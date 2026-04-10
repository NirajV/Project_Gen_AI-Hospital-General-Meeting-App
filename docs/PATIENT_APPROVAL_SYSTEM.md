# Patient Approval System - Feature Documentation

## 📋 Overview

The **Patient Approval System** ensures that when participants add patients to meetings, the meeting organizer reviews and approves them before the meeting discussion begins. This provides better control and oversight for meeting organizers.

---

## 🎯 Feature Workflow

```
┌─────────────────────┐
│ Participant Adds    │
│ Patient to Meeting  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐       ┌──────────────────┐
│ Status: PENDING     │       │ Email Notification│
│ Badge: ⏳ Pending   │───────▶ to Organizer      │
└──────────┬──────────┘       └──────────────────┘
           │
           │ Organizer Reviews
           ▼
┌─────────────────────┐
│ Organizer Clicks    │
│ "Approve Patient"   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐       ┌──────────────────┐
│ Status: APPROVED    │       │ Email Notification│
│ ✓ Approved by Name  │───────▶ to Participant   │
└─────────────────────┘       └──────────────────┘
```

---

## 🔑 Key Features

### 1. **Role-Based Patient Addition**
- ✅ **Any participant** can add patients to meetings
- ✅ **Organizer's additions** are auto-approved
- ✅ **Participant's additions** require organizer approval

### 2. **Visual Indicators**
- 🟡 **Pending Badge**: Shows "⏳ Pending Approval" on patient cards
- 🟢 **Approved Badge**: Shows "✓ Approved by [Name]"
- 📊 **Tab Badge**: Shows count of pending patients in Patients tab (organizer only)

### 3. **Full Functionality for Pending Patients**
- ✅ Visible to all participants
- ✅ Can add agenda items
- ✅ Can add treatment plans
- ✅ Can view full patient profile
- ⚠️ Just marked as "pending approval"

### 4. **Email Notifications**
- 📧 **To Organizer**: When participant adds a patient (requires approval)
- 📧 **To Participant**: When organizer approves the patient

### 5. **Information Tracking**
- 👤 Shows who added the patient
- ✓ Shows who approved the patient (if approved)
- 📅 Tracks approval timestamp

---

## 🖥️ User Interface

### Patient Card Layout

```
┌─────────────────────────────────────────┐
│  👤  John Doe                           │
│      [New Case] [⏳ Pending Approval]   │
│                                         │
│      ID: P-12345                        │
│      Added by: Dr. Smith                │
│      Primary Diagnosis: Condition       │
│                                         │
│      [✓ Approve Patient] ← Organizer   │
│                                         │
│      [View Full Profile →]              │
└─────────────────────────────────────────┘
```

### Approved Patient Card

```
┌─────────────────────────────────────────┐
│  👤  Jane Smith                         │
│      [Active Case]                      │
│                                         │
│      ID: P-67890                        │
│      Added by: Dr. Johnson              │
│      ✓ Approved by Dr. Williams        │
│      Primary Diagnosis: Condition       │
│                                         │
│      [View Full Profile →]              │
└─────────────────────────────────────────┘
```

---

## 🔐 Permissions

| Action | Organizer | Participant |
|--------|-----------|-------------|
| Add Patient | ✅ Auto-approved | ✅ Requires approval |
| Approve Patient | ✅ Yes | ❌ No |
| Remove Patient | ✅ Yes | ❌ No |
| View Pending Patients | ✅ Yes | ✅ Yes |
| Add Agenda for Pending Patient | ✅ Yes | ✅ Yes |

---

## 📡 API Endpoints

### 1. Add Patient to Meeting
```http
POST /api/meetings/{meeting_id}/patients
```

**Request Body:**
```json
{
  "patient_id": "uuid",
  "clinical_question": "string (optional)",
  "reason_for_discussion": "string (optional)",
  "status": "new_case"
}
```

**Response:**
```json
{
  "id": "meeting_patient_id",
  "message": "Patient added to meeting. Awaiting organizer approval.",
  "approval_status": "pending"
}
```

**Auto-Approval:**
- If added by **organizer**: `approval_status: "approved"`
- If added by **participant**: `approval_status: "pending"`

---

### 2. Approve Patient Addition
```http
POST /api/meetings/{meeting_id}/patients/{patient_id}/approve
```

**Authorization:** Organizer only

**Response:**
```json
{
  "message": "Patient approved successfully",
  "approved_by": "Dr. Williams",
  "approved_at": "2026-04-10T01:30:00Z"
}
```

---

### 3. Get Meeting Details (Updated)
```http
GET /api/meetings/{meeting_id}
```

**Response includes approval fields:**
```json
{
  "patients": [
    {
      "id": "mp_id",
      "patient_id": "patient_uuid",
      "first_name": "John",
      "last_name": "Doe",
      "approval_status": "pending",
      "added_by": "user_id",
      "added_by_name": "Dr. Smith",
      "approved_by": null,
      "approved_by_name": null,
      "approved_at": null
    }
  ]
}
```

---

## 💾 Database Schema

### meeting_patients Collection

**New Fields Added:**
```javascript
{
  "approval_status": "pending" | "approved",  // Required
  "added_by": "user_id",                       // User who added patient
  "added_by_name": "string",                   // Cached for performance
  "approved_by": "user_id",                    // Who approved (null if pending)
  "approved_by_name": "string",                // Cached for performance
  "approved_at": "ISO 8601 timestamp",         // When approved
  "created_at": "ISO 8601 timestamp"
}
```

---

## 📧 Email Templates

### Approval Required Email (to Organizer)
```
Subject: Patient Approval Required - [Meeting Title]

Hello [Organizer Name],

[Participant Name] has added a patient to the meeting: [Meeting Title]

Patient Details:
- Patient Name: John Doe
- Patient ID: P-12345
- Reason for Discussion: Clinical question...

Meeting Details:
- Meeting: Weekly Tumor Board
- Date: 2026-04-15
- Time: 10:00 AM

Action Required: Please review and approve this patient addition.

[View Meeting & Approve Button]
```

### Approval Confirmation Email (to Participant)
```
Subject: Patient Approved - [Meeting Title]

Hello [Participant Name],

[Organizer Name] has approved the patient you added to the meeting.

Patient Details:
- Patient Name: John Doe
- Patient ID: P-12345

The patient can now be fully discussed in the meeting.

[View Meeting Button]
```

---

## 🧪 Testing Scenarios

### Test Case 1: Participant Adds Patient
1. Login as participant
2. Navigate to meeting
3. Add patient to meeting
4. **Expected:**
   - Patient shows "⏳ Pending Approval" badge
   - Shows "Added by: [Your Name]"
   - Organizer receives email notification
   - Can add agenda items for patient

### Test Case 2: Organizer Adds Patient
1. Login as organizer
2. Navigate to meeting
3. Add patient to meeting
4. **Expected:**
   - Patient is auto-approved
   - No "Pending" badge
   - Shows "✓ Approved by [Your Name]"
   - No email notification sent

### Test Case 3: Organizer Approves Patient
1. Login as organizer
2. Navigate to meeting with pending patient
3. Click "Approve Patient" button
4. **Expected:**
   - Badge changes from "Pending" to "Approved"
   - Shows "✓ Approved by [Organizer Name]"
   - Participant receives email confirmation
   - Toast: "Patient approved successfully"

### Test Case 4: Tab Badge Visibility
1. Login as organizer
2. Navigate to meeting with pending patients
3. **Expected:**
   - Patients tab shows orange badge: "2 Pending"
4. Login as participant
5. **Expected:**
   - No badge visible (only organizer sees it)

---

## 🚨 Error Handling

### Non-Organizer Tries to Approve
```json
{
  "detail": "Only organizer can approve patient additions"
}
```
**Status:** 403 Forbidden

### Patient Not Found
```json
{
  "detail": "Patient not found in this meeting"
}
```
**Status:** 404 Not Found

### Already Approved
```json
{
  "message": "Patient already approved"
}
```
**Status:** 200 OK (idempotent)

---

## 🎨 UI Components Updated

### Files Modified:
1. **`/app/frontend/src/pages/MeetingDetailPage.js`**
   - Added pending badge display
   - Added "Approve Patient" button for organizers
   - Added "Added by" and "Approved by" information
   - Added tab badge for pending count

2. **`/app/frontend/src/lib/api.js`**
   - Added `approvePatientAddition()` function

3. **`/app/backend/server.py`**
   - Updated `add_patient_to_meeting()` endpoint
   - Added `approve_patient_addition()` endpoint
   - Updated `get_meeting_detail()` to include approval info

---

## 📊 Benefits

1. **Better Control**: Organizers have oversight on all patient additions
2. **Transparency**: Everyone knows who added each patient
3. **Flexibility**: Pending patients can still be worked on (agenda items, treatment plans)
4. **Communication**: Automated email notifications keep everyone informed
5. **Audit Trail**: Complete tracking of who added/approved each patient

---

## 🔮 Future Enhancements

- **Bulk Approval**: Approve multiple pending patients at once
- **Auto-Approval Rules**: Configure roles that don't need approval
- **Rejection Option**: Add ability to reject patient additions
- **Mobile Push Notifications**: Real-time notifications for approvals
- **Activity Log**: Detailed audit log of all approval actions

---

**Last Updated**: April 10, 2026  
**Version**: 1.0  
**Feature Status**: ✅ COMPLETE
