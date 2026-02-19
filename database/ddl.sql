-- Hospital General Meeting Scheduler Database DDL
-- MySQL Server 8.0
-- Database: Hospital_General_Meeting_Scheduler_DB

-- Create Database
CREATE DATABASE IF NOT EXISTS Hospital_General_Meeting_Scheduler_DB
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE Hospital_General_Meeting_Scheduler_DB;

-- Users Table (Doctors/Staff)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    picture VARCHAR(500),
    specialty VARCHAR(100),
    organization VARCHAR(255),
    role ENUM('organizer', 'doctor', 'admin') DEFAULT 'doctor',
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_email (email),
    INDEX idx_users_role (role)
) ENGINE=InnoDB;

-- User Sessions Table
CREATE TABLE IF NOT EXISTS user_sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_sessions_token (session_token),
    INDEX idx_sessions_user (user_id)
) ENGINE=InnoDB;

-- Patients Table
CREATE TABLE IF NOT EXISTS patients (
    id VARCHAR(36) PRIMARY KEY,
    patient_id_number VARCHAR(50) UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    gender ENUM('male', 'female', 'other'),
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    primary_diagnosis TEXT,
    allergies TEXT,
    current_medications TEXT,
    department_name VARCHAR(100),
    department_provider_name VARCHAR(255),
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_patients_name (last_name, first_name),
    INDEX idx_patients_department (department_name)
) ENGINE=InnoDB;

-- Meetings Table
CREATE TABLE IF NOT EXISTS meetings (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    meeting_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INT,
    meeting_type ENUM('in_person', 'video', 'hybrid') DEFAULT 'video',
    location VARCHAR(255),
    video_link VARCHAR(500),
    recurrence_type ENUM('one_time', 'daily', 'weekly', 'monthly') DEFAULT 'one_time',
    recurrence_end_date DATE,
    status ENUM('scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled',
    organizer_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_meetings_date (meeting_date),
    INDEX idx_meetings_organizer (organizer_id),
    INDEX idx_meetings_status (status)
) ENGINE=InnoDB;

-- Meeting Participants Table
CREATE TABLE IF NOT EXISTS meeting_participants (
    id VARCHAR(36) PRIMARY KEY,
    meeting_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    role ENUM('organizer', 'presenter', 'attendee') DEFAULT 'attendee',
    response_status ENUM('pending', 'accepted', 'declined', 'tentative') DEFAULT 'pending',
    response_date TIMESTAMP NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_participant (meeting_id, user_id),
    INDEX idx_participants_meeting (meeting_id),
    INDEX idx_participants_user (user_id)
) ENGINE=InnoDB;

-- Meeting Patients Pivot Table
CREATE TABLE IF NOT EXISTS meeting_patients (
    id VARCHAR(36) PRIMARY KEY,
    meeting_id VARCHAR(36) NOT NULL,
    patient_id VARCHAR(36) NOT NULL,
    clinical_question TEXT,
    reason_for_discussion TEXT,
    status ENUM('new_case', 'follow_up', 'urgent', 'routine') DEFAULT 'new_case',
    added_by VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_meeting_patient (meeting_id, patient_id),
    INDEX idx_meeting_patients_meeting (meeting_id),
    INDEX idx_meeting_patients_patient (patient_id)
) ENGINE=InnoDB;

-- Agenda Items Table
CREATE TABLE IF NOT EXISTS agenda_items (
    id VARCHAR(36) PRIMARY KEY,
    meeting_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INT DEFAULT 0,
    estimated_duration_minutes INT,
    assigned_to VARCHAR(36),
    is_completed BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_agenda_meeting (meeting_id)
) ENGINE=InnoDB;

-- File Attachments Table
CREATE TABLE IF NOT EXISTS file_attachments (
    id VARCHAR(36) PRIMARY KEY,
    meeting_id VARCHAR(36),
    patient_id VARCHAR(36),
    meeting_patient_id VARCHAR(36),
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type ENUM('radiology', 'lab', 'consult_note', 'specialist_note', 'other') DEFAULT 'other',
    mime_type VARCHAR(100),
    file_size INT,
    department_document_type VARCHAR(100),
    uploaded_by VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (meeting_patient_id) REFERENCES meeting_patients(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_files_meeting (meeting_id),
    INDEX idx_files_patient (patient_id),
    INDEX idx_files_type (file_type)
) ENGINE=InnoDB;

-- Decision Logs Table
CREATE TABLE IF NOT EXISTS decision_logs (
    id VARCHAR(36) PRIMARY KEY,
    meeting_id VARCHAR(36) NOT NULL,
    meeting_patient_id VARCHAR(36),
    agenda_item_id VARCHAR(36),
    decision_type ENUM('diagnosis', 'treatment_plan', 'follow_up', 'referral', 'other') DEFAULT 'other',
    title VARCHAR(255) NOT NULL,
    description TEXT,
    final_assessment TEXT,
    action_plan TEXT,
    responsible_doctor_id VARCHAR(36),
    follow_up_date DATE,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    status ENUM('pending', 'in_progress', 'completed') DEFAULT 'pending',
    created_by VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
    FOREIGN KEY (meeting_patient_id) REFERENCES meeting_patients(id) ON DELETE CASCADE,
    FOREIGN KEY (agenda_item_id) REFERENCES agenda_items(id) ON DELETE SET NULL,
    FOREIGN KEY (responsible_doctor_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_decisions_meeting (meeting_id),
    INDEX idx_decisions_patient (meeting_patient_id)
) ENGINE=InnoDB;

-- Meeting Comments/Notes Table
CREATE TABLE IF NOT EXISTS meeting_comments (
    id VARCHAR(36) PRIMARY KEY,
    meeting_id VARCHAR(36) NOT NULL,
    meeting_patient_id VARCHAR(36),
    agenda_item_id VARCHAR(36),
    user_id VARCHAR(36) NOT NULL,
    content TEXT NOT NULL,
    parent_comment_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
    FOREIGN KEY (meeting_patient_id) REFERENCES meeting_patients(id) ON DELETE CASCADE,
    FOREIGN KEY (agenda_item_id) REFERENCES agenda_items(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_comment_id) REFERENCES meeting_comments(id) ON DELETE CASCADE,
    INDEX idx_comments_meeting (meeting_id)
) ENGINE=InnoDB;

-- Meeting Summary Table (Auto-generated post-meeting)
CREATE TABLE IF NOT EXISTS meeting_summaries (
    id VARCHAR(36) PRIMARY KEY,
    meeting_id VARCHAR(36) NOT NULL UNIQUE,
    summary_text TEXT,
    key_decisions TEXT,
    action_items TEXT,
    follow_ups TEXT,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
) ENGINE=InnoDB;
