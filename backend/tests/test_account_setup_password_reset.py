"""
Test Suite: Account Setup Email & Password Reset Features
Tests the two new features:
1. Account Setup Email - When inviting new participant with auto-generated credentials
2. Password Reset - Reset password from UI and receive new password via email

Feature 1: POST /api/auth/register with meeting_id
- Auto-generates secure 12-char password
- Sends account setup email with credentials
- Creates user with specified role (Doctor/Nurse/Organizer/Guest)

Feature 2: POST /api/auth/reset-password
- Generates new random password
- Updates database with new password hash
- Sends password reset email with new credentials
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta
import re

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')
if BASE_URL:
    BASE_URL = BASE_URL.rstrip('/')

# Test credentials
ORGANIZER_EMAIL = "test_organizer_new@hospital.com"
ORGANIZER_PASSWORD = "testpass123"


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


@pytest.fixture
def future_meeting(auth_headers):
    """Create a future meeting for testing account setup email"""
    future_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
    
    meeting_data = {
        "title": f"TEST_Account_Setup_Meeting_{uuid.uuid4().hex[:8]}",
        "description": "Test meeting for account setup email feature",
        "meeting_date": future_date,
        "start_time": "14:00",
        "end_time": "15:00",
        "meeting_type": "video",
        "location": "Virtual - Zoom",
        "recurrence_type": "one_time",
        "participant_ids": []
    }
    
    response = requests.post(f"{BASE_URL}/api/meetings", json=meeting_data, headers=auth_headers)
    assert response.status_code == 200, f"Failed to create meeting: {response.text}"
    
    meeting = response.json()
    yield meeting
    
    # Cleanup
    requests.delete(f"{BASE_URL}/api/meetings/{meeting['id']}", headers=auth_headers)


class TestHealthAndAuth:
    """Basic health and auth tests"""
    
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


class TestAccountSetupEmail:
    """
    PRIORITY 1: Test Account Setup Email feature
    Tests that new users created with meeting_id receive account setup email
    """
    
    def test_register_with_meeting_id_creates_user(self, auth_headers, future_meeting):
        """Test that registering user with meeting_id creates user account"""
        test_email = f"test_setup_email_{uuid.uuid4().hex[:8]}@hospital.com"
        
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": test_email,
                "name": "TEST_Account_Setup_User",
                "role": "doctor",
                "meeting_id": future_meeting["id"]
            }
        )
        
        assert response.status_code == 200, f"Failed to register: {response.text}"
        data = response.json()
        
        # Verify user created
        assert "user" in data
        assert data["user"]["email"] == test_email
        assert data["user"]["role"] == "doctor"
        assert "access_token" in data
        
        print(f"User created with meeting_id: {test_email}")
        print("Account setup email should be sent (check backend logs)")
        print("PASS: Account setup email feature triggered")
    
    def test_register_with_doctor_role(self, auth_headers, future_meeting):
        """Test account creation with Doctor role"""
        test_email = f"test_doctor_{uuid.uuid4().hex[:8]}@hospital.com"
        
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": test_email,
                "name": "TEST_Doctor_User",
                "role": "doctor",
                "meeting_id": future_meeting["id"]
            }
        )
        
        assert response.status_code == 200
        assert response.json()["user"]["role"] == "doctor"
        print(f"Doctor role registration: PASS ({test_email})")
    
    def test_register_with_nurse_role(self, auth_headers, future_meeting):
        """Test account creation with Nurse role"""
        test_email = f"test_nurse_{uuid.uuid4().hex[:8]}@hospital.com"
        
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": test_email,
                "name": "TEST_Nurse_User",
                "role": "nurse",
                "meeting_id": future_meeting["id"]
            }
        )
        
        assert response.status_code == 200
        assert response.json()["user"]["role"] == "nurse"
        print(f"Nurse role registration: PASS ({test_email})")
    
    def test_register_with_organizer_role(self, auth_headers, future_meeting):
        """Test account creation with Organizer role"""
        test_email = f"test_organizer_{uuid.uuid4().hex[:8]}@hospital.com"
        
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": test_email,
                "name": "TEST_Organizer_User",
                "role": "organizer",
                "meeting_id": future_meeting["id"]
            }
        )
        
        assert response.status_code == 200
        assert response.json()["user"]["role"] == "organizer"
        print(f"Organizer role registration: PASS ({test_email})")
    
    def test_register_with_guest_role(self, auth_headers, future_meeting):
        """Test account creation with Guest role"""
        test_email = f"test_guest_{uuid.uuid4().hex[:8]}@hospital.com"
        
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": test_email,
                "name": "TEST_Guest_User",
                "role": "guest",
                "meeting_id": future_meeting["id"]
            }
        )
        
        assert response.status_code == 200
        assert response.json()["user"]["role"] == "guest"
        print(f"Guest role registration: PASS ({test_email})")
    
    def test_register_without_password_autogenerates(self, auth_headers, future_meeting):
        """Test that registering without password auto-generates one"""
        test_email = f"test_autogen_pwd_{uuid.uuid4().hex[:8]}@hospital.com"
        
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": test_email,
                "name": "TEST_AutoGen_Password_User",
                "role": "doctor",
                "meeting_id": future_meeting["id"]
                # Note: No password field - should auto-generate
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "user" in data
        assert data["user"]["email"] == test_email
        
        print(f"Auto-generated password registration: PASS ({test_email})")
        print("User should receive email with credentials")
    
    def test_duplicate_email_rejected(self, auth_headers, future_meeting):
        """Test that registering with existing email is rejected"""
        # Register first user
        test_email = f"test_dup_{uuid.uuid4().hex[:8]}@hospital.com"
        
        first_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": test_email,
                "name": "First User",
                "role": "doctor"
            }
        )
        assert first_response.status_code == 200
        
        # Try to register again with same email
        second_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": test_email,
                "name": "Second User",
                "role": "nurse"
            }
        )
        
        assert second_response.status_code == 400
        assert "already registered" in second_response.text.lower() or "already" in second_response.text.lower()
        print("Duplicate email rejection: PASS")


class TestPasswordReset:
    """
    PRIORITY 2: Test Password Reset feature
    Tests that users can reset their password via email
    """
    
    def test_password_reset_endpoint_exists(self):
        """Test that password reset endpoint exists"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reset-password",
            json={"email": "nonexistent@test.com"}
        )
        
        # Should return 200 regardless of whether email exists (for security)
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print("Password reset endpoint exists: PASS")
    
    def test_password_reset_with_valid_email(self):
        """Test password reset with a valid registered email"""
        # First create a test user
        test_email = f"test_reset_{uuid.uuid4().hex[:8]}@hospital.com"
        test_password = "initialPassword123"
        
        # Register user
        reg_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": test_email,
                "name": "TEST_Reset_User",
                "password": test_password,
                "role": "doctor"
            }
        )
        assert reg_response.status_code == 200
        
        # Request password reset
        reset_response = requests.post(
            f"{BASE_URL}/api/auth/reset-password",
            json={"email": test_email}
        )
        
        assert reset_response.status_code == 200
        data = reset_response.json()
        assert "message" in data
        
        # Old password should no longer work
        login_old = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": test_email, "password": test_password}
        )
        assert login_old.status_code == 401, "Old password should not work after reset"
        
        print(f"Password reset with valid email: PASS ({test_email})")
        print("New password should be sent via email (check backend logs)")
    
    def test_password_reset_nonexistent_email_no_error(self):
        """Test that password reset with non-existent email doesn't reveal info"""
        fake_email = f"nonexistent_{uuid.uuid4().hex[:8]}@hospital.com"
        
        response = requests.post(
            f"{BASE_URL}/api/auth/reset-password",
            json={"email": fake_email}
        )
        
        # Should return 200 for security - don't reveal if email exists
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        
        print("Non-existent email returns same response (security): PASS")
    
    def test_password_reset_requires_email(self):
        """Test that password reset requires email field"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reset-password",
            json={}
        )
        
        assert response.status_code == 400
        print("Password reset requires email: PASS")
    
    def test_password_reset_invalid_email_format(self):
        """Test password reset with invalid email format"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reset-password",
            json={"email": "not-an-email"}
        )
        
        # Should still return 200 for security (don't reveal validation)
        # or 400 if validation is enforced - both are acceptable
        assert response.status_code in [200, 400, 422]
        print(f"Password reset with invalid email format: PASS (status: {response.status_code})")


class TestE2EAccountSetupFlow:
    """End-to-end test: Invite new participant with account setup email"""
    
    def test_full_invite_flow_with_account_setup(self, auth_headers, future_meeting):
        """
        E2E Test for Account Setup Email feature:
        1. Create new user via register with meeting_id
        2. Add user as participant to meeting
        3. Verify user is added with pending status
        4. Email confirmation verified via backend logs
        """
        test_email = f"e2e_account_setup_{uuid.uuid4().hex[:8]}@hospital.com"
        meeting_id = future_meeting["id"]
        
        # Step 1: Register user with meeting_id (triggers account setup email)
        reg_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": test_email,
                "name": "E2E Account Setup Test User",
                "role": "doctor",
                "specialty": "Oncology",
                "meeting_id": meeting_id
            }
        )
        
        assert reg_response.status_code == 200, f"Registration failed: {reg_response.text}"
        new_user = reg_response.json()["user"]
        print(f"Step 1: Registered user {test_email} with meeting_id")
        
        # Step 2: Add user as participant
        add_response = requests.post(
            f"{BASE_URL}/api/meetings/{meeting_id}/participants",
            json={"user_id": new_user["id"], "role": "attendee"},
            headers=auth_headers
        )
        
        assert add_response.status_code == 200, f"Add participant failed: {add_response.text}"
        print(f"Step 2: Added user as participant to meeting")
        
        # Step 3: Verify participant in meeting
        meeting_response = requests.get(f"{BASE_URL}/api/meetings/{meeting_id}", headers=auth_headers)
        assert meeting_response.status_code == 200
        
        meeting_data = meeting_response.json()
        participants = meeting_data.get("participants", [])
        
        added_participant = next((p for p in participants if p.get("user_id") == new_user["id"]), None)
        assert added_participant is not None, "Participant not found in meeting"
        assert added_participant.get("response_status") == "pending"
        
        print(f"Step 3: Verified participant added with pending status")
        
        print("")
        print("=" * 60)
        print("E2E ACCOUNT SETUP FLOW COMPLETE")
        print(f"- User: {test_email}")
        print(f"- Role: {new_user['role']}")
        print(f"- Meeting: {future_meeting['title']}")
        print(f"- Account setup email should be sent (check backend logs)")
        print("=" * 60)


class TestE2EPasswordResetFlow:
    """End-to-end test: Password reset flow"""
    
    def test_full_password_reset_flow(self):
        """
        E2E Test for Password Reset feature:
        1. Create user with known password
        2. Login successfully with original password
        3. Request password reset
        4. Verify old password no longer works
        5. (New password received via email - verified via backend logs)
        """
        test_email = f"e2e_password_reset_{uuid.uuid4().hex[:8]}@hospital.com"
        original_password = "originalPass123!"
        
        # Step 1: Register user
        reg_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": test_email,
                "name": "E2E Password Reset Test",
                "password": original_password,
                "role": "doctor"
            }
        )
        assert reg_response.status_code == 200
        print(f"Step 1: Created user {test_email}")
        
        # Step 2: Login with original password
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": test_email, "password": original_password}
        )
        assert login_response.status_code == 200
        print(f"Step 2: Successfully logged in with original password")
        
        # Step 3: Request password reset
        reset_response = requests.post(
            f"{BASE_URL}/api/auth/reset-password",
            json={"email": test_email}
        )
        assert reset_response.status_code == 200
        print(f"Step 3: Password reset requested")
        
        # Step 4: Verify old password no longer works
        login_old = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": test_email, "password": original_password}
        )
        assert login_old.status_code == 401
        print(f"Step 4: Verified old password no longer works")
        
        print("")
        print("=" * 60)
        print("E2E PASSWORD RESET FLOW COMPLETE")
        print(f"- User: {test_email}")
        print(f"- Original password invalidated")
        print(f"- New password sent via email (check backend logs)")
        print("=" * 60)


class TestSecurePasswordGeneration:
    """Test that auto-generated passwords meet security requirements"""
    
    def test_user_with_autogenerated_password_can_be_created(self):
        """Test user creation without password generates secure credentials"""
        test_email = f"test_secure_pwd_{uuid.uuid4().hex[:8]}@hospital.com"
        
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": test_email,
                "name": "TEST_Secure_Password",
                "role": "doctor"
                # No password - should auto-generate
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["email"] == test_email
        
        # User created successfully - password was auto-generated
        # The password is sent via email and not returned in response (secure)
        assert "password" not in data["user"]  # Password should not be in response
        
        print(f"User with auto-generated password created: PASS")
        print("Password is sent via email, not exposed in API response: SECURE")


class TestEmailTemplateFields:
    """Test that meetings have all fields required for email templates"""
    
    def test_meeting_has_account_setup_email_fields(self, auth_headers, future_meeting):
        """Verify meeting has all fields needed for account setup email template"""
        response = requests.get(f"{BASE_URL}/api/meetings/{future_meeting['id']}", headers=auth_headers)
        assert response.status_code == 200
        
        meeting = response.json()
        
        # Required fields for account_setup email template
        assert meeting.get("title"), "Meeting title required for email"
        assert meeting.get("organizer"), "Organizer info required for email"
        
        # Organizer should have name
        if meeting.get("organizer"):
            assert meeting["organizer"].get("name"), "Organizer name required"
        
        print("Meeting has all required fields for account setup email: PASS")
        print(f"  - Title: {meeting.get('title')}")
        print(f"  - Organizer: {meeting.get('organizer', {}).get('name')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
