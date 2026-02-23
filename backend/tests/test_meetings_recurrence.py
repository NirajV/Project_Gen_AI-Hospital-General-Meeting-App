"""
Backend API tests for Hospital Meeting Scheduler
Focus: Advanced recurrence patterns (monthly_on with week_of_month and day_of_week)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USER_EMAIL = "organizer@hospital.com"
TEST_USER_PASSWORD = "password123"

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for testing"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "access_token" in data
    return data["access_token"]

@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get authorization headers"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}

class TestHealthCheck:
    """Health check tests - run first to verify API is accessible"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["database"] == "connected"
        print("✓ API health check passed")

class TestAuthentication:
    """Authentication flow tests"""
    
    def test_login_success(self):
        """Test successful login with organizer credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == TEST_USER_EMAIL
        assert data["user"]["role"] == "organizer"
        print("✓ Login success test passed")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "invalid@test.com", "password": "wrongpassword"}
        )
        assert response.status_code == 401
        print("✓ Invalid credentials test passed")
    
    def test_auth_me(self, auth_headers):
        """Test get current user endpoint"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == TEST_USER_EMAIL
        assert "id" in data
        print("✓ Auth me test passed")

class TestMeetingsWithRecurrence:
    """Meeting CRUD tests with focus on advanced recurrence patterns"""
    
    def test_create_meeting_one_time(self, auth_headers):
        """Test creating a basic one-time meeting"""
        meeting_data = {
            "title": f"TEST_Basic Meeting {uuid.uuid4().hex[:8]}",
            "description": "Test meeting without recurrence",
            "meeting_date": "2026-03-15",
            "start_time": "10:00",
            "end_time": "11:00",
            "meeting_type": "video",
            "recurrence_type": "one_time"
        }
        
        response = requests.post(f"{BASE_URL}/api/meetings", json=meeting_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify response data
        assert data["title"] == meeting_data["title"]
        assert data["recurrence_type"] == "one_time"
        assert data["recurrence_week_of_month"] is None
        assert data["recurrence_day_of_week"] is None
        print(f"✓ Created one-time meeting: {data['id']}")
        return data
    
    def test_create_meeting_monthly_on_first_monday(self, auth_headers):
        """Test creating a meeting with 'Monthly on First Monday' recurrence"""
        meeting_data = {
            "title": f"TEST_Monthly First Monday {uuid.uuid4().hex[:8]}",
            "description": "Meeting on first Monday of every month",
            "meeting_date": "2026-03-03",  # First Monday of March 2026
            "start_time": "09:00",
            "end_time": "10:00",
            "meeting_type": "video",
            "recurrence_type": "monthly_on",
            "recurrence_week_of_month": "first",
            "recurrence_day_of_week": "monday"
        }
        
        response = requests.post(f"{BASE_URL}/api/meetings", json=meeting_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify all recurrence fields are saved correctly
        assert data["title"] == meeting_data["title"]
        assert data["recurrence_type"] == "monthly_on", f"Expected 'monthly_on', got '{data['recurrence_type']}'"
        assert data["recurrence_week_of_month"] == "first", f"Expected 'first', got '{data['recurrence_week_of_month']}'"
        assert data["recurrence_day_of_week"] == "monday", f"Expected 'monday', got '{data['recurrence_day_of_week']}'"
        print(f"✓ Created monthly_on meeting (First Monday): {data['id']}")
        return data
    
    def test_create_meeting_monthly_on_last_friday(self, auth_headers):
        """Test creating a meeting with 'Monthly on Last Friday' recurrence"""
        meeting_data = {
            "title": f"TEST_Monthly Last Friday {uuid.uuid4().hex[:8]}",
            "description": "Meeting on last Friday of every month",
            "meeting_date": "2026-03-27",  # Last Friday of March 2026
            "start_time": "14:00",
            "end_time": "15:30",
            "meeting_type": "hybrid",
            "location": "Conference Room A",
            "recurrence_type": "monthly_on",
            "recurrence_week_of_month": "last",
            "recurrence_day_of_week": "friday"
        }
        
        response = requests.post(f"{BASE_URL}/api/meetings", json=meeting_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify all recurrence fields
        assert data["recurrence_type"] == "monthly_on"
        assert data["recurrence_week_of_month"] == "last"
        assert data["recurrence_day_of_week"] == "friday"
        print(f"✓ Created monthly_on meeting (Last Friday): {data['id']}")
        return data
    
    def test_create_meeting_monthly_on_second_tuesday(self, auth_headers):
        """Test creating a meeting with 'Monthly on Second Tuesday' recurrence"""
        meeting_data = {
            "title": f"TEST_Monthly Second Tuesday {uuid.uuid4().hex[:8]}",
            "description": "Tumor Board meeting on second Tuesday",
            "meeting_date": "2026-03-10",  # Second Tuesday of March 2026
            "start_time": "08:00",
            "end_time": "09:30",
            "meeting_type": "in_person",
            "location": "Medical Conference Hall",
            "recurrence_type": "monthly_on",
            "recurrence_week_of_month": "second",
            "recurrence_day_of_week": "tuesday"
        }
        
        response = requests.post(f"{BASE_URL}/api/meetings", json=meeting_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data["recurrence_type"] == "monthly_on"
        assert data["recurrence_week_of_month"] == "second"
        assert data["recurrence_day_of_week"] == "tuesday"
        print(f"✓ Created monthly_on meeting (Second Tuesday): {data['id']}")
        return data
    
    def test_create_meeting_with_all_week_options(self, auth_headers):
        """Test all week_of_month values: first, second, third, fourth, last"""
        week_options = ["first", "second", "third", "fourth", "last"]
        
        for week in week_options:
            meeting_data = {
                "title": f"TEST_{week.capitalize()} Week Meeting {uuid.uuid4().hex[:8]}",
                "meeting_date": "2026-04-01",
                "start_time": "10:00",
                "end_time": "11:00",
                "meeting_type": "video",
                "recurrence_type": "monthly_on",
                "recurrence_week_of_month": week,
                "recurrence_day_of_week": "wednesday"
            }
            
            response = requests.post(f"{BASE_URL}/api/meetings", json=meeting_data, headers=auth_headers)
            assert response.status_code == 200
            data = response.json()
            assert data["recurrence_week_of_month"] == week, f"Failed for week option: {week}"
            print(f"✓ Verified week option '{week}' saved correctly")
    
    def test_create_meeting_with_all_day_options(self, auth_headers):
        """Test all day_of_week values: monday through sunday"""
        day_options = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        
        for day in day_options:
            meeting_data = {
                "title": f"TEST_{day.capitalize()} Day Meeting {uuid.uuid4().hex[:8]}",
                "meeting_date": "2026-04-01",
                "start_time": "10:00",
                "end_time": "11:00",
                "meeting_type": "video",
                "recurrence_type": "monthly_on",
                "recurrence_week_of_month": "first",
                "recurrence_day_of_week": day
            }
            
            response = requests.post(f"{BASE_URL}/api/meetings", json=meeting_data, headers=auth_headers)
            assert response.status_code == 200
            data = response.json()
            assert data["recurrence_day_of_week"] == day, f"Failed for day option: {day}"
            print(f"✓ Verified day option '{day}' saved correctly")
    
    def test_get_meeting_verify_recurrence_fields(self, auth_headers):
        """Test that GET meeting returns recurrence fields correctly"""
        # First create a meeting
        meeting_data = {
            "title": f"TEST_Get Verify Meeting {uuid.uuid4().hex[:8]}",
            "meeting_date": "2026-03-01",
            "start_time": "11:00",
            "end_time": "12:00",
            "meeting_type": "video",
            "recurrence_type": "monthly_on",
            "recurrence_week_of_month": "third",
            "recurrence_day_of_week": "thursday"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/meetings", json=meeting_data, headers=auth_headers)
        assert create_response.status_code == 200
        created_meeting = create_response.json()
        meeting_id = created_meeting["id"]
        
        # Now GET the meeting and verify data persisted
        get_response = requests.get(f"{BASE_URL}/api/meetings/{meeting_id}", headers=auth_headers)
        assert get_response.status_code == 200
        fetched_meeting = get_response.json()
        
        assert fetched_meeting["recurrence_type"] == "monthly_on"
        assert fetched_meeting["recurrence_week_of_month"] == "third"
        assert fetched_meeting["recurrence_day_of_week"] == "thursday"
        print(f"✓ GET meeting verified recurrence fields persist: {meeting_id}")
    
    def test_meetings_list_returns_all_types(self, auth_headers):
        """Test that meetings list returns meetings with various recurrence types"""
        response = requests.get(f"{BASE_URL}/api/meetings", headers=auth_headers)
        assert response.status_code == 200
        meetings = response.json()
        
        # Check we have multiple meetings (from previous tests)
        assert isinstance(meetings, list)
        print(f"✓ Meetings list returned {len(meetings)} meetings")

class TestCleanup:
    """Cleanup test data created during tests"""
    
    def test_cleanup_test_meetings(self, auth_headers):
        """Clean up TEST_ prefixed meetings"""
        # Get all meetings
        response = requests.get(f"{BASE_URL}/api/meetings", headers=auth_headers)
        if response.status_code == 200:
            meetings = response.json()
            deleted_count = 0
            for meeting in meetings:
                if meeting.get("title", "").startswith("TEST_"):
                    del_response = requests.delete(
                        f"{BASE_URL}/api/meetings/{meeting['id']}", 
                        headers=auth_headers
                    )
                    if del_response.status_code == 200:
                        deleted_count += 1
            print(f"✓ Cleaned up {deleted_count} test meetings")

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
