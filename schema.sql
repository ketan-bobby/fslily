
-- Function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Job Requisitions Table
CREATE TABLE IF NOT EXISTS job_requisitions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    department TEXT,
    location TEXT,
    status TEXT,
    date_posted TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    skills_required TEXT[],
    hiring_manager TEXT,
    priority TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_job_requisitions_status ON job_requisitions(status);
CREATE INDEX IF NOT EXISTS idx_job_requisitions_date_posted ON job_requisitions(date_posted);

CREATE OR REPLACE TRIGGER update_job_requisitions_updated_at
BEFORE UPDATE ON job_requisitions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Candidates Table
CREATE TABLE IF NOT EXISTS candidates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    avatar_url TEXT,
    job_title TEXT,
    stage TEXT,
    applied_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_contacted TIMESTAMPTZ,
    resume_summary TEXT,
    sentiment TEXT,
    skills TEXT[],
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_candidates_stage ON candidates(stage);
CREATE INDEX IF NOT EXISTS idx_candidates_job_title ON candidates(job_title);

CREATE OR REPLACE TRIGGER update_candidates_updated_at
BEFORE UPDATE ON candidates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    manager TEXT,
    status TEXT,
    open_requisitions INTEGER DEFAULT 0,
    candidates_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE TRIGGER update_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Ideal Candidate Profiles Table
CREATE TABLE IF NOT EXISTS ideal_candidate_profiles (
    id TEXT PRIMARY KEY,
    profile_name TEXT NOT NULL,
    job_title TEXT,
    key_skills TEXT[],
    experience_level TEXT,
    education_requirements TEXT,
    location_preferences TEXT,
    company_background TEXT,
    cultural_fit_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE TRIGGER update_ideal_candidate_profiles_updated_at
BEFORE UPDATE ON ideal_candidate_profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Manager Profiles Table
CREATE TABLE IF NOT EXISTS manager_profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    department TEXT,
    avatar_url TEXT,
    active_requisitions INTEGER DEFAULT 0,
    team_size INTEGER DEFAULT 0,
    hiring_since DATE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE TRIGGER update_manager_profiles_updated_at
BEFORE UPDATE ON manager_profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Scheduled Interviews Table
CREATE TABLE IF NOT EXISTS scheduled_interviews (
    id TEXT PRIMARY KEY,
    candidate_name TEXT,
    job_title TEXT,
    interviewers TEXT[],
    interview_date DATE,
    interview_time TIME,
    interview_type TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_scheduled_interviews_date_time ON scheduled_interviews(interview_date, interview_time);

CREATE OR REPLACE TRIGGER update_scheduled_interviews_updated_at
BEFORE UPDATE ON scheduled_interviews
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Re-Engagement Candidates Table
CREATE TABLE IF NOT EXISTS re_engagement_candidates (
    id TEXT PRIMARY KEY,
    name TEXT,
    previous_role TEXT,
    last_contacted DATE,
    reason_not_hired TEXT,
    potential_fit_for TEXT[],
    contacted_for_new_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE TRIGGER update_re_engagement_candidates_updated_at
BEFORE UPDATE ON re_engagement_candidates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Interview Links Table
CREATE TABLE IF NOT EXISTS interview_links (
    id TEXT PRIMARY KEY,
    job_title TEXT,
    candidate_name TEXT,
    link_url TEXT NOT NULL,
    link_type TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE TRIGGER update_interview_links_updated_at
BEFORE UPDATE ON interview_links
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Clients Table
CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    company_name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    logo_url TEXT,
    active_requisitions INTEGER DEFAULT 0,
    total_hires INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE TRIGGER update_clients_updated_at
BEFORE UPDATE ON clients
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT,
    last_login TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- New tables for managed lists
CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE OR REPLACE TRIGGER update_departments_updated_at
BEFORE UPDATE ON departments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS locations (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE OR REPLACE TRIGGER update_locations_updated_at
BEFORE UPDATE ON locations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS company_hiring_managers (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE OR REPLACE TRIGGER update_company_hiring_managers_updated_at
BEFORE UPDATE ON company_hiring_managers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
