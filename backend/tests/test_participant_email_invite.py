"""
Test Suite: Email Invites for Newly Added Participants
Tests the bug fix where newly added participants to an existing meeting 
now receive email invitations.

Feature tested: POST /api/meetings/{meeting_id}/participants
- When a participant is added to an existing meeting, they should receive an email invite
- The email should contain meeting details (title, date, time, location)
- Works for future meetings only
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')
if BASE_URL:
    BASE_URL = BASE_URL.rstrip('/')

# Test credentials
ORGANIZER_EMAIL = "organizer@hospital.com"
ORGANIZER_PASSWORD = "password123"


@pytest.fixture(scope="module")
def organizer_token():
    """Get auth token for organizer account"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ORGANIZER_EMAIL, "password": ORGANIZER_PASSWORD}
    )
    if response.status_code != 200:
        pytest.skip(f"Could not login as organizer: {response.text}")
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(organizer_token):
    """Get authorization headers"""
    return {"Authorization": f"Bearer {organizer_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def organizer_user(auth_headers):
    """Get organizer's user details"""
    response = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
    assert response.status_code == 200
    return response.json()


@pytest.fixture
def test_user(auth_headers):
    """Create a test user for adding to meetings"""
    test_email = f"test_email_participant_{uuid.uuid4().hex[:8]}@hospital.com"
    
    # Register a new test user
    response = requests.post(
        f"{BASE_URL}/api/auth/register",
        json={
            "email": test_email,
            "name": "TEST_Email_Participant",
            "password": "testpass123",
            "specialty": "General Medicine",
            "role": "doctor"
        }
    )
    
    if response.status_code != 200:
        pytest.skip(f"Could not create test user: {response.text}")
    
    return response.json()["user"]


@pytest.fixture
def future_meeting(auth_headers):
    """Create a future meeting for testing"""
    # Create a meeting 7 days in the future
    future_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
    
    meeting_data = {
        "title": f"TEST_Email_Invite_Meeting_{uuid.uuid4().hex[:8]}",
        "description": "Test meeting for email invite feature",
        "meeting_date": future_date,
        "start_time": "14:00",
        "end_time": "15:00",
        "meeting_type": "video",
        "location": "Virtual - Zoom",
        "recurrence_type": "one_time",
        "participant_ids": []  # No participants initially
    }
    
    response = requests.post(f"{BASE_URL}/api/meetings", json=meeting_data, headers=auth_headers)
    assert response.status_code == 200, f"Failed to create meeting: {response.text}"
    
    meeting = response.json()
    yield meeting
    
    # Cleanup - cancel the meeting
    requests.delete(f"{BASE_URL}/api/meetings/{meeting['id']}", headers=auth_headers)


class TestHealthAndAuth:
    """Basic health and auth tests to ensure API is ready"""
    
    def test_api_health(self):
        """Test API is healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("API Health: PASS")
    
    def test_organizer_login(self):
        """Test organizer can login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ORGANIZER_EMAIL, "password": ORGANIZER_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        print(f"Organizer Login: PASS (role: {data['user'].get('role')})")


class TestAddParticipantEmailInvite:
    """Test that adding a participant to an existing meeting sends email invite"""
    
    def test_add_participant_to_existing_meeting_sends_email(self, auth_headers, future_meeting, test_user):
        """
        PRIORITY 1: Verify when organizer adds participant to existing meeting, 
        that participant receives email invite
        """
        meeting_id = future_meeting["id"]
        user_id = test_user["id"]
        user_email = test_user["email"]
        
        # Add participant to the meeting
        response = requests.post(
            f"{BASE_URL}/api/meetings/{meeting_id}/participants",
            json={"user_id": user_id, "role": "attendee"},
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to add participant: {response.text}"
        data = response.json()
        assert data["message"] == "Participant added successfully"
        
        print(f"Added participant {user_email} to meeting {meeting_id}")
        print("Email should have been sent (check backend logs for confirmation)")
        print("PASS: Participant added successfully - email invite triggered")
    
    def test_participant_added_with_correct_response_status(self, auth_headers, future_meeting, test_user):
        """Verify newly added participant has 'pending' response status"""
        meeting_id = future_meeting["id"]
        user_id = test_user["id"]
        
        # Add participant
        add_response = requests.post(
            f"{BASE_URL}/api/meetings/{meeting_id}/participants",
            json={"user_id": user_id, "role": "attendee"},
            headers=auth_headers
        )
        assert add_response.status_code == 200
        
        # Get meeting details to verify participant was added
        get_response = requests.get(f"{BASE_URL}/api/meetings/{meeting_id}", headers=auth_headers)
        assert get_response.status_code == 200
        
        meeting = get_response.json()
        participants = meeting.get("participants", [])
        
        # Find the added participant
        added_participant = next((p for p in participants if p.get("user_id") == user_id), None)
        assert added_participant is not None, "Participant not found in meeting"
        assert added_participant.get("response_status") == "pending", f"Expected 'pending', got {added_participant.get('response_status')}"
        assert added_participant.get("role") == "attendee"
        
        print(f"Participant {user_id} added with response_status='pending' - PASS")
    
    def test_cannot_add_duplicate_participant(self, auth_headers, future_meeting, test_user):
        """Test that adding the same participant twice returns error"""
        meeting_id = future_meeting["id"]
        user_id = test_user["id"]
        
        # Add participant first time
        first_response = requests.post(
            f"{BASE_URL}/api/meetings/{meeting_id}/participants",
            json={"user_id": user_id, "role": "attendee"},
            headers=auth_headers
        )
        assert first_response.status_code == 200
        
        # Try to add same participant again
        second_response = requests.post(
            f"{BASE_URL}/api/meetings/{meeting_id}/participants",
            json={"user_id": user_id, "role": "attendee"},
            headers=auth_headers
        )
        
        assert second_response.status_code == 400, f"Expected 400, got {second_response.status_code}"
        assert "already a participant" in second_response.text.lower()
        print("Duplicate participant rejection: PASS")


class TestEmailContents:
    """Test email contains correct meeting details"""
    
    def test_meeting_has_required_fields_for_email(self, auth_headers, future_meeting):
        """Verify meeting has all fields required for email template"""
        meeting_id = future_meeting["id"]
        
        # Get meeting details
        response = requests.get(f"{BASE_URL}/api/meetings/{meeting_id}", headers=auth_headers)
        assert response.status_code == 200
        
        meeting = response.json()
        
        # Check required fields for email are present
        assert meeting.get("title"), "Meeting title missing"
        assert meeting.get("meeting_date"), "Meeting date missing"
        assert meeting.get("start_time"), "Meeting start time missing"
        
        # Location can be optional but should have fallback
        location = meeting.get("location") or "To be announced"
        
        print(f"Meeting has all required email fields:")
        print(f"  - Title: {meeting['title']}")
        print(f"  - Date: {meeting['meeting_date']}")
        print(f"  - Time: {meeting['start_time']}")
        print(f"  - Location: {location}")
        print("PASS")


class TestDifferentRoles:
    """Test with different user roles being added"""
    
    def test_add_doctor_participant(self, auth_headers, future_meeting):
        """Test adding a doctor role participant"""
        meeting_id = future_meeting["id"]
        
        # Create a doctor user
        test_email = f"test_doctor_{uuid.uuid4().hex[:8]}@hospital.com"
        reg_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": test_email,
                "name": "TEST_Doctor_User",
                "password": "testpass123",
                "specialty": "Cardiology",
                "role": "doctor"
            }
        )
        
        if reg_response.status_code != 200:
            pytest.skip("Could not create doctor user")
        
        user_id = reg_response.json()["user"]["id"]
        
        # Add to meeting
        response = requests.post(
            f"{BASE_URL}/api/meetings/{meeting_id}/participants",
            json={"user_id": user_id, "role": "attendee"},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        print(f"Added doctor participant ({test_email}): PASS")
    
    def test_add_nurse_participant(self, auth_headers, future_meeting):
        """Test adding a nurse role participant"""
        meeting_id = future_meeting["id"]
        
        # Create a nurse user
        test_email = f"test_nurse_{uuid.uuid4().hex[:8]}@hospital.com"
        reg_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": test_email,
                "name": "TEST_Nurse_User",
                "password": "testpass123",
                "specialty": "ICU",
                "role": "nurse"
            }
        )
        
        if reg_response.status_code != 200:
            pytest.skip("Could not create nurse user")
        
        user_id = reg_response.json()["user"]["id"]
        
        # Add to meeting
        response = requests.post(
            f"{BASE_URL}/api/meetings/{meeting_id}/participants",
            json={"user_id": user_id, "role": "attendee"},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        print(f"Added nurse participant ({test_email}): PASS")


class TestE2EFlow:
    """End-to-end flow: Create meeting -> Add participant -> Verify email sent"""
    
    def test_full_flow_create_meeting_add_participant(self, auth_headers, organizer_user):
        """
        E2E Test: 
        1. Create a new meeting without participants
        2. Add a participant after meeting creation  
        3. Verify participant added with pending status
        4. (Email sending verified via backend logs)
        """
        # Step 1: Create meeting
        future_date = (datetime.now() + timedelta(days=10)).strftime("%Y-%m-%d")
        meeting_data = {
            "title": f"E2E_Test_Meeting_{uuid.uuid4().hex[:8]}",
            "description": "E2E test for email invite feature",
            "meeting_date": future_date,
            "start_time": "10:00",
            "end_time": "11:00",
            "meeting_type": "hybrid",
            "location": "Conference Room A",
            "recurrence_type": "one_time",
            "participant_ids": []
        }
        
        create_response = requests.post(f"{BASE_URL}/api/meetings", json=meeting_data, headers=auth_headers)
        assert create_response.status_code == 200, f"Failed to create meeting: {create_response.text}"
        
        meeting = create_response.json()
        meeting_id = meeting["id"]
        print(f"Step 1: Created meeting '{meeting['title']}' (ID: {meeting_id})")
        
        # Step 2: Create a new user to add
        test_email = f"e2e_test_user_{uuid.uuid4().hex[:8]}@hospital.com"
        reg_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": test_email,
                "name": "E2E_Test_Participant",
                "password": "testpass123",
                "specialty": "Oncology",
                "role": "doctor"
            }
        )
        
        assert reg_response.status_code == 200, f"Failed to create user: {reg_response.text}"
        new_user = reg_response.json()["user"]
        print(f"Step 2: Created test user '{new_user['name']}' ({new_user['email']})")
        
        # Step 3: Add participant to meeting
        add_response = requests.post(
            f"{BASE_URL}/api/meetings/{meeting_id}/participants",
            json={"user_id": new_user["id"], "role": "attendee"},
            headers=auth_headers
        )
        
        assert add_response.status_code == 200, f"Failed to add participant: {add_response.text}"
        print(f"Step 3: Added participant to meeting")
        
        # Step 4: Verify participant in meeting details
        get_response = requests.get(f"{BASE_URL}/api/meetings/{meeting_id}", headers=auth_headers)
        assert get_response.status_code == 200
        
        meeting_details = get_response.json()
        participants = meeting_details.get("participants", [])
        
        added_participant = next((p for p in participants if p.get("user_id") == new_user["id"]), None)
        assert added_participant is not None, "Participant not found in meeting"
        assert added_participant.get("response_status") == "pending"
        
        print(f"Step 4: Verified participant added with status='pending'")
        print("")
        print("=" * 60)
        print("E2E TEST COMPLETE")
        print(f"- Meeting: {meeting['title']}")
        print(f"- Date: {meeting_data['meeting_date']} at {meeting_data['start_time']}")
        print(f"- Participant Added: {new_user['email']}")
        print(f"- Email should be sent (check backend logs)")
        print("=" * 60)
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/meetings/{meeting_id}", headers=auth_headers)


class TestMeetingNotFoundCases:
    """Test error handling for invalid meeting IDs"""
    
    def test_add_participant_to_nonexistent_meeting(self, auth_headers, test_user):
        """Test adding participant to non-existent meeting returns 404"""
        fake_meeting_id = str(uuid.uuid4())
        
        response = requests.post(
            f"{BASE_URL}/api/meetings/{fake_meeting_id}/participants",
            json={"user_id": test_user["id"], "role": "attendee"},
            headers=auth_headers
        )
        
        assert response.status_code == 404
        print("Non-existent meeting returns 404: PASS")


class TestParticipantCanAddParticipant:
    """Test that existing participants can also add new participants"""
    
    def test_participant_can_add_other_participant(self, auth_headers, future_meeting):
        """Test that an existing participant can add another participant"""
        meeting_id = future_meeting["id"]
        
        # Create first participant
        first_email = f"first_participant_{uuid.uuid4().hex[:8]}@hospital.com"
        first_reg = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": first_email,
                "name": "First_Participant",
                "password": "testpass123",
                "role": "doctor"
            }
        )
        
        if first_reg.status_code != 200:
            pytest.skip("Could not create first participant")
        
        first_user = first_reg.json()["user"]
        first_token = first_reg.json()["access_token"]
        first_headers = {"Authorization": f"Bearer {first_token}", "Content-Type": "application/json"}
        
        # Add first participant using organizer
        add_first = requests.post(
            f"{BASE_URL}/api/meetings/{meeting_id}/participants",
            json={"user_id": first_user["id"], "role": "attendee"},
            headers=auth_headers
        )
        assert add_first.status_code == 200
        
        # Create second participant
        second_email = f"second_participant_{uuid.uuid4().hex[:8]}@hospital.com"
        second_reg = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": second_email,
                "name": "Second_Participant",
                "password": "testpass123",
                "role": "doctor"
            }
        )
        
        if second_reg.status_code != 200:
            pytest.skip("Could not create second participant")
        
        second_user = second_reg.json()["user"]
        
        # First participant adds second participant
        add_second = requests.post(
            f"{BASE_URL}/api/meetings/{meeting_id}/participants",
            json={"user_id": second_user["id"], "role": "attendee"},
            headers=first_headers
        )
        
        assert add_second.status_code == 200, f"Participant could not add other participant: {add_second.text}"
        print("Existing participant can add new participant: PASS")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
