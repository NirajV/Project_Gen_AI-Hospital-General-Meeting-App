# 🎯 Microsoft Teams Integration - Future Implementation Guide

**Status:** 📝 Documented for future implementation  
**Priority:** Backlog  
**Created:** March 3, 2026

---

## 📋 **Overview**

This document outlines the potential implementation of Microsoft Teams meeting link integration for the Hospital Meeting Scheduler app. This feature would allow automatic creation and management of Microsoft Teams meeting links within the application.

---

## 🎯 **Feature Requirements**

### **Primary Goal:**
Enable seamless integration with Microsoft Teams to automatically generate and manage Teams meeting links for scheduled hospital meetings.

### **User Story:**
As a meeting organizer, I want to automatically create Microsoft Teams meeting links when scheduling a meeting, so that participants can easily join via Teams without manual link creation.

---

## 🔀 **Implementation Options**

### **Option A: Manual Teams Link Entry** ⌨️

**Description:** Users manually create Teams meetings and paste the link into the app.

**Implementation:**
- ✅ **Already supported!** The current `video_link` field accepts Teams links
- No additional development needed
- Just better UI labeling/guidance

**Pros:**
- ✅ No API integration required
- ✅ No authentication setup needed
- ✅ Works immediately
- ✅ No ongoing maintenance
- ✅ User has full control

**Cons:**
- ❌ Manual work for organizer
- ❌ Extra steps to create meeting
- ❌ Potential for copy-paste errors
- ❌ No automatic updates if Teams link changes

**Estimated Effort:** 1-2 hours (UI improvements only)

---

### **Option B: Automatic Teams Meeting Creation** 🤖 (RECOMMENDED)

**Description:** App automatically creates Teams meetings via Microsoft Graph API.

**Implementation:**
- Integrate Microsoft Graph API
- Implement OAuth 2.0 authentication
- Create Teams meeting on hospital meeting creation
- Store and display Teams link automatically

**Pros:**
- ✅ Fully automated experience
- ✅ No manual link creation
- ✅ Professional integration
- ✅ Can update/cancel Teams meetings automatically
- ✅ Seamless user experience

**Cons:**
- ❌ Requires Microsoft 365 subscription
- ❌ Needs app registration in Azure AD
- ❌ OAuth setup complexity
- ❌ API rate limits to consider
- ❌ Ongoing maintenance required

**Estimated Effort:** 8-16 hours

---

### **Option C: Teams Link Generator Helper** 🔗

**Description:** Provide quick links/buttons to open Teams meeting creation.

**Implementation:**
- Add "Create Teams Meeting" button
- Opens Teams web interface in new tab
- User copies link back to app

**Pros:**
- ✅ Faster than fully manual
- ✅ No API integration needed
- ✅ Simple to implement
- ✅ No authentication required

**Cons:**
- ❌ Still requires manual steps
- ❌ Not fully automated
- ❌ Extra browser tabs

**Estimated Effort:** 2-4 hours

---

## 🔧 **Technical Implementation: Option B (Automatic)**

### **Prerequisites**

1. **Microsoft 365 Account**
   - Organization must have Microsoft 365 subscription
   - Need admin access to Azure AD

2. **Azure AD App Registration**
   - Register application in Azure portal
   - Obtain Client ID and Client Secret
   - Configure redirect URIs

3. **API Permissions Required**
   - `OnlineMeetings.ReadWrite` - Create Teams meetings
   - `Calendars.ReadWrite` - Manage calendar events
   - `User.Read` - Read user profile

---

### **Step 1: Azure AD App Registration**

**Actions:**
1. Go to https://portal.azure.com
2. Navigate to "Azure Active Directory" → "App registrations"
3. Click "New registration"
4. Fill in:
   - Name: "Hospital Meeting Scheduler"
   - Supported account types: "Single tenant"
   - Redirect URI: `https://your-app.com/api/auth/microsoft/callback`
5. Note down:
   - **Application (client) ID**
   - **Directory (tenant) ID**

**Create Client Secret:**
1. Go to "Certificates & secrets"
2. Click "New client secret"
3. Set expiration (24 months recommended)
4. Copy the secret value immediately (shown only once!)

**Configure API Permissions:**
1. Go to "API permissions"
2. Click "Add a permission" → "Microsoft Graph"
3. Select "Delegated permissions"
4. Add:
   - `OnlineMeetings.ReadWrite`
   - `Calendars.ReadWrite`
   - `User.Read`
   - `offline_access` (for refresh tokens)
5. Click "Grant admin consent"

---

### **Step 2: Backend Implementation**

**Add Environment Variables** (`/app/backend/.env`):
```env
# Microsoft Teams Integration
MICROSOFT_TENANT_ID=your-tenant-id-here
MICROSOFT_CLIENT_ID=your-client-id-here
MICROSOFT_CLIENT_SECRET=your-client-secret-here
MICROSOFT_REDIRECT_URI=https://your-app.com/api/auth/microsoft/callback
```

**Install Required Libraries** (`requirements.txt`):
```
msal==1.25.0  # Microsoft Authentication Library
requests==2.31.0
```

**Create Microsoft Graph API Client** (`/app/backend/utils/microsoft_teams.py`):
```python
import msal
import requests
import os
from typing import Dict, Optional

TENANT_ID = os.getenv("MICROSOFT_TENANT_ID")
CLIENT_ID = os.getenv("MICROSOFT_CLIENT_ID")
CLIENT_SECRET = os.getenv("MICROSOFT_CLIENT_SECRET")
REDIRECT_URI = os.getenv("MICROSOFT_REDIRECT_URI")

AUTHORITY = f"https://login.microsoftonline.com/{TENANT_ID}"
SCOPES = ["https://graph.microsoft.com/.default"]

def get_access_token() -> Optional[str]:
    """Get access token using client credentials flow"""
    app = msal.ConfidentialClientApplication(
        CLIENT_ID,
        authority=AUTHORITY,
        client_credential=CLIENT_SECRET
    )
    
    result = app.acquire_token_for_client(scopes=SCOPES)
    
    if "access_token" in result:
        return result["access_token"]
    else:
        print(f"Error: {result.get('error')}")
        print(f"Description: {result.get('error_description')}")
        return None


def create_teams_meeting(
    subject: str,
    start_datetime: str,  # ISO 8601 format
    end_datetime: str,
    organizer_email: str
) -> Optional[Dict]:
    """
    Create a Microsoft Teams online meeting
    
    Args:
        subject: Meeting title
        start_datetime: Start time in ISO 8601 format
        end_datetime: End time in ISO 8601 format
        organizer_email: Email of meeting organizer
    
    Returns:
        Dict with Teams meeting details including join URL
    """
    access_token = get_access_token()
    if not access_token:
        return None
    
    # Microsoft Graph API endpoint
    endpoint = f"https://graph.microsoft.com/v1.0/users/{organizer_email}/onlineMeetings"
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    body = {
        "subject": subject,
        "startDateTime": start_datetime,
        "endDateTime": end_datetime,
        "participants": {
            "organizer": {
                "identity": {
                    "user": {
                        "id": organizer_email
                    }
                }
            }
        }
    }
    
    response = requests.post(endpoint, json=body, headers=headers)
    
    if response.status_code == 201:
        meeting_data = response.json()
        return {
            "join_url": meeting_data.get("joinWebUrl"),
            "meeting_id": meeting_data.get("id"),
            "audio_conferencing": meeting_data.get("audioConferencing")
        }
    else:
        print(f"Error creating Teams meeting: {response.status_code}")
        print(response.text)
        return None


def delete_teams_meeting(meeting_id: str, organizer_email: str) -> bool:
    """Delete a Teams meeting"""
    access_token = get_access_token()
    if not access_token:
        return False
    
    endpoint = f"https://graph.microsoft.com/v1.0/users/{organizer_email}/onlineMeetings/{meeting_id}"
    
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    response = requests.delete(endpoint, headers=headers)
    return response.status_code == 204


def update_teams_meeting(
    meeting_id: str,
    organizer_email: str,
    subject: Optional[str] = None,
    start_datetime: Optional[str] = None,
    end_datetime: Optional[str] = None
) -> Optional[Dict]:
    """Update an existing Teams meeting"""
    access_token = get_access_token()
    if not access_token:
        return None
    
    endpoint = f"https://graph.microsoft.com/v1.0/users/{organizer_email}/onlineMeetings/{meeting_id}"
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    body = {}
    if subject:
        body["subject"] = subject
    if start_datetime:
        body["startDateTime"] = start_datetime
    if end_datetime:
        body["endDateTime"] = end_datetime
    
    response = requests.patch(endpoint, json=body, headers=headers)
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error updating Teams meeting: {response.status_code}")
        return None
```

**Integrate with Meeting Creation** (`/app/backend/server.py`):
```python
from utils.microsoft_teams import create_teams_meeting, delete_teams_meeting

@api_router.post("/meetings")
async def create_meeting(meeting: MeetingCreate, current_user: dict = Depends(get_current_user)):
    # ... existing meeting creation code ...
    
    # Auto-create Teams meeting if enabled
    teams_enabled = os.getenv("TEAMS_AUTO_CREATE", "false").lower() == "true"
    
    if teams_enabled:
        try:
            # Format datetime for Microsoft Graph
            start_iso = f"{meeting.meeting_date}T{meeting.start_time}:00"
            end_iso = f"{meeting.meeting_date}T{meeting.end_time}:00"
            
            teams_meeting = create_teams_meeting(
                subject=meeting.title,
                start_datetime=start_iso,
                end_datetime=end_iso,
                organizer_email=current_user['email']
            )
            
            if teams_meeting:
                # Store Teams meeting ID and use join URL as video_link
                meeting_doc['video_link'] = teams_meeting['join_url']
                meeting_doc['teams_meeting_id'] = teams_meeting['meeting_id']
                logger.info(f"Created Teams meeting: {teams_meeting['meeting_id']}")
        except Exception as e:
            logger.error(f"Failed to create Teams meeting: {str(e)}")
    
    # ... rest of meeting creation ...
```

---

### **Step 3: Frontend Implementation**

**Add Teams Icon/Indicator:**
```javascript
// In MeetingDetailPage.js or MeetingWizardPage.js
import { Video } from 'lucide-react';

// Display Teams meeting indicator
{meeting.video_link?.includes('teams.microsoft.com') && (
  <Badge variant="secondary" className="bg-purple-100 text-purple-800">
    <Video className="w-3 h-3 mr-1" />
    Microsoft Teams
  </Badge>
)}
```

**Auto-detect Teams Links:**
```javascript
const isTeamsLink = (url) => {
  return url?.includes('teams.microsoft.com') || url?.includes('teams.live.com');
};

// Show Teams-specific UI
{isTeamsLink(meeting.video_link) && (
  <div className="flex items-center gap-2 text-purple-700">
    <Video className="w-4 h-4" />
    <span>Microsoft Teams Meeting</span>
  </div>
)}
```

---

### **Step 4: Database Schema Updates**

**Add to `meetings` collection:**
```javascript
{
  // ... existing fields ...
  "video_link": "https://teams.microsoft.com/l/meetup-join/...",
  "teams_meeting_id": "MSo1N2Y5ZGFjYy03MWJmLTQ3NDMtYjQxMy01M2EdFGkdRWHJlQ",  // NEW
  "teams_auto_created": true  // NEW
}
```

---

## 🔐 **Authentication Flow**

### **User OAuth Flow (Alternative to Client Credentials)**

For more granular control and user-specific meetings:

1. **User clicks "Connect Microsoft Teams"**
2. **Redirect to Microsoft login:**
   ```
   https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize?
   client_id={client_id}&
   response_type=code&
   redirect_uri={redirect_uri}&
   scope=OnlineMeetings.ReadWrite Calendars.ReadWrite&
   state={random_state}
   ```

3. **Microsoft redirects back with authorization code**

4. **Exchange code for access token:**
   ```python
   POST https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
   
   Body:
   - client_id
   - client_secret
   - code
   - redirect_uri
   - grant_type=authorization_code
   ```

5. **Store tokens in database:**
   ```javascript
   {
     "user_id": "...",
     "microsoft_access_token": "...",
     "microsoft_refresh_token": "...",
     "token_expires_at": "2026-03-04T10:00:00Z"
   }
   ```

6. **Use stored tokens for API calls**

---

## 📊 **API Rate Limits**

**Microsoft Graph API Limits:**
- **Throttling:** 2,000 requests per user per 20 seconds
- **OnlineMeetings:** 2,000 requests per app per 10 seconds
- **Best Practice:** Implement retry logic with exponential backoff

**Error Handling:**
```python
def api_call_with_retry(func, max_retries=3):
    for attempt in range(max_retries):
        try:
            return func()
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 429:  # Too many requests
                retry_after = int(e.response.headers.get('Retry-After', 60))
                time.sleep(retry_after)
                continue
            raise
    raise Exception("Max retries exceeded")
```

---

## 🧪 **Testing Strategy**

### **Unit Tests:**
```python
def test_create_teams_meeting():
    result = create_teams_meeting(
        subject="Test Meeting",
        start_datetime="2026-03-05T14:00:00",
        end_datetime="2026-03-05T15:00:00",
        organizer_email="test@hospital.com"
    )
    
    assert result is not None
    assert "join_url" in result
    assert "teams.microsoft.com" in result["join_url"]
```

### **Integration Tests:**
- Test with actual Microsoft 365 account
- Verify meeting creation in Teams calendar
- Test meeting updates and deletions
- Verify email notifications include Teams link

---

## 🚨 **Error Handling**

### **Common Errors:**

1. **Authentication Failed:**
   - Check client ID/secret
   - Verify tenant ID
   - Ensure API permissions granted

2. **User Not Found:**
   - Organizer email must be valid Microsoft 365 user
   - User must be in same tenant

3. **Permission Denied:**
   - Check API permissions in Azure AD
   - Admin consent may be required

4. **Rate Limit Exceeded:**
   - Implement exponential backoff
   - Queue meeting creation requests

---

## 💰 **Cost Considerations**

**Microsoft 365 Requirements:**
- Free tier: Not available for Graph API production use
- **Business Basic:** $6/user/month (minimum)
- **Business Standard:** $12.50/user/month (recommended)

**Azure AD:**
- App registration: Free
- API calls: Free (within limits)

**Ongoing Costs:**
- Microsoft 365 subscription: Required
- Azure hosting (if needed): Variable

---

## 📅 **Implementation Timeline**

**Phase 1: Setup (2-4 hours)**
- Azure AD app registration
- API permissions configuration
- Environment variable setup

**Phase 2: Backend (4-6 hours)**
- Microsoft Graph integration
- Authentication flow
- Meeting CRUD operations

**Phase 3: Frontend (2-4 hours)**
- UI updates for Teams links
- Connection flow UI
- Error handling displays

**Phase 4: Testing (2-3 hours)**
- Unit tests
- Integration tests
- User acceptance testing

**Total Estimated Time:** 10-17 hours

---

## 🔄 **Alternative: Simple Implementation**

For immediate use without API integration:

**Quick Win:**
1. Add "Microsoft Teams" as meeting type option
2. Update UI to show Teams icon when selected
3. Add helpful link: "Create Teams meeting" → Opens Teams web
4. User pastes link into video_link field

**Implementation Time:** 1-2 hours  
**No API needed:** ✅  
**Works immediately:** ✅

---

## 📚 **References**

**Official Documentation:**
- Microsoft Graph API: https://docs.microsoft.com/en-us/graph/api/
- Online Meetings API: https://docs.microsoft.com/en-us/graph/api/resources/onlinemeeting
- MSAL Python: https://msal-python.readthedocs.io/

**Useful Links:**
- Azure Portal: https://portal.azure.com
- Graph Explorer: https://developer.microsoft.com/en-us/graph/graph-explorer
- Microsoft 365 Admin: https://admin.microsoft.com

---

## ✅ **Implementation Checklist**

When ready to implement, complete these steps:

**Prerequisites:**
- [ ] Obtain Microsoft 365 subscription
- [ ] Get Azure AD admin access
- [ ] Register application in Azure AD
- [ ] Note Client ID, Tenant ID, Client Secret
- [ ] Configure API permissions
- [ ] Grant admin consent

**Backend:**
- [ ] Add environment variables to .env
- [ ] Install msal library
- [ ] Create microsoft_teams.py utility
- [ ] Update meeting creation endpoint
- [ ] Add Teams meeting ID to database schema
- [ ] Implement error handling
- [ ] Add logging for debugging

**Frontend:**
- [ ] Add Teams meeting indicator
- [ ] Update meeting creation UI
- [ ] Add connection status display
- [ ] Implement error messages
- [ ] Add Teams icon/branding

**Testing:**
- [ ] Test meeting creation
- [ ] Test meeting updates
- [ ] Test meeting deletion
- [ ] Verify calendar sync
- [ ] Test error scenarios
- [ ] User acceptance testing

**Documentation:**
- [ ] Update user guide
- [ ] Document admin setup steps
- [ ] Create troubleshooting guide

---

## 🎯 **Recommendation**

**For Now:**
- ✅ Use existing video_link field with Teams URLs
- ✅ Add better UI labeling for Teams meetings
- ✅ Document this integration guide for future

**For Later (When Ready):**
- 🚀 Implement Option B (Automatic) when:
  - Microsoft 365 access is available
  - Admin can register Azure AD app
  - Development time is allocated
  - Budget for Microsoft 365 is confirmed

---

**Document Version:** 1.0  
**Last Updated:** March 3, 2026  
**Status:** 📝 Ready for implementation when requirements are met
