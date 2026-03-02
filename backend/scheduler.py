"""
Background tasks for Hospital Meeting App
Handles scheduled email reminders and daily digests
"""

import asyncio
import os
from datetime import datetime, timedelta, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from utils.email import send_meeting_reminder, send_daily_digest
import logging

logger = logging.getLogger(__name__)

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/hospital_meeting_db')
DB_NAME = os.environ.get('DB_NAME', 'hospital_meeting_db')
FRONTEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:3000').replace(':8001', ':3000')

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


async def send_meeting_reminders_24h():
    """Send 24-hour meeting reminders"""
    try:
        # Get tomorrow's date
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        # Find all scheduled meetings for tomorrow
        meetings = await db.meetings.find({
            "meeting_date": tomorrow,
            "status": "scheduled"
        }, {"_id": 0}).to_list(1000)
        
        logger.info(f"Found {len(meetings)} meetings for 24h reminders")
        
        for meeting in meetings:
            # Get all accepted participants
            participants = await db.meeting_participants.find({
                "meeting_id": meeting['id'],
                "response_status": "accepted"
            }, {"_id": 0}).to_list(100)
            
            for participant_doc in participants:
                user = await db.users.find_one({"id": participant_doc['user_id']}, {"_id": 0})
                if user and user.get('email'):
                    try:
                        meeting_data = {
                            "id": meeting['id'],
                            "title": meeting.get('title', 'Meeting'),
                            "date": meeting.get('meeting_date', 'TBD'),
                            "time": meeting.get('start_time', 'TBD'),
                            "location": meeting.get('location', 'To be announced')
                        }
                        send_meeting_reminder(
                            meeting=meeting_data,
                            participant=user,
                            reminder_type="24h",
                            frontend_url=FRONTEND_URL
                        )
                        logger.info(f"Sent 24h reminder to {user.get('email')}")
                    except Exception as e:
                        logger.error(f"Failed to send 24h reminder: {str(e)}")
        
        logger.info("Completed 24h reminder batch")
    except Exception as e:
        logger.error(f"Error in 24h reminder task: {str(e)}")


async def send_meeting_reminders_1h():
    """Send 1-hour meeting reminders"""
    try:
        # Get current time + 1 hour
        now = datetime.now()
        target_time = now + timedelta(hours=1)
        today = now.strftime("%Y-%m-%d")
        target_hour = target_time.strftime("%H:00")
        
        # Find meetings starting in approximately 1 hour
        meetings = await db.meetings.find({
            "meeting_date": today,
            "status": "scheduled"
        }, {"_id": 0}).to_list(1000)
        
        # Filter meetings by time (within next hour)
        upcoming_meetings = []
        for meeting in meetings:
            meeting_time = meeting.get('start_time', '')
            if meeting_time:
                meeting_hour = meeting_time.split(':')[0] if ':' in meeting_time else None
                target_hour_only = target_hour.split(':')[0]
                if meeting_hour == target_hour_only:
                    upcoming_meetings.append(meeting)
        
        logger.info(f"Found {len(upcoming_meetings)} meetings for 1h reminders")
        
        for meeting in upcoming_meetings:
            # Get all accepted participants
            participants = await db.meeting_participants.find({
                "meeting_id": meeting['id'],
                "response_status": "accepted"
            }, {"_id": 0}).to_list(100)
            
            for participant_doc in participants:
                user = await db.users.find_one({"id": participant_doc['user_id']}, {"_id": 0})
                if user and user.get('email'):
                    try:
                        meeting_data = {
                            "id": meeting['id'],
                            "title": meeting.get('title', 'Meeting'),
                            "date": meeting.get('meeting_date', 'TBD'),
                            "time": meeting.get('start_time', 'TBD'),
                            "location": meeting.get('location', 'To be announced')
                        }
                        send_meeting_reminder(
                            meeting=meeting_data,
                            participant=user,
                            reminder_type="1h",
                            frontend_url=FRONTEND_URL
                        )
                        logger.info(f"Sent 1h reminder to {user.get('email')}")
                    except Exception as e:
                        logger.error(f"Failed to send 1h reminder: {str(e)}")
        
        logger.info("Completed 1h reminder batch")
    except Exception as e:
        logger.error(f"Error in 1h reminder task: {str(e)}")


async def send_daily_digests():
    """Send daily digest emails to all users with upcoming meetings"""
    try:
        today = datetime.now().strftime("%Y-%m-%d")
        week_end = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        
        # Get all active users
        users = await db.users.find({"is_active": True}, {"_id": 0}).to_list(1000)
        
        logger.info(f"Sending daily digests to {len(users)} users")
        
        for user in users:
            try:
                # Get user's meetings as participant
                participant_meetings = await db.meeting_participants.find({
                    "user_id": user['id']
                }, {"_id": 0}).to_list(1000)
                participant_meeting_ids = [pm['meeting_id'] for pm in participant_meetings]
                
                # Get today's meetings
                todays_meetings = await db.meetings.find({
                    "meeting_date": today,
                    "status": "scheduled",
                    "$or": [
                        {"organizer_id": user['id']},
                        {"id": {"$in": participant_meeting_ids}}
                    ]
                }, {"_id": 0}).sort("start_time", 1).to_list(100)
                
                # Get upcoming meetings this week
                upcoming_meetings = await db.meetings.find({
                    "meeting_date": {"$gt": today, "$lte": week_end},
                    "status": "scheduled",
                    "$or": [
                        {"organizer_id": user['id']},
                        {"id": {"$in": participant_meeting_ids}}
                    ]
                }, {"_id": 0}).sort([("meeting_date", 1), ("start_time", 1)]).to_list(100)
                
                # Only send if user has meetings
                if todays_meetings or upcoming_meetings:
                    # Format meetings for email
                    formatted_todays = []
                    for m in todays_meetings:
                        formatted_todays.append({
                            "id": m['id'],
                            "title": m.get('title', 'Meeting'),
                            "time": m.get('start_time', 'TBD'),
                            "location": m.get('location', 'To be announced')
                        })
                    
                    formatted_upcoming = []
                    for m in upcoming_meetings:
                        formatted_upcoming.append({
                            "id": m['id'],
                            "title": m.get('title', 'Meeting'),
                            "date": m.get('meeting_date', 'TBD'),
                            "time": m.get('start_time', 'TBD')
                        })
                    
                    if user.get('email'):
                        send_daily_digest(
                            user=user,
                            todays_meetings=formatted_todays,
                            upcoming_meetings=formatted_upcoming,
                            frontend_url=FRONTEND_URL
                        )
                        logger.info(f"Sent daily digest to {user.get('email')}")
            except Exception as e:
                logger.error(f"Failed to send daily digest to {user.get('email', 'unknown')}: {str(e)}")
        
        logger.info("Completed daily digest batch")
    except Exception as e:
        logger.error(f"Error in daily digest task: {str(e)}")


async def scheduler():
    """Main scheduler loop"""
    logger.info("Email scheduler started")
    
    while True:
        try:
            now = datetime.now()
            current_hour = now.hour
            current_minute = now.minute
            
            # Send daily digest at 8:00 AM
            if current_hour == 8 and current_minute == 0:
                await send_daily_digests()
                await asyncio.sleep(60)  # Sleep for 1 minute to avoid duplicate sends
            
            # Send 24h reminders every hour
            if current_minute == 0:
                await send_meeting_reminders_24h()
                await asyncio.sleep(60)
            
            # Send 1h reminders every 10 minutes
            if current_minute % 10 == 0:
                await send_meeting_reminders_1h()
                await asyncio.sleep(60)
            
            # Sleep for 30 seconds before next check
            await asyncio.sleep(30)
            
        except Exception as e:
            logger.error(f"Error in scheduler: {str(e)}")
            await asyncio.sleep(60)  # Wait a minute before retrying


if __name__ == "__main__":
    # Run scheduler
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    asyncio.run(scheduler())
