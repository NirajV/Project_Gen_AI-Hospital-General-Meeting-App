# 🗄️ MongoDB Schema - Hospital Meeting App

## Database Information
- **Database Name**: `hospital_meeting_db`
- **Host**: `localhost:27017` (in preview environment)
- **Total Collections**: 6

---

## 📦 Collections Overview

### 1. **users** (5 documents)
Stores all user accounts (doctors, organizers, admin)

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | MongoDB internal ID |
| `id` | String (UUID) | Unique user identifier |
| `email` | String | User email (unique) |
| `name` | String | Full name |
| `password_hash` | String | Bcrypt hashed password |
| `specialty` | String | Medical specialty (e.g., "Cardiology") |
| `organization` | String (nullable) | Hospital/organization name |
| `phone` | String (nullable) | Contact number |
| `role` | String | User role: "doctor", "organizer", "admin" |
| `picture` | String (nullable) | Profile picture URL |
| `is_active` | Boolean | Account status |
| `created_at` | String (ISO) | Account creation timestamp |

**Indexes**: `email` (unique)

**Example Document**:
```json
{
  "_id": ObjectId("..."),
  "id": "63f5e4a0-1234-5678-90ab-cdef12345678",
  "email": "testdoctor@hospital.com",
  "name": "Dr. Test Doctor",
  "password_hash": "$2b$12$...",
  "specialty": "General Medicine",
  "organization": null,
  "phone": null,
  "role": "doctor",
  "picture": null,
  "is_active": true,
  "created_at": "2026-02-21T16:53:20.208000"
}
```

---

### 2. **patients** (3 documents)
Patient records and medical information

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | MongoDB internal ID |
| `id` | String (UUID) | Unique patient identifier |
| `patient_id_number` | String (nullable) | Hospital patient ID |
| `first_name` | String | Patient first name |
| `last_name` | String | Patient last name |
| `date_of_birth` | String (ISO date) | DOB in YYYY-MM-DD format |
| `gender` | String | "male", "female", "other" |
| `email` | String (nullable) | Contact email |
| `phone` | String (nullable) | Contact phone |
| `address` | String (nullable) | Full address |
| `primary_diagnosis` | String | Main diagnosis |
| `allergies` | String (nullable) | Known allergies |
| `current_medications` | String (nullable) | Current medications |
| `department_name` | String | Department (e.g., "Oncology") |
| `department_provider_name` | String (nullable) | Attending physician |
| `notes` | String (nullable) | Additional notes |
| `is_active` | Boolean | Record status |
| `created_by` | String (UUID) | User ID who created record |
| `created_at` | String (ISO) | Record creation timestamp |

**Indexes**: `patient_id_number` (if set)

**Example Document**:
```json
{
  "_id": ObjectId("..."),
  "id": "patient-uuid-1234",
  "patient_id_number": null,
  "first_name": "John",
  "last_name": "Doe",
  "date_of_birth": "1954-03-01",
  "gender": "male",
  "email": null,
  "phone": null,
  "address": null,
  "primary_diagnosis": "Lung Cancer Stage II",
  "allergies": null,
  "current_medications": null,
  "department_name": "Oncology",
  "department_provider_name": null,
  "notes": null,
  "is_active": true,
  "created_by": "creator-user-id",
  "created_at": "2026-02-21T16:53:41.857000"
}
```

---

### 3. **meetings** (1 document)
Meeting/case conference information

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | MongoDB internal ID |
| `id` | String (UUID) | Unique meeting identifier |
| `title` | String | Meeting title |
| `description` | String | Meeting description |
| `meeting_date` | String (ISO date) | Date in YYYY-MM-DD format |
| `start_time` | String (HH:MM:SS) | Start time |
| `end_time` | String (HH:MM:SS) | End time |
| `duration_minutes` | Number | Meeting duration |
| `meeting_type` | String | "video", "in-person", "hybrid" |
| `location` | String | Physical location (if in-person) |
| `video_link` | String | Meeting URL (Teams, Zoom, etc.) |
| `recurrence_type` | String | "one_time", "daily", "weekly", etc. |
| `recurrence_end_date` | String (nullable) | End date for recurring meetings |
| `status` | String | "scheduled", "in_progress", "completed", "cancelled" |
| `organizer_id` | String (UUID) | User ID of organizer |
| `created_at` | String (ISO) | Creation timestamp |

**Indexes**: `organizer_id`, `meeting_date`, `status`

**Example Document**:
```json
{
  "_id": ObjectId("..."),
  "id": "meeting-uuid-5678",
  "title": "Tumor Board Meeting",
  "description": "Weekly oncology case review",
  "meeting_date": "2026-02-23",
  "start_time": "09:00:00",
  "end_time": "10:00:00",
  "duration_minutes": 60,
  "meeting_type": "video",
  "location": "",
  "video_link": "https://teams.microsoft.com/...",
  "recurrence_type": "one_time",
  "recurrence_end_date": null,
  "status": "scheduled",
  "organizer_id": "organizer-user-id",
  "created_at": "2026-02-21T16:53:41.791000"
}
```

---

### 4. **meeting_participants** (4 documents)
Junction table linking users to meetings

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | MongoDB internal ID |
| `id` | String (UUID) | Unique participant record ID |
| `meeting_id` | String (UUID) | Meeting reference |
| `user_id` | String (UUID) | User reference |
| `role` | String | "organizer", "attendee", "presenter" |
| `response_status` | String | "pending", "accepted", "declined" |
| `created_at` | String (ISO) | When participant was added |

**Indexes**: `meeting_id`, `user_id`, compound `(meeting_id, user_id)` unique

**Example Document**:
```json
{
  "_id": ObjectId("..."),
  "id": "participant-record-id",
  "meeting_id": "meeting-uuid-5678",
  "user_id": "user-uuid-1234",
  "role": "attendee",
  "response_status": "pending",
  "created_at": "2026-02-21T16:53:41.803000"
}
```

---

### 5. **meeting_patients** (3 documents)
Junction table linking patients to meetings

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | MongoDB internal ID |
| `id` | String (UUID) | Unique record ID |
| `meeting_id` | String (UUID) | Meeting reference |
| `patient_id` | String (UUID) | Patient reference |
| `status` | String | "new_case", "follow_up", "urgent" |
| `added_by` | String (UUID) | User who added patient |
| `created_at` | String (ISO) | When patient was added |

**Indexes**: `meeting_id`, `patient_id`

**Example Document**:
```json
{
  "_id": ObjectId("..."),
  "id": "meeting-patient-record-id",
  "meeting_id": "meeting-uuid-5678",
  "patient_id": "patient-uuid-1234",
  "status": "new_case",
  "added_by": "organizer-user-id",
  "created_at": "2026-02-21T16:53:41.813000"
}
```

---

### 6. **agenda_items** (2 documents)
Meeting agenda items

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | MongoDB internal ID |
| `id` | String (UUID) | Unique agenda item ID |
| `meeting_id` | String (UUID) | Meeting reference |
| `title` | String | Agenda item title |
| `description` | String | Detailed description |
| `order_index` | Number | Display order (0, 1, 2...) |
| `estimated_duration_minutes` | Number | Expected duration |
| `assigned_to` | String (nullable) | User ID if assigned |
| `is_completed` | Boolean | Completion status |
| `created_at` | String (ISO) | Creation timestamp |

**Indexes**: `meeting_id`, `order_index`

**Example Document**:
```json
{
  "_id": ObjectId("..."),
  "id": "agenda-item-uuid",
  "meeting_id": "meeting-uuid-5678",
  "title": "Review John Doe Case",
  "description": "Discuss treatment options",
  "order_index": 0,
  "estimated_duration_minutes": 30,
  "assigned_to": null,
  "is_completed": false,
  "created_at": "2026-02-21T16:53:41.822000"
}
```

---

## 🔗 Relationships

```
users (1) ──────► (N) meetings [organizer_id]
users (N) ◄────► (N) meetings [via meeting_participants]
meetings (N) ◄──► (N) patients [via meeting_patients]
meetings (1) ────► (N) agenda_items
meetings (1) ────► (N) file_attachments (not shown)
meetings (1) ────► (N) decision_logs (not shown)
```

---

## 🔍 How to Access MongoDB

### Option 1: MongoDB Shell (Command Line)

```bash
# Connect to database
mongosh mongodb://localhost:27017/hospital_meeting_db

# List all collections
show collections

# View sample documents
db.users.findOne()
db.patients.find().limit(5)
db.meetings.find({}, {title: 1, status: 1, meeting_date: 1})

# Count documents
db.users.countDocuments()

# Query examples
db.users.find({role: "doctor"})
db.meetings.find({status: "scheduled"})
db.patients.find({department_name: "Oncology"})
```

### Option 2: View in Code (Python)

The schema is defined using Pydantic models in `/app/backend/server.py`:

```python
# User Model
class UserBase(BaseModel):
    email: EmailStr
    name: str
    specialty: Optional[str] = None
    # ... more fields

# Patient Model
class PatientBase(BaseModel):
    first_name: str
    last_name: str
    # ... more fields

# Meeting Model
class MeetingBase(BaseModel):
    title: str
    meeting_date: str
    # ... more fields
```

### Option 3: Export Data

```bash
# Export entire database
mongodump --uri="mongodb://localhost:27017/hospital_meeting_db" --out=/tmp/backup

# Export specific collection as JSON
mongoexport --uri="mongodb://localhost:27017/hospital_meeting_db" \
  --collection=users --out=users.json --pretty

# Export to CSV
mongoexport --uri="mongodb://localhost:27017/hospital_meeting_db" \
  --collection=patients --type=csv \
  --fields=first_name,last_name,primary_diagnosis \
  --out=patients.csv
```

---

## 📊 Current Database Stats

```
Total Collections: 6
Total Documents: 18

Collection Sizes:
  • users: 5 documents
  • patients: 3 documents  
  • meetings: 1 document
  • meeting_participants: 4 documents
  • meeting_patients: 3 documents
  • agenda_items: 2 documents
```

---

## 🛠️ Useful Queries

### Get all meetings with organizer names
```javascript
db.meetings.aggregate([
  {
    $lookup: {
      from: "users",
      localField: "organizer_id",
      foreignField: "id",
      as: "organizer"
    }
  },
  { $unwind: "$organizer" },
  {
    $project: {
      title: 1,
      meeting_date: 1,
      "organizer.name": 1,
      status: 1
    }
  }
])
```

### Get meeting with all participants
```javascript
db.meetings.aggregate([
  {
    $lookup: {
      from: "meeting_participants",
      localField: "id",
      foreignField: "meeting_id",
      as: "participants"
    }
  },
  {
    $lookup: {
      from: "users",
      localField: "participants.user_id",
      foreignField: "id",
      as: "participant_details"
    }
  }
])
```

### Get patients by meeting
```javascript
db.meeting_patients.aggregate([
  {
    $lookup: {
      from: "patients",
      localField: "patient_id",
      foreignField: "id",
      as: "patient_info"
    }
  },
  { $unwind: "$patient_info" },
  {
    $project: {
      meeting_id: 1,
      "patient_info.first_name": 1,
      "patient_info.last_name": 1,
      "patient_info.primary_diagnosis": 1,
      status: 1
    }
  }
])
```

---

## 📝 Notes

- **IDs**: All main entities use UUID strings (`id` field), not MongoDB ObjectId
- **Soft Deletes**: Most entities use `is_active` flag instead of deletion
- **Timestamps**: All ISO 8601 format strings
- **No Foreign Key Constraints**: MongoDB doesn't enforce relationships - maintained at application level
- **Denormalization**: Some data duplicated for performance (e.g., organizer info in meeting responses)

---

**Last Updated**: February 22, 2026  
**Database Version**: MongoDB 6.x
