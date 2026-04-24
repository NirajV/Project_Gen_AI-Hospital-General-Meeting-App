"""
Microsoft Teams Integration Service
Creates and manages Teams meeting links for hospital meetings
"""

from msgraph import GraphServiceClient
from msgraph.generated.models.online_meeting import OnlineMeeting
from azure.identity import ClientSecretCredential
from datetime import datetime
from typing import Dict, Any, Optional
import logging
import os

logger = logging.getLogger(__name__)

class TeamsService:
    """Service for creating and managing Microsoft Teams meetings"""
    
    def __init__(self):
        """Initialize the Teams service with Azure AD credentials"""
        self.client_id = os.getenv('GRAPH_CLIENT_ID')
        self.tenant_id = os.getenv('GRAPH_TENANT_ID')
        self.client_secret = os.getenv('GRAPH_CLIENT_SECRET')
        self.user_id = os.getenv('GRAPH_USER_ID', 'NirajVishwakarma@yhgkntech.onmicrosoft.com')
        
        if not all([self.client_id, self.tenant_id, self.client_secret]):
            raise ValueError("Teams credentials not configured. Check GRAPH_CLIENT_ID, GRAPH_TENANT_ID, and GRAPH_CLIENT_SECRET in .env")
        
        # Initialize credential
        self.credential = ClientSecretCredential(
            tenant_id=self.tenant_id,
            client_id=self.client_id,
            client_secret=self.client_secret
        )
        
        # Initialize Graph client
        self.client = GraphServiceClient(
            credentials=self.credential,
            scopes=['https://graph.microsoft.com/.default']
        )
        
        logger.info("Teams service initialized successfully")
    
    async def create_online_meeting(
        self,
        subject: str,
        start_datetime: datetime,
        end_datetime: datetime,
        require_passcode: bool = False
    ) -> Dict[str, Any]:
        """
        Create a new Teams meeting
        
        Args:
            subject: Meeting title
            start_datetime: Meeting start time
            end_datetime: Meeting end time
            require_passcode: Whether to require a passcode to join
            
        Returns:
            Dictionary with meeting details including join URL
        """
        try:
            # Create OnlineMeeting object
            online_meeting = OnlineMeeting()
            online_meeting.subject = subject
            online_meeting.start_date_time = start_datetime
            online_meeting.end_date_time = end_datetime
            
            # Create meeting using application permissions (on behalf of service account)
            result = await self.client.users.by_user_id(
                self.user_id
            ).online_meetings.post(online_meeting)
            
            if not result:
                raise Exception("Failed to create Teams meeting - no response from API")
            
            logger.info(f"Successfully created Teams meeting: {result.id}")
            
            return {
                'id': result.id,
                'joinWebUrl': result.join_web_url,
                'subject': result.subject,
                'startDateTime': result.start_date_time.isoformat() if result.start_date_time else None,
                'endDateTime': result.end_date_time.isoformat() if result.end_date_time else None,
                'createdDateTime': result.creation_date_time.isoformat() if result.creation_date_time else None
            }
            
        except Exception as e:
            logger.error(f"Failed to create Teams meeting: {str(e)}")
            raise Exception(f"Teams meeting creation failed: {str(e)}")
    
    async def get_meeting(self, meeting_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve Teams meeting details
        
        Args:
            meeting_id: Teams meeting ID
            
        Returns:
            Dictionary with meeting details or None if not found
        """
        try:
            result = await self.client.users.by_user_id(
                self.user_id
            ).online_meetings.by_online_meeting_id(meeting_id).get()
            
            if not result:
                return None
            
            return {
                'id': result.id,
                'joinWebUrl': result.join_web_url,
                'subject': result.subject,
                'startDateTime': result.start_date_time,
                'endDateTime': result.end_date_time
            }
            
        except Exception as e:
            logger.error(f"Failed to retrieve Teams meeting: {str(e)}")
            return None
    
    async def delete_meeting(self, meeting_id: str) -> bool:
        """
        Delete a Teams meeting
        
        Args:
            meeting_id: Teams meeting ID
            
        Returns:
            True if successful, False otherwise
        """
        try:
            await self.client.users.by_user_id(
                self.user_id
            ).online_meetings.by_online_meeting_id(meeting_id).delete()
            
            logger.info(f"Successfully deleted Teams meeting: {meeting_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete Teams meeting: {str(e)}")
            return False


# Singleton instance
_teams_service = None

def get_teams_service() -> TeamsService:
    """Get or create Teams service singleton"""
    global _teams_service
    if _teams_service is None:
        _teams_service = TeamsService()
    return _teams_service
