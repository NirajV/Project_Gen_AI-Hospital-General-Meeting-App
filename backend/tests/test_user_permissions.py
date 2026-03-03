"""
Tests for User Permissions - Edit Participant Feature
This tests the critical bug fix for organizer editing other users' email/department
"""
import pytest
import requests
import os

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
def organizer_user_id(organizer_token):
    """Get organizer's user ID"""
    response = requests.get(
        f"{BASE_URL}/api/auth/me",
        headers={"Authorization": f"Bearer {organizer_token}"}
    )
    assert response.status_code == 200
    return response.json()["id"]


@pytest.fixture(scope="module")
def test_user(organizer_token):
    """Create a test user for testing permission updates"""
    import uuid
    test_email = f"test_perm_user_{uuid.uuid4().hex[:8]}@hospital.com"
    
    # Create user via register endpoint
    response = requests.post(
        f"{BASE_URL}/api/auth/register",
        json={
            "email": test_email,
            "name": "TEST_Permission_User",
            "password": "testpass123",
            "specialty": "Cardiology",
            "role": "doctor"
        }
    )
    
    if response.status_code != 200:
        pytest.skip(f"Could not create test user: {response.text}")
    
    user_data = response.json()["user"]
    yield user_data
    
    # Cleanup - Note: No delete endpoint, so we leave test data


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestOrganizerPermissions:
    """Test that organizers can edit other users' email and department"""
    
    def test_organizer_login(self, api_client):
        """Test organizer can login successfully"""
        response = api_client.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ORGANIZER_EMAIL, "password": ORGANIZER_PASSWORD}
        )
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["role"] in ["organizer", "admin"], f"User role is {data['user']['role']}, expected organizer or admin"
        print(f"✅ Organizer logged in successfully. Role: {data['user']['role']}")
    
    def test_organizer_can_update_other_user_email(self, organizer_token, test_user, api_client):
        """CRITICAL TEST: Organizer can update another user's email"""
        import uuid
        new_email = f"test_updated_{uuid.uuid4().hex[:8]}@hospital.com"
        
        response = api_client.put(
            f"{BASE_URL}/api/users/{test_user['id']}",
            headers={"Authorization": f"Bearer {organizer_token}"},
            json={"email": new_email}
        )
        
        # This should NOT return 403 Insufficient permissions anymore
        assert response.status_code != 403, f"BUG NOT FIXED: Still getting 403 Insufficient permissions. Response: {response.text}"
        assert response.status_code == 200, f"Unexpected error: {response.status_code} - {response.text}"
        
        data = response.json()
        assert data["email"] == new_email, f"Email not updated. Expected {new_email}, got {data['email']}"
        print(f"✅ Organizer successfully updated other user's email to: {new_email}")
    
    def test_organizer_can_update_other_user_specialty(self, organizer_token, test_user, api_client):
        """CRITICAL TEST: Organizer can update another user's specialty/department"""
        new_specialty = "Oncology"
        
        response = api_client.put(
            f"{BASE_URL}/api/users/{test_user['id']}",
            headers={"Authorization": f"Bearer {organizer_token}"},
            json={"specialty": new_specialty}
        )
        
        assert response.status_code != 403, f"BUG NOT FIXED: Still getting 403 Insufficient permissions. Response: {response.text}"
        assert response.status_code == 200, f"Unexpected error: {response.status_code} - {response.text}"
        
        data = response.json()
        assert data["specialty"] == new_specialty, f"Specialty not updated. Expected {new_specialty}, got {data.get('specialty')}"
        print(f"✅ Organizer successfully updated other user's specialty to: {new_specialty}")
    
    def test_organizer_can_update_email_and_specialty_together(self, organizer_token, test_user, api_client):
        """Test organizer can update both email and specialty in one request"""
        import uuid
        new_email = f"test_combo_{uuid.uuid4().hex[:8]}@hospital.com"
        new_specialty = "Neurology"
        
        response = api_client.put(
            f"{BASE_URL}/api/users/{test_user['id']}",
            headers={"Authorization": f"Bearer {organizer_token}"},
            json={"email": new_email, "specialty": new_specialty}
        )
        
        assert response.status_code == 200, f"Update failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert data["email"] == new_email, f"Email mismatch"
        assert data["specialty"] == new_specialty, f"Specialty mismatch"
        print(f"✅ Organizer successfully updated both email ({new_email}) and specialty ({new_specialty})")
    
    def test_update_persists_in_database(self, organizer_token, test_user, api_client):
        """Verify updates are persisted - fetch user after update"""
        import uuid
        new_email = f"test_persist_{uuid.uuid4().hex[:8]}@hospital.com"
        new_specialty = "Pediatrics"
        
        # Update
        update_response = api_client.put(
            f"{BASE_URL}/api/users/{test_user['id']}",
            headers={"Authorization": f"Bearer {organizer_token}"},
            json={"email": new_email, "specialty": new_specialty}
        )
        assert update_response.status_code == 200
        
        # Fetch to verify persistence
        get_response = api_client.get(
            f"{BASE_URL}/api/users/{test_user['id']}",
            headers={"Authorization": f"Bearer {organizer_token}"}
        )
        
        assert get_response.status_code == 200
        fetched_data = get_response.json()
        assert fetched_data["email"] == new_email, f"Email not persisted. Expected {new_email}, got {fetched_data['email']}"
        assert fetched_data["specialty"] == new_specialty, f"Specialty not persisted"
        print(f"✅ Updates verified as persisted in database")


class TestDuplicateEmailValidation:
    """Test that duplicate email validation works correctly"""
    
    def test_cannot_update_to_existing_email(self, organizer_token, test_user, api_client):
        """Test that updating to an existing email returns error"""
        # Try to update to organizer's email
        response = api_client.put(
            f"{BASE_URL}/api/users/{test_user['id']}",
            headers={"Authorization": f"Bearer {organizer_token}"},
            json={"email": ORGANIZER_EMAIL}
        )
        
        assert response.status_code == 400, f"Should reject duplicate email with 400. Got: {response.status_code}"
        assert "already in use" in response.text.lower() or "already exists" in response.text.lower(), f"Error message should mention email is in use: {response.text}"
        print(f"✅ Correctly rejected duplicate email update")


class TestNonOrganizerPermissions:
    """Test that non-organizers cannot edit other users"""
    
    def test_regular_user_cannot_edit_others(self, test_user, api_client):
        """Regular users should not be able to edit other users' details"""
        # Login as the test user (who is a doctor, not organizer)
        login_response = api_client.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": test_user["email"], "password": "testpass123"}
        )
        
        if login_response.status_code != 200:
            pytest.skip("Could not login as test user")
        
        user_token = login_response.json()["access_token"]
        user_id = login_response.json()["user"]["id"]
        
        # Try to update organizer's details - should be rejected
        # First, get list of users to find organizer ID
        users_response = api_client.get(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        
        assert users_response.status_code == 200
        users = users_response.json()
        organizer = next((u for u in users if u.get("email") == ORGANIZER_EMAIL), None)
        
        if not organizer:
            pytest.skip("Could not find organizer user in list")
        
        # Try to update organizer's email - should be rejected
        response = api_client.put(
            f"{BASE_URL}/api/users/{organizer['id']}",
            headers={"Authorization": f"Bearer {user_token}"},
            json={"email": "should_not_work@test.com"}
        )
        
        assert response.status_code == 403, f"Non-organizer should get 403 when editing others. Got: {response.status_code}"
        print(f"✅ Correctly blocked non-organizer from editing others")
    
    def test_user_can_update_own_profile(self, test_user, api_client):
        """Users should be able to update their own profile"""
        # Login as test user
        login_response = api_client.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": test_user["email"], "password": "testpass123"}
        )
        
        if login_response.status_code != 200:
            pytest.skip("Could not login as test user")
        
        user_token = login_response.json()["access_token"]
        user_data = login_response.json()["user"]
        
        # Update own name
        response = api_client.put(
            f"{BASE_URL}/api/users/{user_data['id']}",
            headers={"Authorization": f"Bearer {user_token}"},
            json={"name": "TEST_Updated_Name"}
        )
        
        assert response.status_code == 200, f"User should be able to update own profile. Got: {response.status_code}"
        print(f"✅ User can update their own profile")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
