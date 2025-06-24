
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set.');
  console.error('Please create a .env file in the root directory and add DATABASE_URL="your_postgres_connection_string"');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
});

// Function to execute a query with logging
const executeQuery = async (queryText, params = []) => {
  const client = await pool.connect();
  try {
    const result = await client.query(queryText, params);
    console.log(`SUCCESS: Executed query: ${queryText.substring(0, 100)}...`);
    return result;
  } catch (err) {
    console.error(`ERROR executing query: ${queryText.substring(0, 100)}...`, err);
    throw err; // Re-throw the error to stop the script if something fails
  } finally {
    client.release();
  }
};

// Function to check if a table exists
const tableExists = async (tableName) => {
  const res = await executeQuery(
    "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)",
    [tableName]
  );
  return res.rows[0].exists;
};

// Function to check if a column exists in a table
const columnExists = async (tableName, columnName) => {
  const res = await executeQuery(
    "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = $1 AND column_name = $2)",
    [tableName, columnName]
  );
  return res.rows[0].exists;
};

// Function to add a column to a table if it doesn't exist
const addColumnIfNotExists = async (tableName, columnName, columnType) => {
  if (!(await columnExists(tableName, columnName))) {
    console.log(`Column "${columnName}" not found in table "${tableName}". Adding it...`);
    await executeQuery(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`);
  } else {
    console.log(`Column "${columnName}" already exists in table "${tableName}".`);
  }
};

// Main setup function
const setupDatabase = async () => {
  console.log('Starting database setup...');

  try {
    // --- Create Tables ---
    console.log('--- Creating tables if they do not exist ---');
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS job_requisitions (
          id VARCHAR(255) PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          department VARCHAR(255),
          location VARCHAR(255),
          status VARCHAR(50),
          date_posted TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          description TEXT,
          skills_required TEXT[],
          hiring_manager VARCHAR(255),
          priority VARCHAR(50),
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS candidates (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE,
          avatar_url VARCHAR(255),
          job_title VARCHAR(255),
          stage VARCHAR(50),
          applied_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          last_contacted TIMESTAMPTZ,
          resume_summary TEXT,
          sentiment TEXT,
          skills TEXT[],
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await executeQuery(`
        CREATE TABLE IF NOT EXISTS projects (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            manager VARCHAR(255),
            status VARCHAR(50),
            start_date DATE,
            end_date DATE,
            description TEXT,
            jobs_count INTEGER DEFAULT 0,
            candidates_in_pipeline INTEGER DEFAULT 0,
            interviews_count INTEGER DEFAULT 0,
            progress INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
    `);

    await executeQuery(`
        CREATE TABLE IF NOT EXISTS project_job_links (
            project_id VARCHAR(255) REFERENCES projects(id) ON DELETE CASCADE,
            job_requisition_id VARCHAR(255) REFERENCES job_requisitions(id) ON DELETE CASCADE,
            PRIMARY KEY (project_id, job_requisition_id)
        );
    `);
    
    await executeQuery(`
        CREATE TABLE IF NOT EXISTS ideal_candidate_profiles (
            id VARCHAR(255) PRIMARY KEY,
            profile_name VARCHAR(255) NOT NULL,
            job_title VARCHAR(255),
            key_skills TEXT[],
            experience_level VARCHAR(255),
            education_requirements TEXT,
            location_preferences VARCHAR(255),
            company_background TEXT,
            cultural_fit_notes TEXT,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
    `);
    
     await executeQuery(`
        CREATE TABLE IF NOT EXISTS manager_profiles (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE,
            department VARCHAR(255),
            avatar_url VARCHAR(255),
            active_requisitions INTEGER DEFAULT 0,
            team_size INTEGER DEFAULT 0,
            hiring_since DATE,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
    `);
    
    await executeQuery(`
        CREATE TABLE IF NOT EXISTS scheduled_interviews (
            id VARCHAR(255) PRIMARY KEY,
            candidate_name VARCHAR(255) NOT NULL,
            job_title VARCHAR(255) NOT NULL,
            interviewers TEXT[],
            interview_datetime TIMESTAMPTZ,
            interview_type VARCHAR(100),
            notes TEXT,
            questions JSONB,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
    `);
    
    await executeQuery(`
        CREATE TABLE IF NOT EXISTS re_engagement_candidates (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            previous_role VARCHAR(255),
            last_contacted TIMESTAMPTZ,
            reason_not_hired TEXT,
            potential_fit_for TEXT[],
            contacted_for_new_role BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
    `);
    
     await executeQuery(`
        CREATE TABLE IF NOT EXISTS interview_links (
            id VARCHAR(255) PRIMARY KEY,
            job_title VARCHAR(255) NOT NULL,
            candidate_name VARCHAR(255),
            link_url VARCHAR(255) NOT NULL,
            link_type VARCHAR(100),
            expires_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
    `);

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS clients (
        id VARCHAR(255) PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL UNIQUE,
        contact_person VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        logo_url VARCHAR(255),
        active_requisitions INTEGER DEFAULT 0,
        total_hires INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS departments (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS locations (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS company_hiring_managers (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS project_tasks (
          id VARCHAR(255) PRIMARY KEY,
          project_id VARCHAR(255) REFERENCES projects(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          status VARCHAR(50) NOT NULL,
          assignee_name VARCHAR(255),
          candidate_id VARCHAR(255) REFERENCES candidates(id) ON DELETE SET NULL,
          due_date DATE,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await executeQuery(`
        CREATE TABLE IF NOT EXISTS project_budgets (
            id VARCHAR(255) PRIMARY KEY,
            project_id VARCHAR(255) NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
            total_budget NUMERIC(15, 2) NOT NULL DEFAULT 0,
            spent_budget NUMERIC(15, 2) NOT NULL DEFAULT 0,
            currency VARCHAR(10) NOT NULL,
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
    `);
    
     await executeQuery(`
        CREATE TABLE IF NOT EXISTS project_resources (
            id VARCHAR(255) PRIMARY KEY,
            project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            resource_name VARCHAR(255) NOT NULL,
            role VARCHAR(255) NOT NULL,
            allocated_hours NUMERIC(10, 2) NOT NULL DEFAULT 0,
            cost_per_hour NUMERIC(10, 2) NOT NULL DEFAULT 0,
            total_cost NUMERIC(15, 2) NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
    `);


    // --- Add Columns ---
    console.log('--- Checking for and adding missing columns ---');
    await addColumnIfNotExists('scheduled_interviews', 'cheating_detections', 'JSONB');
    await addColumnIfNotExists('scheduled_interviews', 'video_storage_path', 'TEXT');
    await addColumnIfNotExists('scheduled_interviews', 'analysis', 'JSONB');
    
    
    console.log('Database setup completed successfully.');
  } catch (error) {
    console.error('An error occurred during database setup:', error);
    process.exit(1); // Exit with error code
  } finally {
    await pool.end(); // Close the pool connection
    console.log('Database pool connection closed.');
  }
};

setupDatabase();
