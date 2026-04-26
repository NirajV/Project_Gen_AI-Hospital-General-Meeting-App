"""
Pydantic Models and Schemas
"""
from pydantic import BaseModel, EmailStr
from typing import List, Optional


# ============== User Models ==============

class UserBase(BaseModel):
    email: EmailStr
    name: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    specialty: Optional[str] = None
    organization: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = "doctor"
    language: Optional[str] = "en-US"
    country: Optional[str] = "US"
    timezone: Optional[str] = "America/New_York"


class UserCreate(UserBase):
    password: Optional[str] = None
    meeting_id: Optional[str] = None


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
    requires_password_change: bool = False


# ============== Patient Models ==============

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


# ============== Meeting Models ==============

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
    recurrence_pattern: Optional[str] = None
    recurrence_week_of_month: Optional[str] = None
    recurrence_day_of_week: Optional[str] = None
    recurrence_day_of_month: Optional[int] = None
    completed_at: Optional[str] = None


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
    patient_id: str
    mrn: str
    requested_provider: str
    diagnosis: str
    reason_for_discussion: str
    pathology_required: bool
    radiology_required: bool
    treatment_plan: Optional[str] = None


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


class FeedbackRequest(BaseModel):
    feedback_type: str
    subject: str
    message: str
