#!/bin/bash
# Quick MongoDB Access Commands for Hospital Meeting App

echo "🗄️  MongoDB Quick Access Guide"
echo "================================"
echo ""

# Connection info
echo "📍 Connection:"
echo "   mongodb://localhost:27017/hospital_meeting_db"
echo ""

# Interactive shell
echo "💻 Access MongoDB Shell:"
echo "   mongosh mongodb://localhost:27017/hospital_meeting_db"
echo ""

# Quick commands
cat << 'COMMANDS'
📝 Common Commands (run in mongosh):

1. List Collections:
   show collections

2. View All Users:
   db.users.find({}, {password_hash: 0}).pretty()

3. View All Patients:
   db.patients.find().pretty()

4. View All Meetings:
   db.meetings.find().pretty()

5. View Meeting with Participants:
   const meetingId = "YOUR_MEETING_ID";
   db.meetings.findOne({id: meetingId})
   db.meeting_participants.find({meeting_id: meetingId})

6. Count Documents:
   db.users.countDocuments()
   db.patients.countDocuments()
   db.meetings.countDocuments()

7. Search Users by Email:
   db.users.findOne({email: "testdoctor@hospital.com"})

8. Get Meetings by Status:
   db.meetings.find({status: "scheduled"})

9. Get Recent Patients:
   db.patients.find().sort({created_at: -1}).limit(5)

10. View Meeting Agenda:
    const meetingId = "YOUR_MEETING_ID";
    db.agenda_items.find({meeting_id: meetingId}).sort({order_index: 1})

COMMANDS

echo ""
echo "📥 Export Data:"
echo "   # Export users to JSON"
echo "   mongoexport --db=hospital_meeting_db --collection=users --out=users.json --pretty"
echo ""
echo "   # Export patients to CSV"
echo "   mongoexport --db=hospital_meeting_db --collection=patients --type=csv --fields=first_name,last_name,primary_diagnosis --out=patients.csv"
echo ""

echo "🔍 View Full Schema Documentation:"
echo "   cat /app/MONGODB_SCHEMA.md"
echo ""
