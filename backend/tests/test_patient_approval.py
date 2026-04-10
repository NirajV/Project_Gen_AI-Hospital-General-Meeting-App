"""
Test Patient Approval System
Tests for the patient approval workflow where:
- Participant adds patient -> status is 'pending'
- Organizer adds patient -> status is auto-approved
- Organizer can approve pending patients
- Email notifications are sent
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ORGANIZER_EMAIL = "organizer@hospital.com"
ORGANIZER_PASSWORD = "password123"

class TestPatientApprovalSystem:
    """Tests for patient approval workflow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.organizer_token = None
        self.participant_token = None
        self.test_meeting_id = None
        self.test_patient_id = None
        self.test_participant_id = None
    
    def login_as_organizer(self):
        """Login as organizer and get token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ORGANIZER_EMAIL,
            "password": ORGANIZER_PASSWORD
        })
        assert response.status_code == 200, f"Organizer login failed: {response.text}"
        data = response.json()
        self.organizer_token = data['access_token']
        self.organizer_id = data['user']['id']
        return data
    
    def create_test_participant(self):
        """Create a test participant user"""
        unique_id = str(uuid.uuid4())[:8]
        email = f"TEST_participant_{unique_id}@hospital.com"
        
        response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "name": f"Test Participant {unique_id}",
            "password": "testpass123",
            "role": "doctor"
        })
        
        if response.status_code == 200:
            data = response.json()
            self.participant_token = data['access_token']
            self.test_participant_id = data['user']['id']
            return data
        elif response.status_code == 400 and "already registered" in response.text:
            # User exists, try to login
            response = self.session.post(f"{BASE_URL}/api/auth/login", json={
                "email": email,
                "password": "testpass123"
            })
            if response.status_code == 200:
                data = response.json()
                self.participant_token = data['access_token']
                self.test_participant_id = data['user']['id']
                return data
        
        pytest.skip(f"Could not create test participant: {response.text}")
    
    def create_test_meeting(self):
        """Create a test meeting as organizer"""
        headers = {"Authorization": f"Bearer {self.organizer_token}"}
        
        meeting_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        unique_id = str(uuid.uuid4())[:8]
        
        response = self.session.post(f"{BASE_URL}/api/meetings", json={
            "title": f"TEST_Approval_Meeting_{unique_id}",
            "description": "Test meeting for patient approval",
            "meeting_date": meeting_date,
            "start_time": "10:00",
            "end_time": "11:00",
            "meeting_type": "in_person",
            "location": "Conference Room A",
            "recurrence_type": "none"
        }, headers=headers)
        
        assert response.status_code == 200, f"Failed to create meeting: {response.text}"
        data = response.json()
        self.test_meeting_id = data['id']
        return data
    
    def create_test_patient(self):
        """Create a test patient"""
        headers = {"Authorization": f"Bearer {self.organizer_token}"}
        unique_id = str(uuid.uuid4())[:8]
        
        response = self.session.post(f"{BASE_URL}/api/patients", json={
            "first_name": f"TEST_Patient_{unique_id}",
            "last_name": "Approval",
            "patient_id_number": f"MRN-{unique_id}",
            "date_of_birth": "1990-01-15",
            "gender": "male",
            "primary_diagnosis": "Test diagnosis",
            "department_name": "Cardiology"
        }, headers=headers)
        
        assert response.status_code == 200, f"Failed to create patient: {response.text}"
        data = response.json()
        self.test_patient_id = data['id']
        return data
    
    def add_participant_to_meeting(self):
        """Add the test participant to the meeting"""
        headers = {"Authorization": f"Bearer {self.organizer_token}"}
        
        response = self.session.post(
            f"{BASE_URL}/api/meetings/{self.test_meeting_id}/participants",
            json={"user_id": self.test_participant_id, "role": "attendee"},
            headers=headers
        )
        
        assert response.status_code == 200, f"Failed to add participant: {response.text}"
        return response.json()
    
    # ============== TESTS ==============
    
    def test_01_api_health(self):
        """Test API is healthy"""
        response = self.session.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'healthy'
        print("✓ API health check passed")
    
    def test_02_organizer_login(self):
        """Test organizer can login"""
        data = self.login_as_organizer()
        assert 'access_token' in data
        assert data['user']['email'] == ORGANIZER_EMAIL
        print(f"✓ Organizer login successful: {data['user']['name']}")
    
    def test_03_organizer_adds_patient_auto_approved(self):
        """Test that when organizer adds patient, it's auto-approved"""
        self.login_as_organizer()
        self.create_test_meeting()
        self.create_test_patient()
        
        headers = {"Authorization": f"Bearer {self.organizer_token}"}
        
        # Organizer adds patient to meeting
        response = self.session.post(
            f"{BASE_URL}/api/meetings/{self.test_meeting_id}/patients",
            json={
                "patient_id": self.test_patient_id,
                "reason_for_discussion": "Test case review",
                "status": "new_case"
            },
            headers=headers
        )
        
        assert response.status_code == 200, f"Failed to add patient: {response.text}"
        data = response.json()
        
        # Verify auto-approved
        assert data.get('approval_status') == 'approved', f"Expected 'approved', got: {data.get('approval_status')}"
        print(f"✓ Organizer added patient - auto-approved: {data.get('approval_status')}")
        
        # Verify in meeting details
        meeting_response = self.session.get(
            f"{BASE_URL}/api/meetings/{self.test_meeting_id}",
            headers=headers
        )
        assert meeting_response.status_code == 200
        meeting_data = meeting_response.json()
        
        patient_in_meeting = next(
            (p for p in meeting_data.get('patients', []) if p['patient_id'] == self.test_patient_id),
            None
        )
        assert patient_in_meeting is not None, "Patient not found in meeting"
        assert patient_in_meeting.get('approval_status') == 'approved'
        assert patient_in_meeting.get('approved_by') == self.organizer_id
        assert patient_in_meeting.get('approved_by_name') is not None
        print(f"✓ Patient in meeting with approved status, approved_by_name: {patient_in_meeting.get('approved_by_name')}")
    
    def test_04_participant_adds_patient_pending_status(self):
        """Test that when participant adds patient, it's pending"""
        self.login_as_organizer()
        self.create_test_meeting()
        self.create_test_participant()
        self.add_participant_to_meeting()
        
        # Create another patient for this test
        headers_org = {"Authorization": f"Bearer {self.organizer_token}"}
        unique_id = str(uuid.uuid4())[:8]
        
        patient_response = self.session.post(f"{BASE_URL}/api/patients", json={
            "first_name": f"TEST_Pending_{unique_id}",
            "last_name": "Patient",
            "patient_id_number": f"MRN-PEND-{unique_id}",
            "date_of_birth": "1985-05-20",
            "gender": "female",
            "primary_diagnosis": "Pending test",
            "department_name": "Oncology"
        }, headers=headers_org)
        
        assert patient_response.status_code == 200
        patient_data = patient_response.json()
        pending_patient_id = patient_data['id']
        
        # Participant adds patient to meeting
        headers_participant = {"Authorization": f"Bearer {self.participant_token}"}
        
        response = self.session.post(
            f"{BASE_URL}/api/meetings/{self.test_meeting_id}/patients",
            json={
                "patient_id": pending_patient_id,
                "reason_for_discussion": "Participant added case",
                "status": "new_case"
            },
            headers=headers_participant
        )
        
        assert response.status_code == 200, f"Failed to add patient: {response.text}"
        data = response.json()
        
        # Verify pending status
        assert data.get('approval_status') == 'pending', f"Expected 'pending', got: {data.get('approval_status')}"
        assert "Awaiting organizer approval" in data.get('message', ''), f"Expected approval message, got: {data.get('message')}"
        print(f"✓ Participant added patient - pending status: {data.get('approval_status')}")
        print(f"✓ Message: {data.get('message')}")
        
        # Verify in meeting details
        meeting_response = self.session.get(
            f"{BASE_URL}/api/meetings/{self.test_meeting_id}",
            headers=headers_org
        )
        assert meeting_response.status_code == 200
        meeting_data = meeting_response.json()
        
        patient_in_meeting = next(
            (p for p in meeting_data.get('patients', []) if p['patient_id'] == pending_patient_id),
            None
        )
        assert patient_in_meeting is not None, "Patient not found in meeting"
        assert patient_in_meeting.get('approval_status') == 'pending'
        assert patient_in_meeting.get('added_by_name') is not None
        print(f"✓ Patient in meeting with pending status, added_by_name: {patient_in_meeting.get('added_by_name')}")
    
    def test_05_organizer_approves_pending_patient(self):
        """Test that organizer can approve a pending patient"""
        self.login_as_organizer()
        self.create_test_meeting()
        self.create_test_participant()
        self.add_participant_to_meeting()
        
        # Create patient
        headers_org = {"Authorization": f"Bearer {self.organizer_token}"}
        unique_id = str(uuid.uuid4())[:8]
        
        patient_response = self.session.post(f"{BASE_URL}/api/patients", json={
            "first_name": f"TEST_ToApprove_{unique_id}",
            "last_name": "Patient",
            "patient_id_number": f"MRN-APPR-{unique_id}",
            "date_of_birth": "1975-03-10",
            "gender": "male",
            "primary_diagnosis": "Approval test",
            "department_name": "Neurology"
        }, headers=headers_org)
        
        assert patient_response.status_code == 200
        patient_data = patient_response.json()
        approve_patient_id = patient_data['id']
        
        # Participant adds patient (pending)
        headers_participant = {"Authorization": f"Bearer {self.participant_token}"}
        
        add_response = self.session.post(
            f"{BASE_URL}/api/meetings/{self.test_meeting_id}/patients",
            json={
                "patient_id": approve_patient_id,
                "reason_for_discussion": "Needs approval",
                "status": "new_case"
            },
            headers=headers_participant
        )
        
        assert add_response.status_code == 200
        assert add_response.json().get('approval_status') == 'pending'
        print("✓ Patient added with pending status")
        
        # Organizer approves
        approve_response = self.session.post(
            f"{BASE_URL}/api/meetings/{self.test_meeting_id}/patients/{approve_patient_id}/approve",
            headers=headers_org
        )
        
        assert approve_response.status_code == 200, f"Approval failed: {approve_response.text}"
        approve_data = approve_response.json()
        
        assert approve_data.get('message') == 'Patient approved successfully'
        assert approve_data.get('approved_by') is not None
        assert approve_data.get('approved_at') is not None
        print(f"✓ Patient approved by: {approve_data.get('approved_by')}")
        
        # Verify in meeting details
        meeting_response = self.session.get(
            f"{BASE_URL}/api/meetings/{self.test_meeting_id}",
            headers=headers_org
        )
        assert meeting_response.status_code == 200
        meeting_data = meeting_response.json()
        
        patient_in_meeting = next(
            (p for p in meeting_data.get('patients', []) if p['patient_id'] == approve_patient_id),
            None
        )
        assert patient_in_meeting is not None
        assert patient_in_meeting.get('approval_status') == 'approved'
        assert patient_in_meeting.get('approved_by_name') is not None
        print(f"✓ Patient now approved in meeting, approved_by_name: {patient_in_meeting.get('approved_by_name')}")
    
    def test_06_non_organizer_cannot_approve(self):
        """Test that non-organizer cannot approve patients"""
        self.login_as_organizer()
        self.create_test_meeting()
        self.create_test_participant()
        self.add_participant_to_meeting()
        
        # Create patient
        headers_org = {"Authorization": f"Bearer {self.organizer_token}"}
        unique_id = str(uuid.uuid4())[:8]
        
        patient_response = self.session.post(f"{BASE_URL}/api/patients", json={
            "first_name": f"TEST_NoApprove_{unique_id}",
            "last_name": "Patient",
            "patient_id_number": f"MRN-NOAPPR-{unique_id}",
            "date_of_birth": "1980-07-25",
            "gender": "female",
            "primary_diagnosis": "No approve test",
            "department_name": "Pediatrics"
        }, headers=headers_org)
        
        assert patient_response.status_code == 200
        patient_data = patient_response.json()
        no_approve_patient_id = patient_data['id']
        
        # Participant adds patient
        headers_participant = {"Authorization": f"Bearer {self.participant_token}"}
        
        add_response = self.session.post(
            f"{BASE_URL}/api/meetings/{self.test_meeting_id}/patients",
            json={
                "patient_id": no_approve_patient_id,
                "reason_for_discussion": "Cannot approve",
                "status": "new_case"
            },
            headers=headers_participant
        )
        
        assert add_response.status_code == 200
        
        # Participant tries to approve (should fail)
        approve_response = self.session.post(
            f"{BASE_URL}/api/meetings/{self.test_meeting_id}/patients/{no_approve_patient_id}/approve",
            headers=headers_participant
        )
        
        assert approve_response.status_code == 403, f"Expected 403, got: {approve_response.status_code}"
        assert "Only organizer can approve" in approve_response.text
        print("✓ Non-organizer correctly denied approval permission")
    
    def test_07_approve_already_approved_patient(self):
        """Test approving an already approved patient returns appropriate message"""
        self.login_as_organizer()
        self.create_test_meeting()
        self.create_test_patient()
        
        headers = {"Authorization": f"Bearer {self.organizer_token}"}
        
        # Organizer adds patient (auto-approved)
        add_response = self.session.post(
            f"{BASE_URL}/api/meetings/{self.test_meeting_id}/patients",
            json={
                "patient_id": self.test_patient_id,
                "reason_for_discussion": "Already approved test",
                "status": "new_case"
            },
            headers=headers
        )
        
        assert add_response.status_code == 200
        assert add_response.json().get('approval_status') == 'approved'
        
        # Try to approve again
        approve_response = self.session.post(
            f"{BASE_URL}/api/meetings/{self.test_meeting_id}/patients/{self.test_patient_id}/approve",
            headers=headers
        )
        
        assert approve_response.status_code == 200
        assert approve_response.json().get('message') == 'Patient already approved'
        print("✓ Already approved patient returns correct message")
    
    def test_08_approve_nonexistent_patient(self):
        """Test approving a patient not in the meeting"""
        self.login_as_organizer()
        self.create_test_meeting()
        
        headers = {"Authorization": f"Bearer {self.organizer_token}"}
        fake_patient_id = str(uuid.uuid4())
        
        approve_response = self.session.post(
            f"{BASE_URL}/api/meetings/{self.test_meeting_id}/patients/{fake_patient_id}/approve",
            headers=headers
        )
        
        assert approve_response.status_code == 404
        assert "Patient not found" in approve_response.text
        print("✓ Approving nonexistent patient returns 404")
    
    def test_09_meeting_detail_includes_approval_info(self):
        """Test that meeting detail includes all approval-related fields"""
        self.login_as_organizer()
        self.create_test_meeting()
        self.create_test_patient()
        
        headers = {"Authorization": f"Bearer {self.organizer_token}"}
        
        # Add patient
        self.session.post(
            f"{BASE_URL}/api/meetings/{self.test_meeting_id}/patients",
            json={
                "patient_id": self.test_patient_id,
                "reason_for_discussion": "Detail test",
                "status": "new_case"
            },
            headers=headers
        )
        
        # Get meeting details
        response = self.session.get(
            f"{BASE_URL}/api/meetings/{self.test_meeting_id}",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert 'patients' in data
        assert len(data['patients']) > 0
        
        patient = data['patients'][0]
        
        # Check required fields
        assert 'approval_status' in patient, "Missing approval_status field"
        assert 'added_by' in patient, "Missing added_by field"
        assert 'added_by_name' in patient, "Missing added_by_name field"
        
        if patient['approval_status'] == 'approved':
            assert 'approved_by' in patient, "Missing approved_by field for approved patient"
            assert 'approved_by_name' in patient, "Missing approved_by_name field for approved patient"
            assert 'approved_at' in patient, "Missing approved_at field for approved patient"
        
        print(f"✓ Meeting detail includes all approval fields:")
        print(f"  - approval_status: {patient.get('approval_status')}")
        print(f"  - added_by_name: {patient.get('added_by_name')}")
        print(f"  - approved_by_name: {patient.get('approved_by_name')}")
    
    def test_10_add_patient_endpoint_returns_approval_status(self):
        """Test that POST /api/meetings/{id}/patients returns approval_status"""
        self.login_as_organizer()
        self.create_test_meeting()
        
        headers = {"Authorization": f"Bearer {self.organizer_token}"}
        unique_id = str(uuid.uuid4())[:8]
        
        # Create patient
        patient_response = self.session.post(f"{BASE_URL}/api/patients", json={
            "first_name": f"TEST_Response_{unique_id}",
            "last_name": "Check",
            "patient_id_number": f"MRN-RESP-{unique_id}",
            "date_of_birth": "1995-12-01",
            "gender": "male",
            "primary_diagnosis": "Response check",
            "department_name": "General"
        }, headers=headers)
        
        assert patient_response.status_code == 200
        patient_id = patient_response.json()['id']
        
        # Add patient to meeting
        add_response = self.session.post(
            f"{BASE_URL}/api/meetings/{self.test_meeting_id}/patients",
            json={
                "patient_id": patient_id,
                "reason_for_discussion": "Response check",
                "status": "new_case"
            },
            headers=headers
        )
        
        assert add_response.status_code == 200
        data = add_response.json()
        
        assert 'approval_status' in data, "Response missing approval_status field"
        assert 'id' in data, "Response missing id field"
        assert 'message' in data, "Response missing message field"
        
        print(f"✓ Add patient response includes approval_status: {data.get('approval_status')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
