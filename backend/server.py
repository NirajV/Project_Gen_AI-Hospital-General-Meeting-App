from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, Query, Request, Response
from fastapi.security import HTTPBearer
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta, date, time
import hashlib
import secrets
import aiomysql
import aiofiles
import jwt
import bcrypt
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MySQL Configuration
MYSQL_CONFIG = {
    'host': os.environ.get('MYSQL_HOST', '127.0.0.1'),
    'port': int(os.environ.get('MYSQL_PORT', 3306)),
    'user': os.environ.get('MYSQL_USER', 'root'),
    'password': os.environ.get('MYSQL_PASSWORD', '12345678'),
    'db': os.environ.get('MYSQL_DATABASE', 'Hospital_General_Meeting_Scheduler_DB'),
    'autocommit': True,
}

JWT_SECRET = os.environ.get('JWT_SECRET', 'hospital_meeting_scheduler_secret_key_2025')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRATION_HOURS = int(os.environ.get('JWT_EXPIRATION_HOURS', 24))
UPLOAD_DIR = Path(os.environ.get('UPLOAD_DIR', '/app/uploads'))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Database pool
pool = None

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
    created_at: Optional[datetime] = None

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
    date_of_birth: Optional[date] = None
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

class PatientResponse(PatientBase):
    id: str
    is_active: bool = True
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None

class MeetingBase(BaseModel):
    title: str
    description: Optional[str] = None
    meeting_date: date
    start_time: time
    end_time: time
    duration_minutes: Optional[int] = None
    meeting_type: Optional[str] = "video"
    location: Optional[str] = None
    video_link: Optional[str] = None
    recurrence_type: Optional[str] = "one_time"
    recurrence_end_date: Optional[date] = None

class MeetingCreate(MeetingBase):
    participant_ids: Optional[List[str]] = []
    patient_ids: Optional[List[str]] = []
    agenda_items: Optional[List[dict]] = []

class MeetingResponse(MeetingBase):
    id: str
    status: str = "scheduled"
    organizer_id: str
    created_at: Optional[datetime] = None
    organizer: Optional[UserResponse] = None
    participants: Optional[List[dict]] = []
    patients: Optional[List[dict]] = []
    agenda: Optional[List[dict]] = []

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

class AgendaItemBase(BaseModel):
    title: str
    description: Optional[str] = None
    order_index: Optional[int] = 0
    estimated_duration_minutes: Optional[int] = None
    assigned_to: Optional[str] = None

class AgendaItemCreate(AgendaItemBase):
    pass

class AgendaItemResponse(AgendaItemBase):
    id: str
    meeting_id: str
    is_completed: bool = False
    notes: Optional[str] = None

class DecisionLogCreate(BaseModel):
    meeting_patient_id: Optional[str] = None
    agenda_item_id: Optional[str] = None
    decision_type: Optional[str] = "other"
    title: str
    description: Optional[str] = None
    final_assessment: Optional[str] = None
    action_plan: Optional[str] = None
    responsible_doctor_id: Optional[str] = None
    follow_up_date: Optional[date] = None
    priority: Optional[str] = "medium"

class DecisionLogResponse(DecisionLogCreate):
    id: str
    meeting_id: str
    status: str = "pending"
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None

class FileAttachmentResponse(BaseModel):
    id: str
    file_name: str
    original_name: str
    file_type: str
    mime_type: Optional[str] = None
    file_size: Optional[int] = None
    uploaded_by: Optional[str] = None
    created_at: Optional[datetime] = None

# ============== Database Helpers ==============

async def get_db_pool():
    global pool
    if pool is None:
        try:
            pool = await aiomysql.create_pool(**MYSQL_CONFIG)
            logger.info("MySQL connection pool created")
        except Exception as e:
            logger.error(f"Failed to create MySQL pool: {e}")
            raise HTTPException(status_code=500, detail="Database connection failed")
    return pool

async def execute_query(query: str, params: tuple = None, fetch_one: bool = False, fetch_all: bool = False):
    db_pool = await get_db_pool()
    async with db_pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute(query, params)
            if fetch_one:
                return await cur.fetchone()
            if fetch_all:
                return await cur.fetchall()
            return cur.lastrowid

def serialize_row(row: dict) -> dict:
    """Convert MySQL row to JSON-serializable dict"""
    if row is None:
        return None
    result = {}
    for key, value in row.items():
        if isinstance(value, (datetime, date)):
            result[key] = value.isoformat()
        elif isinstance(value, time):
            result[key] = value.strftime("%H:%M:%S")
        elif isinstance(value, timedelta):
            result[key] = str(value)
        else:
            result[key] = value
    return result

# ============== Authentication ==============

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
        session = await execute_query(
            "SELECT * FROM user_sessions WHERE session_token = %s AND expires_at > NOW()",
            (session_token,), fetch_one=True
        )
        if session:
            user = await execute_query("SELECT * FROM users WHERE id = %s", (session['user_id'],), fetch_one=True)
            if user:
                return serialize_row(user)
    
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
            user = await execute_query("SELECT * FROM users WHERE id = %s", (payload['sub'],), fetch_one=True)
            if user:
                return serialize_row(user)
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.InvalidTokenError:
            pass
    
    raise HTTPException(status_code=401, detail="Not authenticated")

async def get_optional_user(request: Request, credentials = Depends(security)) -> Optional[dict]:
    """Get current user if authenticated, otherwise None"""
    try:
        return await get_current_user(request, credentials)
    except HTTPException:
        return None

# ============== Auth Routes ==============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user: UserCreate):
    existing = await execute_query("SELECT id FROM users WHERE email = %s", (user.email,), fetch_one=True)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    password_hash = hash_password(user.password) if user.password else None
    
    await execute_query(
        """INSERT INTO users (id, email, name, password_hash, specialty, organization, phone, role)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
        (user_id, user.email, user.name, password_hash, user.specialty, user.organization, user.phone, user.role)
    )
    
    user_data = await execute_query("SELECT * FROM users WHERE id = %s", (user_id,), fetch_one=True)
    token = create_jwt_token(user_id, user.email)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(**serialize_row(user_data))
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await execute_query("SELECT * FROM users WHERE email = %s", (credentials.email,), fetch_one=True)
    if not user or not user.get('password_hash'):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_jwt_token(user['id'], user['email'])
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(**serialize_row(user))
    )

# REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
@api_router.post("/auth/session")
async def process_session(request: Request, response: Response):
    """Process Emergent OAuth session_id and create local session"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Call Emergent Auth to get user data
    async with httpx.AsyncClient() as client:
        auth_response = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        if auth_response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        auth_data = auth_response.json()
    
    # Find or create user
    user = await execute_query("SELECT * FROM users WHERE email = %s", (auth_data['email'],), fetch_one=True)
    
    if not user:
        user_id = str(uuid.uuid4())
        await execute_query(
            """INSERT INTO users (id, email, name, picture, role)
               VALUES (%s, %s, %s, %s, %s)""",
            (user_id, auth_data['email'], auth_data['name'], auth_data.get('picture'), 'doctor')
        )
        user = await execute_query("SELECT * FROM users WHERE id = %s", (user_id,), fetch_one=True)
    else:
        # Update picture if changed
        await execute_query(
            "UPDATE users SET picture = %s, name = %s WHERE id = %s",
            (auth_data.get('picture'), auth_data['name'], user['id'])
        )
        user = await execute_query("SELECT * FROM users WHERE id = %s", (user['id'],), fetch_one=True)
    
    # Create session
    session_token = secrets.token_urlsafe(32)
    session_id_db = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await execute_query(
        """INSERT INTO user_sessions (id, user_id, session_token, expires_at)
           VALUES (%s, %s, %s, %s)""",
        (session_id_db, user['id'], session_token, expires_at)
    )
    
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
    
    return {"user": serialize_row(user), "session_token": session_token}

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await execute_query("DELETE FROM user_sessions WHERE session_token = %s", (session_token,))
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out"}

# ============== Users Routes ==============

@api_router.get("/users", response_model=List[dict])
async def list_users(current_user: dict = Depends(get_current_user)):
    users = await execute_query("SELECT * FROM users WHERE is_active = TRUE ORDER BY name", fetch_all=True)
    return [serialize_row(u) for u in users]

@api_router.get("/users/{user_id}")
async def get_user(user_id: str, current_user: dict = Depends(get_current_user)):
    user = await execute_query("SELECT * FROM users WHERE id = %s", (user_id,), fetch_one=True)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return serialize_row(user)

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, updates: dict, current_user: dict = Depends(get_current_user)):
    if current_user['id'] != user_id:
        raise HTTPException(status_code=403, detail="Can only update own profile")
    
    allowed_fields = ['name', 'specialty', 'organization', 'phone']
    set_clause = ", ".join([f"{k} = %s" for k in updates.keys() if k in allowed_fields])
    values = [v for k, v in updates.items() if k in allowed_fields]
    
    if set_clause:
        values.append(user_id)
        await execute_query(f"UPDATE users SET {set_clause} WHERE id = %s", tuple(values))
    
    user = await execute_query("SELECT * FROM users WHERE id = %s", (user_id,), fetch_one=True)
    return serialize_row(user)

# ============== Patients Routes ==============

@api_router.get("/patients", response_model=List[dict])
async def list_patients(
    search: Optional[str] = None,
    department: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = "SELECT * FROM patients WHERE is_active = TRUE"
    params = []
    
    if search:
        query += " AND (first_name LIKE %s OR last_name LIKE %s OR patient_id_number LIKE %s)"
        search_pattern = f"%{search}%"
        params.extend([search_pattern, search_pattern, search_pattern])
    
    if department:
        query += " AND department_name = %s"
        params.append(department)
    
    query += " ORDER BY last_name, first_name"
    patients = await execute_query(query, tuple(params) if params else None, fetch_all=True)
    return [serialize_row(p) for p in patients]

@api_router.post("/patients")
async def create_patient(patient: PatientCreate, current_user: dict = Depends(get_current_user)):
    patient_id = str(uuid.uuid4())
    
    await execute_query(
        """INSERT INTO patients (id, patient_id_number, first_name, last_name, date_of_birth, gender,
           email, phone, address, primary_diagnosis, allergies, current_medications,
           department_name, department_provider_name, notes, created_by)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
        (patient_id, patient.patient_id_number, patient.first_name, patient.last_name,
         patient.date_of_birth, patient.gender, patient.email, patient.phone, patient.address,
         patient.primary_diagnosis, patient.allergies, patient.current_medications,
         patient.department_name, patient.department_provider_name, patient.notes, current_user['id'])
    )
    
    patient_data = await execute_query("SELECT * FROM patients WHERE id = %s", (patient_id,), fetch_one=True)
    return serialize_row(patient_data)

@api_router.get("/patients/{patient_id}")
async def get_patient(patient_id: str, current_user: dict = Depends(get_current_user)):
    patient = await execute_query("SELECT * FROM patients WHERE id = %s", (patient_id,), fetch_one=True)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Get patient's meetings
    meetings = await execute_query(
        """SELECT m.*, mp.clinical_question, mp.status as case_status
           FROM meetings m
           JOIN meeting_patients mp ON m.id = mp.meeting_id
           WHERE mp.patient_id = %s
           ORDER BY m.meeting_date DESC""",
        (patient_id,), fetch_all=True
    )
    
    # Get patient's files
    files = await execute_query(
        "SELECT * FROM file_attachments WHERE patient_id = %s ORDER BY created_at DESC",
        (patient_id,), fetch_all=True
    )
    
    result = serialize_row(patient)
    result['meetings'] = [serialize_row(m) for m in meetings]
    result['files'] = [serialize_row(f) for f in files]
    
    return result

@api_router.put("/patients/{patient_id}")
async def update_patient(patient_id: str, updates: dict, current_user: dict = Depends(get_current_user)):
    allowed_fields = ['first_name', 'last_name', 'date_of_birth', 'gender', 'email', 'phone',
                      'address', 'primary_diagnosis', 'allergies', 'current_medications',
                      'department_name', 'department_provider_name', 'notes']
    
    set_clause = ", ".join([f"{k} = %s" for k in updates.keys() if k in allowed_fields])
    values = [v for k, v in updates.items() if k in allowed_fields]
    
    if set_clause:
        values.append(patient_id)
        await execute_query(f"UPDATE patients SET {set_clause} WHERE id = %s", tuple(values))
    
    patient = await execute_query("SELECT * FROM patients WHERE id = %s", (patient_id,), fetch_one=True)
    return serialize_row(patient)

@api_router.delete("/patients/{patient_id}")
async def delete_patient(patient_id: str, current_user: dict = Depends(get_current_user)):
    await execute_query("UPDATE patients SET is_active = FALSE WHERE id = %s", (patient_id,))
    return {"message": "Patient deleted"}

# ============== Meetings Routes ==============

@api_router.get("/meetings")
async def list_meetings(
    filter_type: Optional[str] = None,  # upcoming, past, my_invites
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    today = date.today()
    
    if filter_type == "my_invites":
        query = """
            SELECT m.*, u.name as organizer_name, u.specialty as organizer_specialty,
                   mp.response_status
            FROM meetings m
            JOIN users u ON m.organizer_id = u.id
            JOIN meeting_participants mp ON m.id = mp.meeting_id AND mp.user_id = %s
            WHERE m.status != 'cancelled'
            ORDER BY m.meeting_date DESC, m.start_time DESC
        """
        meetings = await execute_query(query, (current_user['id'],), fetch_all=True)
    else:
        base_query = """
            SELECT m.*, u.name as organizer_name, u.specialty as organizer_specialty
            FROM meetings m
            JOIN users u ON m.organizer_id = u.id
            WHERE (m.organizer_id = %s OR m.id IN (
                SELECT meeting_id FROM meeting_participants WHERE user_id = %s
            ))
        """
        params = [current_user['id'], current_user['id']]
        
        if filter_type == "upcoming":
            base_query += " AND m.meeting_date >= %s AND m.status IN ('scheduled', 'in_progress')"
            params.append(today)
        elif filter_type == "past":
            base_query += " AND (m.meeting_date < %s OR m.status = 'completed')"
            params.append(today)
        
        if status:
            base_query += " AND m.status = %s"
            params.append(status)
        
        base_query += " ORDER BY m.meeting_date DESC, m.start_time DESC"
        meetings = await execute_query(base_query, tuple(params), fetch_all=True)
    
    # Enrich with participant and patient counts
    for meeting in meetings:
        participant_count = await execute_query(
            "SELECT COUNT(*) as count FROM meeting_participants WHERE meeting_id = %s",
            (meeting['id'],), fetch_one=True
        )
        patient_count = await execute_query(
            "SELECT COUNT(*) as count FROM meeting_patients WHERE meeting_id = %s",
            (meeting['id'],), fetch_one=True
        )
        meeting['participant_count'] = participant_count['count'] if participant_count else 0
        meeting['patient_count'] = patient_count['count'] if patient_count else 0
    
    return [serialize_row(m) for m in meetings]

@api_router.post("/meetings")
async def create_meeting(meeting: MeetingCreate, current_user: dict = Depends(get_current_user)):
    meeting_id = str(uuid.uuid4())
    
    # Calculate duration
    start_dt = datetime.combine(date.today(), meeting.start_time)
    end_dt = datetime.combine(date.today(), meeting.end_time)
    duration = int((end_dt - start_dt).total_seconds() / 60)
    
    await execute_query(
        """INSERT INTO meetings (id, title, description, meeting_date, start_time, end_time,
           duration_minutes, meeting_type, location, video_link, recurrence_type,
           recurrence_end_date, organizer_id)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
        (meeting_id, meeting.title, meeting.description, meeting.meeting_date,
         meeting.start_time, meeting.end_time, duration, meeting.meeting_type,
         meeting.location, meeting.video_link, meeting.recurrence_type,
         meeting.recurrence_end_date, current_user['id'])
    )
    
    # Add organizer as participant
    await execute_query(
        """INSERT INTO meeting_participants (id, meeting_id, user_id, role, response_status)
           VALUES (%s, %s, %s, 'organizer', 'accepted')""",
        (str(uuid.uuid4()), meeting_id, current_user['id'])
    )
    
    # Add participants
    for participant_id in meeting.participant_ids or []:
        if participant_id != current_user['id']:
            await execute_query(
                """INSERT INTO meeting_participants (id, meeting_id, user_id, role, response_status)
                   VALUES (%s, %s, %s, 'attendee', 'pending')""",
                (str(uuid.uuid4()), meeting_id, participant_id)
            )
    
    # Add patients
    for patient_id in meeting.patient_ids or []:
        await execute_query(
            """INSERT INTO meeting_patients (id, meeting_id, patient_id, added_by)
               VALUES (%s, %s, %s, %s)""",
            (str(uuid.uuid4()), meeting_id, patient_id, current_user['id'])
        )
    
    # Add agenda items
    for idx, item in enumerate(meeting.agenda_items or []):
        await execute_query(
            """INSERT INTO agenda_items (id, meeting_id, title, description, order_index,
               estimated_duration_minutes, assigned_to)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (str(uuid.uuid4()), meeting_id, item.get('title'), item.get('description'),
             idx, item.get('estimated_duration_minutes'), item.get('assigned_to'))
        )
    
    return await get_meeting(meeting_id, current_user)

@api_router.get("/meetings/{meeting_id}")
async def get_meeting(meeting_id: str, current_user: dict = Depends(get_current_user)):
    meeting = await execute_query(
        """SELECT m.*, u.name as organizer_name, u.email as organizer_email,
           u.specialty as organizer_specialty, u.picture as organizer_picture
           FROM meetings m
           JOIN users u ON m.organizer_id = u.id
           WHERE m.id = %s""",
        (meeting_id,), fetch_one=True
    )
    
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Get participants
    participants = await execute_query(
        """SELECT mp.*, u.name, u.email, u.specialty, u.picture
           FROM meeting_participants mp
           JOIN users u ON mp.user_id = u.id
           WHERE mp.meeting_id = %s""",
        (meeting_id,), fetch_all=True
    )
    
    # Get patients
    patients = await execute_query(
        """SELECT mp.*, p.first_name, p.last_name, p.patient_id_number,
           p.primary_diagnosis, p.department_name, p.date_of_birth, p.gender
           FROM meeting_patients mp
           JOIN patients p ON mp.patient_id = p.id
           WHERE mp.meeting_id = %s""",
        (meeting_id,), fetch_all=True
    )
    
    # Get agenda items
    agenda = await execute_query(
        """SELECT a.*, u.name as assigned_to_name
           FROM agenda_items a
           LEFT JOIN users u ON a.assigned_to = u.id
           WHERE a.meeting_id = %s
           ORDER BY a.order_index""",
        (meeting_id,), fetch_all=True
    )
    
    # Get files
    files = await execute_query(
        """SELECT f.*, u.name as uploader_name
           FROM file_attachments f
           LEFT JOIN users u ON f.uploaded_by = u.id
           WHERE f.meeting_id = %s
           ORDER BY f.created_at DESC""",
        (meeting_id,), fetch_all=True
    )
    
    # Get decisions
    decisions = await execute_query(
        "SELECT * FROM decision_logs WHERE meeting_id = %s ORDER BY created_at DESC",
        (meeting_id,), fetch_all=True
    )
    
    result = serialize_row(meeting)
    result['organizer'] = {
        'id': meeting['organizer_id'],
        'name': meeting['organizer_name'],
        'email': meeting['organizer_email'],
        'specialty': meeting['organizer_specialty'],
        'picture': meeting['organizer_picture']
    }
    result['participants'] = [serialize_row(p) for p in participants]
    result['patients'] = [serialize_row(p) for p in patients]
    result['agenda'] = [serialize_row(a) for a in agenda]
    result['files'] = [serialize_row(f) for f in files]
    result['decisions'] = [serialize_row(d) for d in decisions]
    
    return result

@api_router.put("/meetings/{meeting_id}")
async def update_meeting(meeting_id: str, updates: dict, current_user: dict = Depends(get_current_user)):
    meeting = await execute_query("SELECT * FROM meetings WHERE id = %s", (meeting_id,), fetch_one=True)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    if meeting['organizer_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Only organizer can update meeting")
    
    allowed_fields = ['title', 'description', 'meeting_date', 'start_time', 'end_time',
                      'meeting_type', 'location', 'video_link', 'status', 'recurrence_type']
    
    set_clause = ", ".join([f"{k} = %s" for k in updates.keys() if k in allowed_fields])
    values = [v for k, v in updates.items() if k in allowed_fields]
    
    if set_clause:
        values.append(meeting_id)
        await execute_query(f"UPDATE meetings SET {set_clause} WHERE id = %s", tuple(values))
    
    return await get_meeting(meeting_id, current_user)

@api_router.delete("/meetings/{meeting_id}")
async def delete_meeting(meeting_id: str, current_user: dict = Depends(get_current_user)):
    meeting = await execute_query("SELECT * FROM meetings WHERE id = %s", (meeting_id,), fetch_one=True)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    if meeting['organizer_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Only organizer can delete meeting")
    
    await execute_query("UPDATE meetings SET status = 'cancelled' WHERE id = %s", (meeting_id,))
    return {"message": "Meeting cancelled"}

# ============== Meeting Participants Routes ==============

@api_router.post("/meetings/{meeting_id}/participants")
async def add_participant(meeting_id: str, invite: ParticipantInvite, current_user: dict = Depends(get_current_user)):
    meeting = await execute_query("SELECT * FROM meetings WHERE id = %s", (meeting_id,), fetch_one=True)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    existing = await execute_query(
        "SELECT * FROM meeting_participants WHERE meeting_id = %s AND user_id = %s",
        (meeting_id, invite.user_id), fetch_one=True
    )
    if existing:
        raise HTTPException(status_code=400, detail="User already a participant")
    
    await execute_query(
        """INSERT INTO meeting_participants (id, meeting_id, user_id, role, response_status)
           VALUES (%s, %s, %s, %s, 'pending')""",
        (str(uuid.uuid4()), meeting_id, invite.user_id, invite.role)
    )
    
    return {"message": "Participant added"}

@api_router.put("/meetings/{meeting_id}/respond")
async def respond_to_invite(
    meeting_id: str,
    response: ParticipantResponse,
    current_user: dict = Depends(get_current_user)
):
    if response.response_status not in ['accepted', 'declined', 'tentative']:
        raise HTTPException(status_code=400, detail="Invalid response status")
    
    result = await execute_query(
        """UPDATE meeting_participants 
           SET response_status = %s, response_date = NOW()
           WHERE meeting_id = %s AND user_id = %s""",
        (response.response_status, meeting_id, current_user['id'])
    )
    
    return {"message": f"Response recorded: {response.response_status}"}

@api_router.delete("/meetings/{meeting_id}/participants/{user_id}")
async def remove_participant(meeting_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    meeting = await execute_query("SELECT * FROM meetings WHERE id = %s", (meeting_id,), fetch_one=True)
    if not meeting or meeting['organizer_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Only organizer can remove participants")
    
    await execute_query(
        "DELETE FROM meeting_participants WHERE meeting_id = %s AND user_id = %s",
        (meeting_id, user_id)
    )
    
    return {"message": "Participant removed"}

# ============== Meeting Patients Routes ==============

@api_router.post("/meetings/{meeting_id}/patients")
async def add_patient_to_meeting(
    meeting_id: str,
    patient_data: MeetingPatientCreate,
    current_user: dict = Depends(get_current_user)
):
    existing = await execute_query(
        "SELECT * FROM meeting_patients WHERE meeting_id = %s AND patient_id = %s",
        (meeting_id, patient_data.patient_id), fetch_one=True
    )
    if existing:
        raise HTTPException(status_code=400, detail="Patient already in meeting")
    
    mp_id = str(uuid.uuid4())
    await execute_query(
        """INSERT INTO meeting_patients (id, meeting_id, patient_id, clinical_question,
           reason_for_discussion, status, added_by)
           VALUES (%s, %s, %s, %s, %s, %s, %s)""",
        (mp_id, meeting_id, patient_data.patient_id, patient_data.clinical_question,
         patient_data.reason_for_discussion, patient_data.status, current_user['id'])
    )
    
    return {"id": mp_id, "message": "Patient added to meeting"}

@api_router.delete("/meetings/{meeting_id}/patients/{patient_id}")
async def remove_patient_from_meeting(meeting_id: str, patient_id: str, current_user: dict = Depends(get_current_user)):
    await execute_query(
        "DELETE FROM meeting_patients WHERE meeting_id = %s AND patient_id = %s",
        (meeting_id, patient_id)
    )
    return {"message": "Patient removed from meeting"}

# ============== Agenda Routes ==============

@api_router.post("/meetings/{meeting_id}/agenda")
async def add_agenda_item(
    meeting_id: str,
    item: AgendaItemCreate,
    current_user: dict = Depends(get_current_user)
):
    item_id = str(uuid.uuid4())
    await execute_query(
        """INSERT INTO agenda_items (id, meeting_id, title, description, order_index,
           estimated_duration_minutes, assigned_to)
           VALUES (%s, %s, %s, %s, %s, %s, %s)""",
        (item_id, meeting_id, item.title, item.description, item.order_index,
         item.estimated_duration_minutes, item.assigned_to)
    )
    
    return {"id": item_id, "message": "Agenda item added"}

@api_router.put("/meetings/{meeting_id}/agenda/{item_id}")
async def update_agenda_item(
    meeting_id: str,
    item_id: str,
    updates: dict,
    current_user: dict = Depends(get_current_user)
):
    allowed_fields = ['title', 'description', 'order_index', 'estimated_duration_minutes',
                      'assigned_to', 'is_completed', 'notes']
    
    set_clause = ", ".join([f"{k} = %s" for k in updates.keys() if k in allowed_fields])
    values = [v for k, v in updates.items() if k in allowed_fields]
    
    if set_clause:
        values.append(item_id)
        await execute_query(f"UPDATE agenda_items SET {set_clause} WHERE id = %s", tuple(values))
    
    item = await execute_query("SELECT * FROM agenda_items WHERE id = %s", (item_id,), fetch_one=True)
    return serialize_row(item)

@api_router.delete("/meetings/{meeting_id}/agenda/{item_id}")
async def delete_agenda_item(meeting_id: str, item_id: str, current_user: dict = Depends(get_current_user)):
    await execute_query("DELETE FROM agenda_items WHERE id = %s AND meeting_id = %s", (item_id, meeting_id))
    return {"message": "Agenda item deleted"}

# ============== Decision Logs Routes ==============

@api_router.post("/meetings/{meeting_id}/decisions")
async def create_decision(
    meeting_id: str,
    decision: DecisionLogCreate,
    current_user: dict = Depends(get_current_user)
):
    decision_id = str(uuid.uuid4())
    await execute_query(
        """INSERT INTO decision_logs (id, meeting_id, meeting_patient_id, agenda_item_id,
           decision_type, title, description, final_assessment, action_plan,
           responsible_doctor_id, follow_up_date, priority, created_by)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
        (decision_id, meeting_id, decision.meeting_patient_id, decision.agenda_item_id,
         decision.decision_type, decision.title, decision.description, decision.final_assessment,
         decision.action_plan, decision.responsible_doctor_id, decision.follow_up_date,
         decision.priority, current_user['id'])
    )
    
    return {"id": decision_id, "message": "Decision logged"}

@api_router.put("/meetings/{meeting_id}/decisions/{decision_id}")
async def update_decision(
    meeting_id: str,
    decision_id: str,
    updates: dict,
    current_user: dict = Depends(get_current_user)
):
    allowed_fields = ['decision_type', 'title', 'description', 'final_assessment',
                      'action_plan', 'responsible_doctor_id', 'follow_up_date', 'priority', 'status']
    
    set_clause = ", ".join([f"{k} = %s" for k in updates.keys() if k in allowed_fields])
    values = [v for k, v in updates.items() if k in allowed_fields]
    
    if set_clause:
        values.append(decision_id)
        await execute_query(f"UPDATE decision_logs SET {set_clause} WHERE id = %s", tuple(values))
    
    decision = await execute_query("SELECT * FROM decision_logs WHERE id = %s", (decision_id,), fetch_one=True)
    return serialize_row(decision)

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
    await execute_query(
        """INSERT INTO file_attachments (id, meeting_id, patient_id, meeting_patient_id,
           file_name, original_name, file_path, file_type, mime_type, file_size,
           department_document_type, uploaded_by)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
        (file_id, meeting_id, patient_id, meeting_patient_id, file_name, file.filename,
         str(full_path), file_type, file.content_type, len(content),
         department_document_type, current_user['id'])
    )
    
    return {"id": file_id, "file_name": file_name, "message": "File uploaded"}

@api_router.get("/files/{file_id}")
async def get_file(file_id: str, current_user: dict = Depends(get_current_user)):
    from fastapi.responses import FileResponse
    
    file_record = await execute_query(
        "SELECT * FROM file_attachments WHERE id = %s", (file_id,), fetch_one=True
    )
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        file_record['file_path'],
        filename=file_record['original_name'],
        media_type=file_record['mime_type']
    )

@api_router.delete("/files/{file_id}")
async def delete_file(file_id: str, current_user: dict = Depends(get_current_user)):
    file_record = await execute_query(
        "SELECT * FROM file_attachments WHERE id = %s", (file_id,), fetch_one=True
    )
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Delete physical file
    try:
        os.remove(file_record['file_path'])
    except:
        pass
    
    await execute_query("DELETE FROM file_attachments WHERE id = %s", (file_id,))
    return {"message": "File deleted"}

# ============== Dashboard Stats ==============

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    today = date.today()
    
    # Upcoming meetings count
    upcoming = await execute_query(
        """SELECT COUNT(*) as count FROM meetings 
           WHERE (organizer_id = %s OR id IN (SELECT meeting_id FROM meeting_participants WHERE user_id = %s))
           AND meeting_date >= %s AND status IN ('scheduled', 'in_progress')""",
        (current_user['id'], current_user['id'], today), fetch_one=True
    )
    
    # Pending invites
    pending = await execute_query(
        """SELECT COUNT(*) as count FROM meeting_participants
           WHERE user_id = %s AND response_status = 'pending'""",
        (current_user['id'],), fetch_one=True
    )
    
    # Total patients
    patients = await execute_query("SELECT COUNT(*) as count FROM patients WHERE is_active = TRUE", fetch_one=True)
    
    # Meetings this week
    week_end = today + timedelta(days=7)
    this_week = await execute_query(
        """SELECT COUNT(*) as count FROM meetings 
           WHERE (organizer_id = %s OR id IN (SELECT meeting_id FROM meeting_participants WHERE user_id = %s))
           AND meeting_date BETWEEN %s AND %s""",
        (current_user['id'], current_user['id'], today, week_end), fetch_one=True
    )
    
    return {
        "upcoming_meetings": upcoming['count'] if upcoming else 0,
        "pending_invites": pending['count'] if pending else 0,
        "total_patients": patients['count'] if patients else 0,
        "meetings_this_week": this_week['count'] if this_week else 0
    }

# ============== Health Check ==============

@api_router.get("/")
async def root():
    return {"message": "Hospital Meeting Scheduler API", "status": "running"}

@api_router.get("/health")
async def health_check():
    try:
        await get_db_pool()
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
    try:
        await get_db_pool()
        logger.info("Database connection established")
    except Exception as e:
        logger.error(f"Database connection failed: {e}")

@app.on_event("shutdown")
async def shutdown():
    global pool
    if pool:
        pool.close()
        await pool.wait_closed()
        logger.info("Database connection closed")
