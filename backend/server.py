from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, Request, Response
from starlette.middleware.cors import CORSMiddleware
import logging
from typing import List, Optional
from pathlib import Path
import uuid
from datetime import datetime, timezone, timedelta, date, time
import secrets
import aiofiles
import httpx
import os
import asyncio

# Core imports (refactored modules)
from core import (
    db, client, serialize_doc,
    hash_password, verify_password, create_jwt_token, get_current_user, generate_secure_password,
    JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_HOURS,
    UPLOAD_DIR, FRONTEND_URL, CORS_ORIGINS, security
)

# Model imports (refactored schemas)
from models import (
    UserCreate, UserLogin, UserResponse, TokenResponse,
    PatientCreate, PatientBase,
    MeetingCreate, MeetingBase,
    ParticipantInvite, ParticipantResponse,
    MeetingPatientCreate, AgendaItemCreate, DecisionLogCreate,
    FeedbackRequest
)

# Utility imports
from utils.email import (
    send_meeting_invite,
    send_response_alert,
    send_meeting_reminder,
    send_daily_digest,
    send_datetime_change_email,
    send_account_setup_email,
    send_password_reset_email,
    send_combined_account_setup_and_invite,
    send_simple_account_setup_email
)
from utils.pdf_generator import generate_meeting_summary_pdf
from utils.holiday_checker import get_holiday_checker, validate_meeting_date
from services.teams_service import get_teams_service

app = FastAPI(title="Hospital Meeting Scheduler API")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== Auth Routes ==============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user: UserCreate):
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    # Generate secure password if not provided
    temp_password = user.password if user.password else generate_secure_password(12)
    password_hash = hash_password(temp_password)
    
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
        "requires_password_change": not user.password,  # True if password was auto-generated
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    user_data = await db.users.find_one({"id": user_id}, {"_id": 0})
    token = create_jwt_token(user_id, user.email)
    
    # ALWAYS send account setup email immediately (with or without meeting_id)
    try:
        if user.meeting_id:
            # If meeting_id provided, try to send email with meeting details
            meeting = await db.meetings.find_one({"id": user.meeting_id}, {"_id": 0})
            if meeting:
                organizer = await db.users.find_one({"id": meeting['organizer_id']}, {"_id": 0})
                if organizer:
                    send_account_setup_email(
                        user=user_data,
                        temp_password=temp_password,
                        meeting=meeting,
                        organizer=organizer,
                        frontend_url=FRONTEND_URL
                    )
                    logger.info(f"Sent account setup email (with meeting details) to {user.email}")
            else:
                # Meeting doesn't exist yet, send simple credentials email
                send_simple_account_setup_email(
                    user=user_data,
                    temp_password=temp_password,
                    frontend_url=FRONTEND_URL
                )
                logger.info(f"Sent simple account setup email (credentials only) to {user.email}")
        else:
            # No meeting_id, send simple credentials email
            send_simple_account_setup_email(
                user=user_data,
                temp_password=temp_password,
                frontend_url=FRONTEND_URL
            )
            logger.info(f"Sent simple account setup email (credentials only) to {user.email}")
    except Exception as e:
        logger.error(f"Failed to send account setup email: {str(e)}")
    
    return TokenResponse(access_token=token, user=UserResponse(**serialize_doc(user_data)))

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not user.get('password_hash'):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_jwt_token(user['id'], user['email'])
    user_response = UserResponse(**serialize_doc(user))
    
    return TokenResponse(
        access_token=token,
        user=user_response,
        requires_password_change=user.get('requires_password_change', False)
    )


@api_router.post("/auth/reset-password")
async def reset_password(data: dict):
    """Reset user password - generates new random password and sends via email"""
    email = data.get('email')
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    
    # Find user by email
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        # Don't reveal if email exists or not for security
        return {"message": "If the email exists, a password reset link has been sent"}
    
    # Generate new secure random password
    new_password = generate_secure_password(12)
    
    # Hash and update password
    password_hash = hash_password(new_password)
    await db.users.update_one(
        {"id": user['id']},
        {"$set": {"password_hash": password_hash, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Send password reset email
    try:
        send_password_reset_email(
            user=user,
            new_password=new_password,
            frontend_url=FRONTEND_URL
        )
        logger.info(f"Password reset email sent to {email}")
    except Exception as e:
        logger.error(f"Failed to send password reset email: {str(e)}")
    
    return {"message": "If the email exists, a password reset email has been sent"}



@api_router.post("/auth/change-password")
async def change_password(data: dict, current_user: dict = Depends(get_current_user)):
    """Change user password with current password verification"""
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    
    if not current_password or not new_password:
        raise HTTPException(status_code=400, detail="Current and new password are required")
    
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")
    
    # Get user from database
    user = await db.users.find_one({"id": current_user['id']}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify current password
    if not verify_password(current_password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    
    # Hash and update new password
    new_password_hash = hash_password(new_password)
    await db.users.update_one(
        {"id": current_user['id']},
        {"$set": {
            "password_hash": new_password_hash,
            "requires_password_change": False,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    logger.info(f"Password changed successfully for user: {current_user['email']}")
    
    return {"message": "Password changed successfully"}


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

@api_router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Update user role - only organizers and admins can do this"""
    # Check if current user is organizer or admin
    if current_user.get('role') not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Only organizers and admins can update user roles")
    
    new_role = data.get('role')
    if not new_role:
        raise HTTPException(status_code=400, detail="Role is required")
    
    valid_roles = ['doctor', 'nurse', 'admin', 'organizer']
    if new_role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}")
    
    # Update user role
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"role": new_role, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    updated_user = await db.users.find_one({"id": user_id}, {"_id": 0})
    return serialize_doc(updated_user)

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, updates: dict, current_user: dict = Depends(get_current_user)):
    # Check if current user is admin/organizer or updating own profile
    is_admin_or_organizer = current_user.get('role') in ['admin', 'organizer']
    is_self_update = current_user['id'] == user_id
    
    if not is_admin_or_organizer and not is_self_update:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Admin/Organizer can update email and specialty, users can update their own info
    if is_admin_or_organizer:
        allowed_fields = ['name', 'email', 'specialty', 'organization', 'phone']
    else:
        allowed_fields = ['name', 'specialty', 'organization', 'phone']
    
    update_data = {k: v for k, v in updates.items() if k in allowed_fields}
    
    # If updating email, check if it's unique
    if 'email' in update_data:
        existing_user = await db.users.find_one({
            "email": update_data['email'],
            "id": {"$ne": user_id}
        }, {"_id": 0})
        
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already in use")
    
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
    
    # Get patient's treatment plans from agenda items (sorted by meeting date DESC - latest first)
    treatment_plans = []
    agenda_items = await db.agenda_items.find({"patient_id": patient_id, "treatment_plan": {"$exists": True, "$ne": ""}}, {"_id": 0}).to_list(1000)
    
    for item in agenda_items:
        # Get the meeting details for this agenda item
        meeting = await db.meetings.find_one({"id": item['meeting_id']}, {"_id": 0, "title": 1, "meeting_date": 1, "id": 1})
        if meeting:
            treatment_plans.append({
                "id": item.get('id'),
                "treatment_plan": item.get('treatment_plan'),
                "diagnosis": item.get('diagnosis'),
                "requested_provider": item.get('requested_provider'),
                "created_at": item.get('created_at'),
                "meeting_id": meeting.get('id'),
                "meeting_title": meeting.get('title'),
                "meeting_date": meeting.get('meeting_date'),
            })
    
    # Sort treatment plans by meeting date (descending - latest first)
    treatment_plans.sort(key=lambda x: x.get('meeting_date', ''), reverse=True)
    
    result = serialize_doc(patient)
    result['meetings'] = [serialize_doc(m) for m in meetings]
    result['files'] = [serialize_doc(f) for f in files]
    result['treatment_plans'] = treatment_plans
    
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
        
        # Add participants array with response_status for dashboard
        participants = await db.meeting_participants.find({"meeting_id": meeting['id']}, {"_id": 0, "user_id": 1, "response_status": 1, "responded_at": 1}).to_list(100)
        meeting['participants'] = participants
        
        # Get response status for my_invites
        if filter_type == "my_invites":
            participant = next((pm for pm in participant_meetings if pm['meeting_id'] == meeting['id']), None)
            meeting['response_status'] = participant.get('response_status') if participant else None
    
    return [serialize_doc(m) for m in meetings]

@api_router.post("/meetings")
async def create_meeting(meeting: MeetingCreate, current_user: dict = Depends(get_current_user)):
    meeting_id = str(uuid.uuid4())
    
    # Validate meeting date against holidays
    try:
        meeting_date_obj = datetime.strptime(meeting.meeting_date, '%Y-%m-%d').date()
        holiday_validation = validate_meeting_date(meeting_date_obj)
        
        if not holiday_validation['valid']:
            holiday_name = holiday_validation['holiday_name']
            country = holiday_validation.get('country', 'USA')
            
            # Format country name for display
            country_display = {
                'USA': 'USA Federal',
                'India': 'Indian National',
                'UK': 'UK Public'
            }.get(country, country)
            
            error_message = f"{country_display} Holiday - No Meeting Schedule. {holiday_name} falls on this date. Please choose a different date."
            
            raise HTTPException(
                status_code=400, 
                detail=error_message
            )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid meeting date format")
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Holiday validation error (proceeding anyway): {str(e)}")
    
    # Calculate duration
    try:
        start_parts = meeting.start_time.split(':')
        end_parts = meeting.end_time.split(':')
        start_minutes = int(start_parts[0]) * 60 + int(start_parts[1])
        end_minutes = int(end_parts[0]) * 60 + int(end_parts[1])
        duration = end_minutes - start_minutes
    except (ValueError, IndexError):
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
        "recurrence_pattern": meeting.recurrence_pattern,
        "recurrence_week_of_month": meeting.recurrence_week_of_month,
        "recurrence_day_of_week": meeting.recurrence_day_of_week,
        "recurrence_day_of_month": meeting.recurrence_day_of_month,
        "status": "scheduled",
        "organizer_id": current_user['id'],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "teams_meeting_id": None,
        "teams_join_url": None
    }
    await db.meetings.insert_one(meeting_doc)
    
    # Auto-generate Teams meeting link
    try:
        teams_service = get_teams_service()
        
        # Parse meeting date and times for Teams
        meeting_datetime = datetime.strptime(f"{meeting.meeting_date} {meeting.start_time}", "%Y-%m-%d %H:%M")
        end_datetime = datetime.strptime(f"{meeting.meeting_date} {meeting.end_time}", "%Y-%m-%d %H:%M")
        
        # Create Teams meeting
        teams_meeting = await teams_service.create_online_meeting(
            subject=f"{meeting.title} - Hospital Meeting",
            start_datetime=meeting_datetime,
            end_datetime=end_datetime
        )
        
        # Update meeting with Teams info
        await db.meetings.update_one(
            {"id": meeting_id},
            {"$set": {
                "teams_meeting_id": teams_meeting['id'],
                "teams_join_url": teams_meeting['joinWebUrl']
            }}
        )
        
        logger.info(f"Teams meeting created for meeting {meeting_id}")
        
    except Exception as e:
        logger.error(f"Failed to create Teams meeting for {meeting_id}: {str(e)}")
        # Continue without Teams link - meeting still created successfully
    
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
            
            # Send email invitation to participant
            try:
                participant_user = await db.users.find_one({"id": participant_id}, {"_id": 0})
                if participant_user and participant_user.get('email'):
                    meeting_data = {
                        "id": meeting_id,
                        "title": meeting.title,
                        "description": meeting.description,
                        "date": meeting.meeting_date,
                        "time": meeting.start_time,
                        "location": meeting.location or "To be announced"
                    }
                    send_meeting_invite(
                        meeting=meeting_data,
                        participant=participant_user,
                        organizer=current_user,
                        frontend_url=FRONTEND_URL
                    )
                    logger.info(f"Sent meeting invite to {participant_user.get('email')}")
            except Exception as e:
                logger.error(f"Failed to send meeting invite: {str(e)}")
    
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
            "patient_id": item.get('patient_id'),
            "mrn": item.get('mrn'),
            "requested_provider": item.get('requested_provider'),
            "diagnosis": item.get('diagnosis'),
            "reason_for_discussion": item.get('reason_for_discussion'),
            "pathology_required": item.get('pathology_required', False),
            "radiology_required": item.get('radiology_required', False),
            "treatment_plan": item.get('treatment_plan', ''),
            "order_index": idx,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
    
    return await get_meeting_detail(meeting_id, current_user)

async def get_meeting_detail(meeting_id: str, current_user: dict):
    meeting = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Get organizer (exclude password_hash)
    organizer = await db.users.find_one({"id": meeting['organizer_id']}, {"_id": 0, "password_hash": 0})
    meeting['organizer'] = serialize_doc(organizer) if organizer else None
    
    # Get participants with user info
    participants = await db.meeting_participants.find({"meeting_id": meeting_id}, {"_id": 0}).to_list(100)
    for p in participants:
        user = await db.users.find_one({"id": p['user_id']}, {"_id": 0, "name": 1, "email": 1, "specialty": 1, "picture": 1})
        if user:
            # Preserve response_status and other participant fields
            response_status = p.get('response_status')
            responded_at = p.get('responded_at')
            p.update(user)
            if response_status:
                p['response_status'] = response_status
            if responded_at:
                p['responded_at'] = responded_at
    meeting['participants'] = [serialize_doc(p) for p in participants]
    
    # Get patients with patient info and approval status
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
        
        # Add "added by" user info
        if mp.get('added_by'):
            added_by_user = await db.users.find_one({"id": mp['added_by']}, {"_id": 0, "name": 1})
            if added_by_user:
                mp['added_by_name'] = added_by_user.get('name')
        
        # Add "approved by" user info
        if mp.get('approved_by'):
            approved_by_user = await db.users.find_one({"id": mp['approved_by']}, {"_id": 0, "name": 1})
            if approved_by_user:
                mp['approved_by_name'] = approved_by_user.get('name')
    
    meeting['patients'] = [serialize_doc(mp) for mp in meeting_patients]
    
    # Get agenda items
    agenda = await db.agenda_items.find({"meeting_id": meeting_id}, {"_id": 0}).sort("order_index", 1).to_list(100)
    for a in agenda:
        if a.get('assigned_to'):
            assigned_user = await db.users.find_one({"id": a['assigned_to']}, {"_id": 0, "name": 1})
            a['assigned_to_name'] = assigned_user.get('name') if assigned_user else None
        if a.get('patient_id'):
            patient = await db.patients.find_one({"id": a['patient_id']}, {"_id": 0, "first_name": 1, "last_name": 1})
            if patient:
                a['patient_name'] = f"{patient.get('first_name', '')} {patient.get('last_name', '')}".strip()
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
    
    # Check if date/time is being changed
    datetime_changed = ('meeting_date' in update_data and update_data['meeting_date'] != meeting.get('meeting_date')) or \
                      ('start_time' in update_data and update_data['start_time'] != meeting.get('start_time'))
    
    # If status is being changed to 'completed', set completed_at timestamp
    if 'status' in update_data and update_data['status'] == 'completed' and meeting.get('status') != 'completed':
        update_data['completed_at'] = datetime.now(timezone.utc).isoformat()
    
    if update_data:
        await db.meetings.update_one({"id": meeting_id}, {"$set": update_data})
    
    # Send email notification if date/time changed
    if datetime_changed:
        try:
            # Get all participants except those who explicitly declined
            participants = await db.meeting_participants.find({
                "meeting_id": meeting_id,
                "response_status": {"$ne": "declined"}  # Send to everyone except declined
            }, {"_id": 0}).to_list(100)
            
            new_date = update_data.get('meeting_date', meeting.get('meeting_date'))
            new_time = update_data.get('start_time', meeting.get('start_time'))
            old_date = meeting.get('meeting_date')
            old_time = meeting.get('start_time')
            
            for participant_doc in participants:
                if participant_doc['user_id'] != current_user['id']:  # Don't email organizer
                    user = await db.users.find_one({"id": participant_doc['user_id']}, {"_id": 0})
                    if user and user.get('email'):
                        try:
                            send_datetime_change_email(
                                meeting_title=update_data.get('title', meeting.get('title', 'Meeting')),
                                participant=user,
                                organizer=current_user,
                                old_date=old_date,
                                old_time=old_time,
                                new_date=new_date,
                                new_time=new_time,
                                meeting_link=f"{FRONTEND_URL}/meetings/{meeting_id}"
                            )
                            logger.info(f"Sent datetime change notification to {user.get('email')}")
                        except Exception as e:
                            logger.error(f"Failed to send datetime change email: {str(e)}")
        except Exception as e:
            logger.error(f"Error sending datetime change notifications: {str(e)}")
    
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

# Generate Meeting Summary PDF
@api_router.get("/meetings/{meeting_id}/summary")
async def generate_meeting_summary(meeting_id: str, current_user: dict = Depends(get_current_user)):
    """
    Generate a comprehensive PDF summary for a meeting including:
    - Meeting details
    - Participants list
    - Patients discussed
    - Agenda items with treatment plans
    - Decisions made
    """
    # Get meeting details
    meeting = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Check if user has access to this meeting
    is_organizer = meeting['organizer_id'] == current_user['id']
    is_participant = await db.meeting_participants.find_one({
        "meeting_id": meeting_id,
        "user_id": current_user['id']
    })
    
    if not is_organizer and not is_participant:
        raise HTTPException(status_code=403, detail="You don't have access to this meeting")
    
    # Get organizer info
    organizer = await db.users.find_one({"id": meeting['organizer_id']}, {"_id": 0, "name": 1})
    meeting['organizer_name'] = organizer.get('name', 'Unknown') if organizer else 'Unknown'
    
    # Get participants
    participants_cursor = db.meeting_participants.find({"meeting_id": meeting_id}, {"_id": 0})
    participants_list = await participants_cursor.to_list(length=None)
    
    participants = []
    for p in participants_list:
        user = await db.users.find_one({"id": p['user_id']}, {"_id": 0, "name": 1, "role": 1, "specialty": 1})
        if user:
            participants.append({
                "name": user.get('name', 'Unknown'),
                "role": user.get('role', 'Unknown'),
                "specialty": user.get('specialty', 'N/A'),
                "response_status": p.get('response_status', 'pending')
            })
    
    # Get patients
    patients_cursor = db.meeting_patients.find({"meeting_id": meeting_id}, {"_id": 0})
    meeting_patients = await patients_cursor.to_list(length=None)
    
    patients = []
    for mp in meeting_patients:
        patient = await db.patients.find_one({"id": mp['patient_id']}, {"_id": 0})
        if patient:
            # Calculate age
            if patient.get('date_of_birth'):
                dob = datetime.fromisoformat(patient['date_of_birth'].replace('Z', '+00:00'))
                today = datetime.now(timezone.utc)
                age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
                patient['age'] = age
            patients.append(patient)
    
    # Get agenda items with treatment plans
    agenda_cursor = db.agenda_items.find({"meeting_id": meeting_id}, {"_id": 0}).sort("order", 1)
    agenda_items = await agenda_cursor.to_list(length=None)
    
    for item in agenda_items:
        if item.get('patient_id'):
            patient = await db.patients.find_one({"id": item['patient_id']}, {"_id": 0, "first_name": 1, "last_name": 1, "patient_id_number": 1})
            if patient:
                item['patient_name'] = f"{patient.get('first_name', '')} {patient.get('last_name', '')}"
                item['patient_mrn'] = patient.get('patient_id_number', '')
    
    # Get decisions
    decisions_cursor = db.meeting_decisions.find({"meeting_id": meeting_id}, {"_id": 0})
    decisions = await decisions_cursor.to_list(length=None)
    
    for decision in decisions:
        if decision.get('created_by'):
            user = await db.users.find_one({"id": decision['created_by']}, {"_id": 0, "name": 1})
            if user:
                decision['decision_maker'] = user.get('name', 'Unknown')
        
        if decision.get('created_at'):
            decision['created_at'] = decision['created_at'].strftime('%B %d, %Y at %I:%M %p')
    
    # Generate PDF
    try:
        pdf_bytes = generate_meeting_summary_pdf(meeting, participants, patients, agenda_items, decisions)
        
        # Create filename: Summary_MeetingTitle_Date_Time.pdf
        # Format: Summary_Weekly_Case_Review_2024-03-25_14-30.pdf
        meeting_title = meeting.get('title', 'Meeting').replace(' ', '_')
        meeting_date = meeting.get('meeting_date', datetime.now().strftime('%Y-%m-%d'))
        meeting_time = meeting.get('start_time', '00:00')[:5].replace(':', '-')  # Convert HH:MM to HH-MM
        
        filename = f"Summary_{meeting_title}_{meeting_date}_{meeting_time}.pdf"
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    except Exception as e:
        logger.error(f"Error generating PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")

# ============== Meeting Participants Routes ==============

@api_router.post("/meetings/{meeting_id}/participants")
async def add_participant(meeting_id: str, invite: ParticipantInvite, current_user: dict = Depends(get_current_user)):
    # Check if meeting exists
    meeting = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Check permissions - both organizer AND participants can add new participants
    is_organizer = meeting['organizer_id'] == current_user['id']
    existing_participant = await db.meeting_participants.find_one({
        "meeting_id": meeting_id, 
        "user_id": current_user['id']
    }, {"_id": 0})
    is_participant = existing_participant is not None
    
    if not is_organizer and not is_participant:
        raise HTTPException(status_code=403, detail="Only organizer or existing participants can add new participants")
    
    # Check if user to be added already exists as participant
    existing = await db.meeting_participants.find_one({"meeting_id": meeting_id, "user_id": invite.user_id})
    if existing:
        raise HTTPException(status_code=400, detail="User already a participant")
    
    await db.meeting_participants.insert_one({
        "id": str(uuid.uuid4()),
        "meeting_id": meeting_id,
        "user_id": invite.user_id,
        "role": invite.role,
        "response_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "added_by": current_user['id']  # Track who added this participant
    })
    
    # Send email invite to newly added participant
    try:
        # Get participant user details
        participant_user = await db.users.find_one({"id": invite.user_id}, {"_id": 0})
        # Get organizer details
        organizer = await db.users.find_one({"id": meeting['organizer_id']}, {"_id": 0})
        
        if participant_user and participant_user.get('email') and organizer:
            meeting_data = {
                "id": meeting_id,
                "title": meeting.get('title'),
                "description": meeting.get('description'),
                "date": meeting.get('meeting_date'),
                "time": meeting.get('start_time'),
                "location": meeting.get('location') or "To be announced"
            }
            send_meeting_invite(
                meeting=meeting_data,
                participant=participant_user,
                organizer=organizer,
                frontend_url=FRONTEND_URL
            )
            logger.info(f"Sent meeting invite to newly added participant: {participant_user.get('email')}")
    except Exception as e:
        logger.error(f"Failed to send meeting invite to newly added participant: {str(e)}")
    
    return {"message": "Participant added successfully"}

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

@api_router.put("/meetings/{meeting_id}/participants/{user_id}/response")
async def update_participant_response(meeting_id: str, user_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    # Only the participant themselves can update their response
    if user_id != current_user['id']:
        raise HTTPException(status_code=403, detail="You can only update your own response")
    
    response_status = data.get('response_status')
    if response_status not in ['accepted', 'maybe', 'declined']:
        raise HTTPException(status_code=400, detail="Invalid response status")
    
    result = await db.meeting_participants.update_one(
        {"meeting_id": meeting_id, "user_id": user_id},
        {"$set": {"response_status": response_status, "responded_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    # Send response alert to organizer
    try:
        meeting = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
        if meeting:
            organizer = await db.users.find_one({"id": meeting['organizer_id']}, {"_id": 0})
            if organizer and organizer.get('email') and organizer['id'] != current_user['id']:
                meeting_data = {
                    "id": meeting_id,
                    "title": meeting.get('title', 'Meeting'),
                    "date": meeting.get('meeting_date', 'TBD'),
                    "time": meeting.get('start_time', 'TBD')
                }
                send_response_alert(
                    meeting=meeting_data,
                    participant=current_user,
                    organizer=organizer,
                    response_status=response_status,
                    frontend_url=FRONTEND_URL
                )
                logger.info(f"Sent response alert to organizer {organizer.get('email')}")
    except Exception as e:
        logger.error(f"Failed to send response alert: {str(e)}")
    
    return {"message": f"Response updated to {response_status}"}

# ============== Meeting Patients Routes ==============

@api_router.post("/meetings/{meeting_id}/patients")
async def add_patient_to_meeting(meeting_id: str, patient_data: MeetingPatientCreate, current_user: dict = Depends(get_current_user)):
    # Check if meeting exists
    meeting = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Check permissions - both organizer AND participants can add patients
    is_organizer = meeting['organizer_id'] == current_user['id']
    existing_participant = await db.meeting_participants.find_one({
        "meeting_id": meeting_id, 
        "user_id": current_user['id']
    }, {"_id": 0})
    is_participant = existing_participant is not None
    
    if not is_organizer and not is_participant:
        raise HTTPException(status_code=403, detail="Only organizer or participants can add patients")
    
    existing = await db.meeting_patients.find_one({"meeting_id": meeting_id, "patient_id": patient_data.patient_id})
    if existing:
        raise HTTPException(status_code=400, detail="Patient already in meeting")
    
    # Determine approval status
    # Organizer's additions are auto-approved, others are pending
    approval_status = "approved" if is_organizer else "pending"
    
    mp_id = str(uuid.uuid4())
    meeting_patient_doc = {
        "id": mp_id,
        "meeting_id": meeting_id,
        "patient_id": patient_data.patient_id,
        "clinical_question": patient_data.clinical_question,
        "reason_for_discussion": patient_data.reason_for_discussion,
        "status": patient_data.status,
        "added_by": current_user['id'],
        "added_by_name": current_user['name'],
        "approval_status": approval_status,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Add approval fields if auto-approved
    if approval_status == "approved":
        meeting_patient_doc["approved_by"] = current_user['id']
        meeting_patient_doc["approved_by_name"] = current_user['name']
        meeting_patient_doc["approved_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.meeting_patients.insert_one(meeting_patient_doc)
    
    # Send notification to organizer if added by participant
    if not is_organizer:
        try:
            # Get organizer details
            organizer = await db.users.find_one({"id": meeting['organizer_id']}, {"_id": 0})
            patient = await db.patients.find_one({"id": patient_data.patient_id}, {"_id": 0})
            
            if organizer and patient:
                # Send email notification
                from utils.email import send_email
                
                patient_name = f"{patient.get('first_name', '')} {patient.get('last_name', '')}".strip()
                
                email_body = f"""
                <h2>New Patient Added to Meeting - Approval Required</h2>
                <p>Hello {organizer['name']},</p>
                <p><strong>{current_user['name']}</strong> has added a patient to the meeting: <strong>{meeting['title']}</strong></p>
                
                <h3>Patient Details:</h3>
                <ul>
                    <li><strong>Patient Name:</strong> {patient_name}</li>
                    <li><strong>Patient ID:</strong> {patient.get('patient_id_number', 'N/A')}</li>
                    <li><strong>Reason for Discussion:</strong> {patient_data.reason_for_discussion or 'N/A'}</li>
                </ul>
                
                <h3>Meeting Details:</h3>
                <ul>
                    <li><strong>Meeting:</strong> {meeting['title']}</li>
                    <li><strong>Date:</strong> {meeting['meeting_date']}</li>
                    <li><strong>Time:</strong> {meeting['start_time']}</li>
                </ul>
                
                <p><strong>Action Required:</strong> Please review and approve this patient addition before the meeting starts.</p>
                <p><a href="{FRONTEND_URL}/meetings/{meeting_id}" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Meeting & Approve</a></p>
                
                <p>Best regards,<br>Hospital Meeting Scheduler</p>
                """
                
                send_email(
                    to_email=organizer['email'],
                    subject=f"Patient Approval Required - {meeting['title']}",
                    body=email_body
                )
                logger.info(f"Sent patient approval notification to organizer: {organizer['email']}")
        except Exception as e:
            logger.error(f"Failed to send patient approval notification: {str(e)}")
    
    response_data = {
        "id": mp_id,
        "message": "Patient added to meeting",
        "approval_status": approval_status
    }
    
    if approval_status == "pending":
        response_data["message"] = "Patient added to meeting. Awaiting organizer approval."
    
    return response_data

@api_router.delete("/meetings/{meeting_id}/patients/{patient_id}")
async def remove_patient_from_meeting(meeting_id: str, patient_id: str, current_user: dict = Depends(get_current_user)):
    await db.meeting_patients.delete_one({"meeting_id": meeting_id, "patient_id": patient_id})
    return {"message": "Patient removed from meeting"}


@api_router.post("/meetings/{meeting_id}/patients/{patient_id}/approve")
async def approve_patient_addition(meeting_id: str, patient_id: str, current_user: dict = Depends(get_current_user)):
    """
    Approve a pending patient addition (organizer only)
    """
    # Check if meeting exists
    meeting = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Only organizer can approve
    if meeting['organizer_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Only organizer can approve patient additions")
    
    # Find the meeting patient record
    meeting_patient = await db.meeting_patients.find_one({
        "meeting_id": meeting_id,
        "patient_id": patient_id
    }, {"_id": 0})
    
    if not meeting_patient:
        raise HTTPException(status_code=404, detail="Patient not found in this meeting")
    
    # Check if already approved
    if meeting_patient.get('approval_status') == 'approved':
        return {"message": "Patient already approved"}
    
    # Update approval status
    await db.meeting_patients.update_one(
        {"meeting_id": meeting_id, "patient_id": patient_id},
        {"$set": {
            "approval_status": "approved",
            "approved_by": current_user['id'],
            "approved_by_name": current_user['name'],
            "approved_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Send notification to the person who added the patient
    try:
        added_by_id = meeting_patient.get('added_by')
        if added_by_id and added_by_id != current_user['id']:
            added_by_user = await db.users.find_one({"id": added_by_id}, {"_id": 0})
            patient = await db.patients.find_one({"id": patient_id}, {"_id": 0})
            
            if added_by_user and patient:
                from utils.email import send_email
                
                patient_name = f"{patient.get('first_name', '')} {patient.get('last_name', '')}".strip()
                
                email_body = f"""
                <h2>Patient Addition Approved</h2>
                <p>Hello {added_by_user['name']},</p>
                <p><strong>{current_user['name']}</strong> (Organizer) has approved the patient you added to the meeting.</p>
                
                <h3>Patient Details:</h3>
                <ul>
                    <li><strong>Patient Name:</strong> {patient_name}</li>
                    <li><strong>Patient ID:</strong> {patient.get('patient_id_number', 'N/A')}</li>
                </ul>
                
                <h3>Meeting Details:</h3>
                <ul>
                    <li><strong>Meeting:</strong> {meeting['title']}</li>
                    <li><strong>Date:</strong> {meeting['meeting_date']}</li>
                    <li><strong>Time:</strong> {meeting['start_time']}</li>
                </ul>
                
                <p>The patient can now be fully discussed in the meeting.</p>
                <p><a href="{FRONTEND_URL}/meetings/{meeting_id}" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Meeting</a></p>
                
                <p>Best regards,<br>Hospital Meeting Scheduler</p>
                """
                
                send_email(
                    to_email=added_by_user['email'],
                    subject=f"Patient Approved - {meeting['title']}",
                    body=email_body
                )
                logger.info(f"Sent approval confirmation to {added_by_user['email']}")
    except Exception as e:
        logger.error(f"Failed to send approval confirmation: {str(e)}")
    
    return {
        "message": "Patient approved successfully",
        "approved_by": current_user['name'],
        "approved_at": datetime.now(timezone.utc).isoformat()
    }


# ============== Agenda Routes ==============

@api_router.post("/meetings/{meeting_id}/agenda")
async def add_agenda_item(meeting_id: str, item: AgendaItemCreate, current_user: dict = Depends(get_current_user)):
    # Check if meeting exists
    meeting = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Check permissions - both organizer AND participants can add agenda items
    is_organizer = meeting['organizer_id'] == current_user['id']
    existing_participant = await db.meeting_participants.find_one({
        "meeting_id": meeting_id, 
        "user_id": current_user['id']
    }, {"_id": 0})
    is_participant = existing_participant is not None
    
    if not is_organizer and not is_participant:
        raise HTTPException(status_code=403, detail="Only organizer or participants can add agenda items")
    
    # Check if patient already has an agenda item in this meeting
    existing = await db.agenda_items.find_one({
        "meeting_id": meeting_id,
        "patient_id": item.patient_id
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="This patient already has an agenda item in this meeting")
    
    item_id = str(uuid.uuid4())
    
    # Get current max order_index
    max_order = await db.agenda_items.find({"meeting_id": meeting_id}).sort("order_index", -1).limit(1).to_list(1)
    order_index = (max_order[0]['order_index'] + 1) if max_order else 0
    
    await db.agenda_items.insert_one({
        "id": item_id,
        "meeting_id": meeting_id,
        "patient_id": item.patient_id,
        "mrn": item.mrn,
        "requested_provider": item.requested_provider,
        "diagnosis": item.diagnosis,
        "reason_for_discussion": item.reason_for_discussion,
        "pathology_required": item.pathology_required,
        "radiology_required": item.radiology_required,
        "treatment_plan": item.treatment_plan or '',
        "order_index": order_index,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "added_by": current_user['id']
    })
    
    return {"id": item_id, "message": "Agenda item added"}

@api_router.put("/meetings/{meeting_id}/agenda/{item_id}")
async def update_agenda_item(meeting_id: str, item_id: str, updates: dict, current_user: dict = Depends(get_current_user)):
    allowed_fields = ['mrn', 'requested_provider', 'diagnosis', 'reason_for_discussion',
                      'pathology_required', 'radiology_required', 'treatment_plan', 'order_index']
    update_data = {k: v for k, v in updates.items() if k in allowed_fields}
    
    if update_data:
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        await db.agenda_items.update_one({"id": item_id}, {"$set": update_data})
    
    item = await db.agenda_items.find_one({"id": item_id}, {"_id": 0})
    return serialize_doc(item)

@api_router.put("/meetings/{meeting_id}/agenda/{item_id}/treatment-plan")
async def update_treatment_plan(meeting_id: str, item_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Update treatment plan during meeting - accessible to all participants"""
    
    # Get meeting details to check completion status and 7-day rule
    meeting = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Check if meeting is completed and if 7-day edit window has passed
    if meeting.get('status') == 'completed' and meeting.get('completed_at'):
        completed_at = datetime.fromisoformat(meeting['completed_at'].replace('Z', '+00:00'))
        days_since_completion = (datetime.now(timezone.utc) - completed_at).days
        
        if days_since_completion > 7:
            raise HTTPException(
                status_code=403, 
                detail=f"Treatment plan editing is disabled. The 7-day edit window expired {days_since_completion - 7} days ago."
            )
    
    treatment_plan = data.get('treatment_plan', '')
    
    await db.agenda_items.update_one(
        {"id": item_id, "meeting_id": meeting_id},
        {"$set": {
            "treatment_plan": treatment_plan,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "last_updated_by": current_user['id']
        }}
    )
    
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

@api_router.delete("/meetings/{meeting_id}/decisions/{decision_id}")
async def delete_decision(meeting_id: str, decision_id: str, current_user: dict = Depends(get_current_user)):
    await db.decision_logs.delete_one({"id": decision_id, "meeting_id": meeting_id})
    return {"message": "Decision deleted"}

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

@api_router.post("/meetings/{meeting_id}/generate-teams-link")
async def generate_teams_link(meeting_id: str, current_user: dict = Depends(get_current_user)):
    """Generate or regenerate Microsoft Teams meeting link for an existing meeting"""
    
    # Get meeting
    meeting = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Check if user has permission (organizer or participant)
    is_organizer = meeting['organizer_id'] == current_user['id']
    participant = await db.meeting_participants.find_one({
        "meeting_id": meeting_id,
        "user_id": current_user['id']
    }, {"_id": 0})
    
    if not is_organizer and not participant:
        raise HTTPException(status_code=403, detail="You don't have permission to generate Teams link for this meeting")
    
    try:
        try:
            teams_service = get_teams_service()
        except ValueError as cfg_err:
            # Credentials not configured in environment
            logger.error(f"Teams not configured: {cfg_err}")
            raise HTTPException(
                status_code=503,
                detail=(
                    "Microsoft Teams integration is not configured on this server. "
                    "An administrator needs to set GRAPH_CLIENT_ID, GRAPH_TENANT_ID, "
                    "GRAPH_CLIENT_SECRET (and optionally GRAPH_USER_ID) in the backend "
                    "environment and restart the backend container."
                )
            )

        # Parse meeting date and times
        meeting_datetime = datetime.strptime(f"{meeting['meeting_date']} {meeting['start_time']}", "%Y-%m-%d %H:%M")
        end_datetime = datetime.strptime(f"{meeting['meeting_date']} {meeting['end_time']}", "%Y-%m-%d %H:%M")

        # Create Teams meeting
        teams_meeting = await teams_service.create_online_meeting(
            subject=f"{meeting['title']} - Hospital Meeting",
            start_datetime=meeting_datetime,
            end_datetime=end_datetime
        )

        # Update meeting with Teams info
        await db.meetings.update_one(
            {"id": meeting_id},
            {"$set": {
                "teams_meeting_id": teams_meeting['id'],
                "teams_join_url": teams_meeting['joinWebUrl'],
                "teams_generated_at": datetime.now(timezone.utc).isoformat()
            }}
        )

        logger.info(f"Teams link generated for meeting {meeting_id} by user {current_user['id']}")

        return {
            "success": True,
            "teams_join_url": teams_meeting['joinWebUrl'],
            "message": "Teams meeting link generated successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate Teams link for meeting {meeting_id}: {str(e)}")
        raise HTTPException(
            status_code=502,
            detail=f"Failed to generate Teams meeting link: {str(e)}"
        )


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
    except (FileNotFoundError, OSError):
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

# ============== Feedback Routes ==============

@api_router.post("/feedback")
async def submit_feedback(
    feedback: FeedbackRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Submit feedback to the application owner
    Types: feature_request, bug_report, enhancement
    """
    # Get owner email from environment
    owner_email = os.environ.get('OWNER_EMAIL', 'Niraj.K.Vishwakarma@gmail.com')
    
    # Create feedback record in database
    feedback_id = str(uuid.uuid4())
    feedback_data = {
        "id": feedback_id,
        "user_id": current_user['id'],
        "user_name": current_user['name'],
        "user_email": current_user['email'],
        "user_role": current_user['role'],
        "feedback_type": feedback.feedback_type,
        "subject": feedback.subject,
        "message": feedback.message,
        "status": "pending",
        "created_at": datetime.now(timezone.utc),
    }
    
    await db.feedback.insert_one(feedback_data)
    
    # Send email to owner
    try:
        from utils.email import send_email
        
        # Format feedback type for display
        type_display = feedback.feedback_type.replace('_', ' ').title()
        
        email_body = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .feedback-type {{ display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 10px 0; }}
                .feature {{ background: #3b6658; color: white; }}
                .bug {{ background: #dc2626; color: white; }}
                .enhancement {{ background: #694e20; color: white; }}
                .info-box {{ background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #667eea; }}
                .message-box {{ background: white; padding: 20px; border-radius: 8px; margin: 15px 0; border: 1px solid #ddd; }}
                .label {{ font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }}
                .value {{ font-size: 14px; color: #333; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0;">🔔 New Feedback Received</h1>
                    <p style="margin: 10px 0 0 0; opacity: 0.9;">Hospital Meeting App</p>
                </div>
                <div class="content">
                    <span class="feedback-type {feedback.feedback_type.split('_')[0]}">{type_display}</span>
                    
                    <div class="info-box">
                        <div class="label">From</div>
                        <div class="value">{current_user['name']} ({current_user['role'].title()})</div>
                        <div class="value" style="color: #666; font-size: 12px; margin-top: 5px;">{current_user['email']}</div>
                    </div>
                    
                    <div class="info-box">
                        <div class="label">Subject</div>
                        <div class="value" style="font-size: 16px; font-weight: bold;">{feedback.subject}</div>
                    </div>
                    
                    <div class="message-box">
                        <div class="label">Message</div>
                        <div class="value" style="white-space: pre-wrap; margin-top: 10px;">{feedback.message}</div>
                    </div>
                    
                    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 12px;">
                        <p>Submitted on {datetime.now(timezone.utc).strftime('%B %d, %Y at %I:%M %p UTC')}</p>
                        <p>Feedback ID: {feedback_id}</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        send_email(
            to_email=owner_email,
            subject=f"[{type_display}] {feedback.subject}",
            html_content=email_body
        )
        
        logger.info(f"Feedback email sent to {owner_email} from {current_user['email']}")
        
    except Exception as e:
        logger.error(f"Failed to send feedback email: {str(e)}")
        # Don't fail the request if email fails
    
    return {
        "message": "Feedback submitted successfully",
        "feedback_id": feedback_id
    }

@api_router.get("/holidays/status")
async def get_holiday_status():
    """Get current holiday enforcement status"""
    try:
        checker = get_holiday_checker()
        
        return {
            "enforcement_enabled": checker.is_enforcement_enabled(),
            "active_country": checker.active_country,
            "config_version": checker.config.get('holiday_calendar_version', '1.0'),
            "message": "Holiday enforcement is currently " + ("enabled" if checker.is_enforcement_enabled() else "disabled")
        }
    except Exception as e:
        logger.error(f"Error getting holiday status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting holiday status: {str(e)}")


@api_router.put("/holidays/toggle-enforcement")
async def toggle_holiday_enforcement(
    enabled: bool,
    current_user: dict = Depends(get_current_user)
):
    """
    Enable or disable holiday enforcement (Organizer/Admin only)
    
    Args:
        enabled: True to enable holiday enforcement, False to disable
    """
    # Check if user is organizer or admin
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Only organizers and admins can change holiday settings")
    
    try:
        checker = get_holiday_checker()
        success = checker.set_enforcement_enabled(enabled)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update holiday enforcement setting")
        
        status = "enabled" if enabled else "disabled"
        logger.info(f"Holiday enforcement {status} by {current_user['email']}")
        
        return {
            "message": f"Holiday enforcement has been {status}",
            "enforcement_enabled": enabled,
            "changed_by": current_user['email']
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling holiday enforcement: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error toggling holiday enforcement: {str(e)}")


# ============== Holiday Calendar Endpoints ==============

@api_router.get("/holidays/countries")
async def get_available_countries():
    """Get list of available countries in holiday calendar"""
    try:
        checker = get_holiday_checker()
        countries = checker.get_available_countries()
        active = checker.active_country
        
        # Get country details
        countries_info = []
        for country_code in countries:
            info = checker.get_country_info(country_code)
            countries_info.append({
                "code": country_code,
                "name": info.get("country_name", country_code),
                "timezone": info.get("timezone", ""),
                "is_active": country_code == active
            })
        
        return {
            "countries": countries_info,
            "active_country": active
        }
    except Exception as e:
        logger.error(f"Error getting countries: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error loading country list: {str(e)}")


@api_router.get("/holidays/{country_code}")
async def get_country_holidays(country_code: str, year: Optional[int] = None):
    """Get holidays for a specific country and year"""
    try:
        checker = get_holiday_checker()
        
        # Validate country exists
        if country_code not in checker.get_available_countries():
            raise HTTPException(status_code=404, detail=f"Country '{country_code}' not found in holiday calendar")
        
        country_info = checker.get_country_info(country_code)
        
        # If year not provided, use current year
        if year is None:
            year = datetime.now().year
        
        holidays = country_info.get('holidays', {}).get(str(year), [])
        
        return {
            "country_code": country_code,
            "country_name": country_info.get('country_name', country_code),
            "year": year,
            "holidays": holidays,
            "total_count": len(holidays)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting holidays: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error loading holidays: {str(e)}")


@api_router.post("/holidays/validate")
async def validate_date(
    meeting_date: str,
    country_code: Optional[str] = None
):
    """
    Validate if a date is available for scheduling (not a holiday)
    
    Args:
        meeting_date: Date in YYYY-MM-DD format
        country_code: Optional country code (uses active country if not provided)
    
    Returns:
        Validation result with holiday information if applicable
    """
    try:
        # Parse date
        try:
            check_date = datetime.strptime(meeting_date, '%Y-%m-%d').date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
        # Validate against holidays
        result = validate_meeting_date(check_date, country_code)
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating date: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error validating date: {str(e)}")


@api_router.get("/holidays/upcoming")
async def get_upcoming_holidays(
    days: int = 30,
    country_code: Optional[str] = None
):
    """
    Get holidays in the next N days
    
    Args:
        days: Number of days to look ahead (default 30, max 365)
        country_code: Optional country code (uses active country if not provided)
    """
    try:
        # Validate days parameter
        if days < 1 or days > 365:
            raise HTTPException(status_code=400, detail="Days must be between 1 and 365")
        
        checker = get_holiday_checker()
        
        # Use provided country or active country
        if country_code and country_code not in checker.get_available_countries():
            raise HTTPException(status_code=404, detail=f"Country '{country_code}' not found")
        
        holidays = checker.get_upcoming_holidays(days, country_code)
        
        return {
            "country": country_code or checker.active_country,
            "days_ahead": days,
            "holidays": holidays,
            "count": len(holidays)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting upcoming holidays: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting upcoming holidays: {str(e)}")


@api_router.put("/holidays/set-country")
async def set_active_country(
    country_code: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Change the active country for holiday checking (Organizer/Admin only)
    
    Args:
        country_code: Country code to set as active
    """
    # Check if user is organizer or admin
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Only organizers and admins can change holiday settings")
    
    try:
        checker = get_holiday_checker()
        
        if country_code not in checker.get_available_countries():
            raise HTTPException(status_code=404, detail=f"Country '{country_code}' not found")
        
        # Update config file
        import json
        with open(checker.config_path, 'r') as f:
            config = json.load(f)
        
        config['active_country'] = country_code
        
        with open(checker.config_path, 'w') as f:
            json.dump(config, f, indent=2)
        
        # Reload checker
        checker.reload_config()
        
        logger.info(f"Active country changed to {country_code} by {current_user['email']}")
        
        return {
            "message": f"Active country set to {country_code}",
            "active_country": country_code
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error setting active country: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error setting active country: {str(e)}")


# ============== Health Check ==============

@api_router.get("/")
async def root():
    return {"message": "Hospital Meeting Scheduler API", "status": "running"}

@api_router.get("/health")
async def health_check_api():
    try:
        await db.command('ping')
        return {"status": "healthy", "database": "connected"}
    except Exception:
        return {"status": "unhealthy", "database": "disconnected"}

# Include router and configure middleware
# Health check endpoint for Docker
@app.get("/api/health")
async def health_check():
    try:
        # Check database connection
        await db.command("ping")
        return {
            "status": "healthy",
            "service": "Hospital Meeting Scheduler API",
            "database": "connected",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "service": "Hospital Meeting Scheduler API",
            "database": "disconnected",
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=CORS_ORIGINS,
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

    # Start background email reminder scheduler (1h before meeting)
    from scheduler import reminder_loop
    app.state.reminder_task = asyncio.create_task(reminder_loop(db))
    logger.info("Email reminder background task scheduled")

@app.on_event("shutdown")
async def shutdown():
    # Cancel background reminder task cleanly
    task = getattr(app.state, "reminder_task", None)
    if task is not None:
        task.cancel()
        try:
            await task
        except (asyncio.CancelledError, Exception):
            pass
    client.close()
    logger.info("Database connection closed")
