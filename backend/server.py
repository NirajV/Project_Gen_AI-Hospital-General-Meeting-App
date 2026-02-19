from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, Request, Response
from fastapi.security import HTTPBearer
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta, date, time
import secrets
import aiofiles
import jwt
import bcrypt
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB Configuration
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'hospital_meeting_scheduler_secret_key_2025')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRATION_HOURS = int(os.environ.get('JWT_EXPIRATION_HOURS', 24))
UPLOAD_DIR = Path(os.environ.get('UPLOAD_DIR', '/app/uploads'))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Hospital Meeting Scheduler API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== Pydantic Models ==============

class UserBase(BaseModel):
    email: EmailStr
    name: str
    specialty: Optional[str] = None
    organization: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = "doctor"

class UserCreate(UserBase):
    password: Optional[str] = None

class UserResponse(UserBase):
    id: str
    picture: Optional[str] = None
    is_active: bool = True
    created_at: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class PatientBase(BaseModel):
    patient_id_number: Optional[str] = None
    first_name: str
    last_name: str
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    primary_diagnosis: Optional[str] = None
    allergies: Optional[str] = None
    current_medications: Optional[str] = None
    department_name: Optional[str] = None
    department_provider_name: Optional[str] = None
    notes: Optional[str] = None

class PatientCreate(PatientBase):
    pass

class MeetingBase(BaseModel):
    title: str
    description: Optional[str] = None
    meeting_date: str
    start_time: str
    end_time: str
    duration_minutes: Optional[int] = None
    meeting_type: Optional[str] = "video"
    location: Optional[str] = None
    video_link: Optional[str] = None
    recurrence_type: Optional[str] = "one_time"
    recurrence_end_date: Optional[str] = None

class MeetingCreate(MeetingBase):
    participant_ids: Optional[List[str]] = []
    patient_ids: Optional[List[str]] = []
    agenda_items: Optional[List[dict]] = []

class ParticipantInvite(BaseModel):
    user_id: str
    role: Optional[str] = "attendee"

class ParticipantResponse(BaseModel):
    response_status: str

class MeetingPatientCreate(BaseModel):
    patient_id: str
    clinical_question: Optional[str] = None
    reason_for_discussion: Optional[str] = None
    status: Optional[str] = "new_case"

class AgendaItemCreate(BaseModel):
    title: str
    description: Optional[str] = None
    order_index: Optional[int] = 0
    estimated_duration_minutes: Optional[int] = None
    assigned_to: Optional[str] = None

class DecisionLogCreate(BaseModel):
    meeting_patient_id: Optional[str] = None
    agenda_item_id: Optional[str] = None
    decision_type: Optional[str] = "other"
    title: str
    description: Optional[str] = None
    final_assessment: Optional[str] = None
    action_plan: Optional[str] = None
    responsible_doctor_id: Optional[str] = None
    follow_up_date: Optional[str] = None
    priority: Optional[str] = "medium"

# ============== Helpers ==============

def serialize_doc(doc: dict) -> dict:
    """Remove MongoDB _id and convert dates to strings"""
    if doc is None:
        return None
    result = {k: v for k, v in doc.items() if k != '_id'}
    for key, value in result.items():
        if isinstance(value, datetime):
            result[key] = value.isoformat()
    return result

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request, credentials = Depends(security)) -> dict:
    """Get current user from JWT token or session token"""
    token = None
    
    # Check cookies first
    session_token = request.cookies.get("session_token")
    if session_token:
        session = await db.user_sessions.find_one(
            {"session_token": session_token, "expires_at": {"$gt": datetime.now(timezone.utc).isoformat()}},
            {"_id": 0}
        )
        if session:
            user = await db.users.find_one({"id": session['user_id']}, {"_id": 0})
            if user:
                return serialize_doc(user)
    
    # Check Authorization header
    if credentials:
        token = credentials.credentials
    else:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
    
    if token:
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user = await db.users.find_one({"id": payload['sub']}, {"_id": 0})
            if user:
                return serialize_doc(user)
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.InvalidTokenError:
            pass
    
    raise HTTPException(status_code=401, detail="Not authenticated")

# ============== Auth Routes ==============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user: UserCreate):
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    password_hash = hash_password(user.password) if user.password else None
    
    user_doc = {
        "id": user_id,
        "email": user.email,
        "name": user.name,
        "password_hash": password_hash,
        "specialty": user.specialty,
        "organization": user.organization,
        "phone": user.phone,
        "role": user.role or "doctor",
        "picture": None,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    user_data = await db.users.find_one({"id": user_id}, {"_id": 0})
    token = create_jwt_token(user_id, user.email)
    
    return TokenResponse(access_token=token, user=UserResponse(**serialize_doc(user_data)))

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not user.get('password_hash'):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_jwt_token(user['id'], user['email'])
    return TokenResponse(access_token=token, user=UserResponse(**serialize_doc(user)))

# REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
@api_router.post("/auth/session")
async def process_session(request: Request, response: Response):
    """Process Emergent OAuth session_id and create local session"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Call Emergent Auth to get user data
    async with httpx.AsyncClient() as http_client:
        auth_response = await http_client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        if auth_response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        auth_data = auth_response.json()
    
    # Find or create user
    user = await db.users.find_one({"email": auth_data['email']}, {"_id": 0})
    
    if not user:
        user_id = str(uuid.uuid4())
        user_doc = {
            "id": user_id,
            "email": auth_data['email'],
            "name": auth_data['name'],
            "picture": auth_data.get('picture'),
            "role": "doctor",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
    else:
        # Update picture if changed
        await db.users.update_one(
            {"id": user['id']},
            {"$set": {"picture": auth_data.get('picture'), "name": auth_data['name']}}
        )
        user = await db.users.find_one({"id": user['id']}, {"_id": 0})
    
    # Create session
    session_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user['id'],
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    return {"user": serialize_doc(user), "session_token": session_token}

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out"}

# ============== Users Routes ==============

@api_router.get("/users")
async def list_users(current_user: dict = Depends(get_current_user)):
    users = await db.users.find({"is_active": True}, {"_id": 0}).sort("name", 1).to_list(1000)
    return [serialize_doc(u) for u in users]

@api_router.get("/users/{user_id}")
async def get_user(user_id: str, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return serialize_doc(user)

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, updates: dict, current_user: dict = Depends(get_current_user)):
    if current_user['id'] != user_id:
        raise HTTPException(status_code=403, detail="Can only update own profile")
    
    allowed_fields = ['name', 'specialty', 'organization', 'phone']
    update_data = {k: v for k, v in updates.items() if k in allowed_fields}
    
    if update_data:
        await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    return serialize_doc(user)

# ============== Patients Routes ==============

@api_router.get("/patients")
async def list_patients(search: Optional[str] = None, department: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"is_active": True}
    
    if search:
        query["$or"] = [
            {"first_name": {"$regex": search, "$options": "i"}},
            {"last_name": {"$regex": search, "$options": "i"}},
            {"patient_id_number": {"$regex": search, "$options": "i"}}
        ]
    
    if department:
        query["department_name"] = department
    
    patients = await db.patients.find(query, {"_id": 0}).sort([("last_name", 1), ("first_name", 1)]).to_list(1000)
    return [serialize_doc(p) for p in patients]

@api_router.post("/patients")
async def create_patient(patient: PatientCreate, current_user: dict = Depends(get_current_user)):
    patient_id = str(uuid.uuid4())
    
    patient_doc = {
        "id": patient_id,
        **patient.model_dump(),
        "is_active": True,
        "created_by": current_user['id'],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.patients.insert_one(patient_doc)
    
    patient_data = await db.patients.find_one({"id": patient_id}, {"_id": 0})
    return serialize_doc(patient_data)

@api_router.get("/patients/{patient_id}")
async def get_patient(patient_id: str, current_user: dict = Depends(get_current_user)):
    patient = await db.patients.find_one({"id": patient_id}, {"_id": 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Get patient's meetings
    meeting_patients = await db.meeting_patients.find({"patient_id": patient_id}, {"_id": 0}).to_list(100)
    meeting_ids = [mp['meeting_id'] for mp in meeting_patients]
    meetings = await db.meetings.find({"id": {"$in": meeting_ids}}, {"_id": 0}).sort("meeting_date", -1).to_list(100)
    
    # Get patient's files
    files = await db.file_attachments.find({"patient_id": patient_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    result = serialize_doc(patient)
    result['meetings'] = [serialize_doc(m) for m in meetings]
    result['files'] = [serialize_doc(f) for f in files]
    
    return result

@api_router.put("/patients/{patient_id}")
async def update_patient(patient_id: str, updates: dict, current_user: dict = Depends(get_current_user)):
    allowed_fields = ['first_name', 'last_name', 'date_of_birth', 'gender', 'email', 'phone',
                      'address', 'primary_diagnosis', 'allergies', 'current_medications',
                      'department_name', 'department_provider_name', 'notes']
    
    update_data = {k: v for k, v in updates.items() if k in allowed_fields}
    
    if update_data:
        await db.patients.update_one({"id": patient_id}, {"$set": update_data})
    
    patient = await db.patients.find_one({"id": patient_id}, {"_id": 0})
    return serialize_doc(patient)

@api_router.delete("/patients/{patient_id}")
async def delete_patient(patient_id: str, current_user: dict = Depends(get_current_user)):
    await db.patients.update_one({"id": patient_id}, {"$set": {"is_active": False}})
    return {"message": "Patient deleted"}

# ============== Meetings Routes ==============

@api_router.get("/meetings")
async def list_meetings(filter_type: Optional[str] = None, status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Base query - meetings where user is organizer or participant
    participant_meetings = await db.meeting_participants.find({"user_id": current_user['id']}, {"_id": 0}).to_list(1000)
    participant_meeting_ids = [pm['meeting_id'] for pm in participant_meetings]
    
    query = {"$or": [
        {"organizer_id": current_user['id']},
        {"id": {"$in": participant_meeting_ids}}
    ]}
    
    if filter_type == "upcoming":
        query["meeting_date"] = {"$gte": today}
        query["status"] = {"$in": ["scheduled", "in_progress"]}
    elif filter_type == "past":
        query["$or"] = [{"meeting_date": {"$lt": today}}, {"status": "completed"}]
    elif filter_type == "my_invites":
        query = {"id": {"$in": participant_meeting_ids}}
    
    if status:
        query["status"] = status
    
    meetings = await db.meetings.find(query, {"_id": 0}).sort([("meeting_date", -1), ("start_time", -1)]).to_list(1000)
    
    # Enrich with organizer info and counts
    for meeting in meetings:
        organizer = await db.users.find_one({"id": meeting['organizer_id']}, {"_id": 0, "name": 1, "specialty": 1})
        meeting['organizer_name'] = organizer['name'] if organizer else None
        meeting['organizer_specialty'] = organizer.get('specialty') if organizer else None
        
        participant_count = await db.meeting_participants.count_documents({"meeting_id": meeting['id']})
        patient_count = await db.meeting_patients.count_documents({"meeting_id": meeting['id']})
        meeting['participant_count'] = participant_count
        meeting['patient_count'] = patient_count
        
        # Get response status for my_invites
        if filter_type == "my_invites":
            participant = next((pm for pm in participant_meetings if pm['meeting_id'] == meeting['id']), None)
            meeting['response_status'] = participant.get('response_status') if participant else None
    
    return [serialize_doc(m) for m in meetings]

@api_router.post("/meetings")
async def create_meeting(meeting: MeetingCreate, current_user: dict = Depends(get_current_user)):
    meeting_id = str(uuid.uuid4())
    
    # Calculate duration
    try:
        start_parts = meeting.start_time.split(':')
        end_parts = meeting.end_time.split(':')
        start_minutes = int(start_parts[0]) * 60 + int(start_parts[1])
        end_minutes = int(end_parts[0]) * 60 + int(end_parts[1])
        duration = end_minutes - start_minutes
    except:
        duration = 60
    
    meeting_doc = {
        "id": meeting_id,
        "title": meeting.title,
        "description": meeting.description,
        "meeting_date": meeting.meeting_date,
        "start_time": meeting.start_time,
        "end_time": meeting.end_time,
        "duration_minutes": duration,
        "meeting_type": meeting.meeting_type,
        "location": meeting.location,
        "video_link": meeting.video_link,
        "recurrence_type": meeting.recurrence_type,
        "recurrence_end_date": meeting.recurrence_end_date,
        "status": "scheduled",
        "organizer_id": current_user['id'],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.meetings.insert_one(meeting_doc)
    
    # Add organizer as participant
    await db.meeting_participants.insert_one({
        "id": str(uuid.uuid4()),
        "meeting_id": meeting_id,
        "user_id": current_user['id'],
        "role": "organizer",
        "response_status": "accepted",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Add participants
    for participant_id in meeting.participant_ids or []:
        if participant_id != current_user['id']:
            await db.meeting_participants.insert_one({
                "id": str(uuid.uuid4()),
                "meeting_id": meeting_id,
                "user_id": participant_id,
                "role": "attendee",
                "response_status": "pending",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
    
    # Add patients
    for patient_id in meeting.patient_ids or []:
        await db.meeting_patients.insert_one({
            "id": str(uuid.uuid4()),
            "meeting_id": meeting_id,
            "patient_id": patient_id,
            "status": "new_case",
            "added_by": current_user['id'],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # Add agenda items
    for idx, item in enumerate(meeting.agenda_items or []):
        await db.agenda_items.insert_one({
            "id": str(uuid.uuid4()),
            "meeting_id": meeting_id,
            "title": item.get('title'),
            "description": item.get('description'),
            "order_index": idx,
            "estimated_duration_minutes": item.get('estimated_duration_minutes', 15),
            "assigned_to": item.get('assigned_to'),
            "is_completed": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    return await get_meeting_detail(meeting_id, current_user)

async def get_meeting_detail(meeting_id: str, current_user: dict):
    meeting = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Get organizer
    organizer = await db.users.find_one({"id": meeting['organizer_id']}, {"_id": 0})
    meeting['organizer'] = serialize_doc(organizer) if organizer else None
    
    # Get participants with user info
    participants = await db.meeting_participants.find({"meeting_id": meeting_id}, {"_id": 0}).to_list(100)
    for p in participants:
        user = await db.users.find_one({"id": p['user_id']}, {"_id": 0, "name": 1, "email": 1, "specialty": 1, "picture": 1})
        if user:
            p.update(user)
    meeting['participants'] = [serialize_doc(p) for p in participants]
    
    # Get patients with patient info
    meeting_patients = await db.meeting_patients.find({"meeting_id": meeting_id}, {"_id": 0}).to_list(100)
    for mp in meeting_patients:
        patient = await db.patients.find_one({"id": mp['patient_id']}, {"_id": 0})
        if patient:
            mp.update({
                "first_name": patient.get('first_name'),
                "last_name": patient.get('last_name'),
                "patient_id_number": patient.get('patient_id_number'),
                "primary_diagnosis": patient.get('primary_diagnosis'),
                "department_name": patient.get('department_name'),
                "date_of_birth": patient.get('date_of_birth'),
                "gender": patient.get('gender')
            })
    meeting['patients'] = [serialize_doc(mp) for mp in meeting_patients]
    
    # Get agenda items
    agenda = await db.agenda_items.find({"meeting_id": meeting_id}, {"_id": 0}).sort("order_index", 1).to_list(100)
    for a in agenda:
        if a.get('assigned_to'):
            assigned_user = await db.users.find_one({"id": a['assigned_to']}, {"_id": 0, "name": 1})
            a['assigned_to_name'] = assigned_user.get('name') if assigned_user else None
    meeting['agenda'] = [serialize_doc(a) for a in agenda]
    
    # Get files
    files = await db.file_attachments.find({"meeting_id": meeting_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    for f in files:
        if f.get('uploaded_by'):
            uploader = await db.users.find_one({"id": f['uploaded_by']}, {"_id": 0, "name": 1})
            f['uploader_name'] = uploader.get('name') if uploader else None
    meeting['files'] = [serialize_doc(f) for f in files]
    
    # Get decisions
    decisions = await db.decision_logs.find({"meeting_id": meeting_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    meeting['decisions'] = [serialize_doc(d) for d in decisions]
    
    return serialize_doc(meeting)

@api_router.get("/meetings/{meeting_id}")
async def get_meeting(meeting_id: str, current_user: dict = Depends(get_current_user)):
    return await get_meeting_detail(meeting_id, current_user)

@api_router.put("/meetings/{meeting_id}")
async def update_meeting(meeting_id: str, updates: dict, current_user: dict = Depends(get_current_user)):
    meeting = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    if meeting['organizer_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Only organizer can update meeting")
    
    allowed_fields = ['title', 'description', 'meeting_date', 'start_time', 'end_time',
                      'meeting_type', 'location', 'video_link', 'status', 'recurrence_type']
    update_data = {k: v for k, v in updates.items() if k in allowed_fields}
    
    if update_data:
        await db.meetings.update_one({"id": meeting_id}, {"$set": update_data})
    
    return await get_meeting_detail(meeting_id, current_user)

@api_router.delete("/meetings/{meeting_id}")
async def delete_meeting(meeting_id: str, current_user: dict = Depends(get_current_user)):
    meeting = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    if meeting['organizer_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Only organizer can delete meeting")
    
    await db.meetings.update_one({"id": meeting_id}, {"$set": {"status": "cancelled"}})
    return {"message": "Meeting cancelled"}

# ============== Meeting Participants Routes ==============

@api_router.post("/meetings/{meeting_id}/participants")
async def add_participant(meeting_id: str, invite: ParticipantInvite, current_user: dict = Depends(get_current_user)):
    existing = await db.meeting_participants.find_one({"meeting_id": meeting_id, "user_id": invite.user_id})
    if existing:
        raise HTTPException(status_code=400, detail="User already a participant")
    
    await db.meeting_participants.insert_one({
        "id": str(uuid.uuid4()),
        "meeting_id": meeting_id,
        "user_id": invite.user_id,
        "role": invite.role,
        "response_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Participant added"}

@api_router.put("/meetings/{meeting_id}/respond")
async def respond_to_invite(meeting_id: str, response: ParticipantResponse, current_user: dict = Depends(get_current_user)):
    if response.response_status not in ['accepted', 'declined', 'tentative']:
        raise HTTPException(status_code=400, detail="Invalid response status")
    
    await db.meeting_participants.update_one(
        {"meeting_id": meeting_id, "user_id": current_user['id']},
        {"$set": {"response_status": response.response_status, "response_date": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": f"Response recorded: {response.response_status}"}

@api_router.delete("/meetings/{meeting_id}/participants/{user_id}")
async def remove_participant(meeting_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    meeting = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
    if not meeting or meeting['organizer_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Only organizer can remove participants")
    
    await db.meeting_participants.delete_one({"meeting_id": meeting_id, "user_id": user_id})
    return {"message": "Participant removed"}

# ============== Meeting Patients Routes ==============

@api_router.post("/meetings/{meeting_id}/patients")
async def add_patient_to_meeting(meeting_id: str, patient_data: MeetingPatientCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.meeting_patients.find_one({"meeting_id": meeting_id, "patient_id": patient_data.patient_id})
    if existing:
        raise HTTPException(status_code=400, detail="Patient already in meeting")
    
    mp_id = str(uuid.uuid4())
    await db.meeting_patients.insert_one({
        "id": mp_id,
        "meeting_id": meeting_id,
        "patient_id": patient_data.patient_id,
        "clinical_question": patient_data.clinical_question,
        "reason_for_discussion": patient_data.reason_for_discussion,
        "status": patient_data.status,
        "added_by": current_user['id'],
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"id": mp_id, "message": "Patient added to meeting"}

@api_router.delete("/meetings/{meeting_id}/patients/{patient_id}")
async def remove_patient_from_meeting(meeting_id: str, patient_id: str, current_user: dict = Depends(get_current_user)):
    await db.meeting_patients.delete_one({"meeting_id": meeting_id, "patient_id": patient_id})
    return {"message": "Patient removed from meeting"}

# ============== Agenda Routes ==============

@api_router.post("/meetings/{meeting_id}/agenda")
async def add_agenda_item(meeting_id: str, item: AgendaItemCreate, current_user: dict = Depends(get_current_user)):
    item_id = str(uuid.uuid4())
    await db.agenda_items.insert_one({
        "id": item_id,
        "meeting_id": meeting_id,
        "title": item.title,
        "description": item.description,
        "order_index": item.order_index,
        "estimated_duration_minutes": item.estimated_duration_minutes,
        "assigned_to": item.assigned_to,
        "is_completed": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"id": item_id, "message": "Agenda item added"}

@api_router.put("/meetings/{meeting_id}/agenda/{item_id}")
async def update_agenda_item(meeting_id: str, item_id: str, updates: dict, current_user: dict = Depends(get_current_user)):
    allowed_fields = ['title', 'description', 'order_index', 'estimated_duration_minutes',
                      'assigned_to', 'is_completed', 'notes']
    update_data = {k: v for k, v in updates.items() if k in allowed_fields}
    
    if update_data:
        await db.agenda_items.update_one({"id": item_id}, {"$set": update_data})
    
    item = await db.agenda_items.find_one({"id": item_id}, {"_id": 0})
    return serialize_doc(item)

@api_router.delete("/meetings/{meeting_id}/agenda/{item_id}")
async def delete_agenda_item(meeting_id: str, item_id: str, current_user: dict = Depends(get_current_user)):
    await db.agenda_items.delete_one({"id": item_id, "meeting_id": meeting_id})
    return {"message": "Agenda item deleted"}

# ============== Decision Logs Routes ==============

@api_router.post("/meetings/{meeting_id}/decisions")
async def create_decision(meeting_id: str, decision: DecisionLogCreate, current_user: dict = Depends(get_current_user)):
    decision_id = str(uuid.uuid4())
    await db.decision_logs.insert_one({
        "id": decision_id,
        "meeting_id": meeting_id,
        "meeting_patient_id": decision.meeting_patient_id,
        "agenda_item_id": decision.agenda_item_id,
        "decision_type": decision.decision_type,
        "title": decision.title,
        "description": decision.description,
        "final_assessment": decision.final_assessment,
        "action_plan": decision.action_plan,
        "responsible_doctor_id": decision.responsible_doctor_id,
        "follow_up_date": decision.follow_up_date,
        "priority": decision.priority,
        "status": "pending",
        "created_by": current_user['id'],
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"id": decision_id, "message": "Decision logged"}

@api_router.put("/meetings/{meeting_id}/decisions/{decision_id}")
async def update_decision(meeting_id: str, decision_id: str, updates: dict, current_user: dict = Depends(get_current_user)):
    allowed_fields = ['decision_type', 'title', 'description', 'final_assessment',
                      'action_plan', 'responsible_doctor_id', 'follow_up_date', 'priority', 'status']
    update_data = {k: v for k, v in updates.items() if k in allowed_fields}
    
    if update_data:
        await db.decision_logs.update_one({"id": decision_id}, {"$set": update_data})
    
    decision = await db.decision_logs.find_one({"id": decision_id}, {"_id": 0})
    return serialize_doc(decision)

# ============== File Upload Routes ==============

@api_router.post("/meetings/{meeting_id}/files")
async def upload_file(
    meeting_id: str,
    file: UploadFile = File(...),
    patient_id: Optional[str] = Form(None),
    meeting_patient_id: Optional[str] = Form(None),
    file_type: Optional[str] = Form("other"),
    department_document_type: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    # Generate unique filename
    file_ext = Path(file.filename).suffix
    file_name = f"{uuid.uuid4()}{file_ext}"
    file_path = UPLOAD_DIR / meeting_id
    file_path.mkdir(parents=True, exist_ok=True)
    full_path = file_path / file_name
    
    # Save file
    async with aiofiles.open(full_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    file_id = str(uuid.uuid4())
    await db.file_attachments.insert_one({
        "id": file_id,
        "meeting_id": meeting_id,
        "patient_id": patient_id,
        "meeting_patient_id": meeting_patient_id,
        "file_name": file_name,
        "original_name": file.filename,
        "file_path": str(full_path),
        "file_type": file_type,
        "mime_type": file.content_type,
        "file_size": len(content),
        "department_document_type": department_document_type,
        "uploaded_by": current_user['id'],
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"id": file_id, "file_name": file_name, "message": "File uploaded"}

@api_router.get("/files/{file_id}")
async def get_file(file_id: str, current_user: dict = Depends(get_current_user)):
    from fastapi.responses import FileResponse
    
    file_record = await db.file_attachments.find_one({"id": file_id}, {"_id": 0})
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        file_record['file_path'],
        filename=file_record['original_name'],
        media_type=file_record['mime_type']
    )

@api_router.delete("/files/{file_id}")
async def delete_file(file_id: str, current_user: dict = Depends(get_current_user)):
    file_record = await db.file_attachments.find_one({"id": file_id}, {"_id": 0})
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Delete physical file
    try:
        os.remove(file_record['file_path'])
    except:
        pass
    
    await db.file_attachments.delete_one({"id": file_id})
    return {"message": "File deleted"}

# ============== Dashboard Stats ==============

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    week_end = (datetime.now(timezone.utc) + timedelta(days=7)).strftime("%Y-%m-%d")
    
    # Get meeting IDs where user is participant
    participant_meetings = await db.meeting_participants.find({"user_id": current_user['id']}, {"_id": 0, "meeting_id": 1}).to_list(1000)
    participant_meeting_ids = [pm['meeting_id'] for pm in participant_meetings]
    
    # Upcoming meetings count
    upcoming = await db.meetings.count_documents({
        "$or": [{"organizer_id": current_user['id']}, {"id": {"$in": participant_meeting_ids}}],
        "meeting_date": {"$gte": today},
        "status": {"$in": ["scheduled", "in_progress"]}
    })
    
    # Pending invites
    pending = await db.meeting_participants.count_documents({
        "user_id": current_user['id'],
        "response_status": "pending"
    })
    
    # Total patients
    patients = await db.patients.count_documents({"is_active": True})
    
    # Meetings this week
    this_week = await db.meetings.count_documents({
        "$or": [{"organizer_id": current_user['id']}, {"id": {"$in": participant_meeting_ids}}],
        "meeting_date": {"$gte": today, "$lte": week_end}
    })
    
    return {
        "upcoming_meetings": upcoming,
        "pending_invites": pending,
        "total_patients": patients,
        "meetings_this_week": this_week
    }

# ============== Health Check ==============

@api_router.get("/")
async def root():
    return {"message": "Hospital Meeting Scheduler API", "status": "running"}

@api_router.get("/health")
async def health_check():
    try:
        await db.command('ping')
        return {"status": "healthy", "database": "connected"}
    except:
        return {"status": "unhealthy", "database": "disconnected"}

# Include router and configure middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    logger.info("Starting Hospital Meeting Scheduler API")
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.patients.create_index("id", unique=True)
    await db.meetings.create_index("id", unique=True)
    await db.meeting_participants.create_index([("meeting_id", 1), ("user_id", 1)])
    await db.meeting_patients.create_index([("meeting_id", 1), ("patient_id", 1)])
    logger.info("Database indexes created")

@app.on_event("shutdown")
async def shutdown():
    client.close()
    logger.info("Database connection closed")
