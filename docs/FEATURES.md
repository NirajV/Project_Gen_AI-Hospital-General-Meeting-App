# 🎯 MedMeet Features Documentation

> Comprehensive guide to all features in the Hospital Case Meeting Scheduler

Last Updated: April 2026 | Version 2.0.0

---

## 📋 Table of Contents

1. [Authentication & User Management](#authentication--user-management)
2. [Dashboard & Analytics](#dashboard--analytics)
3. [Meeting Management](#meeting-management)
4. [Patient Management](#patient-management)
5. [Participant Management](#participant-management)
6. [File Management](#file-management)
7. [Decision Logging](#decision-logging)
8. [Email Notifications](#email-notifications)
9. [PDF Generation](#pdf-generation)
10. [User Feedback System](#user-feedback-system)
11. [Permission Matrix](#permission-matrix)

---

## 🔐 Authentication & User Management

### Dual Authentication System

**Email/Password Login**
- Traditional login with email and password
- JWT token-based authentication
- Secure bcrypt password hashing
- Session management with 24-hour expiration

**Google OAuth (Emergent-Managed)**
- One-click Google sign-in
- Automatic account creation
- No password required
- Managed by Emergent integration service

### Profile Management

**Profile Page Features:**
- ✅ View and edit personal information (Name, Specialty, Organization, Phone)
- ✅ Email field (read-only, cannot be changed)
- ✅ Change password functionality
- ✅ Current/New/Confirm password validation
- ✅ Minimum 8 character password requirement
- ✅ User avatar with initials fallback

**User Roles:**
- **Organizer** - Full system access, can create meetings and manage users
- **Doctor** - Can participate in meetings, manage patients
- **Nurse** - Can participate in meetings
- **Admin** - System administrator with organizer-level access

---

## 📊 Dashboard & Analytics

### Dashboard Overview

**Statistics Cards (Color-Coded):**
1. **Upcoming Meetings** (Navy Blue)
   - Count of scheduled future meetings
   - Quick view of next meeting time

2. **This Week** (Teal Green)
   - Meetings scheduled for current week
   - Clock icon indicator

3. **Pending Invites** (Amber)
   - Number of meetings awaiting response
   - Only visible for non-organizers

4. **Total Patients** (Purple)
   - System-wide patient count
   - Quick access to patient management

### Upcoming Meetings List

**Features:**
- Chronological list of future meetings
- Color-coded meeting type indicators
- Quick response buttons (Accept/Maybe/Decline)
- Meeting date, time, and location display
- Direct navigation to meeting details
- "Schedule your first meeting" empty state

### Dashboard Response System

**Participant Response Options:**
- ✅ **Accept** (Green) - Confirm attendance
- ⚠️ **Maybe** (Amber) - Tentative attendance
- ❌ **Decline** (Red) - Cannot attend

**Response Features:**
- One-click response directly from dashboard
- Real-time UI updates after response
- "Pending Invites" counter decreases automatically
- Response persists across sessions
- Can change response at any time

**Visibility Rules:**
- Only visible to meeting participants (not organizers)
- Hidden for completed/cancelled meetings
- Label changes from "Respond:" to "Change:" after initial response

---

## 🗓️ Meeting Management

### Meeting Creation Wizard

**Multi-Step Process:**

**Step 1: Basic Details**
- Meeting title (required)
- Description
- Date and time (start/end)
- Duration calculation
- Meeting type (Video/In-Person/Hybrid)
- Video link (for video/hybrid meetings)
- Physical location (for in-person/hybrid meetings)

**Step 2: Participants**
- Select existing staff from system
- Checkbox selection interface
- Role display (Organizer, Doctor, Nurse, Admin)
- Specialty information
- **OR** Invite by email:
  - Email address (required)
  - Full name (required)
  - Specialty (optional)
  - Auto-creates account with temporary password: `TempPass123!`

**Step 3: Patients**
- Select existing patients from database
- Checkbox selection interface
- Patient details preview (MRN, Diagnosis)
- Add clinical question for each patient
- **OR** Create new patient inline:
  - First/Last name, MRN
  - Date of birth, Gender
  - Primary diagnosis
  - Contact information

**Step 4: Agenda**
- Add multiple agenda items
- Item title and description
- Estimated duration (minutes)
- Order index for sequencing
- Drag-and-drop reordering
- Total meeting duration calculation

### Meeting Detail Page (Case Room)

**Overview Tab:**
- Complete meeting information
- Participant list with response status
- Patient list with clinical questions
- Quick actions: Edit, Delete, Complete
- Add/Remove participants button
- Add/Remove patients button

**Patients Tab:**
- Detailed patient information
- Associated clinical questions
- Patient medical history
- Direct link to full patient profile
- Treatment plan summary

**Meetings Tab (in Patient Detail):**
- View all meetings for a patient
- Meeting history
- Treatment plan tracking
- 32px white space between meeting cards (Clinical Zen design)

**Treatment Plans Tab (in Patient Detail):**
- Chronological list of treatment plans
- Sorted by date (descending)
- Associated meeting information
- Treatment plan details
- Empty state: "No treatment plans found for this patient"

**Agenda Tab:**
- Full agenda item list with details
- Estimated duration per item
- Add new agenda items during meeting
- Edit/Delete agenda items
- Treatment plan attachment to agenda items

**Files Tab:**
- Upload medical records, images, documents
- Associate files with specific patients
- File type indicators
- Download/Delete functionality
- File size and upload date
- Organized by patient

**Decisions Tab:**
- Log clinical decisions
- Decision type: Treatment / Diagnostic / Referral / Follow-up
- Title and description
- Final assessment
- Action plan
- Responsible doctor assignment
- Follow-up date
- Priority level (High/Medium/Low)
- Status tracking (Pending/Implemented/Completed)

### Meeting Status Management

**Status Lifecycle:**
- **Scheduled** → Meeting created, awaiting date
- **In Progress** → Meeting currently active
- **Completed** → Meeting finished, records locked
- **Cancelled** → Meeting cancelled

**Completed Status Features:**
- Triggers `completed_at` timestamp
- Activates 7-day treatment plan edit window
- Enables post-meeting PDF summary generation
- Locks meeting details from editing

### 7-Day Treatment Plan Edit Window

**After Meeting Completion:**
- Treatment plans can be edited for 7 days
- Real-time countdown displayed
- Warning banner: "Treatment plan can be edited for X more days"
- After 7 days: Red alert "The 7-day edit window has expired"
- Edit button disabled after expiration
- Both organizers and participants can edit within window
- Read-only after expiration

**Business Logic:**
- Countdown starts when meeting status changes to "completed"
- Calculated from `completed_at` timestamp
- Helper functions: `isTreatmentPlanEditable()`, `getRemainingEditDays()`

---

## 👨‍⚕️ Patient Management

### Patient Records

**Patient Information:**
- **Demographics:** First/Last name, Date of birth, Gender
- **Identifiers:** Patient ID Number (MRN), System ID
- **Contact:** Email, Phone, Address
- **Medical:** Primary diagnosis, Allergies, Current medications
- **Organization:** Department name, Department provider
- **Notes:** Additional clinical notes

### Patient Creation

**Create Patient Form:**
- All fields above
- Validation for required fields
- Date of birth validation (cannot be future)
- MRN uniqueness check
- Real-time form validation

### Patient Detail Page

**Tabs:**
1. **Overview**
   - Complete patient information
   - Edit button for updates
   - Quick stats (Meetings count, Documents)

2. **Meetings** (with 32px spacing)
   - List of all meetings patient attended
   - Meeting status indicators
   - Direct navigation to meetings
   - Clinical questions for each meeting
   - Proper white space between cards (Clinical Zen UI)

3. **Files**
   - Uploaded documents for this patient
   - Organized by meeting
   - Download functionality

4. **Treatment Plans** ✨ NEW
   - Chronological list of treatment recommendations
   - Sorted by date (descending)
   - Associated meeting information
   - Treatment details and action plans
   - Empty state message

### Patient Search & Filter

- Search by name, MRN, or diagnosis
- Real-time search results
- Grid layout with patient cards
- Color-coded patient cards (Amber theme)
- Quick view of diagnosis and department

---

## 👥 Participant Management

### Participants Page

**Statistics Dashboard:**
- Total participants count
- Breakdown by role (Doctors, Nurses, Admins)
- Real-time stat updates

**Participant Directory:**
- Grid layout of participant cards
- Avatar with initials
- Name, email, specialty
- Role badge (color-coded)
- Contact information (phone)
- Search by name, email, or specialty
- Filter by role (All/Doctor/Nurse/Admin/Organizer)

### Create New Participant ⚡ Organizer Only

**Features:**
- "Create Participant" button (top right, dark blue)
- Modal dialog form
- **Required fields:**
  - Full name
  - Email address
  - Role selection (Doctor/Nurse/Admin/Organizer)
- **Optional fields:**
  - Specialty
  - Phone number
- Default password: `TempPass123!`
- Email uniqueness validation
- Success message with credentials
- Auto-refresh participant list

**Permissions:**
- ✅ Organizers can create
- ✅ Admins can create
- ❌ Doctors cannot create (button hidden)
- ❌ Nurses cannot create (button hidden)

### Change Participant Role ⚡ Organizer Only

**Features:**
- Small edit icon (pencil ✏️) next to role badge
- Inline dropdown editor
- Four role options: Doctor | Nurse | Admin | Organizer
- Auto-saves on selection (no separate save button)
- Cancel button (X) to exit
- Role badge color updates immediately
- Success confirmation message
- Backend permission validation
- Audit trail with timestamps

**Permissions:**
- ✅ Organizers can change roles
- ✅ Admins can change roles
- ❌ Doctors cannot change roles (icon hidden)
- ❌ Nurses cannot change roles (icon hidden)

**Role Badge Colors:**
- Doctor: Blue (bg-blue-100)
- Nurse: Green (bg-green-100)
- Admin: Purple (bg-purple-100)
- Organizer: Purple (bg-purple-100)

---

## 📁 File Management

### File Upload

**Supported File Types:**
- Medical images (JPG, PNG, DICOM)
- Documents (PDF, DOCX)
- Lab results
- Scans and reports

**Upload Features:**
- Drag-and-drop interface
- File size validation
- Associate with specific patient
- Add description/notes
- Automatic thumbnail generation (images)
- Upload progress indicator

### File Organization

- Files organized by meeting
- Patient-specific file filtering
- File type icons
- Upload date and uploader tracking
- Download functionality
- Delete with confirmation

---

## 📝 Decision Logging

### Decision Types

1. **Treatment** - Treatment plan decisions
2. **Diagnostic** - Diagnostic test orders
3. **Referral** - Specialist referrals
4. **Follow-up** - Follow-up appointment plans

### Decision Fields

- Decision type (required)
- Title (required)
- Description
- Final assessment
- Action plan
- Responsible doctor (dropdown)
- Follow-up date
- Priority (High/Medium/Low)
- Status (Pending/Implemented/Completed)

### Decision Tracking

- Chronological list view
- Filter by type, status, priority
- Edit existing decisions
- Mark as completed
- Export to PDF summary

---

## 📧 Email Notifications

### Meeting Invite Notifications

**Trigger:** Meeting creation
**Recipients:** All invited participants (except organizer)
**Content:**
- Meeting title and description
- Date, time, and location
- Organizer information
- Quick action buttons (Accept/Decline)
- Link to meeting details

### Response Change Alerts

**Trigger:** Participant updates response status
**Recipient:** Meeting organizer
**Content:**
- Participant name and role
- Response status (Accepted/Maybe/Declined)
- Meeting details
- Current response summary

### Meeting Reminders

**24-Hour Reminder:**
- Sent 1 day before meeting
- Recipients: All participants who accepted
- Content: Meeting reminder with countdown

**1-Hour Reminder:**
- Sent 1 hour before meeting
- Recipients: All participants who accepted
- Content: Immediate reminder with join link

### Email Configuration

**SMTP Settings in `.env`:**
```
EMAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

**Email Templates:**
- HTML responsive design
- Mobile-friendly layout
- Professional branding
- Color-coded by type

---

## 📄 PDF Generation

### Post-Meeting Summary PDF

**Features:**
- Auto-generate after meeting completion
- Includes all meeting details
- Participant list with responses
- Patient information with MRN
- All agenda items
- Treatment plans
- Decisions logged
- Filename format: `Summary+{Meeting Title}+{Date}+{Time}.pdf`
- Excludes "Untitled" fields
- Professional clinical layout

**Generation:**
- Click "Generate PDF Summary" button
- Uses ReportLab library
- Downloads automatically
- Stored for future access

**Content Sections:**
1. Meeting Header (Title, Date, Time, Location)
2. Organizer & Participants
3. Patients (with MRN)
4. Agenda Items
5. Treatment Plans
6. Decisions & Action Items
7. Follow-up Requirements

---

## 💬 User Feedback System

### Feedback Form (Profile Page)

**Location:** Profile Page → Send Feedback Section

**Features:**
- Feedback type dropdown:
  - 🚀 Feature Request
  - 🐛 Bug Report
  - ✨ Enhancement
- Subject field (required)
- Message textarea (required, 6 rows)
- Cancel button
- Send Feedback button

**Submission:**
- Backend API: `POST /api/feedback`
- Emails sent to: `Niraj.K.Vishwakarma@gmail.com`
- Beautiful HTML email template with gradient header
- Stores feedback in MongoDB database
- Success alert after submission
- Form resets automatically

**Email Content:**
- Feedback type (color-coded badge)
- User information (name, role, email)
- Subject line
- Detailed message
- Submission timestamp
- Feedback ID for tracking

**Database Storage:**
- Feedback collection
- User tracking
- Status field (pending/reviewed/implemented)
- Created timestamp

---

## 🔒 Permission Matrix

### Feature Access by Role

| Feature | Organizer | Admin | Doctor | Nurse |
|---------|-----------|-------|--------|-------|
| **Dashboard** | ✅ | ✅ | ✅ | ✅ |
| **View Meetings** | ✅ | ✅ | ✅ | ✅ |
| **Create Meetings** | ✅ | ✅ | ✅ | ✅ |
| **Edit Meetings** | ✅ Owner | ✅ Owner | ✅ Owner | ✅ Owner |
| **Delete Meetings** | ✅ Owner | ❌ | ❌ | ❌ |
| **Mark as Completed** | ✅ | ❌ | ❌ | ❌ |
| **Respond to Invites** | ✅ | ✅ | ✅ | ✅ |
| **Add Participants** | ✅ | ✅ | ✅ | ✅ |
| **Add Patients** | ✅ | ✅ | ✅ | ✅ |
| **Create Patients** | ✅ | ✅ | ✅ | ✅ |
| **Edit Patients** | ✅ | ✅ | ✅ | ✅ |
| **Delete Patients** | ✅ | ❌ | ❌ | ❌ |
| **Edit Treatment Plans (7 days)** | ✅ | ✅ | ✅ | ✅ |
| **Log Decisions** | ✅ | ✅ | ✅ | ✅ |
| **Upload Files** | ✅ | ✅ | ✅ | ✅ |
| **View Participants Page** | ✅ | ✅ | ✅ | ✅ |
| **Create Participant** | ✅ | ✅ | ❌ | ❌ |
| **Change User Role** | ✅ | ✅ | ❌ | ❌ |
| **Generate PDF Summary** | ✅ | ✅ | ✅ | ✅ |
| **Submit Feedback** | ✅ | ✅ | ✅ | ✅ |

### Permission Notes

- **Owner** = User who created the meeting
- ✅ = Full access
- ❌ = No access
- Features marked "Owner" require user to be the meeting creator

---

## 🎨 UI Design System (Clinical Zen)

### Color Coding

**Strict Rotating Pattern:**
- 🟦 **Dashboard:** Blue (#0b0b30 / #e8e8f5)
- 🟢 **Meetings:** Teal (#3b6658 / #e8f5f0)
- 🟡 **Patients:** Amber (#694e20 / #f5f0e8)
- 🟣 **Participants:** Purple (#68517d / #f3edf5)

### Spacing Standards

- **Between Meeting Cards:** 32px (`space-y-8`)
- **Card Padding:** 24px
- **Button Height:** 44px (11 in Tailwind)
- **Modal Max Width:** 600px

### Typography

- **H1 (Main Heading):** text-4xl → text-6xl (responsive)
- **H2 (Subheading):** text-base → text-lg
- **Body:** text-base (mobile: text-sm)
- **Small/Accent:** text-sm or text-xs

---

## 📊 Feature Statistics

- **Total Features:** 50+
- **API Endpoints:** 30+
- **Database Collections:** 8
- **Email Templates:** 4
- **PDF Templates:** 1
- **UI Components:** 100+

---

## 🚀 Recent Additions (v2.0.0 - April 2026)

- ✅ Treatment Plans Tab in Patient Detail
- ✅ User Feedback Form with Email Integration
- ✅ Updated Application Owner Email
- ✅ CORS Configuration Fix
- ✅ Profile Page Authentication Fix
- ✅ Feedback Endpoint Debugging

---

## 📝 Notes

- All features tested and working in production
- Email notifications require SMTP configuration
- PDF generation uses ReportLab library
- File uploads stored locally (cloud migration planned)
- Real-time updates not yet implemented (manual refresh required)

---

**For technical implementation details, see [API_REFERENCE.md](./API_REFERENCE.md)**

Last Updated: April 6, 2026 | MedMeet v2.0.0
