-- ============================================================================
-- Hospital Meeting Scheduler - MySQL Database Schema
-- ============================================================================
-- Database: hospital_meeting_scheduler
-- MySQL Version: 8.0+
-- Character Set: utf8mb4
-- Collation: utf8mb4_unicode_ci
-- Created: April 2026
-- ============================================================================

-- Create Database
CREATE DATABASE IF NOT EXISTS hospital_meeting_scheduler
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE hospital_meeting_scheduler;

-- ============================================================================
-- Table: users
-- Description: Stores all user accounts (doctors, organizers, nurses, admins)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY COMMENT 'UUID - Unique user identifier',
    email VARCHAR(255) NOT NULL UNIQUE COMMENT 'User email address',
    name VARCHAR(255) NOT NULL COMMENT 'Full name',
    password_hash VARCHAR(255) NULL COMMENT 'Bcrypt hashed password (NULL for OAuth users)',
    specialty VARCHAR(100) NULL COMMENT 'Medical specialty (e.g., Cardiology, Oncology)',
    organization VARCHAR(255) NULL COMMENT 'Hospital or organization name',
    phone VARCHAR(20) NULL COMMENT 'Contact phone number',
    role ENUM('doctor', 'nurse', 'admin', 'organizer') NOT NULL DEFAULT 'doctor' COMMENT 'User role',
    picture VARCHAR(500) NULL COMMENT 'Profile picture URL (usually from OAuth)',
    is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Account status',
    requires_password_change BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Force password change on next login',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Account creation timestamp',
    updated_at TIMESTAMP NULL COMMENT 'Last update timestamp',
    
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_specialty (specialty),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='User accounts for doctors, nurses, organizers, and admins';

-- ============================================================================
-- Table: patients
-- Description: Patient records and medical information
-- ============================================================================
CREATE TABLE IF NOT EXISTS patients (
    id VARCHAR(36) PRIMARY KEY COMMENT 'UUID - Unique patient identifier',
    patient_id_number VARCHAR(50) NULL UNIQUE COMMENT 'Hospital MRN (Medical Record Number)',
    first_name VARCHAR(100) NOT NULL COMMENT 'Patient first name',
    last_name VARCHAR(100) NOT NULL COMMENT 'Patient last name',
    date_of_birth DATE NOT NULL COMMENT 'Patient date of birth',
    gender ENUM('male', 'female', 'other') NOT NULL COMMENT 'Patient gender',
    email VARCHAR(255) NULL COMMENT 'Patient email address',
    phone VARCHAR(20) NULL COMMENT 'Patient phone number',
    address TEXT NULL COMMENT 'Patient full address',
    primary_diagnosis VARCHAR(500) NOT NULL COMMENT 'Primary medical diagnosis',
    allergies TEXT NULL COMMENT 'Known allergies',
    current_medications TEXT NULL COMMENT 'Current medications and dosages',
    department_name VARCHAR(100) NOT NULL COMMENT 'Department (e.g., Cardiology, Oncology)',
    department_provider_name VARCHAR(255) NULL COMMENT 'Attending physician name',
    notes TEXT NULL COMMENT 'Additional clinical notes',
    is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Record status',
    created_by VARCHAR(36) NOT NULL COMMENT 'User ID who created this patient record',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
    updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
    
    INDEX idx_patient_id_number (patient_id_number),
    INDEX idx_last_name (last_name),
    INDEX idx_department (department_name),
    INDEX idx_is_active (is_active),
    INDEX idx_created_by (created_by),
    FULLTEXT idx_fulltext_search (first_name, last_name, primary_diagnosis),
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Patient medical records and demographics';

-- ============================================================================
-- Table: meetings
-- Description: Hospital case meetings and conferences
-- ============================================================================
CREATE TABLE IF NOT EXISTS meetings (
    id VARCHAR(36) PRIMARY KEY COMMENT 'UUID - Unique meeting identifier',
    title VARCHAR(255) NOT NULL COMMENT 'Meeting title',
    description TEXT NULL COMMENT 'Meeting description and purpose',
    meeting_date DATE NOT NULL COMMENT 'Meeting date',
    start_time TIME NOT NULL COMMENT 'Meeting start time',
    end_time TIME NOT NULL COMMENT 'Meeting end time',
    duration_minutes INT NOT NULL COMMENT 'Meeting duration in minutes',
    meeting_type ENUM('video', 'in-person', 'hybrid') NOT NULL DEFAULT 'video' COMMENT 'Meeting format',
    location VARCHAR(255) NULL COMMENT 'Physical location (for in-person/hybrid)',
    video_link VARCHAR(500) NULL COMMENT 'Video conference URL (Teams, Zoom, etc.)',
    recurrence_type ENUM('one_time', 'daily', 'weekly', 'monthly') NOT NULL DEFAULT 'one_time' COMMENT 'Recurrence pattern',
    recurrence_end_date DATE NULL COMMENT 'End date for recurring meetings',
    status ENUM('scheduled', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled' COMMENT 'Meeting status',
    completed_at TIMESTAMP NULL COMMENT 'When meeting was marked as completed',
    organizer_id VARCHAR(36) NOT NULL COMMENT 'User ID of meeting organizer',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Meeting creation timestamp',
    updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
    
    INDEX idx_meeting_date (meeting_date),
    INDEX idx_status (status),
    INDEX idx_organizer_id (organizer_id),
    INDEX idx_meeting_type (meeting_type),
    INDEX idx_date_status (meeting_date, status),
    
    FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Hospital case meetings and conferences';

-- ============================================================================
-- Table: meeting_participants
-- Description: Junction table linking users to meetings (Many-to-Many)
-- ============================================================================
CREATE TABLE IF NOT EXISTS meeting_participants (
    id VARCHAR(36) PRIMARY KEY COMMENT 'UUID - Unique participant record ID',
    meeting_id VARCHAR(36) NOT NULL COMMENT 'Meeting reference',
    user_id VARCHAR(36) NOT NULL COMMENT 'User reference',
    role ENUM('organizer', 'attendee', 'presenter') NOT NULL DEFAULT 'attendee' COMMENT 'Participant role in meeting',
    response_status ENUM('pending', 'accepted', 'maybe', 'declined') NOT NULL DEFAULT 'pending' COMMENT 'Attendance response',
    added_by VARCHAR(36) NULL COMMENT 'User ID who added this participant',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When participant was added',
    
    INDEX idx_meeting_id (meeting_id),
    INDEX idx_user_id (user_id),
    INDEX idx_response_status (response_status),
    UNIQUE INDEX idx_meeting_user (meeting_id, user_id),
    
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Meeting participants (users attending meetings)';

-- ============================================================================
-- Table: meeting_patients
-- Description: Junction table linking patients to meetings (Many-to-Many)
-- ============================================================================
CREATE TABLE IF NOT EXISTS meeting_patients (
    id VARCHAR(36) PRIMARY KEY COMMENT 'UUID - Unique record ID',
    meeting_id VARCHAR(36) NOT NULL COMMENT 'Meeting reference',
    patient_id VARCHAR(36) NOT NULL COMMENT 'Patient reference',
    clinical_question TEXT NULL COMMENT 'Clinical question or reason for discussion',
    status ENUM('new_case', 'follow_up', 'urgent', 'routine') NOT NULL DEFAULT 'routine' COMMENT 'Case priority/type',
    added_by VARCHAR(36) NOT NULL COMMENT 'User ID who added this patient to meeting',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When patient was added',
    
    INDEX idx_meeting_id (meeting_id),
    INDEX idx_patient_id (patient_id),
    INDEX idx_status (status),
    UNIQUE INDEX idx_meeting_patient (meeting_id, patient_id),
    
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Patients associated with meetings';

-- ============================================================================
-- Table: agenda_items
-- Description: Meeting agenda items
-- ============================================================================
CREATE TABLE IF NOT EXISTS agenda_items (
    id VARCHAR(36) PRIMARY KEY COMMENT 'UUID - Unique agenda item ID',
    meeting_id VARCHAR(36) NOT NULL COMMENT 'Meeting reference',
    title VARCHAR(255) NOT NULL COMMENT 'Agenda item title',
    description TEXT NULL COMMENT 'Detailed description',
    order_index INT NOT NULL DEFAULT 0 COMMENT 'Display order (0, 1, 2...)',
    estimated_duration_minutes INT NULL COMMENT 'Expected duration in minutes',
    treatment_plan TEXT NULL COMMENT 'Treatment plan details (if applicable)',
    assigned_to VARCHAR(36) NULL COMMENT 'User ID if assigned to specific doctor',
    is_completed BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Completion status',
    added_by VARCHAR(36) NULL COMMENT 'User ID who created this item',
    last_updated_by VARCHAR(36) NULL COMMENT 'User ID who last updated treatment plan',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation timestamp',
    updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
    
    INDEX idx_meeting_id (meeting_id),
    INDEX idx_order_index (order_index),
    INDEX idx_assigned_to (assigned_to),
    INDEX idx_is_completed (is_completed),
    
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (last_updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Meeting agenda items and treatment plans';

-- ============================================================================
-- Table: decision_logs
-- Description: Clinical decisions made during meetings
-- ============================================================================
CREATE TABLE IF NOT EXISTS decision_logs (
    id VARCHAR(36) PRIMARY KEY COMMENT 'UUID - Unique decision ID',
    meeting_id VARCHAR(36) NOT NULL COMMENT 'Meeting reference',
    decision_type ENUM('treatment', 'diagnostic', 'referral', 'follow_up') NOT NULL COMMENT 'Type of decision',
    title VARCHAR(255) NOT NULL COMMENT 'Decision title',
    description TEXT NULL COMMENT 'Decision description',
    final_assessment TEXT NULL COMMENT 'Final clinical assessment',
    action_plan TEXT NULL COMMENT 'Action plan and next steps',
    responsible_doctor_id VARCHAR(36) NULL COMMENT 'Doctor responsible for follow-up',
    follow_up_date DATE NULL COMMENT 'Follow-up appointment date',
    priority ENUM('high', 'medium', 'low') NOT NULL DEFAULT 'medium' COMMENT 'Decision priority',
    status ENUM('pending', 'implemented', 'completed', 'cancelled') NOT NULL DEFAULT 'pending' COMMENT 'Implementation status',
    created_by VARCHAR(36) NOT NULL COMMENT 'User ID who logged this decision',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation timestamp',
    updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
    
    INDEX idx_meeting_id (meeting_id),
    INDEX idx_decision_type (decision_type),
    INDEX idx_responsible_doctor_id (responsible_doctor_id),
    INDEX idx_priority (priority),
    INDEX idx_status (status),
    INDEX idx_follow_up_date (follow_up_date),
    
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
    FOREIGN KEY (responsible_doctor_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Clinical decisions and action items from meetings';

-- ============================================================================
-- Table: file_attachments
-- Description: Files uploaded to meetings (documents, images, reports)
-- ============================================================================
CREATE TABLE IF NOT EXISTS file_attachments (
    id VARCHAR(36) PRIMARY KEY COMMENT 'UUID - Unique file ID',
    meeting_id VARCHAR(36) NOT NULL COMMENT 'Meeting reference',
    patient_id VARCHAR(36) NULL COMMENT 'Patient reference (if file is patient-specific)',
    file_name VARCHAR(255) NOT NULL COMMENT 'Original filename',
    file_path VARCHAR(500) NOT NULL COMMENT 'Server file path',
    file_size INT NOT NULL COMMENT 'File size in bytes',
    file_type VARCHAR(100) NOT NULL COMMENT 'MIME type (e.g., application/pdf)',
    description TEXT NULL COMMENT 'File description',
    uploaded_by VARCHAR(36) NOT NULL COMMENT 'User ID who uploaded the file',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Upload timestamp',
    
    INDEX idx_meeting_id (meeting_id),
    INDEX idx_patient_id (patient_id),
    INDEX idx_uploaded_by (uploaded_by),
    INDEX idx_file_type (file_type),
    
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='File attachments for meetings and patients';

-- ============================================================================
-- Table: feedback
-- Description: User feedback submissions
-- ============================================================================
CREATE TABLE IF NOT EXISTS feedback (
    id VARCHAR(36) PRIMARY KEY COMMENT 'UUID - Unique feedback ID',
    user_id VARCHAR(36) NOT NULL COMMENT 'User who submitted feedback',
    user_name VARCHAR(255) NOT NULL COMMENT 'User name (denormalized)',
    user_email VARCHAR(255) NOT NULL COMMENT 'User email (denormalized)',
    user_role VARCHAR(50) NOT NULL COMMENT 'User role at time of submission',
    feedback_type ENUM('feature_request', 'bug_report', 'enhancement') NOT NULL COMMENT 'Type of feedback',
    subject VARCHAR(255) NOT NULL COMMENT 'Feedback subject',
    message TEXT NOT NULL COMMENT 'Detailed feedback message',
    status ENUM('pending', 'reviewed', 'implemented', 'rejected') NOT NULL DEFAULT 'pending' COMMENT 'Review status',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Submission timestamp',
    
    INDEX idx_user_id (user_id),
    INDEX idx_feedback_type (feedback_type),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='User feedback and feature requests';

-- ============================================================================
-- Insert Default Test Data
-- ============================================================================

-- Insert default organizer user
INSERT INTO users (id, email, name, password_hash, specialty, role, is_active, created_at) VALUES
('b885e166-4714-47e2-9e03-7ca58262ea66', 
 'organizer@hospital.com', 
 'Dr. Sarah Organizer', 
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMESn4yYKGqhuT6cOa1.qYk2gO', -- password123
 'Cardiology', 
 'organizer', 
 TRUE, 
 CURRENT_TIMESTAMP);

-- Insert test doctor
INSERT INTO users (id, email, name, password_hash, specialty, role, is_active, created_at) VALUES
('c995f177-5825-58f3-a0b4-8db69373fb77',
 'doctor@hospital.com',
 'Dr. John Doctor',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMESn4yYKGqhuT6cOa1.qYk2gO', -- password123
 'General Medicine',
 'doctor',
 TRUE,
 CURRENT_TIMESTAMP);

-- ============================================================================
-- Utility Views (Optional - for easier queries)
-- ============================================================================

-- View: Active upcoming meetings with organizer names
CREATE OR REPLACE VIEW v_upcoming_meetings AS
SELECT 
    m.id,
    m.title,
    m.meeting_date,
    m.start_time,
    m.end_time,
    m.meeting_type,
    m.status,
    u.name AS organizer_name,
    u.email AS organizer_email,
    (SELECT COUNT(*) FROM meeting_participants WHERE meeting_id = m.id) AS participant_count,
    (SELECT COUNT(*) FROM meeting_patients WHERE meeting_id = m.id) AS patient_count
FROM meetings m
INNER JOIN users u ON m.organizer_id = u.id
WHERE m.meeting_date >= CURDATE()
  AND m.status IN ('scheduled', 'in_progress')
ORDER BY m.meeting_date, m.start_time;

-- View: Patient summary with meeting count
CREATE OR REPLACE VIEW v_patient_summary AS
SELECT 
    p.id,
    p.patient_id_number,
    CONCAT(p.first_name, ' ', p.last_name) AS full_name,
    p.date_of_birth,
    p.gender,
    p.primary_diagnosis,
    p.department_name,
    p.is_active,
    (SELECT COUNT(*) FROM meeting_patients WHERE patient_id = p.id) AS meeting_count,
    p.created_at
FROM patients p
WHERE p.is_active = TRUE
ORDER BY p.last_name, p.first_name;

-- ============================================================================
-- Database Information Query
-- ============================================================================

-- To get table sizes and row counts, run:
-- SELECT 
--     TABLE_NAME,
--     TABLE_ROWS,
--     ROUND(((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024), 2) AS `Size (MB)`
-- FROM information_schema.TABLES
-- WHERE TABLE_SCHEMA = 'hospital_meeting_scheduler'
-- ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC;

-- ============================================================================
-- End of Schema
-- ============================================================================
-- 
-- NOTES:
-- 1. All IDs are VARCHAR(36) to store UUIDs
-- 2. Foreign key constraints enforce referential integrity
-- 3. ON DELETE CASCADE for junction tables (meeting_participants, meeting_patients)
-- 4. ON DELETE RESTRICT for main entity references (prevents orphaned records)
-- 5. Indexes created for common query patterns
-- 6. Full-text search enabled on patient names and diagnosis
-- 7. Default test users created with password: password123
-- 8. All timestamps in UTC (configure MySQL timezone)
-- 
-- ============================================================================
