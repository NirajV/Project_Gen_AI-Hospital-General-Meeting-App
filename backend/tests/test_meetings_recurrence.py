"""
Backend API tests for Hospital Meeting Scheduler
Focus: Enhanced recurrence patterns including:
- Weekly recurrence with day_of_week selection
- Monthly recurrence with day_of_month (1-31) selection
- Monthly on... pattern with week_of_month and day_of_week
- Mandatory recurrence_end_date for all recurring meetings
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
        print("✓ Login success test passed")
    
    def test_auth_me(self, auth_headers):
        """Test get current user endpoint"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == TEST_USER_EMAIL
        assert "id" in data
        print("✓ Auth me test passed")

class TestMeetingsOneTime:
    """Test one-time meeting (no recurrence)"""
    
    def test_create_one_time_meeting(self, auth_headers):
        """Test creating a basic one-time meeting"""
        meeting_data = {
            "title": f"TEST_One Time Meeting {uuid.uuid4().hex[:8]}",
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
        
        # Verify one_time meeting does NOT require recurrence_end_date
        assert data["title"] == meeting_data["title"]
        assert data["recurrence_type"] == "one_time"
        assert data.get("recurrence_end_date") is None
        print(f"✓ Created one-time meeting without end date: {data['id']}")

class TestDailyRecurrence:
    """Test daily recurring meetings with mandatory end date"""
    
    def test_create_daily_recurring_meeting_with_end_date(self, auth_headers):
        """Test creating a daily recurring meeting with end date"""
        meeting_data = {
            "title": f"TEST_Daily Meeting {uuid.uuid4().hex[:8]}",
            "description": "Daily standup meeting",
            "meeting_date": "2026-03-01",
            "start_time": "09:00",
            "end_time": "09:30",
            "meeting_type": "video",
            "recurrence_type": "daily",
            "recurrence_end_date": "2026-06-30"  # End date 4 months later
        }
        
        response = requests.post(f"{BASE_URL}/api/meetings", json=meeting_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify recurrence fields
        assert data["recurrence_type"] == "daily"
        assert data["recurrence_end_date"] == "2026-06-30"
        print(f"✓ Created daily recurring meeting with end date: {data['id']}")

class TestWeeklyRecurrence:
    """Test weekly recurring meetings with day_of_week selection"""
    
    def test_create_weekly_meeting_monday(self, auth_headers):
        """Test creating a weekly meeting on Monday with end date"""
        meeting_data = {
            "title": f"TEST_Weekly Monday Meeting {uuid.uuid4().hex[:8]}",
            "description": "Weekly team sync on Mondays",
            "meeting_date": "2026-03-02",  # A Monday
            "start_time": "10:00",
            "end_time": "11:00",
            "meeting_type": "video",
            "recurrence_type": "weekly",
            "recurrence_day_of_week": "monday",
            "recurrence_end_date": "2026-06-30"
        }
        
        response = requests.post(f"{BASE_URL}/api/meetings", json=meeting_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify weekly recurrence fields
        assert data["recurrence_type"] == "weekly"
        assert data["recurrence_day_of_week"] == "monday"
        assert data["recurrence_end_date"] == "2026-06-30"
        print(f"✓ Created weekly Monday meeting: {data['id']}")
    
    def test_create_weekly_meeting_friday(self, auth_headers):
        """Test creating a weekly meeting on Friday with end date"""
        meeting_data = {
            "title": f"TEST_Weekly Friday Meeting {uuid.uuid4().hex[:8]}",
            "description": "Weekly wrap-up on Fridays",
            "meeting_date": "2026-03-06",  # A Friday
            "start_time": "16:00",
            "end_time": "17:00",
            "meeting_type": "hybrid",
            "location": "Conference Room B",
            "recurrence_type": "weekly",
            "recurrence_day_of_week": "friday",
            "recurrence_end_date": "2026-12-31"
        }
        
        response = requests.post(f"{BASE_URL}/api/meetings", json=meeting_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data["recurrence_type"] == "weekly"
        assert data["recurrence_day_of_week"] == "friday"
        assert data["recurrence_end_date"] == "2026-12-31"
        print(f"✓ Created weekly Friday meeting: {data['id']}")
    
    def test_weekly_all_days_of_week(self, auth_headers):
        """Test all day_of_week values for weekly recurrence"""
        days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        
        for day in days:
            meeting_data = {
                "title": f"TEST_Weekly {day.capitalize()} {uuid.uuid4().hex[:8]}",
                "meeting_date": "2026-03-01",
                "start_time": "10:00",
                "end_time": "11:00",
                "meeting_type": "video",
                "recurrence_type": "weekly",
                "recurrence_day_of_week": day,
                "recurrence_end_date": "2026-03-31"
            }
            
            response = requests.post(f"{BASE_URL}/api/meetings", json=meeting_data, headers=auth_headers)
            assert response.status_code == 200
            data = response.json()
            assert data["recurrence_day_of_week"] == day
            print(f"✓ Weekly recurrence saved with day: {day}")

class TestMonthlyDayOfMonth:
    """Test monthly recurring meetings with day_of_month (1-31) selection"""
    
    def test_create_monthly_meeting_15th(self, auth_headers):
        """Test creating a monthly meeting on the 15th with end date"""
        meeting_data = {
            "title": f"TEST_Monthly 15th Meeting {uuid.uuid4().hex[:8]}",
            "description": "Monthly budget review on the 15th",
            "meeting_date": "2026-03-15",
            "start_time": "14:00",
            "end_time": "15:30",
            "meeting_type": "video",
            "recurrence_type": "monthly",
            "recurrence_day_of_month": 15,
            "recurrence_end_date": "2026-12-15"
        }
        
        response = requests.post(f"{BASE_URL}/api/meetings", json=meeting_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify monthly recurrence fields
        assert data["recurrence_type"] == "monthly"
        assert data["recurrence_day_of_month"] == 15
        assert data["recurrence_end_date"] == "2026-12-15"
        print(f"✓ Created monthly meeting on 15th: {data['id']}")
    
    def test_create_monthly_meeting_1st(self, auth_headers):
        """Test creating a monthly meeting on the 1st"""
        meeting_data = {
            "title": f"TEST_Monthly 1st Meeting {uuid.uuid4().hex[:8]}",
            "description": "First of month review",
            "meeting_date": "2026-04-01",
            "start_time": "09:00",
            "end_time": "10:00",
            "meeting_type": "video",
            "recurrence_type": "monthly",
            "recurrence_day_of_month": 1,
            "recurrence_end_date": "2026-12-01"
        }
        
        response = requests.post(f"{BASE_URL}/api/meetings", json=meeting_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data["recurrence_type"] == "monthly"
        assert data["recurrence_day_of_month"] == 1
        print(f"✓ Created monthly meeting on 1st: {data['id']}")
    
    def test_create_monthly_meeting_31st(self, auth_headers):
        """Test creating a monthly meeting on the 31st (last day)"""
        meeting_data = {
            "title": f"TEST_Monthly 31st Meeting {uuid.uuid4().hex[:8]}",
            "description": "End of month meeting (31st or last day)",
            "meeting_date": "2026-03-31",
            "start_time": "17:00",
            "end_time": "18:00",
            "meeting_type": "in_person",
            "location": "Main Hall",
            "recurrence_type": "monthly",
            "recurrence_day_of_month": 31,
            "recurrence_end_date": "2026-12-31"
        }
        
        response = requests.post(f"{BASE_URL}/api/meetings", json=meeting_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data["recurrence_type"] == "monthly"
        assert data["recurrence_day_of_month"] == 31
        print(f"✓ Created monthly meeting on 31st: {data['id']}")
    
    def test_monthly_various_days(self, auth_headers):
        """Test multiple day_of_month values"""
        days_to_test = [5, 10, 20, 25, 28]
        
        for day in days_to_test:
            meeting_data = {
                "title": f"TEST_Monthly Day{day} {uuid.uuid4().hex[:8]}",
                "meeting_date": f"2026-03-{day:02d}",
                "start_time": "10:00",
                "end_time": "11:00",
                "meeting_type": "video",
                "recurrence_type": "monthly",
                "recurrence_day_of_month": day,
                "recurrence_end_date": "2026-06-30"
            }
            
            response = requests.post(f"{BASE_URL}/api/meetings", json=meeting_data, headers=auth_headers)
            assert response.status_code == 200
            data = response.json()
            assert data["recurrence_day_of_month"] == day
            print(f"✓ Monthly recurrence saved with day_of_month: {day}")

class TestMonthlyOnPattern:
    """Test 'Monthly on...' pattern (e.g., First Monday, Last Friday)"""
    
    def test_create_monthly_on_first_monday(self, auth_headers):
        """Test creating a meeting with 'Monthly on First Monday' recurrence"""
        meeting_data = {
            "title": f"TEST_Monthly First Monday {uuid.uuid4().hex[:8]}",
            "description": "Meeting on first Monday of every month",
            "meeting_date": "2026-03-02",
            "start_time": "09:00",
            "end_time": "10:00",
            "meeting_type": "video",
            "recurrence_type": "monthly_on",
            "recurrence_week_of_month": "first",
            "recurrence_day_of_week": "monday",
            "recurrence_end_date": "2026-12-07"  # End after Dec first Monday
        }
        
        response = requests.post(f"{BASE_URL}/api/meetings", json=meeting_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data["recurrence_type"] == "monthly_on"
        assert data["recurrence_week_of_month"] == "first"
        assert data["recurrence_day_of_week"] == "monday"
        assert data["recurrence_end_date"] == "2026-12-07"
        print(f"✓ Created monthly_on meeting (First Monday): {data['id']}")
    
    def test_create_monthly_on_last_friday(self, auth_headers):
        """Test creating a meeting with 'Monthly on Last Friday' recurrence"""
        meeting_data = {
            "title": f"TEST_Monthly Last Friday {uuid.uuid4().hex[:8]}",
            "description": "Meeting on last Friday of every month",
            "meeting_date": "2026-03-27",
            "start_time": "14:00",
            "end_time": "15:30",
            "meeting_type": "hybrid",
            "location": "Conference Room A",
            "recurrence_type": "monthly_on",
            "recurrence_week_of_month": "last",
            "recurrence_day_of_week": "friday",
            "recurrence_end_date": "2026-12-25"
        }
        
        response = requests.post(f"{BASE_URL}/api/meetings", json=meeting_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data["recurrence_type"] == "monthly_on"
        assert data["recurrence_week_of_month"] == "last"
        assert data["recurrence_day_of_week"] == "friday"
        print(f"✓ Created monthly_on meeting (Last Friday): {data['id']}")
    
    def test_all_week_options(self, auth_headers):
        """Test all week_of_month values: first, second, third, fourth, last"""
        week_options = ["first", "second", "third", "fourth", "last"]
        
        for week in week_options:
            meeting_data = {
                "title": f"TEST_{week.capitalize()} Week {uuid.uuid4().hex[:8]}",
                "meeting_date": "2026-04-01",
                "start_time": "10:00",
                "end_time": "11:00",
                "meeting_type": "video",
                "recurrence_type": "monthly_on",
                "recurrence_week_of_month": week,
                "recurrence_day_of_week": "wednesday",
                "recurrence_end_date": "2026-06-30"
            }
            
            response = requests.post(f"{BASE_URL}/api/meetings", json=meeting_data, headers=auth_headers)
            assert response.status_code == 200
            data = response.json()
            assert data["recurrence_week_of_month"] == week
            print(f"✓ Verified week option '{week}' saved correctly")

class TestRecurrenceEndDatePersistence:
    """Test that recurrence_end_date persists correctly via GET"""
    
    def test_get_meeting_verify_end_date_persists(self, auth_headers):
        """Test that GET meeting returns recurrence_end_date correctly"""
        meeting_data = {
            "title": f"TEST_EndDate Verify {uuid.uuid4().hex[:8]}",
            "meeting_date": "2026-03-01",
            "start_time": "11:00",
            "end_time": "12:00",
            "meeting_type": "video",
            "recurrence_type": "weekly",
            "recurrence_day_of_week": "tuesday",
            "recurrence_end_date": "2026-09-15"
        }
        
        # Create meeting
        create_response = requests.post(f"{BASE_URL}/api/meetings", json=meeting_data, headers=auth_headers)
        assert create_response.status_code == 200
        created_meeting = create_response.json()
        meeting_id = created_meeting["id"]
        
        # GET meeting and verify data persisted
        get_response = requests.get(f"{BASE_URL}/api/meetings/{meeting_id}", headers=auth_headers)
        assert get_response.status_code == 200
        fetched_meeting = get_response.json()
        
        assert fetched_meeting["recurrence_type"] == "weekly"
        assert fetched_meeting["recurrence_day_of_week"] == "tuesday"
        assert fetched_meeting["recurrence_end_date"] == "2026-09-15"
        print(f"✓ GET meeting verified recurrence_end_date persists: {meeting_id}")

class TestCleanup:
    """Cleanup test data created during tests"""
    
    def test_cleanup_test_meetings(self, auth_headers):
        """Clean up TEST_ prefixed meetings"""
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
