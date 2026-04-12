// ============================================================
// MongoDB Database Setup for Hospital Meeting Scheduler
// ============================================================
// 
// Purpose: Create collections, indexes, and schema validation
// Database: hospital_meeting_scheduler
// Version: 1.0
// Last Updated: April 10, 2026
//
// Usage:
//   1. Start MongoDB: mongod
//   2. Run this script: mongosh < DDL_Mongo.js
//   OR
//   3. Copy-paste into mongosh interactive shell
//
// ============================================================

// Switch to database (creates if doesn't exist)
use hospital_meeting_scheduler;

print("=== Creating Hospital Meeting Scheduler Database ===");

// ============================================================
// 1. USERS COLLECTION
// ============================================================
print("\n1. Creating 'users' collection...");

db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["id", "email", "name", "role"],
      properties: {
        id: {
          bsonType: "string",
          description: "UUID - required"
        },
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
          description: "Email address - required and must be valid format"
        },
        name: {
          bsonType: "string",
          description: "User full name - required"
        },
        password_hash: {
          bsonType: "string",
          description: "Bcrypt hashed password"
        },
        specialty: {
          bsonType: ["string", "null"],
          description: "Medical specialty (optional)"
        },
        organization: {
          bsonType: ["string", "null"],
          description: "Hospital or organization name"
        },
        phone: {
          bsonType: ["string", "null"],
          description: "Contact phone number"
        },
        role: {
          bsonType: "string",
          enum: ["doctor", "nurse", "admin", "staff"],
          description: "User role"
        },
        picture: {
          bsonType: ["string", "null"],
          description: "Profile picture URL"
        },
        is_active: {
          bsonType: "bool",
          description: "Account active status"
        },
        requires_password_change: {
          bsonType: "bool",
          description: "Force password change on next login"
        },
        created_at: {
          bsonType: "string",
          description: "ISO 8601 timestamp"
        },
        updated_at: {
          bsonType: ["string", "null"],
          description: "ISO 8601 timestamp"
        }
      }
    }
  }
});

// Create indexes
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "id": 1 }, { unique: true });
db.users.createIndex({ "role": 1 });
db.users.createIndex({ "created_at": -1 });

print("✓ 'users' collection created with indexes");

// ============================================================
// 2. USER SESSIONS COLLECTION (for Google OAuth)
// ============================================================
print("\n2. Creating 'user_sessions' collection...");

db.createCollection("user_sessions", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["id", "user_id", "session_token", "expires_at"],
      properties: {
        id: {
          bsonType: "string",
          description: "Session ID - required"
        },
        user_id: {
          bsonType: "string",
          description: "Reference to users.id - required"
        },
        session_token: {
          bsonType: "string",
          description: "Session token - required"
        },
        expires_at: {
          bsonType: "string",
          description: "ISO 8601 expiration timestamp - required"
        },
        created_at: {
          bsonType: "string",
          description: "ISO 8601 timestamp"
        }
      }
    }
  }
});

// Create indexes
db.user_sessions.createIndex({ "session_token": 1 }, { unique: true });
db.user_sessions.createIndex({ "user_id": 1 });
db.user_sessions.createIndex({ "expires_at": 1 }, { expireAfterSeconds: 0 }); // TTL index

print("✓ 'user_sessions' collection created with indexes");

// ============================================================
// 3. PATIENTS COLLECTION
// ============================================================
print("\n3. Creating 'patients' collection...");

db.createCollection("patients", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["id", "first_name", "last_name"],
      properties: {
        id: {
          bsonType: "string",
          description: "UUID - required"
        },
        patient_id_number: {
          bsonType: ["string", "null"],
          description: "Hospital patient ID/MRN"
        },
        first_name: {
          bsonType: "string",
          description: "Patient first name - required"
        },
        last_name: {
          bsonType: "string",
          description: "Patient last name - required"
        },
        date_of_birth: {
          bsonType: ["string", "null"],
          description: "Date of birth (YYYY-MM-DD)"
        },
        gender: {
          bsonType: ["string", "null"],
          enum: ["male", "female", "other", null],
          description: "Patient gender"
        },
        email: {
          bsonType: ["string", "null"],
          description: "Patient email"
        },
        phone: {
          bsonType: ["string", "null"],
          description: "Patient phone"
        },
        address: {
          bsonType: ["string", "null"],
          description: "Patient address"
        },
        primary_diagnosis: {
          bsonType: ["string", "null"],
          description: "Primary diagnosis"
        },
        allergies: {
          bsonType: ["string", "null"],
          description: "Known allergies"
        },
        current_medications: {
          bsonType: ["string", "null"],
          description: "Current medications"
        },
        department_name: {
          bsonType: ["string", "null"],
          description: "Department name"
        },
        department_provider_name: {
          bsonType: ["string", "null"],
          description: "Provider name"
        },
        notes: {
          bsonType: ["string", "null"],
          description: "Additional notes"
        },
        created_at: {
          bsonType: "string",
          description: "ISO 8601 timestamp"
        },
        updated_at: {
          bsonType: ["string", "null"],
          description: "ISO 8601 timestamp"
        }
      }
    }
  }
});

// Create indexes
db.patients.createIndex({ "id": 1 }, { unique: true });
db.patients.createIndex({ "patient_id_number": 1 });
db.patients.createIndex({ "first_name": 1, "last_name": 1 });
db.patients.createIndex({ "created_at": -1 });

print("✓ 'patients' collection created with indexes");

// ============================================================
// 4. MEETINGS COLLECTION
// ============================================================
print("\n4. Creating 'meetings' collection...");

db.createCollection("meetings", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["id", "title", "meeting_date", "start_time", "end_time", "organizer_id"],
      properties: {
        id: {
          bsonType: "string",
          description: "UUID - required"
        },
        title: {
          bsonType: "string",
          description: "Meeting title - required"
        },
        description: {
          bsonType: ["string", "null"],
          description: "Meeting description"
        },
        meeting_date: {
          bsonType: "string",
          description: "Date (YYYY-MM-DD) - required"
        },
        start_time: {
          bsonType: "string",
          description: "Start time (HH:MM) - required"
        },
        end_time: {
          bsonType: "string",
          description: "End time (HH:MM) - required"
        },
        duration_minutes: {
          bsonType: ["int", "null"],
          description: "Meeting duration in minutes"
        },
        meeting_type: {
          bsonType: "string",
          enum: ["video", "in_person", "hybrid"],
          description: "Meeting type"
        },
        location: {
          bsonType: ["string", "null"],
          description: "Physical location"
        },
        video_link: {
          bsonType: ["string", "null"],
          description: "Video conference link"
        },
        status: {
          bsonType: "string",
          enum: ["scheduled", "in_progress", "completed", "cancelled"],
          description: "Meeting status"
        },
        organizer_id: {
          bsonType: "string",
          description: "Reference to users.id - required"
        },
        recurrence_type: {
          bsonType: "string",
          enum: ["one_time", "daily", "weekly", "monthly"],
          description: "Recurrence pattern"
        },
        recurrence_end_date: {
          bsonType: ["string", "null"],
          description: "Recurrence end date"
        },
        completed_at: {
          bsonType: ["string", "null"],
          description: "ISO 8601 timestamp when marked complete"
        },
        created_at: {
          bsonType: "string",
          description: "ISO 8601 timestamp"
        },
        updated_at: {
          bsonType: ["string", "null"],
          description: "ISO 8601 timestamp"
        }
      }
    }
  }
});

// Create indexes
db.meetings.createIndex({ "id": 1 }, { unique: true });
db.meetings.createIndex({ "organizer_id": 1 });
db.meetings.createIndex({ "meeting_date": -1 });
db.meetings.createIndex({ "status": 1 });
db.meetings.createIndex({ "created_at": -1 });

print("✓ 'meetings' collection created with indexes");

// ============================================================
// 5. MEETING_PARTICIPANTS COLLECTION
// ============================================================
print("\n5. Creating 'meeting_participants' collection...");

db.createCollection("meeting_participants", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["id", "meeting_id", "user_id"],
      properties: {
        id: {
          bsonType: "string",
          description: "UUID - required"
        },
        meeting_id: {
          bsonType: "string",
          description: "Reference to meetings.id - required"
        },
        user_id: {
          bsonType: "string",
          description: "Reference to users.id - required"
        },
        role: {
          bsonType: "string",
          enum: ["organizer", "presenter", "attendee", "optional"],
          description: "Participant role"
        },
        response_status: {
          bsonType: "string",
          enum: ["pending", "accepted", "declined", "tentative"],
          description: "Response status"
        },
        created_at: {
          bsonType: "string",
          description: "ISO 8601 timestamp"
        }
      }
    }
  }
});

// Create indexes
db.meeting_participants.createIndex({ "id": 1 }, { unique: true });
db.meeting_participants.createIndex({ "meeting_id": 1, "user_id": 1 }, { unique: true });
db.meeting_participants.createIndex({ "user_id": 1 });

print("✓ 'meeting_participants' collection created with indexes");

// ============================================================
// 6. MEETING_PATIENTS COLLECTION (with Approval Status)
// ============================================================
print("\n6. Creating 'meeting_patients' collection...");

db.createCollection("meeting_patients", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["id", "meeting_id", "patient_id", "added_by", "approval_status"],
      properties: {
        id: {
          bsonType: "string",
          description: "UUID - required"
        },
        meeting_id: {
          bsonType: "string",
          description: "Reference to meetings.id - required"
        },
        patient_id: {
          bsonType: "string",
          description: "Reference to patients.id - required"
        },
        clinical_question: {
          bsonType: ["string", "null"],
          description: "Clinical question for discussion"
        },
        reason_for_discussion: {
          bsonType: ["string", "null"],
          description: "Reason for patient discussion"
        },
        status: {
          bsonType: "string",
          enum: ["new_case", "follow_up", "urgent", "routine"],
          description: "Patient case status"
        },
        added_by: {
          bsonType: "string",
          description: "User ID who added patient - required"
        },
        added_by_name: {
          bsonType: ["string", "null"],
          description: "Cached user name"
        },
        approval_status: {
          bsonType: "string",
          enum: ["pending", "approved"],
          description: "Approval status - required"
        },
        approved_by: {
          bsonType: ["string", "null"],
          description: "User ID who approved"
        },
        approved_by_name: {
          bsonType: ["string", "null"],
          description: "Cached approver name"
        },
        approved_at: {
          bsonType: ["string", "null"],
          description: "ISO 8601 approval timestamp"
        },
        created_at: {
          bsonType: "string",
          description: "ISO 8601 timestamp"
        }
      }
    }
  }
});

// Create indexes
db.meeting_patients.createIndex({ "id": 1 }, { unique: true });
db.meeting_patients.createIndex({ "meeting_id": 1, "patient_id": 1 }, { unique: true });
db.meeting_patients.createIndex({ "patient_id": 1 });
db.meeting_patients.createIndex({ "approval_status": 1 });
db.meeting_patients.createIndex({ "added_by": 1 });

print("✓ 'meeting_patients' collection created with indexes");

// ============================================================
// 7. AGENDA_ITEMS COLLECTION
// ============================================================
print("\n7. Creating 'agenda_items' collection...");

db.createCollection("agenda_items", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["id", "meeting_id", "patient_id"],
      properties: {
        id: {
          bsonType: "string",
          description: "UUID - required"
        },
        meeting_id: {
          bsonType: "string",
          description: "Reference to meetings.id - required"
        },
        patient_id: {
          bsonType: "string",
          description: "Reference to patients.id - required"
        },
        mrn: {
          bsonType: ["string", "null"],
          description: "Medical Record Number"
        },
        requested_provider: {
          bsonType: ["string", "null"],
          description: "Requested provider name"
        },
        diagnosis: {
          bsonType: ["string", "null"],
          description: "Patient diagnosis"
        },
        reason_for_discussion: {
          bsonType: ["string", "null"],
          description: "Discussion reason"
        },
        pathology_required: {
          bsonType: "bool",
          description: "Pathology review needed"
        },
        radiology_required: {
          bsonType: "bool",
          description: "Radiology review needed"
        },
        treatment_plan: {
          bsonType: ["string", "null"],
          description: "Proposed treatment plan"
        },
        order_number: {
          bsonType: ["int", "null"],
          description: "Display order"
        },
        created_at: {
          bsonType: "string",
          description: "ISO 8601 timestamp"
        }
      }
    }
  }
});

// Create indexes
db.agenda_items.createIndex({ "id": 1 }, { unique: true });
db.agenda_items.createIndex({ "meeting_id": 1 });
db.agenda_items.createIndex({ "patient_id": 1 });
db.agenda_items.createIndex({ "order_number": 1 });

print("✓ 'agenda_items' collection created with indexes");

// ============================================================
// 8. DECISION_LOGS COLLECTION
// ============================================================
print("\n8. Creating 'decision_logs' collection...");

db.createCollection("decision_logs", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["id", "meeting_id", "title", "created_by"],
      properties: {
        id: {
          bsonType: "string",
          description: "UUID - required"
        },
        meeting_id: {
          bsonType: "string",
          description: "Reference to meetings.id - required"
        },
        meeting_patient_id: {
          bsonType: ["string", "null"],
          description: "Reference to meeting_patients.id"
        },
        agenda_item_id: {
          bsonType: ["string", "null"],
          description: "Reference to agenda_items.id"
        },
        decision_type: {
          bsonType: "string",
          enum: ["treatment", "diagnostic", "referral", "follow_up", "other"],
          description: "Decision type"
        },
        title: {
          bsonType: "string",
          description: "Decision title - required"
        },
        description: {
          bsonType: ["string", "null"],
          description: "Detailed description"
        },
        final_assessment: {
          bsonType: ["string", "null"],
          description: "Final clinical assessment"
        },
        action_plan: {
          bsonType: ["string", "null"],
          description: "Action plan"
        },
        responsible_doctor_id: {
          bsonType: ["string", "null"],
          description: "Reference to users.id"
        },
        follow_up_date: {
          bsonType: ["string", "null"],
          description: "Follow-up date (YYYY-MM-DD)"
        },
        priority: {
          bsonType: "string",
          enum: ["low", "medium", "high", "urgent"],
          description: "Priority level"
        },
        created_by: {
          bsonType: "string",
          description: "User ID who created - required"
        },
        created_at: {
          bsonType: "string",
          description: "ISO 8601 timestamp"
        }
      }
    }
  }
});

// Create indexes
db.decision_logs.createIndex({ "id": 1 }, { unique: true });
db.decision_logs.createIndex({ "meeting_id": 1 });
db.decision_logs.createIndex({ "meeting_patient_id": 1 });
db.decision_logs.createIndex({ "agenda_item_id": 1 });
db.decision_logs.createIndex({ "priority": 1 });
db.decision_logs.createIndex({ "created_at": -1 });

print("✓ 'decision_logs' collection created with indexes");

// ============================================================
// 9. FILES COLLECTION
// ============================================================
print("\n9. Creating 'files' collection...");

db.createCollection("files", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["id", "meeting_id", "filename", "file_path", "uploaded_by"],
      properties: {
        id: {
          bsonType: "string",
          description: "UUID - required"
        },
        meeting_id: {
          bsonType: "string",
          description: "Reference to meetings.id - required"
        },
        filename: {
          bsonType: "string",
          description: "Original filename - required"
        },
        file_path: {
          bsonType: "string",
          description: "Storage path - required"
        },
        file_type: {
          bsonType: ["string", "null"],
          description: "MIME type"
        },
        file_size: {
          bsonType: ["int", "null"],
          description: "File size in bytes"
        },
        uploaded_by: {
          bsonType: "string",
          description: "User ID who uploaded - required"
        },
        created_at: {
          bsonType: "string",
          description: "ISO 8601 timestamp"
        }
      }
    }
  }
});

// Create indexes
db.files.createIndex({ "id": 1 }, { unique: true });
db.files.createIndex({ "meeting_id": 1 });
db.files.createIndex({ "uploaded_by": 1 });
db.files.createIndex({ "created_at": -1 });

print("✓ 'files' collection created with indexes");

// ============================================================
// 10. FEEDBACK COLLECTION
// ============================================================
print("\n10. Creating 'feedback' collection...");

db.createCollection("feedback", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["id", "user_id", "feedback_type", "subject", "message"],
      properties: {
        id: {
          bsonType: "string",
          description: "UUID - required"
        },
        user_id: {
          bsonType: "string",
          description: "Reference to users.id - required"
        },
        feedback_type: {
          bsonType: "string",
          enum: ["bug", "feature_request", "improvement", "general"],
          description: "Feedback type - required"
        },
        subject: {
          bsonType: "string",
          description: "Feedback subject - required"
        },
        message: {
          bsonType: "string",
          description: "Feedback message - required"
        },
        status: {
          bsonType: "string",
          enum: ["new", "reviewed", "resolved", "closed"],
          description: "Feedback status"
        },
        created_at: {
          bsonType: "string",
          description: "ISO 8601 timestamp"
        }
      }
    }
  }
});

// Create indexes
db.feedback.createIndex({ "id": 1 }, { unique: true });
db.feedback.createIndex({ "user_id": 1 });
db.feedback.createIndex({ "feedback_type": 1 });
db.feedback.createIndex({ "status": 1 });
db.feedback.createIndex({ "created_at": -1 });

print("✓ 'feedback' collection created with indexes");

// ============================================================
// SUMMARY
// ============================================================
print("\n=== Database Setup Complete ===");
print("\nCollections created:");
print("  1. users (with unique email & id)");
print("  2. user_sessions (with TTL expiration)");
print("  3. patients");
print("  4. meetings");
print("  5. meeting_participants");
print("  6. meeting_patients (with approval status)");
print("  7. agenda_items");
print("  8. decision_logs");
print("  9. files");
print("  10. feedback");

print("\nTotal indexes created: " + db.users.getIndexes().length + 
      db.user_sessions.getIndexes().length + 
      db.patients.getIndexes().length + 
      db.meetings.getIndexes().length + 
      db.meeting_participants.getIndexes().length + 
      db.meeting_patients.getIndexes().length + 
      db.agenda_items.getIndexes().length + 
      db.decision_logs.getIndexes().length + 
      db.files.getIndexes().length + 
      db.feedback.getIndexes().length);

print("\n✓ Database 'hospital_meeting_scheduler' is ready!");
print("\nNext steps:");
print("  1. Configure your backend/.env with:");
print("     MONGO_URL=mongodb://localhost:27017");
print("     DB_NAME=hospital_meeting_scheduler");
print("  2. Start your FastAPI backend: cd /app/backend && uvicorn server:app");
print("  3. Your application will connect to this database");
