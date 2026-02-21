# 🧪 Local MySQL Testing Guide

## Overview
This guide provides comprehensive test cases to verify all functionality of the Hospital Meeting App with your local MySQL database.

---

## Prerequisites

✅ MySQL Server running on localhost:3306  
✅ Database created: `Hospital_General_Meeting_Scheduler_DB`  
✅ Backend running on: http://localhost:8001  
✅ Frontend running on: http://localhost:3000  

---

## 🔐 Test Suite 1: Authentication

### Test 1.1: User Registration

```bash
# Register User 1 (Organizer/Cardiologist)
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"dr.smith@hospital.com\",
    \"name\": \"Dr. John Smith\",
    \"password\": \"password123\",
    \"specialty\": \"Cardiology\",
    \"organization\": \"City General Hospital\",
    \"role\": \"organizer\"
  }"

# Expected: 200 OK with access_token and user object
# Save TOKEN_SMITH from response
```

```bash
# Register User 2 (Doctor/Neurologist)
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"dr.jones@hospital.com\",
    \"name\": \"Dr. Sarah Jones\",
    \"password\": \"password123\",
    \"specialty\": \"Neurology\",
    \"organization\": \"City General Hospital\",
    \"role\": \"doctor\"
  }"

# Expected: 200 OK
# Save TOKEN_JONES from response
```

```bash
# Register User 3 (Doctor/Oncology)
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"dr.williams@hospital.com\",
    \"name\": \"Dr. Michael Williams\",
    \"password\": \"password123\",
    \"specialty\": \"Oncology\",
    \"organization\": \"City General Hospital\",
    \"role\": \"doctor\"
  }"

# Expected: 200 OK
# Save TOKEN_WILLIAMS from response
```

### Test 1.2: User Login

```bash
# Login as Dr. Smith
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"dr.smith@hospital.com\",
    \"password\": \"password123\"
  }"

# Expected: 200 OK with access_token
```

### Test 1.3: Duplicate Registration (Should Fail)

```bash
# Try to register with existing email
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"dr.smith@hospital.com\",
    \"name\": \"Another Doctor\",
    \"password\": \"password\"
  }"

# Expected: 400 Bad Request - "Email already registered"
```

### Test 1.4: Invalid Login (Should Fail)

```bash
# Wrong password
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"dr.smith@hospital.com\",
    \"password\": \"wrongpassword\"
  }"

# Expected: 401 Unauthorized
```

### Test 1.5: Get All Users

```bash
# Get list of all users (for adding participants)
curl -X GET http://localhost:8001/api/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Expected: 200 OK with array of users (without password_hash)
```

---

## 👥 Test Suite 2: Patient Management

**Use TOKEN_SMITH (organizer) for these tests**

### Test 2.1: Create Patient 1

```bash
curl -X POST http://localhost:8001/api/patients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_SMITH" \
  -d "{
    \"patient_id_number\": \"P001\",
    \"first_name\": \"Robert\",
    \"last_name\": \"Johnson\",
    \"date_of_birth\": \"1965-03-20\",
    \"gender\": \"male\",
    \"email\": \"robert.j@email.com\",
    \"phone\": \"+1-555-0101\",
    \"primary_diagnosis\": \"Coronary Artery Disease\",
    \"allergies\": \"Penicillin\",
    \"current_medications\": \"Aspirin 81mg, Atorvastatin 40mg\",
    \"department_name\": \"Cardiology\",
    \"notes\": \"High risk patient, regular monitoring required\"
  }"

# Expected: 200 OK with patient object
# Save PATIENT_1_ID from response
```

### Test 2.2: Create Patient 2

```bash
curl -X POST http://localhost:8001/api/patients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_SMITH" \
  -d "{
    \"patient_id_number\": \"P002\",
    \"first_name\": \"Emily\",
    \"last_name\": \"Davis\",
    \"date_of_birth\": \"1978-11-10\",
    \"gender\": \"female\",
    \"email\": \"emily.d@email.com\",
    \"phone\": \"+1-555-0102\",
    \"primary_diagnosis\": \"Breast Cancer Stage 2\",
    \"allergies\": \"None\",
    \"current_medications\": \"Tamoxifen 20mg\",
    \"department_name\": \"Oncology\",
    \"notes\": \"Undergoing chemotherapy\"
  }"

# Expected: 200 OK
# Save PATIENT_2_ID from response
```

### Test 2.3: Create Patient 3

```bash
curl -X POST http://localhost:8001/api/patients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_SMITH" \
  -d "{
    \"patient_id_number\": \"P003\",
    \"first_name\": \"James\",
    \"last_name\": \"Miller\",
    \"date_of_birth\": \"1955-07-15\",
    \"gender\": \"male\",
    \"email\": \"james.m@email.com\",
    \"phone\": \"+1-555-0103\",
    \"primary_diagnosis\": \"Stroke Recovery\",
    \"allergies\": \"Sulfa drugs\",
    \"current_medications\": \"Warfarin 5mg, Lisinopril 10mg\",
    \"department_name\": \"Neurology\",
    \"notes\": \"Post-stroke rehabilitation\"
  }"

# Expected: 200 OK
# Save PATIENT_3_ID from response
```

### Test 2.4: Get All Patients

```bash
curl -X GET http://localhost:8001/api/patients \
  -H "Authorization: Bearer TOKEN_SMITH"

# Expected: 200 OK with array of 3 patients
```

### Test 2.5: Get Single Patient

```bash
curl -X GET http://localhost:8001/api/patients/PATIENT_1_ID \
  -H "Authorization: Bearer TOKEN_SMITH"

# Expected: 200 OK with patient details
```

### Test 2.6: Update Patient

```bash
curl -X PUT http://localhost:8001/api/patients/PATIENT_1_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_SMITH" \
  -d "{
    \"current_medications\": \"Aspirin 81mg, Atorvastatin 40mg, Metoprolol 25mg\",
    \"notes\": \"Added beta-blocker to medication regimen\"
  }"

# Expected: 200 OK with updated patient
```

### Test 2.7: Search Patients

```bash
# Search by name
curl -X GET "http://localhost:8001/api/patients?search=Robert" \
  -H "Authorization: Bearer TOKEN_SMITH"

# Expected: 200 OK with matching patients
```

---

## 📅 Test Suite 3: Meeting Management

### Test 3.1: Create Meeting 1 (Cardiology Review)

```bash
curl -X POST http://localhost:8001/api/meetings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_SMITH" \
  -d "{
    \"title\": \"Cardiology Team Meeting\",
    \"description\": \"Weekly review of critical cardiac cases\",
    \"meeting_date\": \"2026-02-28\",
    \"start_time\": \"10:00:00\",
    \"end_time\": \"11:30:00\",
    \"duration_minutes\": 90,
    \"meeting_type\": \"video\",
    \"video_link\": \"https://teams.microsoft.com/meeting123\",
    \"participant_ids\": [\"USER_ID_JONES\", \"USER_ID_WILLIAMS\"],
    \"patient_ids\": [\"PATIENT_1_ID\"],
    \"agenda_items\": [
      {
        \"title\": \"Review Patient Johnson - CAD Status\",
        \"description\": \"Evaluate current treatment effectiveness\",
        \"order_index\": 1,
        \"estimated_duration_minutes\": 30
      },
      {
        \"title\": \"Medication Adjustment Discussion\",
        \"description\": \"Consider adding beta-blocker\",
        \"order_index\": 2,
        \"estimated_duration_minutes\": 20
      }
    ]
  }"

# Expected: 200 OK with meeting object
# Save MEETING_1_ID from response
```

### Test 3.2: Create Meeting 2 (Oncology Case)

```bash
curl -X POST http://localhost:8001/api/meetings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_SMITH" \
  -d "{
    \"title\": \"Oncology Tumor Board\",
    \"description\": \"Multi-disciplinary review of cancer cases\",
    \"meeting_date\": \"2026-03-05\",
    \"start_time\": \"14:00:00\",
    \"end_time\": \"16:00:00\",
    \"meeting_type\": \"in-person\",
    \"location\": \"Conference Room B\",
    \"participant_ids\": [\"USER_ID_WILLIAMS\"],
    \"patient_ids\": [\"PATIENT_2_ID\"],
    \"agenda_items\": [
      {
        \"title\": \"Emily Davis - Treatment Plan Review\",
        \"description\": \"Evaluate chemotherapy response\",
        \"order_index\": 1,
        \"estimated_duration_minutes\": 45
      }
    ]
  }"

# Expected: 200 OK
# Save MEETING_2_ID from response
```

### Test 3.3: Get All Meetings

```bash
curl -X GET http://localhost:8001/api/meetings \
  -H "Authorization: Bearer TOKEN_SMITH"

# Expected: 200 OK with array of meetings
```

### Test 3.4: Get Single Meeting Details

```bash
curl -X GET http://localhost:8001/api/meetings/MEETING_1_ID \
  -H "Authorization: Bearer TOKEN_SMITH"

# Expected: 200 OK with complete meeting details including:
# - meeting info
# - participants list
# - patients list
# - agenda items
# - files (empty array initially)
# - decisions (empty array initially)
```

### Test 3.5: Update Meeting

```bash
curl -X PUT http://localhost:8001/api/meetings/MEETING_1_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_SMITH" \
  -d "{
    \"description\": \"Weekly review of critical cardiac cases - Updated\",
    \"video_link\": \"https://teams.microsoft.com/meeting-updated\"
  }"

# Expected: 200 OK with updated meeting
```

---

## 👨‍⚕️ Test Suite 4: Participant Management

### Test 4.1: Add Participant to Meeting

```bash
curl -X POST http://localhost:8001/api/meetings/MEETING_1_ID/participants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_SMITH" \
  -d "{
    \"user_id\": \"USER_ID_WILLIAMS\",
    \"role\": \"attendee\"
  }"

# Expected: 200 OK - "Participant added"
```

### Test 4.2: Invite New Doctor by Email

```bash
curl -X POST http://localhost:8001/api/meetings/MEETING_1_ID/invite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_SMITH" \
  -d "{
    \"email\": \"dr.external@otherhospital.com\",
    \"name\": \"Dr. External Specialist\",
    \"specialty\": \"Cardiothoracic Surgery\"
  }"

# Expected: 200 OK - "Invitation sent" (or "User invited to meeting" if email not configured)
# Note: Actual email won't be sent unless SMTP is configured
```

### Test 4.3: Remove Participant from Meeting

```bash
curl -X DELETE http://localhost:8001/api/meetings/MEETING_1_ID/participants/USER_ID_JONES \
  -H "Authorization: Bearer TOKEN_SMITH"

# Expected: 200 OK - "Participant removed"
```

### Test 4.4: Verify Participant Changes

```bash
curl -X GET http://localhost:8001/api/meetings/MEETING_1_ID \
  -H "Authorization: Bearer TOKEN_SMITH"

# Expected: Updated participants list without USER_ID_JONES
```

---

## 📝 Test Suite 5: Agenda & Decisions

### Test 5.1: Add Decision Log

```bash
curl -X POST http://localhost:8001/api/meetings/MEETING_1_ID/decisions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_SMITH" \
  -d "{
    \"decision_type\": \"treatment\",
    \"title\": \"Medication Adjustment Approved\",
    \"description\": \"Agreed to add Metoprolol 25mg to patient's regimen\",
    \"final_assessment\": \"Patient showing good tolerance to current medications\",
    \"action_plan\": \"Start Metoprolol 25mg daily, monitor BP and HR for 2 weeks\",
    \"responsible_doctor_id\": \"USER_ID_SMITH\",
    \"follow_up_date\": \"2026-03-14\",
    \"priority\": \"high\"
  }"

# Expected: 200 OK with decision ID
# Save DECISION_1_ID from response
```

### Test 5.2: Update Decision

```bash
curl -X PUT http://localhost:8001/api/meetings/MEETING_1_ID/decisions/DECISION_1_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_SMITH" \
  -d "{
    \"status\": \"implemented\",
    \"priority\": \"medium\"
  }"

# Expected: 200 OK with updated decision
```

---

## 📊 Test Suite 6: Dashboard & Stats

### Test 6.1: Get Dashboard Statistics

```bash
curl -X GET http://localhost:8001/api/dashboard/stats \
  -H "Authorization: Bearer TOKEN_SMITH"

# Expected: 200 OK with stats:
# {
#   "upcoming_meetings": 2,
#   "pending_invites": 0,
#   "total_patients": 3,
#   "meetings_this_week": X
# }
```

### Test 6.2: Dashboard as Different User

```bash
curl -X GET http://localhost:8001/api/dashboard/stats \
  -H "Authorization: Bearer TOKEN_JONES"

# Expected: Different stats based on Dr. Jones's meetings
```

---

## 🔒 Test Suite 7: Authorization & Security

### Test 7.1: Access Without Token (Should Fail)

```bash
curl -X GET http://localhost:8001/api/patients

# Expected: 401 Unauthorized or 403 Forbidden
```

### Test 7.2: Access with Invalid Token (Should Fail)

```bash
curl -X GET http://localhost:8001/api/patients \
  -H "Authorization: Bearer invalid_token_here"

# Expected: 401 Unauthorized
```

### Test 7.3: Verify Password Hash Not Exposed

```bash
curl -X GET http://localhost:8001/api/users \
  -H "Authorization: Bearer TOKEN_SMITH"

# Expected: User objects should NOT contain 'password_hash' field
```

---

## 🗄️ Test Suite 8: Database Verification

After running all API tests, verify data in MySQL:

```sql
-- Open MySQL client
mysql -u root -p

USE Hospital_General_Meeting_Scheduler_DB;

-- 1. Check Users
SELECT id, email, name, specialty, role FROM users;
-- Expected: 3 users (Smith, Jones, Williams)

-- 2. Check Patients
SELECT id, patient_id_number, first_name, last_name, primary_diagnosis FROM patients;
-- Expected: 3 patients

-- 3. Check Meetings
SELECT id, title, meeting_date, start_time, organizer_id, status FROM meetings;
-- Expected: 2 meetings

-- 4. Check Meeting Participants
SELECT 
    m.title as meeting_title,
    u.name as participant_name,
    mp.response_status,
    mp.added_at
FROM meeting_participants mp
JOIN meetings m ON mp.meeting_id = m.id
JOIN users u ON mp.user_id = u.id;
-- Expected: Multiple participant records

-- 5. Check Meeting Patients (Junction Table)
SELECT 
    m.title as meeting_title,
    p.first_name,
    p.last_name,
    mp.clinical_question,
    mp.status
FROM meeting_patients mp
JOIN meetings m ON mp.meeting_id = m.id
JOIN patients p ON mp.patient_id = p.id;
-- Expected: Patient-meeting associations

-- 6. Check Agenda Items
SELECT 
    m.title as meeting_title,
    a.title as agenda_title,
    a.order_index,
    a.estimated_duration_minutes
FROM agenda_items a
JOIN meetings m ON a.meeting_id = m.id
ORDER BY m.id, a.order_index;
-- Expected: Agenda items for meetings

-- 7. Check Decision Logs
SELECT 
    m.title as meeting_title,
    d.decision_type,
    d.title as decision_title,
    d.priority,
    d.status,
    u.name as responsible_doctor
FROM decision_logs d
JOIN meetings m ON d.meeting_id = m.id
LEFT JOIN users u ON d.responsible_doctor_id = u.id;
-- Expected: Decision records

-- 8. Data Integrity Checks
-- All meetings should have an organizer
SELECT COUNT(*) FROM meetings WHERE organizer_id NOT IN (SELECT id FROM users);
-- Expected: 0

-- All participants should reference existing users
SELECT COUNT(*) FROM meeting_participants WHERE user_id NOT IN (SELECT id FROM users);
-- Expected: 0

-- All meeting_patients should reference existing patients
SELECT COUNT(*) FROM meeting_patients WHERE patient_id NOT IN (SELECT id FROM patients);
-- Expected: 0
```

---

## 🌐 Test Suite 9: Frontend Manual Testing

### 9.1 Authentication Flow

1. Open: http://localhost:3000
2. Click **"Sign in with Google"**
   - ✅ Should redirect to Google OAuth
   - ✅ After auth, should redirect back and login
3. Or use **Email/Password Login**:
   - Email: `dr.smith@hospital.com`
   - Password: `password123`
   - ✅ Should successfully login and show dashboard

### 9.2 Dashboard

1. ✅ Should display 4 stat cards:
   - Upcoming Meetings
   - Pending Invites
   - Total Patients
   - This Week's Meetings
2. ✅ Should show upcoming meetings list
3. ✅ "New Meeting" button should be visible

### 9.3 Patient Management

1. Go to **Patients** page
2. ✅ Should list all 3 patients
3. ✅ Search should filter patients
4. Click **"New Patient"**
   - Fill form with patient details
   - ✅ Submit should create patient
   - ✅ Should redirect to patient detail page
5. Click on a patient from list
   - ✅ Should show patient details
   - ✅ Should show meeting history
   - Click **Edit**
   - Update details
   - ✅ Should save successfully

### 9.4 Meeting Creation Wizard

1. Click **"New Meeting"** from dashboard
2. **Step 1: Basic Details**
   - Title: "Test Meeting"
   - Description: "Testing the wizard"
   - Date: Select future date
   - Time: 10:00 AM - 11:00 AM
   - Meeting Type: Video
   - ✅ Click "Next"
3. **Step 2: Participants**
   - ✅ Should show list of doctors with checkboxes
   - Select 2 doctors
   - OR click "Invite by Email"
   - Enter email: `external@hospital.com`
   - Name: "Dr. External"
   - ✅ Click "Add Invitation"
   - ✅ Click "Next"
4. **Step 3: Patients**
   - ✅ Should show list of patients with checkboxes
   - Select 1 patient
   - OR click "Add New Patient"
   - Fill patient details
   - ✅ Click "Add Patient"
   - ✅ Click "Next"
5. **Step 4: Agenda**
   - Click "Add Agenda Item"
   - Title: "Discuss Treatment"
   - Description: "Review options"
   - Duration: 30 minutes
   - ✅ Click "Add"
   - ✅ Add 2-3 agenda items
   - ✅ Click "Create Meeting"
6. ✅ Should redirect to meeting detail page

### 9.5 Meeting Detail Page (Case Room)

1. Click on a meeting from dashboard or meetings list
2. **Overview Tab**:
   - ✅ Should show meeting details
   - ✅ Should show participant list with response status
   - ✅ Should show agenda items
   - ✅ "Add Participant" and "Remove" buttons should work
3. **Patients Tab**:
   - ✅ Should list patients in this meeting
   - ✅ Should show patient details
   - ✅ Should display clinical question if added
4. **Agenda Tab**:
   - ✅ Should show all agenda items
   - ✅ Should be able to add new items
   - ✅ Should show estimated duration
5. **Files Tab**:
   - Click **"Upload File"**
   - Select PDF or image
   - Select patient (if applicable)
   - ✅ File should upload
   - ✅ Should appear in files list
   - ✅ Click file to download
   - ✅ Delete button should work
6. **Decisions Tab**:
   - Click **"Log Decision"**
   - Fill decision details
   - ✅ Should save successfully
   - ✅ Should appear in decisions list
   - ✅ Edit button should work

### 9.6 Profile Page

1. Click user icon → **Profile**
2. ✅ Should show user information
3. ✅ Should allow editing profile
4. ✅ Logout button should work

---

## ✅ Success Criteria

### Backend API Tests
- [ ] All registration tests pass
- [ ] All login tests pass
- [ ] All patient CRUD operations work
- [ ] All meeting CRUD operations work
- [ ] Participant management works
- [ ] Decision logging works
- [ ] Dashboard stats are accurate
- [ ] Authentication/Authorization works correctly

### Database Verification
- [ ] All users created successfully
- [ ] All patients stored correctly
- [ ] All meetings with correct relationships
- [ ] Junction tables populated correctly
- [ ] No orphaned records
- [ ] Foreign key constraints working

### Frontend Tests
- [ ] Google OAuth login works
- [ ] Email/password login works
- [ ] Dashboard displays correct data
- [ ] Patient CRUD operations work
- [ ] Meeting creation wizard completes successfully
- [ ] Meeting detail page displays all tabs correctly
- [ ] File upload/download works
- [ ] Decision logging works
- [ ] Navigation between pages works
- [ ] Responsive design works on different screen sizes

---

## 🐛 Known Limitations

1. **Email Invitations**: Email sending is not yet implemented. SMTP configuration required.
2. **File Storage**: Files are stored locally. For production, use cloud storage (S3/Cloudinary).
3. **Real-time Updates**: No WebSocket support yet. Manual refresh needed to see updates.
4. **Notifications**: No notification system implemented yet.

---

## 📝 Test Results Template

Use this template to track your testing:

```markdown
# Test Results - [Date]

## Environment
- OS: Windows 11
- MySQL Version: 8.0.x
- Python Version: 3.x.x
- Node Version: 16.x.x

## Backend API Tests
- [ ] Authentication: PASS/FAIL
- [ ] Patient Management: PASS/FAIL
- [ ] Meeting Management: PASS/FAIL
- [ ] Participant Management: PASS/FAIL
- [ ] Dashboard Stats: PASS/FAIL
- [ ] Security Tests: PASS/FAIL

## Database Tests
- [ ] Data Integrity: PASS/FAIL
- [ ] Foreign Keys: PASS/FAIL
- [ ] Indexes Working: PASS/FAIL

## Frontend Tests
- [ ] Authentication Flow: PASS/FAIL
- [ ] Dashboard: PASS/FAIL
- [ ] Patient Pages: PASS/FAIL
- [ ] Meeting Wizard: PASS/FAIL
- [ ] Meeting Detail: PASS/FAIL
- [ ] File Upload: PASS/FAIL

## Issues Found
1. [Issue description]
2. [Issue description]

## Notes
[Additional observations]
```

---

**Happy Testing! 🎉**

If you encounter any issues, refer to the troubleshooting section in the LOCAL_SETUP_GUIDE.md
