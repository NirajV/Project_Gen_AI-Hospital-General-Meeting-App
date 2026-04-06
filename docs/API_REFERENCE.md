# 🔌 API Reference

> Complete REST API documentation for MedMeet Hospital Case Meeting Scheduler

Base URL: `https://hospital-case-room.preview.emergentagent.com/api`  
Local: `http://localhost:8001/api`

---

## 📋 Table of Contents

1. [Authentication](#authentication)
2. [Users & Participants](#users--participants)
3. [Meetings](#meetings)
4. [Patients](#patients)
5. [Dashboard](#dashboard)
6. [Feedback](#feedback)
7. [Health Check](#health-check)
8. [Error Responses](#error-responses)

---

## 🔐 Authentication

All authenticated endpoints require a Bearer token in the Authorization header:

```bash
Authorization: Bearer <your_jwt_token>
```

### Register User

```http
POST /api/auth/register
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "doctor@hospital.com",
  "name": "Dr. John Doe",
  "password": "securepassword123",
  "specialty": "Cardiology",
  "organization": "City Hospital",
  "phone": "+1-555-0100",
  "role": "doctor"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "id": "uuid-here",
    "email": "doctor@hospital.com",
    "name": "Dr. John Doe",
    "specialty": "Cardiology",
    "organization": "City Hospital",
    "phone": "+1-555-0100",
    "role": "doctor",
    "is_active": true,
    "created_at": "2026-04-06T12:00:00Z"
  },
  "requires_password_change": false
}
```

---

### Login

```http
POST /api/auth/login
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "organizer@hospital.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": { ... },
  "requires_password_change": false
}
```

---

### Get Current User

```http
GET /api/auth/me
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": "uuid",
  "email": "user@hospital.com",
  "name": "Dr. User",
  "specialty": "Oncology",
  "organization": "Hospital",
  "phone": "+1-555-0101",
  "role": "doctor",
  "is_active": true
}
```

---

### Process OAuth Session

```http
POST /api/auth/session
Content-Type: application/json
```

**Request Body:**
```json
{
  "session_id": "emergent-session-id-from-callback"
}
```

**Response (200 OK):**
```json
{
  "user": { ... },
  "session_token": "jwt-token-here"
}
```

---

### Change Password

```http
POST /api/auth/change-password
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "current_password": "oldpassword",
  "new_password": "newsecurepassword"
}
```

**Response (200 OK):**
```json
{
  "message": "Password changed successfully"
}
```

---

## 👥 Users & Participants

### List All Users

```http
GET /api/users
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
[
  {
    "id": "uuid",
    "email": "doctor@hospital.com",
    "name": "Dr. John Doe",
    "specialty": "Cardiology",
    "role": "doctor",
    "phone": "+1-555-0100",
    "is_active": true
  }
]
```

---

### Update User Role (Organizer/Admin Only)

```http
PUT /api/users/{user_id}/role
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "role": "organizer"
}
```

**Allowed Roles:** `doctor`, `nurse`, `admin`, `organizer`

**Response (200 OK):**
```json
{
  "id": "uuid",
  "email": "user@hospital.com",
  "name": "Dr. User",
  "role": "organizer",
  "updated_at": "2026-04-06T12:00:00Z"
}
```

---

## 🗓️ Meetings

### List Meetings

```http
GET /api/meetings
Authorization: Bearer <token>
```

**Query Parameters:**
- `filter_type` (optional): `upcoming`, `past`, `all`
- `status` (optional): `scheduled`, `in_progress`, `completed`, `cancelled`

**Response (200 OK):**
```json
[
  {
    "id": "meeting-uuid",
    "title": "Cardiology Case Review",
    "description": "Weekly team meeting",
    "meeting_date": "2026-04-10",
    "start_time": "10:00:00",
    "end_time": "11:00:00",
    "meeting_type": "video",
    "video_link": "https://meet.google.com/abc-defg-hij",
    "location": null,
    "status": "scheduled",
    "organizer_id": "organizer-uuid",
    "created_at": "2026-04-05T12:00:00Z"
  }
]
```

---

### Get Meeting Details

```http
GET /api/meetings/{meeting_id}
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": "meeting-uuid",
  "title": "Cardiology Case Review",
  "description": "Weekly team meeting",
  "meeting_date": "2026-04-10",
  "start_time": "10:00:00",
  "end_time": "11:00:00",
  "duration_minutes": 60,
  "meeting_type": "video",
  "video_link": "https://meet.google.com/abc",
  "location": null,
  "status": "scheduled",
  "organizer": {
    "id": "uuid",
    "name": "Dr. Organizer",
    "email": "organizer@hospital.com"
  },
  "participants": [
    {
      "user_id": "uuid",
      "name": "Dr. Participant",
      "role": "doctor",
      "response_status": "accepted",
      "added_at": "2026-04-05T12:00:00Z"
    }
  ],
  "patients": [
    {
      "patient_id": "uuid",
      "first_name": "John",
      "last_name": "Doe",
      "patient_id_number": "MRN12345",
      "primary_diagnosis": "CAD",
      "clinical_question": "Treatment plan review"
    }
  ],
  "agenda_items": [
    {
      "id": "uuid",
      "title": "Patient Review",
      "description": "Discuss treatment options",
      "order_index": 1,
      "estimated_duration_minutes": 30
    }
  ],
  "files": [],
  "decisions": []
}
```

---

### Create Meeting

```http
POST /api/meetings
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Oncology Tumor Board",
  "description": "Monthly review of complex cases",
  "meeting_date": "2026-04-15",
  "start_time": "14:00:00",
  "end_time": "16:00:00",
  "duration_minutes": 120,
  "meeting_type": "in-person",
  "location": "Conference Room A",
  "participant_ids": ["uuid1", "uuid2"],
  "patient_ids": ["patient-uuid1"],
  "agenda_items": [
    {
      "title": "Case Discussion",
      "description": "Review treatment plan",
      "order_index": 1,
      "estimated_duration_minutes": 45
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "id": "new-meeting-uuid",
  "title": "Oncology Tumor Board",
  ...
}
```

---

### Update Meeting

```http
PUT /api/meetings/{meeting_id}
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body (partial update):**
```json
{
  "description": "Updated description",
  "status": "completed"
}
```

**Response (200 OK):**
```json
{
  "id": "meeting-uuid",
  "title": "...",
  "description": "Updated description",
  "completed_at": "2026-04-06T15:30:00Z"
}
```

---

### Delete Meeting

```http
DELETE /api/meetings/{meeting_id}
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "Meeting deleted successfully"
}
```

---

### Add Participant to Meeting

```http
POST /api/meetings/{meeting_id}/participants
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "user_id": "participant-uuid",
  "role": "attendee"
}
```

**Response (200 OK):**
```json
{
  "message": "Participant added to meeting"
}
```

---

### Update Participant Response

```http
PUT /api/meetings/{meeting_id}/participants/{user_id}/response
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "response_status": "accepted"
}
```

**Allowed Values:** `pending`, `accepted`, `maybe`, `declined`

**Response (200 OK):**
```json
{
  "message": "Response updated successfully",
  "participant": {
    "user_id": "uuid",
    "response_status": "accepted"
  }
}
```

---

### Remove Participant from Meeting

```http
DELETE /api/meetings/{meeting_id}/participants/{user_id}
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "Participant removed from meeting"
}
```

---

### Add Patient to Meeting

```http
POST /api/meetings/{meeting_id}/patients
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "patient_id": "patient-uuid",
  "clinical_question": "Review treatment plan effectiveness"
}
```

**Response (200 OK):**
```json
{
  "message": "Patient added to meeting"
}
```

---

### Add Agenda Item

```http
POST /api/meetings/{meeting_id}/agenda
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Lab Results Review",
  "description": "Discuss recent lab findings",
  "order_index": 3,
  "estimated_duration_minutes": 20
}
```

**Response (200 OK):**
```json
{
  "id": "agenda-uuid",
  "title": "Lab Results Review",
  ...
}
```

---

### Update Treatment Plan (7-day window)

```http
PUT /api/meetings/{meeting_id}/agenda/{item_id}/treatment-plan
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "treatment_plan": "Continue current medication regimen. Follow up in 2 weeks."
}
```

**Response (200 OK):**
```json
{
  "message": "Treatment plan updated",
  "agenda_item": { ... }
}
```

**Error Response (403 Forbidden) - After 7 days:**
```json
{
  "detail": "The 7-day edit window has expired. Treatment plan is now read-only."
}
```

---

### Log Decision

```http
POST /api/meetings/{meeting_id}/decisions
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "decision_type": "treatment",
  "title": "Start Beta Blocker",
  "description": "Patient tolerating current meds well",
  "final_assessment": "Stable condition, add beta blocker",
  "action_plan": "Start Metoprolol 25mg daily",
  "responsible_doctor_id": "doctor-uuid",
  "follow_up_date": "2026-04-20",
  "priority": "high"
}
```

**Response (200 OK):**
```json
{
  "id": "decision-uuid",
  "decision_type": "treatment",
  "title": "Start Beta Blocker",
  "status": "pending",
  "created_at": "2026-04-06T12:00:00Z"
}
```

---

### Generate PDF Summary

```http
POST /api/meetings/{meeting_id}/summary
Authorization: Bearer <token>
```

**Response (200 OK):**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="Summary+Meeting+Title+2026-04-06+14-00.pdf"

[PDF Binary Data]
```

---

## 👨‍⚕️ Patients

### List Patients

```http
GET /api/patients
Authorization: Bearer <token>
```

**Query Parameters:**
- `search` (optional): Search by name, MRN, or diagnosis

**Response (200 OK):**
```json
[
  {
    "id": "patient-uuid",
    "patient_id_number": "MRN12345",
    "first_name": "John",
    "last_name": "Doe",
    "date_of_birth": "1965-03-20",
    "gender": "male",
    "email": "patient@email.com",
    "phone": "+1-555-0200",
    "primary_diagnosis": "Coronary Artery Disease",
    "allergies": "Penicillin",
    "current_medications": "Aspirin, Atorvastatin",
    "department_name": "Cardiology",
    "notes": "High risk patient"
  }
]
```

---

### Get Patient Details

```http
GET /api/patients/{patient_id}
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": "patient-uuid",
  "patient_id_number": "MRN12345",
  "first_name": "John",
  "last_name": "Doe",
  "date_of_birth": "1965-03-20",
  "gender": "male",
  "email": "patient@email.com",
  "phone": "+1-555-0200",
  "address": "123 Main St",
  "primary_diagnosis": "CAD",
  "allergies": "Penicillin",
  "current_medications": "Aspirin 81mg, Atorvastatin 40mg",
  "department_name": "Cardiology",
  "department_provider_name": "Dr. Smith",
  "notes": "Regular monitoring required",
  "treatment_plans": [
    {
      "meeting_id": "meeting-uuid",
      "meeting_title": "Cardiology Review",
      "meeting_date": "2026-04-01",
      "treatment_plan": "Continue medications, follow up in 3 months",
      "created_at": "2026-04-01T10:00:00Z"
    }
  ],
  "created_at": "2026-01-15T09:00:00Z"
}
```

---

### Create Patient

```http
POST /api/patients
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "patient_id_number": "MRN54321",
  "first_name": "Jane",
  "last_name": "Smith",
  "date_of_birth": "1978-11-10",
  "gender": "female",
  "email": "jane.smith@email.com",
  "phone": "+1-555-0300",
  "address": "456 Oak Ave",
  "primary_diagnosis": "Breast Cancer Stage 2",
  "allergies": "None",
  "current_medications": "Tamoxifen 20mg",
  "department_name": "Oncology",
  "department_provider_name": "Dr. Johnson",
  "notes": "Undergoing chemotherapy"
}
```

**Response (201 Created):**
```json
{
  "id": "new-patient-uuid",
  "patient_id_number": "MRN54321",
  "first_name": "Jane",
  ...
}
```

---

### Update Patient

```http
PUT /api/patients/{patient_id}
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body (partial update):**
```json
{
  "current_medications": "Tamoxifen 20mg, Added supplement",
  "notes": "Updated treatment notes"
}
```

**Response (200 OK):**
```json
{
  "id": "patient-uuid",
  "current_medications": "Tamoxifen 20mg, Added supplement",
  ...
}
```

---

### Delete Patient

```http
DELETE /api/patients/{patient_id}
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "Patient deleted successfully"
}
```

---

## 📊 Dashboard

### Get Dashboard Statistics

```http
GET /api/dashboard/stats
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "upcoming_meetings": 5,
  "pending_invites": 2,
  "total_patients": 42,
  "meetings_this_week": 8
}
```

---

## 💬 Feedback

### Submit Feedback

```http
POST /api/feedback
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "feedback_type": "feature_request",
  "subject": "Add Calendar Integration",
  "message": "It would be great to sync with Google Calendar automatically."
}
```

**Feedback Types:** `feature_request`, `bug_report`, `enhancement`

**Response (200 OK):**
```json
{
  "message": "Feedback submitted successfully",
  "feedback_id": "feedback-uuid"
}
```

**Email Sent To:** `Niraj.K.Vishwakarma@gmail.com`

---

## ❤️ Health Check

### Check API Health

```http
GET /api/health
```

**Response (200 OK):**
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2026-04-06T12:00:00Z"
}
```

---

## ❌ Error Responses

### 400 Bad Request
```json
{
  "detail": "Email already registered"
}
```

### 401 Unauthorized
```json
{
  "detail": "Invalid credentials"
}
```

### 403 Forbidden
```json
{
  "detail": "You do not have permission to perform this action"
}
```

### 404 Not Found
```json
{
  "detail": "Meeting not found"
}
```

### 422 Unprocessable Entity
```json
{
  "detail": [
    {
      "type": "missing",
      "loc": ["body", "email"],
      "msg": "Field required"
    }
  ]
}
```

### 500 Internal Server Error
```json
{
  "detail": "Internal server error"
}
```

---

## 📝 Notes

### Authentication
- JWT tokens expire after 24 hours
- Refresh tokens not implemented (re-login required)
- OAuth sessions managed by Emergent integration

### Rate Limiting
- Not currently implemented
- Recommended for production: 100 requests/minute per user

### Pagination
- Not currently implemented for list endpoints
- All results returned in single response
- Recommended for large datasets

### WebSocket Support
- Not available
- Real-time updates require manual refresh

---

## 🔗 Interactive Documentation

**Swagger UI:**  
`http://localhost:8001/docs`

**ReDoc:**  
`http://localhost:8001/redoc`

---

**Last Updated:** April 6, 2026 | MedMeet API v2.0.0
