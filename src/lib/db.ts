

'use server';

import { Pool } from 'pg';
import { firestoreAdmin as firestore, FieldValue, Timestamp } from '@/lib/firebase-admin'; // Use Admin SDK and get types from it
import type {
  Candidate, JobRequisition, Project, IdealCandidateProfile, ManagerProfile,
  ScheduledInterview, ReEngagementCandidate, InterviewLink, Client, ManagedListItem,
  GeneralSystemSettings, NotificationSettings, AppearanceSettings, SecuritySettings,
  ActivityLog, SupportTicketData, ProjectTask, ProjectTaskStatus, ProjectBudget, InterviewAnalysis
} from './types';
import type { JobRequisitionInput } from '@/ai/flows/match-resume-to-jobs';
import type { AdvancedMatchingInput } from '@/ai/flows/advanced-candidate-matching-flow';


type TimeFrameKey = 'daily' | 'weekly' | 'monthly' | 'all';

const DATABASE_URL = process.env.DATABASE_URL;

console.log('[DB_MODULE_INIT] src/lib/db.ts module is evaluating...');

// Caching the pool in a global variable for development to prevent connection exhaustion during hot-reloads.
// This is a standard pattern for Next.js with database connections.
// See: https://github.com/vercel/next.js/discussions/12229#discussioncomment-861869
declare global {
  var _pgPool: Pool | undefined;
}

const initializePool = () => {
  const createMockPool = () => {
    console.warn(
      '[DB_MODULE_INIT] Using a simplified, safe mock pool. App will be functional but will show no PostgreSQL data.'
    );
    return {
      query: async (text: string, params?: any[]) => {
        console.warn(`[DB_SAFE_MOCK] Query: ${text.substring(0, 100)}...`, params);
        const upperText = text.trim().toUpperCase();

        if (upperText.startsWith('SELECT COUNT(*)')) {
          return { rows: [{ count: '0' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] };
        }

        // Mock response for INSERTING a new interview
        if (upperText.startsWith('INSERT INTO SCHEDULED_INTERVIEWS')) {
            if (!params) return { rows: [], rowCount: 0, command: 'INSERT', oid: 0, fields: [] };
            
            const columns = text.match(/\(([^)]+)\)/)[1].split(',').map(s => s.trim());
            const rowData: { [key: string]: any } = {
                id: params[columns.indexOf('id')],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            columns.forEach((col, index) => {
                rowData[col] = params[index];
            });

            const mockSavedInterview = {
                id: rowData.id,
                candidate_name: rowData.candidate_name,
                job_title: rowData.job_title,
                interviewers: rowData.interviewers ? JSON.parse(rowData.interviewers) : [],
                interview_datetime: rowData.interview_datetime,
                interview_type: rowData.interview_type,
                notes: rowData.notes,
                questions: rowData.questions ? JSON.parse(rowData.questions) : [],
                video_storage_path: null,
                cheating_detections: '[]',
                analysis: null,
                created_at: rowData.created_at,
                updated_at: rowData.updated_at
            };
            return { rows: [mockSavedInterview], rowCount: 1, command: 'INSERT', oid: 0, fields: [] };
        }
        
        // Default empty response for other queries
        return { rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] };
      },
    } as any as Pool;
  };

  if (!DATABASE_URL) {
    console.log('[DB_MODULE_INIT] DATABASE_URL environment variable is not set.');
    return createMockPool();
  }

  try {
    console.log(`[DB_MODULE_INIT] DATABASE_URL is set. Attempting to create new PostgreSQL Pool.`);
    const realPool = new Pool({
      connectionString: DATABASE_URL,
    });
    realPool.on('connect', () => {
      console.log('[DB_MODULE_INIT] Successfully connected to PostgreSQL database via db.ts pool.');
    });
    realPool.on('error', (err) => {
      console.error('[DB_MODULE_INIT] Unexpected error on idle PostgreSQL client in db.ts pool:', err);
    });
    console.log('[DB_MODULE_INIT] PostgreSQL Pool created and event listeners attached.');
    return realPool;
  } catch (initError) {
    console.error('[DB_MODULE_INIT] CRITICAL ERROR initializing real PostgreSQL Pool. Falling back to mock.', initError);
    return createMockPool();
  }
};

let pool: Pool;

if (process.env.NODE_ENV === 'production') {
  // In production, create a new pool
  pool = initializePool();
} else {
  // In development, use the cached pool or create one if it doesn't exist
  if (!global._pgPool) {
    global._pgPool = initializePool();
  }
  pool = global._pgPool;
}


async function query(text: string, params?: any[]) {
  try {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('[DB Query]', { text: text.substring(0, 200) + (text.length > 200 ? '...' : ''), params: params || "[]", duration, rowCount: res.rowCount });
    return res;
  } catch (error) {
    console.error('[DB Query Error]', { text: text.substring(0, 200) + (text.length > 200 ? '...' : ''), error });
    // Instead of throwing, return an empty result to prevent server crash
    console.warn('[DB Query Fallback] An error occurred. Returning empty result set to avoid crashing the server.');
    return { rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] as any[] };
  }
}

// --- General System Settings Functions (Firestore) ---
const SYSTEM_CONFIG_COLLECTION = 'systemConfiguration';
const MAIN_SETTINGS_DOC_ID = 'mainSettings';
const NOTIFICATION_SETTINGS_DOC_ID = 'notificationSettings';
const APPEARANCE_SETTINGS_DOC_ID = 'appearanceSettings';
const SECURITY_SETTINGS_DOC_ID = 'securitySettings';

const defaultGeneralSettings: GeneralSystemSettings = { id: MAIN_SETTINGS_DOC_ID, defaultTimezone: "America/New_York", autoSaveDrafts: true, availableCountries: ['US', 'GB', 'EU'], updatedAt: new Date().toISOString() };
const defaultNotificationSettings: NotificationSettings = { id: NOTIFICATION_SETTINGS_DOC_ID, newCandidateEmail: true, interviewReminderApp: true, dailySummaryEmail: false, updatedAt: new Date().toISOString() };
const defaultAppearanceSettings: AppearanceSettings = { id: APPEARANCE_SETTINGS_DOC_ID, organizationName: "IntelliAssistant", primaryColor: '#16A34A', logoUrl: undefined, updatedAt: new Date().toISOString() };
const defaultSecuritySettings: SecuritySettings = { id: SECURITY_SETTINGS_DOC_ID, sessionTimeoutMinutes: 30, updatedAt: new Date().toISOString() };

export async function getGeneralSystemSettings(): Promise<GeneralSystemSettings> {
  if (!firestore || !Timestamp) {
      console.warn("[DB] Firestore Admin SDK not initialized. Cannot fetch general settings. Returning defaults.");
      return defaultGeneralSettings;
  }
  console.log("[DB] getGeneralSystemSettings: Fetching general system settings from Firestore...");
  try {
    const docRef = firestore.collection(SYSTEM_CONFIG_COLLECTION).doc(MAIN_SETTINGS_DOC_ID);
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      const data = docSnap.data();
      console.log("[DB] getGeneralSystemSettings: General settings found:", data);
      return {
        id: docSnap.id,
        defaultTimezone: data.defaultTimezone || "America/New_York",
        autoSaveDrafts: data.autoSaveDrafts === undefined ? true : data.autoSaveDrafts,
        availableCountries: data.availableCountries || ['US', 'GB', 'EU'],
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : (data.updatedAt || new Date().toISOString()),
      };
    } else {
      console.log("[DB] getGeneralSystemSettings: No general system settings document found, returning defaults.");
      return defaultGeneralSettings;
    }
  } catch (error) {
    console.error("[DB] getGeneralSystemSettings: Error fetching general system settings:", error);
    throw error;
  }
}

export async function saveGeneralSystemSettings(settings: Omit<GeneralSystemSettings, 'id' | 'updatedAt'>): Promise<GeneralSystemSettings> {
  if (!firestore || !FieldValue) {
      throw new Error("Firestore Admin SDK not initialized. Cannot save general settings. Please check your serviceAccountKey.json.");
  }
  const docRef = firestore.collection(SYSTEM_CONFIG_COLLECTION).doc(MAIN_SETTINGS_DOC_ID);
  const settingsToSave = { ...settings, updatedAt: FieldValue.serverTimestamp() };
  try {
    await docRef.set(settingsToSave, { merge: true });
    addActivityLog({
        description: `General system settings updated.`,
        relatedDocId: MAIN_SETTINGS_DOC_ID,
        relatedDocPath: `${SYSTEM_CONFIG_COLLECTION}/${MAIN_SETTINGS_DOC_ID}`
    }).catch(logError => console.error("[DB] saveGeneralSystemSettings: Non-critical: Failed to add activity log:", logError));
    return {
      id: MAIN_SETTINGS_DOC_ID,
      ...settings,
      updatedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error("[DB] saveGeneralSystemSettings: ERROR during setDoc for general system settings:", error);
    throw new Error(`Failed to save general settings in database: ${error.message}`);
  }
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
    if (!firestore || !Timestamp) {
      console.warn("[DB] Firestore Admin SDK not initialized. Cannot fetch notification settings. Returning defaults.");
      return defaultNotificationSettings;
    }
    console.log("[DB] getNotificationSettings: Fetching notification settings from Firestore...");
    try {
        const docRef = firestore.collection(SYSTEM_CONFIG_COLLECTION).doc(NOTIFICATION_SETTINGS_DOC_ID);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            const data = docSnap.data();
            console.log("[DB] getNotificationSettings: Notification settings found:", data);
            return {
                id: docSnap.id,
                newCandidateEmail: data.newCandidateEmail === undefined ? true : data.newCandidateEmail,
                interviewReminderApp: data.interviewReminderApp === undefined ? true : data.interviewReminderApp,
                dailySummaryEmail: data.dailySummaryEmail === undefined ? false : data.dailySummaryEmail,
                updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : (data.updatedAt || new Date().toISOString()),
            };
        } else {
            console.log("[DB] getNotificationSettings: No notification settings document found, returning defaults.");
            return defaultNotificationSettings;
        }
    } catch (error) {
        console.error("[DB] getNotificationSettings: Error fetching notification settings:", error);
        throw error;
    }
}

export async function saveNotificationSettings(settings: Omit<NotificationSettings, 'id' | 'updatedAt'>): Promise<NotificationSettings> {
    if (!firestore || !FieldValue) {
        throw new Error("Firestore Admin SDK not initialized. Cannot save notification settings. Please check your serviceAccountKey.json.");
    }
    const docRef = firestore.collection(SYSTEM_CONFIG_COLLECTION).doc(NOTIFICATION_SETTINGS_DOC_ID);
    const settingsToSave = { ...settings, updatedAt: FieldValue.serverTimestamp() };
    try {
        await docRef.set(settingsToSave, { merge: true });
        addActivityLog({ description: `Notification settings updated.` })
            .catch(logError => console.error("[DB] saveNotificationSettings: Non-critical: Failed to add activity log:", logError));
        return { id: NOTIFICATION_SETTINGS_DOC_ID, ...settings, updatedAt: new Date().toISOString() };
    } catch (error: any) {
        console.error("[DB] saveNotificationSettings: ERROR during setDoc for notification settings:", error);
        throw new Error(`Failed to save notification settings: ${error.message}`);
    }
}

export async function getAppearanceSettings(): Promise<AppearanceSettings> {
    if (!firestore || !Timestamp) {
        console.warn("[DB] Firestore Admin SDK not initialized. Cannot fetch appearance settings. Returning defaults.");
        return defaultAppearanceSettings;
    }
    console.log("[DB] getAppearanceSettings: Fetching appearance settings from Firestore...");
    try {
        const docRef = firestore.collection(SYSTEM_CONFIG_COLLECTION).doc(APPEARANCE_SETTINGS_DOC_ID);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            const data = docSnap.data();
            console.log("[DB] getAppearanceSettings: Appearance settings found:", data);
            return {
                id: docSnap.id,
                organizationName: data.organizationName || "IntelliAssistant",
                logoUrl: data.logoUrl || undefined,
                primaryColor: data.primaryColor || "#16A34A",
                updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : (data.updatedAt || new Date().toISOString()),
            };
        } else {
            console.log("[DB] getAppearanceSettings: No appearance settings document found, returning defaults.");
            return defaultAppearanceSettings;
        }
    } catch (error) {
        console.error("[DB] getAppearanceSettings: Error fetching appearance settings:", error);
        throw error;
    }
}

export async function saveAppearanceSettings(settings: Omit<AppearanceSettings, 'id' | 'updatedAt'>): Promise<AppearanceSettings> {
    if (!firestore || !FieldValue) {
        throw new Error("Firestore Admin SDK not initialized. Cannot save appearance settings. Please check your serviceAccountKey.json.");
    }
    const docRef = firestore.collection(SYSTEM_CONFIG_COLLECTION).doc(APPEARANCE_SETTINGS_DOC_ID);
    const settingsToSave = { ...settings, updatedAt: FieldValue.serverTimestamp() };
    try {
        await docRef.set(settingsToSave, { merge: true });
        addActivityLog({ description: `Appearance settings updated. Org Name: ${settings.organizationName}` })
            .catch(logError => console.error("[DB] saveAppearanceSettings: Non-critical: Failed to add activity log:", logError));
        return { id: APPEARANCE_SETTINGS_DOC_ID, ...settings, updatedAt: new Date().toISOString() };
    } catch (error: any) {
        console.error("[DB] saveAppearanceSettings: ERROR during setDoc for appearance settings:", error);
        throw new Error(`Failed to save appearance settings: ${error.message}`);
    }
}

export async function getSecuritySettings(): Promise<SecuritySettings> {
    if (!firestore || !Timestamp) {
        console.warn("[DB] Firestore Admin SDK not initialized. Cannot fetch security settings. Returning defaults.");
        return defaultSecuritySettings;
    }
    console.log("[DB] getSecuritySettings: Fetching security settings from Firestore...");
    try {
        const docRef = firestore.collection(SYSTEM_CONFIG_COLLECTION).doc(SECURITY_SETTINGS_DOC_ID);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            const data = docSnap.data();
            console.log("[DB] getSecuritySettings: Security settings found:", data);
            return {
                id: docSnap.id,
                sessionTimeoutMinutes: data.sessionTimeoutMinutes === undefined ? 30 : data.sessionTimeoutMinutes,
                updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : (data.updatedAt || new Date().toISOString()),
            };
        } else {
            console.log("[DB] getSecuritySettings: No security settings document found, returning defaults.");
            return defaultSecuritySettings;
        }
    } catch (error) {
        console.error("[DB] getSecuritySettings: Error fetching security settings:", error);
        throw error;
    }
}

export async function saveSecuritySettings(settings: Omit<SecuritySettings, 'id' | 'updatedAt'>): Promise<SecuritySettings> {
  if (!firestore || !FieldValue) {
      throw new Error("Firestore Admin SDK not initialized. Cannot save security settings. Please check your serviceAccountKey.json.");
  }
  const docRef = firestore.collection(SYSTEM_CONFIG_COLLECTION).doc(SECURITY_SETTINGS_DOC_ID);
  const settingsToSave = { ...settings, updatedAt: FieldValue.serverTimestamp() };
  try {
    await docRef.set(settingsToSave, { merge: true });
    addActivityLog({ description: `Security settings updated. Session timeout: ${settings.sessionTimeoutMinutes} mins.` })
        .catch(logError => console.error("[DB] saveSecuritySettings: Non-critical: Failed to add activity log for security settings save (non-critical):", logError));
    return { id: SECURITY_SETTINGS_DOC_ID, ...settings, updatedAt: new Date().toISOString() };
  } catch (error: any) {
    console.error("[DB] saveSecuritySettings: ERROR during setDoc for security settings:", error);
    throw new Error(`Failed to save security settings: ${error.message}`);
  }
}


// --- Dashboard Metric Functions ---
export async function countOpenJobRequisitions(timeframe: TimeFrameKey = 'all'): Promise<number> {
  let queryString = "SELECT COUNT(*) FROM job_requisitions WHERE status = 'Open'";
  const queryParams = [];

  if (timeframe === 'daily') {
    queryString += " AND date_posted >= CURRENT_DATE";
  } else if (timeframe === 'weekly') {
    queryString += " AND date_posted >= date_trunc('week', CURRENT_DATE)";
  } else if (timeframe === 'monthly') {
    queryString += " AND date_posted >= date_trunc('month', CURRENT_DATE)";
  }

  try {
    const { rows } = await query(queryString, queryParams);
    return rows[0] && rows[0].count ? parseInt(rows[0].count, 10) : 0;
  } catch (error) {
    console.error('Failed to count open job requisitions:', error);
    throw error;
  }
}

export async function countTotalCandidates(timeframe: TimeFrameKey = 'all'): Promise<number> {
  let queryString = 'SELECT COUNT(*) FROM candidates';
  const queryParams = [];

  if (timeframe === 'daily') {
    queryString += " WHERE applied_date >= CURRENT_DATE";
  } else if (timeframe === 'weekly') {
    queryString += " WHERE applied_date >= date_trunc('week', CURRENT_DATE)";
  } else if (timeframe === 'monthly') {
    queryString += " WHERE applied_date >= date_trunc('month', CURRENT_DATE)";
  }

  try {
    const { rows } = await query(queryString, queryParams);
    return rows[0] && rows[0].count ? parseInt(rows[0].count, 10) : 0;
  } catch (error) {
    console.error('Failed to count total candidates:', error);
    throw error;
  }
}

export async function countUpcomingScheduledInterviews(timeframe: TimeFrameKey = 'all'): Promise<number> {
  let queryString = "SELECT COUNT(*) FROM scheduled_interviews WHERE interview_datetime > NOW()";
  const queryParams = [];

  if (timeframe === 'daily') {
    queryString += " AND interview_datetime < (NOW() + interval '1 day')";
  } else if (timeframe === 'weekly') {
    queryString += " AND interview_datetime < (NOW() + interval '7 days')";
  } else if (timeframe === 'monthly') {
    queryString += " AND interview_datetime < (NOW() + interval '1 month')";
  }
  // 'all' timeframe is covered by the base query

  try {
    const { rows } = await query(queryString, queryParams);
    return rows[0] && rows[0].count ? parseInt(rows[0].count, 10) : 0;
  } catch (error) {
    console.error('Failed to count upcoming scheduled interviews:', error);
    throw error;
  }
}

export async function countCandidatesInScreeningStage(): Promise<number> {
  try {
    const { rows } = await query("SELECT COUNT(*) FROM candidates WHERE stage = 'Screening'");
    return rows[0] && rows[0].count ? parseInt(rows[0].count, 10) : 0;
  } catch (error) {
    console.error('Failed to count candidates in screening stage:', error);
    throw error;
  }
}


export async function countResumesScreened(): Promise<number> {
  try {
    return 0;
  } catch (error) {
    console.error('Failed to count resumes screened:', error);
    throw error;
  }
}

export async function getScreeningAccuracy(): Promise<string> {
  try {
    return "N/A";
  } catch (error) {
    console.error('Failed to get screening accuracy:', error);
    throw error;
  }
}

// --- Job Requisition Functions ---
export async function getJobRequisitionsFromDB(): Promise<JobRequisition[]> {
  try {
    const { rows } = await query(
      'SELECT id, title, department, location, status, date_posted, description, skills_required, hiring_manager, priority, created_at, updated_at FROM job_requisitions ORDER BY date_posted DESC'
    );
    return rows.map(row => ({
      id: row.id,
      title: row.title,
      department: row.department,
      location: row.location,
      status: row.status,
      datePosted: row.date_posted ? new Date(row.date_posted).toISOString() : new Date().toISOString(),
      description: row.description,
      skillsRequired: Array.isArray(row.skills_required) ? row.skills_required : [],
      hiringManager: row.hiring_manager,
      priority: row.priority,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
    }));
  } catch (error) {
    console.error('Failed to fetch job requisitions:', error);
    return [];
  }
}

export async function getJobRequisitionByIdFromDB(id: string): Promise<JobRequisition | null> {
  try {
    const { rows } = await query(
      'SELECT id, title, department, location, status, date_posted, description, skills_required, hiring_manager, priority, created_at, updated_at FROM job_requisitions WHERE id = $1',
      [id]
    );
    if (rows.length === 0) {
      return null;
    }
    const row = rows[0];
    return {
      id: row.id,
      title: row.title,
      department: row.department,
      location: row.location,
      status: row.status,
      datePosted: row.date_posted ? new Date(row.date_posted).toISOString() : new Date().toISOString(),
      description: row.description,
      skillsRequired: Array.isArray(row.skills_required) ? row.skills_required : [],
      hiringManager: row.hiring_manager,
      priority: row.priority,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
    };
  } catch (error) {
    console.error(`Failed to fetch job requisition with id ${id}:`, error);
    return null;
  }
}

export async function getJobRequisitionByTitleFromDB(title: string): Promise<JobRequisition | null> {
  try {
    const { rows } = await query(
      'SELECT id, title, department, location, status, date_posted, description, skills_required, hiring_manager, priority, created_at, updated_at FROM job_requisitions WHERE title = $1 LIMIT 1',
      [title]
    );
    if (rows.length === 0) {
      return null;
    }
    const row = rows[0];
    return {
      id: row.id,
      title: row.title,
      department: row.department,
      location: row.location,
      status: row.status,
      datePosted: row.date_posted ? new Date(row.date_posted).toISOString() : new Date().toISOString(),
      description: row.description,
      skillsRequired: Array.isArray(row.skills_required) ? row.skills_required : [],
      hiringManager: row.hiring_manager,
      priority: row.priority,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
    };
  } catch (error) {
    console.error(`Failed to fetch job requisition with title ${title}:`, error);
    return null;
  }
}


export async function getOpenJobRequisitionsForMatching(): Promise<JobRequisitionInput[]> {
  try {
    const { rows } = await query(
      "SELECT id, title, description, skills_required FROM job_requisitions WHERE status = 'Open' ORDER BY date_posted DESC"
    );
    return rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description || '',
      skillsRequired: Array.isArray(row.skills_required) ? row.skills_required : [],
    }));
  } catch (error) {
    console.error('Failed to fetch open job requisitions for matching:', error);
    return [];
  }
}

export async function getLinkableJobRequisitions(projectId?: string): Promise<JobRequisition[]> {
    console.log(`[DB getLinkableJobRequisitions] Fetching for project ID (optional): ${projectId}`);
    try {
        let queryString = `
            SELECT jr.id, jr.title, jr.department, jr.location, jr.status, jr.date_posted, jr.description, jr.skills_required, jr.hiring_manager, jr.priority, jr.created_at, jr.updated_at
            FROM job_requisitions jr
            WHERE jr.status IN ('Open', 'On Hold')
        `;
        const queryParams = [];

        queryString += ' ORDER BY jr.title ASC';

        const { rows } = await query(queryString, queryParams);
        console.log(`[DB getLinkableJobRequisitions] Found ${rows.length} linkable jobs.`);
        return rows.map(row => ({
            id: row.id,
            title: row.title,
            department: row.department,
            location: row.location,
            status: row.status,
            datePosted: row.date_posted ? new Date(row.date_posted).toISOString() : new Date().toISOString(),
            description: row.description,
            skillsRequired: Array.isArray(row.skills_required) ? row.skills_required : [],
            hiringManager: row.hiring_manager,
            priority: row.priority,
            createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
            updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
        }));
    } catch (error) {
        console.error('[DB getLinkableJobRequisitions] Failed to fetch linkable job requisitions:', error);
        return [];
    }
}


export async function getJobRequisitionDetailsForAdvancedMatching(id: string): Promise<AdvancedMatchingInput['jobDetails'] | null> {
  try {
    const { rows } = await query(
      'SELECT title, description, skills_required, location FROM job_requisitions WHERE id = $1',
      [id]
    );
    if (rows.length === 0) return null;
    const job = rows[0];
    return {
      jobTitle: job.title,
      jobDescription: job.description || 'No detailed description provided.',
      requiredSkills: Array.isArray(job.skills_required) ? job.skills_required : [],
      locationPreference: job.location || 'Any',
      requiredExperienceYears: 0,
      requiredEducation: "Not specified in job post",
    };
  } catch (error) {
    console.error(`Failed to fetch job details for advanced matching (ID: ${id}):`, error);
    return null;
  }
}


export async function saveJobRequisitionToDB(
  requisitionData: Omit<JobRequisition, 'id' | 'datePosted' | 'createdAt' | 'updatedAt'>,
  id?: string
): Promise<JobRequisition | null> {
  const { title, department, location, status, description, skillsRequired, hiringManager, priority } = requisitionData;

  try {
    let savedRequisitionRow;
    if (id) {
      const { rows } = await query(
        `UPDATE job_requisitions
         SET title = $1, department = $2, location = $3, status = $4, description = $5,
             skills_required = $6, hiring_manager = $7, priority = $8, updated_at = NOW()
         WHERE id = $9 RETURNING *`,
        [title, department, location, status, description, skillsRequired || [], hiringManager, priority, id]
      );
      savedRequisitionRow = rows[0];
    } else {
      const newId = `jobreq-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const datePosted = new Date().toISOString();
      const { rows } = await query(
        `INSERT INTO job_requisitions (id, title, department, location, status, date_posted, description, skills_required, hiring_manager, priority)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [newId, title, department, location, status, datePosted, description, skillsRequired || [], hiringManager, priority]
      );
      savedRequisitionRow = rows[0];
    }

    if (savedRequisitionRow) {
      const savedRequisition = {
        ...savedRequisitionRow,
        datePosted: new Date(savedRequisitionRow.date_posted).toISOString(),
        skillsRequired: Array.isArray(savedRequisitionRow.skills_required) ? savedRequisitionRow.skills_required : [],
        createdAt: new Date(savedRequisitionRow.created_at).toISOString(),
        updatedAt: new Date(savedRequisitionRow.updated_at).toISOString()
      };
      addActivityLog({
          description: `Job requisition "${savedRequisition.title}" was ${id ? 'updated' : 'created'}.`,
          relatedDocId: savedRequisition.id,
          relatedDocPath: `jobRequisitions/${savedRequisition.id}`
      }).catch(logError => console.error("[DB] Failed to add activity log for job requisition save (non-critical):", logError));
      return savedRequisition;
    }
    return null;

  } catch (error) {
    console.error('Failed to save job requisition:', error);
    return null;
  }
}

export async function deleteJobRequisitionFromDB(id: string): Promise<boolean> {
  try {
    const req = await getJobRequisitionByIdFromDB(id);
    await query('DELETE FROM job_requisitions WHERE id = $1', [id]);
     if (req) {
        addActivityLog({
          description: `Job requisition "${req.title}" was deleted.`,
          relatedDocId: id,
          relatedDocPath: `jobRequisitions/${id}`
        }).catch(logError => console.error("[DB] Failed to add activity log for job requisition delete (non-critical):", logError));
      }
    return true;
  } catch (error) {
    console.error('Failed to delete job requisition:', error);
    return false;
  }
}

// --- Candidate Functions ---
export async function getCandidatesFromDB(filters?: { jobTitle?: string }): Promise<Candidate[]> {
  let queryString = 'SELECT * FROM candidates';
  const queryParams = [];

  if (filters?.jobTitle && filters.jobTitle !== 'all') {
    queryParams.push(filters.jobTitle);
    queryString += ` WHERE job_title ILIKE $${queryParams.length}`;
  }
  queryString += ' ORDER BY applied_date DESC';

  try {
    const { rows } = await query(queryString, queryParams);
    return rows.map(row => ({
      ...row,
      appliedDate: row.applied_date ? new Date(row.applied_date).toISOString() : new Date().toISOString(),
      lastContacted: row.last_contacted ? new Date(row.last_contacted).toISOString() : undefined,
      skills: Array.isArray(row.skills) ? row.skills : [],
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
    }));
  } catch (error) {
    console.error('Failed to fetch candidates:', error);
    return [];
  }
}

export async function saveCandidateToDB(
  candidateData: Omit<Candidate, 'id' | 'appliedDate' | 'createdAt' | 'updatedAt'> & { id?: string },
): Promise<Candidate | null> {
  const { id, name, email, avatarUrl, jobTitle, stage, lastContacted, resumeSummary, sentiment, skills, notes } = candidateData;

  try {
    let savedCandidateRow;
    if (id) {
      const { rows } = await query(
        `UPDATE candidates
         SET name = $1, email = $2, avatar_url = $3, job_title = $4, stage = $5,
             last_contacted = $6, resume_summary = $7, sentiment = $8, skills = $9, notes = $10,
             applied_date = COALESCE(applied_date, NOW()), updated_at = NOW()
         WHERE id = $11 RETURNING *`,
        [name, email, avatarUrl, jobTitle, stage, lastContacted, resumeSummary, sentiment, skills || [], notes, id]
      );
      savedCandidateRow = rows[0];
    } else {
      const newId = `cand-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const appliedDate = new Date().toISOString();
      const { rows } = await query(
        `INSERT INTO candidates (id, name, email, avatar_url, job_title, stage, applied_date, last_contacted, resume_summary, sentiment, skills, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [newId, name, email, avatarUrl, jobTitle, stage, appliedDate, lastContacted, resumeSummary, sentiment, skills || [], notes]
      );
      savedCandidateRow = rows[0];
    }

    if (savedCandidateRow) {
      const savedCandidate = {
        ...savedCandidateRow,
        appliedDate: new Date(savedCandidateRow.applied_date).toISOString(),
        lastContacted: savedCandidateRow.last_contacted ? new Date(savedCandidateRow.last_contacted).toISOString() : undefined,
        skills: Array.isArray(savedCandidateRow.skills) ? savedCandidateRow.skills : [],
        createdAt: new Date(savedCandidateRow.created_at).toISOString(),
        updatedAt: new Date(savedCandidateRow.updated_at).toISOString()
      };
      addActivityLog({
          description: `Candidate "${savedCandidate.name}" was ${id ? 'updated' : 'added'} for job "${savedCandidate.jobTitle}". Stage: ${savedCandidate.stage}.`,
          relatedDocId: savedCandidate.id,
          relatedDocPath: `candidates/${savedCandidate.id}`
      }).catch(logError => console.error("[DB] Failed to add activity log for candidate save (non-critical):", logError));
      return savedCandidate;
    }
    return null;

  } catch (error) {
    console.error('Failed to save candidate:', error);
    return null;
  }
}

export async function deleteCandidateFromDB(id: string): Promise<boolean> {
  try {
     const candidate = (await query('SELECT name FROM candidates WHERE id = $1', [id])).rows[0];
    await query('DELETE FROM candidates WHERE id = $1', [id]);
    if (candidate) {
        addActivityLog({
          description: `Candidate "${candidate.name}" was deleted.`,
          relatedDocId: id,
          relatedDocPath: `candidates/${id}`
        }).catch(logError => console.error("[DB] Failed to add activity log for candidate delete (non-critical):", logError));
    }
    return true;
  } catch (error) {
    console.error('Failed to delete candidate:', error);
    return false;
  }
}

// --- Project Functions ---
export async function getProjectsFromDB(): Promise<Project[]> {
  try {
    const { rows } = await query(
      'SELECT id, name, manager, status, start_date, end_date, description, jobs_count, candidates_in_pipeline, interviews_count, progress, created_at, updated_at FROM projects ORDER BY created_at DESC'
    );
    return rows.map(row => {
      if (!row.id || typeof row.id !== 'string' || row.id.trim() === '') {
        console.error("[DB getProjectsFromDB] Error: Row found with missing or invalid ID. Skipping this row. Row data:", row);
        return null;
      }
      return {
        id: row.id,
        name: row.name,
        manager: row.manager,
        status: row.status,
        startDate: row.start_date ? new Date(row.start_date).toISOString().substring(0,10) : undefined,
        endDate: row.end_date ? new Date(row.end_date).toISOString().substring(0,10) : undefined,
        description: row.description,
        jobsCount: row.jobs_count,
        candidatesInPipeline: row.candidates_in_pipeline,
        interviewsCount: row.interviews_count,
        progress: row.progress,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
        updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
      };
    }).filter(p => p !== null) as Project[];
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    return [];
  }
}

export async function getProjectByIdFromDB(id: string): Promise<Project | null> {
  console.log(`[DB getProjectByIdFromDB] Fetching project with ID: ${id}`);
  if (!id || typeof id !== 'string' || id.trim() === '') {
    console.error(`[DB getProjectByIdFromDB] Error: Invalid or missing ID provided: "${id}"`);
    return null;
  }
  try {
    const { rows } = await query(
      'SELECT id, name, manager, status, start_date, end_date, description, jobs_count, candidates_in_pipeline, interviews_count, progress, created_at, updated_at FROM projects WHERE id = $1',
      [id]
    );
    console.log(`[DB getProjectByIdFromDB] Query for ID ${id} returned ${rows.length} rows. First row:`, rows[0]);
    if (rows.length === 0) {
      return null;
    }
    const row = rows[0];
     if (!row.id || typeof row.id !== 'string' || row.id.trim() === '') {
        console.error(`[DB getProjectByIdFromDB] Error: Row for ID ${id} found with missing or invalid ID in database. Row data:`, row);
        return null;
    }
    return {
      id: row.id,
      name: row.name,
      manager: row.manager,
      status: row.status,
      startDate: row.start_date ? new Date(row.start_date).toISOString().substring(0,10) : undefined,
      endDate: row.end_date ? new Date(row.end_date).toISOString().substring(0,10) : undefined,
      description: row.description,
      jobsCount: row.jobs_count,
      candidatesInPipeline: row.candidates_in_pipeline,
      interviewsCount: row.interviews_count,
      progress: row.progress,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
    };
  } catch (error) {
    console.error(`Failed to fetch project with id ${id}:`, error);
    return null;
  }
}

export async function saveProjectToDB(
  projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>,
  id?: string
): Promise<Project | null> {
  const { name, manager, status, jobsCount, candidatesInPipeline, interviewsCount, progress } = projectData;
  const dbStartDate = projectData.startDate && projectData.startDate.trim() !== '' ? projectData.startDate : null;
  const dbEndDate = projectData.endDate && projectData.endDate.trim() !== '' ? projectData.endDate : null;
  const dbDescription = projectData.description && projectData.description.trim() !== '' ? projectData.description : null;

  try {
    let resultRow;
    let queryResult;
    let queryText: string;
    let queryParams: any[];
    let newProjectId = id;

    if (id) {
      queryParams = [name, manager, status, dbStartDate, dbEndDate, dbDescription, jobsCount, candidatesInPipeline, interviewsCount, progress, id];
      queryText = `UPDATE projects
         SET name = $1, manager = $2, status = $3, start_date = $4, end_date = $5, description = $6,
             jobs_count = $7, candidates_in_pipeline = $8, interviews_count = $9, progress = $10, updated_at = NOW()
         WHERE id = $11 RETURNING *`;
      console.log('[DB saveProjectToDB] Executing UPDATE. Query:', queryText, 'Params:', queryParams);
      queryResult = await pool.query(queryText, queryParams);
      console.log('[DB saveProjectToDB] UPDATE raw result:', queryResult);
      resultRow = queryResult.rows[0];
    } else {
      newProjectId = `proj-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      queryParams = [newProjectId, name, manager, status, dbStartDate, dbEndDate, dbDescription, jobsCount, candidatesInPipeline, interviewsCount, progress];
      queryText = `INSERT INTO projects (id, name, manager, status, start_date, end_date, description, jobs_count, candidates_in_pipeline, interviews_count, progress)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`;
      console.log('[DB saveProjectToDB] Executing INSERT. Query:', queryText, 'Params:', queryParams);
      queryResult = await pool.query(queryText, queryParams);
      console.log('[DB saveProjectToDB] INSERT raw result:', queryResult);
      resultRow = queryResult.rows[0];
    }

    if (!resultRow) {
      console.error('[DB saveProjectToDB] CRITICAL: No row returned from INSERT/UPDATE operation. Query Result:', queryResult, 'Data:', projectData, 'ID:', id);
      throw new Error(`Database ${id ? 'update' : 'insert'} for project did not return the expected row. Review server logs (DB Query Error) for SQL issues, check table constraints or triggers.`);
    }

    const savedProject = {
        id: resultRow.id,
        name: resultRow.name,
        manager: resultRow.manager,
        status: resultRow.status,
        startDate: resultRow.start_date ? new Date(resultRow.start_date).toISOString().substring(0,10) : undefined,
        endDate: resultRow.end_date ? new Date(resultRow.end_date).toISOString().substring(0,10) : undefined,
        description: resultRow.description,
        jobsCount: resultRow.jobs_count,
        candidatesInPipeline: resultRow.candidates_in_pipeline,
        interviewsCount: resultRow.interviews_count,
        progress: resultRow.progress,
        createdAt: resultRow.created_at ? new Date(resultRow.created_at).toISOString() : undefined,
        updatedAt: resultRow.updated_at ? new Date(resultRow.updated_at).toISOString() : undefined,
    };
    addActivityLog({
      description: `Project "${savedProject.name}" was ${id ? 'updated' : 'created'}.`,
      relatedDocId: savedProject.id, 
      relatedDocPath: `projects/${savedProject.id}`
    }).catch(logError => console.error("[DB] Failed to add activity log for project save (non-critical):", logError));
    return savedProject;

  } catch (error) {
    console.error(`[DB saveProjectToDB] Error during database operation for project "${name}":`, error);
    throw error;
  }
}

export async function deleteProjectFromDB(id: string): Promise<boolean> {
  try {
    console.log(`[DB deleteProjectFromDB] Attempting to delete project and links for ID: ${id}`);
    const project = (await query('SELECT name FROM projects WHERE id = $1', [id])).rows[0];
    await query('DELETE FROM project_job_links WHERE project_id = $1', [id]);
    console.log(`[DB deleteProjectFromDB] Deleted links for project ID: ${id}`);
    await query('DELETE FROM project_tasks WHERE project_id = $1', [id]); // Also delete tasks
    console.log(`[DB deleteProjectFromDB] Deleted tasks for project ID: ${id}`);
    await query('DELETE FROM project_budgets WHERE project_id = $1', [id]); // Also delete budgets
    console.log(`[DB deleteProjectFromDB] Deleted budget for project ID: ${id}`);
    await query('DELETE FROM projects WHERE id = $1', [id]);
    console.log(`[DB deleteProjectFromDB] Deleted project with ID: ${id}`);

    if (project) {
        addActivityLog({
          description: `Project "${project.name}" and its associated data (links, tasks, budget) were deleted.`,
          relatedDocId: id,
          relatedDocPath: `projects/${id}`
        }).catch(logError => console.error("[DB] Failed to add activity log for project delete (non-critical):", logError));
    }
    return true;
  } catch (error) {
    console.error(`[DB deleteProjectFromDB] Failed to delete project and its associated data for ID ${id}:`, error);
    return false;
  }
}

// --- Project Dynamic Count Functions ---
export async function countJobsForProject(projectId: string): Promise<number> {
  try {
    const { rows } = await query(
      'SELECT COUNT(*) FROM project_job_links WHERE project_id = $1',
      [projectId]
    );
    return rows[0] && rows[0].count ? parseInt(rows[0].count, 10) : 0;
  } catch (error) {
    console.error(`Failed to count jobs for project ${projectId}:`, error);
    throw error;
  }
}

export async function countCandidatesForProject(projectId: string): Promise<number> {
  try {
    // This query assumes candidates.job_title matches job_requisitions.title for linking.
    const { rows } = await query(
      `SELECT COUNT(DISTINCT c.id)
       FROM candidates c
       INNER JOIN job_requisitions jr ON c.job_title = jr.title
       INNER JOIN project_job_links pjl ON jr.id = pjl.job_requisition_id
       WHERE pjl.project_id = $1`,
      [projectId]
    );
    return rows[0] && rows[0].count ? parseInt(rows[0].count, 10) : 0;
  } catch (error) {
    console.error(`Failed to count candidates for project ${projectId}:`, error);
    throw error;
  }
}

export async function getCandidatesForProject(projectId: string): Promise<Array<{ id: string; name: string; jobTitle: string; jobRequisitionId: string }>> {
  console.log(`[DB getCandidatesForProject] Fetching candidates for project ID: ${projectId}`);
  if (!projectId) {
    console.error("[DB getCandidatesForProject] Project ID is undefined or null. Returning empty array.");
    return [];
  }
  try {
    const { rows } = await query(
      `SELECT DISTINCT c.id, c.name, c.job_title, jr.id as job_requisition_id
       FROM candidates c
       INNER JOIN job_requisitions jr ON c.job_title = jr.title
       INNER JOIN project_job_links pjl ON jr.id = pjl.job_requisition_id
       WHERE pjl.project_id = $1
       ORDER BY jr.title ASC, c.name ASC`,
      [projectId]
    );
    console.log(`[DB getCandidatesForProject] Found ${rows.length} candidates for project ${projectId}.`);
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      jobTitle: row.job_title,
      jobRequisitionId: row.job_requisition_id,
    }));
  } catch (error) {
    console.error(`[DB getCandidatesForProject] Failed to fetch candidates for project ${projectId}:`, error);
    throw error;
  }
}


export async function countInterviewsForProject(projectId: string): Promise<number> {
  try {
    // This query assumes scheduled_interviews.job_title matches job_requisitions.title.
    const { rows } = await query(
      `SELECT COUNT(DISTINCT si.id)
       FROM scheduled_interviews si
       INNER JOIN job_requisitions jr ON si.job_title = jr.title
       INNER JOIN project_job_links pjl ON jr.id = pjl.job_requisition_id
       WHERE pjl.project_id = $1`,
      [projectId]
    );
    return rows[0] && rows[0].count ? parseInt(rows[0].count, 10) : 0;
  } catch (error) {
    console.error(`Failed to count interviews for project ${projectId}:`, error);
    throw error;
  }
}


// --- Project Job Link Functions ---
export async function getLinkedJobRequisitionsForProject(projectId: string): Promise<JobRequisition[]> {
  console.log(`[DB getLinkedJobRequisitionsForProject] Fetching for project ID: ${projectId}`);
  if (!projectId) {
    console.error("[DB getLinkedJobRequisitionsForProject] Project ID is undefined or null. Returning empty array.");
    return [];
  }
  try {
    const { rows } = await query(
      `SELECT jr.id, jr.title, jr.department, jr.location, jr.status, jr.date_posted, jr.description, jr.skills_required, jr.hiring_manager, jr.priority, jr.created_at, jr.updated_at
       FROM job_requisitions jr
       JOIN project_job_links pjl ON jr.id = pjl.job_requisition_id
       WHERE pjl.project_id = $1
       ORDER BY jr.date_posted DESC`,
      [projectId]
    );
    console.log(`[DB getLinkedJobRequisitionsForProject] Found ${rows.length} linked jobs for project ${projectId}. Raw rows:`, rows);
    return rows.map(row => ({
      id: row.id,
      title: row.title,
      department: row.department,
      location: row.location,
      status: row.status,
      datePosted: row.date_posted ? new Date(row.date_posted).toISOString() : new Date().toISOString(),
      description: row.description,
      skillsRequired: Array.isArray(row.skills_required) ? row.skills_required : [],
      hiringManager: row.hiring_manager,
      priority: row.priority,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
    }));
  } catch (error) {
    console.error(`[DB getLinkedJobRequisitionsForProject] Failed to fetch linked job requisitions for project ${projectId}:`, error);
    return [];
  }
}

export async function linkJobToProject(projectId: string, jobRequisitionId: string): Promise<boolean> {
  console.log(`[DB linkJobToProject] Attempting to link job ${jobRequisitionId} to project ${projectId}`);
  if (!firestore) {
    console.error("[DB linkJobToProject] Firestore instance is not available. Cannot add activity log.");
  }
  try {
    const result = await query(
      'INSERT INTO project_job_links (project_id, job_requisition_id) VALUES ($1, $2) ON CONFLICT (project_id, job_requisition_id) DO NOTHING RETURNING *',
      [projectId, jobRequisitionId]
    );
    console.log(`[DB linkJobToProject] Link operation result: ${result.rowCount} row(s) affected (0 means link already existed or conflict). Actual inserted row (if any):`, result.rows[0]);

    if (result.rowCount > 0) {
        const job = await getJobRequisitionByIdFromDB(jobRequisitionId);
        const project = await getProjectByIdFromDB(projectId);
        if (job && project) {
            addActivityLog({
              description: `Job requisition "${job.title}" linked to project "${project.name}".`,
              relatedDocId: projectId, // Log against the project
              relatedDocPath: `projects/${projectId}`
            }).catch(logError => console.error("[DB linkJobToProject] Non-critical: Failed to add activity log:", logError));
        }
    }
    return true;
  } catch (error) {
    console.error(`[DB linkJobToProject] Failed to link job ${jobRequisitionId} to project ${projectId}:`, error);
    return false;
  }
}

export async function unlinkJobFromProject(projectId: string, jobRequisitionId: string): Promise<boolean> {
  console.log(`[DB unlinkJobFromProject] Attempting to unlink job ${jobRequisitionId} from project ${projectId}`);
   if (!firestore) {
    console.error("[DB unlinkJobFromProject] Firestore instance is not available. Cannot add activity log.");
  }
  try {
    const job = await getJobRequisitionByIdFromDB(jobRequisitionId);
    const project = await getProjectByIdFromDB(projectId);
    const result = await query(
      'DELETE FROM project_job_links WHERE project_id = $1 AND job_requisition_id = $2',
      [projectId, jobRequisitionId]
    );
    console.log(`[DB unlinkJobFromProject] Unlink operation result: ${result.rowCount} row(s) affected.`);
    if (result.rowCount > 0 && job && project) {
        addActivityLog({
          description: `Job requisition "${job.title}" unlinked from project "${project.name}".`,
          relatedDocId: projectId, // Log against the project
          relatedDocPath: `projects/${projectId}`
        }).catch(logError => console.error("[DB unlinkJobFromProject] Non-critical: Failed to add activity log:", logError));
    }
    return true;
  } catch (error) {
    console.error(`[DB unlinkJobFromProject] Failed to unlink job ${jobRequisitionId} from project ${projectId}:`, error);
    return false;
  }
}


// --- Ideal Candidate Profile Functions ---
export async function getIdealCandidateProfilesFromDB(): Promise<IdealCandidateProfile[]> {
  try {
    const { rows } = await query(
      'SELECT * FROM ideal_candidate_profiles ORDER BY created_at DESC'
    );
    return rows.map(row => ({
      ...row,
      keySkills: Array.isArray(row.key_skills) ? row.key_skills : [],
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
    }));
  } catch (error) {
    console.error('Failed to fetch ideal candidate profiles:', error);
    return [];
  }
}

export async function saveIdealCandidateProfileToDB(
  profileData: Omit<IdealCandidateProfile, 'id' | 'createdAt' | 'updatedAt'>,
  id?: string
): Promise<IdealCandidateProfile | null> {
  const { profileName, jobTitle, keySkills, experienceLevel, educationRequirements, locationPreferences, companyBackground, culturalFitNotes } = profileData;
  try {
    let savedProfileRow;
    if (id) {
      const { rows } = await query(
        `UPDATE ideal_candidate_profiles
         SET profile_name = $1, job_title = $2, key_skills = $3, experience_level = $4, education_requirements = $5, location_preferences = $6, company_background = $7, cultural_fit_notes = $8, updated_at = NOW()
         WHERE id = $9 RETURNING *`,
        [profileName, jobTitle, keySkills, experienceLevel, educationRequirements, locationPreferences, companyBackground, culturalFitNotes, id]
      );
      savedProfileRow = rows[0];
    } else {
      const newId = `icp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const { rows } = await query(
        `INSERT INTO ideal_candidate_profiles (id, profile_name, job_title, key_skills, experience_level, education_requirements, location_preferences, company_background, cultural_fit_notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [newId, profileName, jobTitle, keySkills, experienceLevel, educationRequirements, locationPreferences, companyBackground, culturalFitNotes]
      );
      savedProfileRow = rows[0];
    }

    if (savedProfileRow) {
      const savedProfile = {
        ...savedProfileRow,
        keySkills: Array.isArray(savedProfileRow.key_skills) ? savedProfileRow.key_skills : [],
        createdAt: new Date(savedProfileRow.created_at).toISOString(),
        updatedAt: new Date(savedProfileRow.updated_at).toISOString()
      };
      addActivityLog({
          description: `Ideal Candidate Profile "${savedProfile.profileName}" for job "${savedProfile.jobTitle}" was ${id ? 'updated' : 'created'}.`,
          relatedDocId: savedProfile.id,
          relatedDocPath: `idealCandidateProfiles/${savedProfile.id}`
      }).catch(logError => console.error("[DB] Failed to add activity log for ICP save (non-critical):", logError));
      return savedProfile;
    }
    return null;

  } catch (error) {
    console.error('Failed to save ideal candidate profile:', error);
    return null;
  }
}

export async function deleteIdealCandidateProfileFromDB(id: string): Promise<boolean> {
  try {
    const profile = (await query('SELECT profile_name FROM ideal_candidate_profiles WHERE id = $1', [id])).rows[0];
    await query('DELETE FROM ideal_candidate_profiles WHERE id = $1', [id]);
    if (profile) {
        addActivityLog({
          description: `Ideal Candidate Profile "${profile.profile_name}" was deleted.`,
          relatedDocId: id,
          relatedDocPath: `idealCandidateProfiles/${id}`
        }).catch(logError => console.error("[DB] Failed to add activity log for ICP delete (non-critical):", logError));
    }
    return true;
  } catch (error) {
    console.error('Failed to delete ideal candidate profile:', error);
    return false;
  }
}

// --- Manager Profile Functions ---
export async function getManagerProfilesFromDB(): Promise<ManagerProfile[]> {
  try {
    const { rows } = await query(
      'SELECT * FROM manager_profiles ORDER BY name ASC'
    );
    return rows.map(row => ({
      ...row,
      hiringSince: row.hiring_since ? new Date(row.hiring_since).toISOString() : undefined,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
    }));
  } catch (error) {
    console.error('Failed to fetch manager profiles:', error);
    return [];
  }
}

export async function saveManagerProfileToDB(
  profileData: Omit<ManagerProfile, 'id' | 'createdAt' | 'updatedAt'>,
  id?: string
): Promise<ManagerProfile | null> {
  const { name, email, department, avatarUrl, activeRequisitions, teamSize, hiringSince } = profileData;
  try {
    let savedProfileRow;
    if (id) {
      const { rows } = await query(
        `UPDATE manager_profiles
         SET name = $1, email = $2, department = $3, avatar_url = $4, active_requisitions = $5, team_size = $6, hiring_since = $7, updated_at = NOW()
         WHERE id = $8 RETURNING *`,
        [name, email, department, avatarUrl, activeRequisitions, teamSize, hiringSince, id]
      );
      savedProfileRow = rows[0];
    } else {
      const newId = `mgr-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const { rows } = await query(
        `INSERT INTO manager_profiles (id, name, email, department, avatar_url, active_requisitions, team_size, hiring_since)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [newId, name, email, department, avatarUrl, activeRequisitions, teamSize, hiringSince]
      );
      savedProfileRow = rows[0];
    }

    if (savedProfileRow) {
      const savedProfile = {
        ...savedProfileRow,
        hiringSince: savedProfileRow.hiring_since ? new Date(savedProfileRow.hiring_since).toISOString(): undefined,
        createdAt: new Date(savedProfileRow.created_at).toISOString(),
        updatedAt: new Date(savedProfileRow.updated_at).toISOString()
      };
      addActivityLog({
          description: `Manager Profile for "${savedProfile.name}" was ${id ? 'updated' : 'created'}.`,
          relatedDocId: savedProfile.id,
          relatedDocPath: `managerProfiles/${savedProfile.id}`
      }).catch(logError => console.error("[DB] Failed to add activity log for manager profile save (non-critical):", logError));
      return savedProfile;
    }
    return null;

  } catch (error) {
    console.error('Failed to save manager profile:', error);
    return null;
  }
}

export async function deleteManagerProfileFromDB(id: string): Promise<boolean> {
  try {
    const profile = (await query('SELECT name FROM manager_profiles WHERE id = $1', [id])).rows[0];
    await query('DELETE FROM manager_profiles WHERE id = $1', [id]);
     if (profile) {
        addActivityLog({
          description: `Manager Profile for "${profile.name}" was deleted.`,
          relatedDocId: id,
          relatedDocPath: `managerProfiles/${id}`
        }).catch(logError => console.error("[DB] Failed to add activity log for manager profile delete (non-critical):", logError));
    }
    return true;
  } catch (error) {
    console.error('Failed to delete manager profile:', error);
    return false;
  }
}

// --- Scheduled Interview Functions ---
export async function getInterviewByIdFromDB(id: string): Promise<ScheduledInterview | null> {
  // Check for local ID and return a mock object if it's a local interview.
  if (id.startsWith('local-')) {
    console.warn(`[DB MOCK] Returning mock interview for local ID: ${id}`);
    return {
      id: id,
      candidateName: "Local Test Candidate",
      jobTitle: "Local Test Job",
      interviewers: ['AI Interviewer'],
      interviewDateTime: new Date().toISOString(),
      interviewType: "AI Initial Screen",
      questions: ["This is a locally stored interview.", "What are the benefits of this approach?"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }

  try {
    const { rows } = await query(
      'SELECT * FROM scheduled_interviews WHERE id = $1',
      [id]
    );
    if (rows.length === 0) {
      return null;
    }
    const row = rows[0];
    return {
      ...row,
      interviewers: Array.isArray(row.interviewers) ? row.interviewers : [],
      questions: Array.isArray(row.questions) ? row.questions : [],
      cheatingDetections: row.cheating_detections ? row.cheating_detections : [],
      analysis: row.analysis ? row.analysis : undefined,
      videoStoragePath: row.video_storage_path,
      interviewDateTime: row.interview_datetime ? new Date(row.interview_datetime).toISOString() : new Date().toISOString(),
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
    };
  } catch (error) {
    console.error(`Failed to fetch interview with id ${id}:`, error);
    return null;
  }
}

export async function getScheduledInterviewsFromDB(): Promise<ScheduledInterview[]> {
  try {
    const { rows } = await query(
      'SELECT * FROM scheduled_interviews ORDER BY interview_datetime ASC'
    );
    return rows.map(row => ({
      ...row,
      interviewers: Array.isArray(row.interviewers) ? row.interviewers : [],
      cheatingDetections: row.cheating_detections ? row.cheating_detections : [],
      analysis: row.analysis ? row.analysis : undefined,
      videoStoragePath: row.video_storage_path,
      interviewDateTime: row.interview_datetime ? new Date(row.interview_datetime).toISOString() : new Date().toISOString(),
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
    }));
  } catch (error) {
    console.error('Failed to fetch scheduled interviews:', error);
    return [];
  }
}

export async function saveScheduledInterviewToDB(
  interviewData: Omit<ScheduledInterview, 'id' | 'createdAt' | 'updatedAt'>,
  id?: string
): Promise<ScheduledInterview | null> {
  try {
    let savedInterviewRow;

    if (id) {
        // UPDATE is dynamic and robust
        const updates: string[] = [];
        const values: any[] = [];
        let i = 1;
        
        const updateField = (key: keyof typeof interviewData, dbCol: string, isJson: boolean = false, isArray: boolean = false) => {
            if (interviewData[key] !== undefined) {
                updates.push(`${dbCol} = $${i++}`);
                let value = interviewData[key];
                if (isJson) {
                    values.push(value ? JSON.stringify(value) : null);
                } else if (isArray) {
                    // Correctly format array for PostgreSQL
                    values.push(value || []);
                }
                else {
                    // Handle empty strings as null for optional text fields
                    values.push(value === '' ? null : value);
                }
            }
        };

        updateField('candidateName', 'candidate_name');
        updateField('jobTitle', 'job_title');
        updateField('interviewers', 'interviewers', false, true); // It's an array
        updateField('interviewDateTime', 'interview_datetime');
        updateField('interviewType', 'interview_type');
        updateField('notes', 'notes');
        updateField('questions', 'questions', true);
        updateField('videoStoragePath', 'video_storage_path');
        updateField('cheatingDetections', 'cheating_detections', true);
        updateField('analysis', 'analysis', true);

        if (updates.length === 0) return getInterviewByIdFromDB(id);

        updates.push('updated_at = NOW()');
        values.push(id);

        const queryText = `UPDATE scheduled_interviews SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`;
        const { rows } = await query(queryText, values);
        savedInterviewRow = rows[0];

    } else {
      // INSERT: Dynamically build the insert query to be robust against missing schema columns
      const newId = `int-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      
      const columns: string[] = ['id'];
      const values: any[] = [newId];
      const placeholders: string[] = ['$1'];
      let i = 2;

      const addFieldToInsert = (dbCol: string, value: any, isJson: boolean = false, isArray: boolean = false) => {
          if (value !== undefined && value !== null) {
              // Only exclude empty strings for non-array/json fields
              if (!isArray && !isJson && value === '') return;

              columns.push(dbCol);
              if (isJson) {
                  values.push(JSON.stringify(value));
              } else {
                  values.push(value);
              }
              placeholders.push(`$${i++}`);
          }
      };
      
      addFieldToInsert('candidate_name', interviewData.candidateName);
      addFieldToInsert('job_title', interviewData.jobTitle);
      addFieldToInsert('interview_datetime', interviewData.interviewDateTime);
      addFieldToInsert('interview_type', interviewData.interviewType);
      addFieldToInsert('interviewers', interviewData.interviewers, false, true); // It's an array
      addFieldToInsert('notes', interviewData.notes);
      addFieldToInsert('questions', interviewData.questions, true);
      
      const queryText = `INSERT INTO scheduled_interviews (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
      const { rows } = await query(queryText, values);
      savedInterviewRow = rows[0];
    }
    
    if (savedInterviewRow) {
      const savedInterview: ScheduledInterview = {
        id: savedInterviewRow.id,
        candidateName: savedInterviewRow.candidate_name,
        jobTitle: savedInterviewRow.job_title,
        interviewers: Array.isArray(savedInterviewRow.interviewers) ? savedInterviewRow.interviewers : [],
        interviewDateTime: new Date(savedInterviewRow.interview_datetime).toISOString(),
        interviewType: savedInterviewRow.interview_type,
        notes: savedInterviewRow.notes,
        questions: Array.isArray(savedInterviewRow.questions) ? savedInterviewRow.questions : [],
        cheatingDetections: savedInterviewRow.cheating_detections || [],
        videoStoragePath: savedInterviewRow.video_storage_path,
        analysis: savedInterviewRow.analysis,
        createdAt: new Date(savedInterviewRow.created_at).toISOString(),
        updatedAt: new Date(savedInterviewRow.updated_at).toISOString(),
      };

      // Log activity only if it's not an analysis update
      if (!interviewData.analysis) {
        addActivityLog({
            description: `Interview for "${savedInterview.candidateName}" (Job: ${savedInterview.jobTitle}) was ${id ? 'updated' : 'scheduled'}.`,
            relatedDocId: savedInterview.id,
            relatedDocPath: `scheduledInterviews/${savedInterview.id}`
        }).catch(logError => console.error("[DB] Failed to add activity log for interview save (non-critical):", logError));
      }
      
      // Auto-create an interview link if it's a new interview
      if (!id) {
          await saveInterviewLinkToDB({
              jobTitle: savedInterview.jobTitle,
              candidateName: savedInterview.candidateName,
              linkUrl: `/live-interview/${savedInterview.id}`,
              type: "AI Interview Link"
          });
          console.log(`[DB] Automatically created an interview link for interview ID ${savedInterview.id}.`);
      }

      return savedInterview;
    }
    return null;

  } catch (error) {
    console.error('Failed to save scheduled interview:', error);
    return null;
  }
}

export async function deleteScheduledInterviewFromDB(id: string): Promise<boolean> {
  try {
    const interview = (await query('SELECT candidate_name, job_title FROM scheduled_interviews WHERE id = $1', [id])).rows[0];
    await query('DELETE FROM scheduled_interviews WHERE id = $1', [id]);
     if (interview) {
        addActivityLog({
          description: `Scheduled interview for "${interview.candidate_name}" (Job: ${interview.job_title}) was deleted.`,
          relatedDocId: id,
          relatedDocPath: `scheduledInterviews/${id}`
        }).catch(logError => console.error("[DB] Failed to add activity log for interview delete (non-critical):", logError));
    }
    return true;
  } catch (error) {
    console.error('Failed to delete scheduled interview:', error);
    return false;
  }
}

// --- Re-Engagement Candidate Functions ---
export async function getReEngagementCandidatesFromDB(): Promise<ReEngagementCandidate[]> {
  try {
    const { rows } = await query(
      'SELECT * FROM re_engagement_candidates ORDER BY last_contacted DESC'
    );
    return rows.map(row => ({
      ...row,
      lastContacted: row.last_contacted ? new Date(row.last_contacted).toISOString() : new Date().toISOString(),
      potentialFitFor: Array.isArray(row.potential_fit_for) ? row.potential_fit_for : [],
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
    }));
  } catch (error) {
    console.error('Failed to fetch re-engagement candidates:', error);
    return [];
  }
}

export async function saveReEngagementCandidateToDB(
  candidateData: Omit<ReEngagementCandidate, 'id' | 'createdAt' | 'updatedAt'>,
  id?: string
): Promise<ReEngagementCandidate | null> {
  const { name, previousRole, lastContacted, reasonNotHired, potentialFitFor, contactedForNewRole } = candidateData;
  try {
    let savedCandidateRow;
    if (id) {
      const { rows } = await query(
        `UPDATE re_engagement_candidates
         SET name = $1, previous_role = $2, last_contacted = $3, reason_not_hired = $4, potential_fit_for = $5, contacted_for_new_role = $6, updated_at = NOW()
         WHERE id = $7 RETURNING *`,
        [name, previousRole, lastContacted, reasonNotHired, potentialFitFor, contactedForNewRole, id]
      );
      savedCandidateRow = rows[0];
    } else {
      const newId = `recand-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const { rows } = await query(
        `INSERT INTO re_engagement_candidates (id, name, previous_role, last_contacted, reason_not_hired, potential_fit_for, contacted_for_new_role)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [newId, name, previousRole, lastContacted, reasonNotHired, potentialFitFor, contactedForNewRole ?? false]
      );
      savedCandidateRow = rows[0];
    }

    if (savedCandidateRow) {
      const savedCandidate = {
        ...savedCandidateRow,
        lastContacted: new Date(savedCandidateRow.last_contacted).toISOString(),
        potentialFitFor: Array.isArray(savedCandidateRow.potential_fit_for) ? savedCandidateRow.potential_fit_for : [],
        createdAt: new Date(savedCandidateRow.created_at).toISOString(),
        updatedAt: new Date(savedCandidateRow.updated_at).toISOString()
      };
      addActivityLog({
          description: `Re-engagement candidate "${savedCandidate.name}" was ${id ? 'updated' : 'added'}.`,
          relatedDocId: savedCandidate.id,
          relatedDocPath: `reEngagementCandidates/${savedCandidate.id}`
      }).catch(logError => console.error("[DB] Failed to add activity log for re-engagement candidate save (non-critical):", logError));
      return savedCandidate;
    }
    return null;

  } catch (error) {
    console.error('Failed to save re-engagement candidate:', error);
    return null;
  }
}

export async function deleteReEngagementCandidateFromDB(id: string): Promise<boolean> {
  try {
    const candidate = (await query('SELECT name FROM re_engagement_candidates WHERE id = $1', [id])).rows[0];
    await query('DELETE FROM re_engagement_candidates WHERE id = $1', [id]);
    if (candidate) {
        addActivityLog({
          description: `Re-engagement candidate "${candidate.name}" was deleted.`,
          relatedDocId: id,
          relatedDocPath: `reEngagementCandidates/${id}`
        }).catch(logError => console.error("[DB] Failed to add activity log for re-engagement candidate delete (non-critical):", logError));
    }
    return true;
  } catch (error) {
    console.error('Failed to delete re-engagement candidate:', error);
    return false;
  }
}

// --- Interview Link Functions ---
export async function getInterviewLinksFromDB(): Promise<InterviewLink[]> {
  try {
    const { rows } = await query(
      'SELECT * FROM interview_links ORDER BY created_at DESC'
    );
    return rows.map(row => ({
      ...row,
      type: row.link_type,
      expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : undefined,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
    }));
  } catch (error) {
    console.error('Failed to fetch interview links:', error);
    return [];
  }
}

export async function saveInterviewLinkToDB(
  linkData: Omit<InterviewLink, 'id' | 'createdAt' | 'updatedAt'>,
  id?: string
): Promise<InterviewLink | null> {
  const { jobTitle, candidateName, linkUrl, type, expiresAt } = linkData;
  try {
    let savedLinkRow;
    if (id) {
      const { rows } = await query(
        `UPDATE interview_links
         SET job_title = $1, candidate_name = $2, link_url = $3, link_type = $4, expires_at = $5, updated_at = NOW()
         WHERE id = $6 RETURNING *`,
        [jobTitle, candidateName, linkUrl, type, expiresAt, id]
      );
      savedLinkRow = rows[0];
    } else {
      const newId = `link-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const createdAt = new Date().toISOString();
      const { rows } = await query(
        `INSERT INTO interview_links (id, job_title, candidate_name, link_url, link_type, expires_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [newId, jobTitle, candidateName, linkUrl, type, expiresAt, createdAt]
      );
      savedLinkRow = rows[0];
    }

    if (savedLinkRow) {
      const savedLink = {
        ...savedLinkRow,
        type: savedLinkRow.link_type,
        expiresAt: savedLinkRow.expires_at ? new Date(savedLinkRow.expires_at).toISOString() : undefined,
        createdAt: new Date(savedLinkRow.created_at).toISOString(),
        updatedAt: new Date(savedLinkRow.updated_at).toISOString()
      };
      addActivityLog({
          description: `Interview link for job "${savedLink.jobTitle}" (Candidate: ${savedLink.candidateName || 'Generic'}) was ${id ? 'updated' : 'created'}.`,
          relatedDocId: savedLink.id,
          relatedDocPath: `interviewLinks/${savedLink.id}`
      }).catch(logError => console.error("[DB] Failed to add activity log for interview link save (non-critical):", logError));
      return savedLink;
    }
    return null;

  } catch (error) {
    console.error('Failed to save interview link:', error);
    return null;
  }
}

export async function deleteInterviewLinkFromDB(id: string): Promise<boolean> {
  try {
     const link = (await query('SELECT job_title, candidate_name FROM interview_links WHERE id = $1', [id])).rows[0];
    await query('DELETE FROM interview_links WHERE id = $1', [id]);
    if (link) {
        addActivityLog({
          description: `Interview link for job "${link.job_title}" (Candidate: ${link.candidate_name || 'Generic'}) was deleted.`,
          relatedDocId: id,
          relatedDocPath: `interviewLinks/${id}`
        }).catch(logError => console.error("[DB] Failed to add activity log for interview link delete (non-critical):", logError));
    }
    return true;
  } catch (error) {
    console.error('Failed to delete interview link:', error);
    return false;
  }
}

// --- Client Functions ---
export async function getClientsFromDB(): Promise<Client[]> {
  try {
    const { rows } = await query(
      'SELECT * FROM clients ORDER BY company_name ASC'
    );
    return rows.map(row => ({
      ...row,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
    }));
  } catch (error) {
    console.error('Failed to fetch clients:', error);
    return [];
  }
}

export async function saveClientToDB(
  clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>,
  id?: string
): Promise<Client | null> {
  const { companyName, contactPerson, email, phone, logoUrl, activeRequisitions, totalHires } = clientData;
  try {
    let savedClientRow;
    if (id) {
      const { rows } = await query(
        `UPDATE clients
         SET company_name = $1, contact_person = $2, email = $3, phone = $4, logo_url = $5, active_requisitions = $6, total_hires = $7, updated_at = NOW()
         WHERE id = $8 RETURNING *`,
        [companyName, contactPerson, email, phone, logoUrl, activeRequisitions, totalHires, id]
      );
      savedClientRow = rows[0];
    } else {
      const newId = `client-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const { rows } = await query(
        `INSERT INTO clients (id, company_name, contact_person, email, phone, logo_url, active_requisitions, total_hires)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [newId, companyName, contactPerson, email, phone, logoUrl, activeRequisitions, totalHires]
      );
      savedClientRow = rows[0];
    }

    if (savedClientRow) {
      const savedClient = {
        ...savedClientRow,
        createdAt: new Date(savedClientRow.created_at).toISOString(),
        updatedAt: new Date(savedClientRow.updated_at).toISOString()
      };
      addActivityLog({
          description: `Client "${savedClient.companyName}" was ${id ? 'updated' : 'created'}.`,
          relatedDocId: savedClient.id,
          relatedDocPath: `clients/${savedClient.id}`
      }).catch(logError => console.error("[DB] Failed to add activity log for client save (non-critical):", logError));
      return savedClient;
    }
    return null;

  } catch (error) {
    console.error('Failed to save client:', error);
    return null;
  }
}

export async function deleteClientFromDB(id: string): Promise<boolean> {
  try {
    const client = (await query('SELECT company_name FROM clients WHERE id = $1', [id])).rows[0];
    await query('DELETE FROM clients WHERE id = $1', [id]);
     if (client) {
        addActivityLog({
          description: `Client "${client.company_name}" was deleted.`,
          relatedDocId: id,
          relatedDocPath: `clients/${id}`
        }).catch(logError => console.error("[DB] Failed to add activity log for client delete (non-critical):", logError));
    }
    return true;
  } catch (error) {
    console.error('Failed to delete client:', error);
    return false;
  }
}

// --- Managed List Item Functions (Departments, Locations, CompanyHiringManagers) ---

export async function getDepartments(): Promise<ManagedListItem[]> {
  try {
    const { rows } = await query('SELECT id, name, created_at FROM departments ORDER BY name ASC');
    return rows.map(row => ({ ...row, createdAt: new Date(row.created_at).toISOString() }));
  } catch (error) {
    console.error('Failed to fetch departments:', error);
    return [];
  }
}

export async function addDepartment(name: string): Promise<ManagedListItem | null> {
  if (!name.trim()) throw new Error("Department name cannot be empty.");
  try {
    const newId = `dept-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const { rows } = await query(
      'INSERT INTO departments (id, name) VALUES ($1, $2) RETURNING id, name, created_at',
      [newId, name]
    );
    const addedDepartment = rows[0] ? { ...rows[0], createdAt: new Date(rows[0].created_at).toISOString() } : null;
    if (addedDepartment) {
      addActivityLog({ description: `Department "${name}" was added.` }).catch(logError => console.error("[DB] Failed to add activity log for department add (non-critical):", logError));
    }
    return addedDepartment;
  } catch (error) {
    console.error('Failed to add department:', error);
    if ((error as any).code === '23505') {
        throw new Error(`Department "${name}" already exists.`);
    }
    throw error;
  }
}

export async function deleteDepartment(id: string): Promise<boolean> {
  try {
    const department = (await query('SELECT name FROM departments WHERE id = $1', [id])).rows[0];
    await query('DELETE FROM departments WHERE id = $1', [id]);
    if (department) {
        addActivityLog({ description: `Department "${department.name}" was deleted.` }).catch(logError => console.error("[DB] Failed to add activity log for department delete (non-critical):", logError));
    }
    return true;
  } catch (error) {
    console.error('Failed to delete department:', error);
    return false;
  }
}


export async function getLocations(): Promise<ManagedListItem[]> {
  try {
    const { rows } = await query('SELECT id, name, created_at FROM locations ORDER BY name ASC');
    return rows.map(row => ({ ...row, createdAt: new Date(row.created_at).toISOString() }));
  } catch (error) {
    console.error('Failed to fetch locations:', error);
    return [];
  }
}

export async function addLocation(name: string): Promise<ManagedListItem | null> {
  if (!name.trim()) throw new Error("Location name cannot be empty.");
  try {
    const newId = `loc-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const { rows } = await query(
      'INSERT INTO locations (id, name) VALUES ($1, $2) RETURNING id, name, created_at',
      [newId, name]
    );
    const addedLocation = rows[0] ? { ...rows[0], createdAt: new Date(rows[0].created_at).toISOString() } : null;
     if (addedLocation) {
      addActivityLog({ description: `Location "${name}" was added.` }).catch(logError => console.error("[DB] Failed to add activity log for location add (non-critical):", logError));
    }
    return addedLocation;
  } catch (error) {
    console.error('Failed to add location:', error);
     if ((error as any).code === '23505') {
        throw new Error(`Location "${name}" already exists.`);
    }
    throw error;
  }
}

export async function deleteLocation(id: string): Promise<boolean> {
  try {
    const location = (await query('SELECT name FROM locations WHERE id = $1', [id])).rows[0];
    await query('DELETE FROM locations WHERE id = $1', [id]);
     if (location) {
        addActivityLog({ description: `Location "${location.name}" was deleted.` }).catch(logError => console.error("[DB] Failed to add activity log for location delete (non-critical):", logError));
    }
    return true;
  } catch (error) {
    console.error('Failed to delete location:', error);
    return false;
  }
}


export async function getCompanyHiringManagers(): Promise<ManagedListItem[]> {
  try {
    const { rows } = await query('SELECT id, name, created_at FROM company_hiring_managers ORDER BY name ASC');
    return rows.map(row => ({ ...row, createdAt: new Date(row.created_at).toISOString() }));
  } catch (error) {
    console.error('Failed to fetch company hiring managers:', error);
    return [];
  }
}

export async function addCompanyHiringManager(name: string): Promise<ManagedListItem | null> {
  if (!name.trim()) throw new Error("Hiring manager name cannot be empty.");
  try {
    const newId = `chm-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const { rows } = await query(
      'INSERT INTO company_hiring_managers (id, name) VALUES ($1, $2) RETURNING id, name, created_at',
      [newId, name]
    );
    const addedManager = rows[0] ? { ...rows[0], createdAt: new Date(rows[0].created_at).toISOString() } : null;
    if (addedManager) {
      addActivityLog({ description: `Hiring Manager "${name}" was added to system list.` }).catch(logError => console.error("[DB] Failed to add activity log for HM add (non-critical):", logError));
    }
    return addedManager;
  } catch (error) {
    console.error('Failed to add company hiring manager:', error);
     if ((error as any).code === '23505') {
        throw new Error(`Hiring manager "${name}" already exists.`);
    }
    throw error;
  }
}

export async function deleteCompanyHiringManager(id: string): Promise<boolean> {
  try {
    const manager = (await query('SELECT name FROM company_hiring_managers WHERE id = $1', [id])).rows[0];
    await query('DELETE FROM company_hiring_managers WHERE id = $1', [id]);
    if (manager) {
        addActivityLog({ description: `Hiring Manager "${manager.name}" was deleted from system list.` }).catch(logError => console.error("[DB] Failed to add activity log for HM delete (non-critical):", logError));
    }
    return true;
  } catch (error) {
    console.error('Failed to delete company hiring manager:', error);
    return false;
  }
}

// --- Activity Log Functions (Firestore) ---
export async function addActivityLog(logData: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<ActivityLog | null> {
  if (!firestore || !FieldValue) {
      console.warn("[DB Activity Log] Firestore Admin SDK not initialized. Cannot add activity log.");
      return null;
  }
  const activityLogRef = firestore.collection('activityLogs');
  const newLogData: any = { 
    description: logData.description,
    user: logData.user || "System", 
    timestamp: FieldValue.serverTimestamp(),
  };

  if (logData.relatedDocId) newLogData.relatedDocId = logData.relatedDocId;
  if (logData.relatedDocPath) newLogData.relatedDocPath = logData.relatedDocPath;
  if (logData.icon) newLogData.icon = logData.icon;

  try {
    const docRef = await activityLogRef.add(newLogData);
    return {
      id: docRef.id,
      description: newLogData.description,
      user: newLogData.user,
      timestamp: new Date(), 
      relatedDocId: newLogData.relatedDocId,
      relatedDocPath: newLogData.relatedDocPath,
      icon: newLogData.icon,
    };
  } catch (error: any) {
    console.error("[DB Activity Log] ERROR during addDoc. Error message:", error.message, "Full error:", error);
    return null;
  }
}

export async function getActivityLogsFromDB(limitCount: number = 5): Promise<ActivityLog[]> {
  if (!firestore || !Timestamp) {
      console.warn("[DB Activity Log] Firestore Admin SDK not initialized. Cannot fetch activity logs.");
      return [];
  }
  try {
    const logsCollectionRef = firestore.collection('activityLogs');
    const q = logsCollectionRef.orderBy('timestamp', 'desc').limit(limitCount);
    const querySnapshot = await q.get();
    const logs: ActivityLog[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const ts = data.timestamp as InstanceType<typeof Timestamp>;
      logs.push({
        id: doc.id,
        ...data,
        timestamp: ts.toDate()
      } as ActivityLog);
    });
    return logs;
  } catch (error) {
    console.error("[DB Activity Log - General] Error fetching activity logs from Firestore:", error);
    return [];
  }
}

export async function getActivityLogsForProject(projectId: string, limitCount: number = 10): Promise<ActivityLog[]> {
  if (!firestore || !Timestamp) {
    console.warn(`[DB Activity Log] Firestore Admin SDK not initialized. Cannot fetch logs for project ${projectId}.`);
    return [];
  }
  if (!projectId || typeof projectId !== 'string' || projectId.trim() === '') {
    console.error(`[DB Activity Log - Project] Invalid projectId: "${projectId}".`);
    return [];
  }
  try {
    const logsCollectionRef = firestore.collection('activityLogs');
    const q = logsCollectionRef
        .where('relatedDocId', '==', projectId)
        .orderBy('timestamp', 'desc')
        .limit(limitCount);
    const querySnapshot = await q.get();
    const logs: ActivityLog[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const ts = data.timestamp as InstanceType<typeof Timestamp>;
      logs.push({
        id: doc.id,
        ...data,
        timestamp: ts.toDate()
      } as ActivityLog);
    });
    return logs;
  } catch (error) {
    console.error(`[DB Activity Log - Project] Error fetching activity logs for project ${projectId}:`, error);
    return [];
  }
}

// --- Support Ticket Function (Firestore) ---
export async function saveSupportTicketToDB(ticketData: SupportTicketData): Promise<SupportTicketData & { id: string } | null> {
  if (!firestore || !FieldValue) {
      console.error("[DB Support Ticket] Firestore Admin SDK not initialized. Cannot save support ticket.");
      throw new Error("Cannot save support ticket: Database connection is not available.");
  }
  const supportTicketsRef = firestore.collection('supportTickets');
  const newTicket = {
    ...ticketData,
    status: 'Open',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  try {
    const docRef = await supportTicketsRef.add(newTicket);
    addActivityLog({
      description: `New support ticket submitted: "${ticketData.subject || 'No Subject'}".`,
      relatedDocId: docRef.id,
      relatedDocPath: `supportTickets/${docRef.id}`
    }).catch(logError => console.error("[DB] Failed to add activity log for support ticket (non-critical):", logError));
    return {
      id: docRef.id,
      ...ticketData,
      status: 'Open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error("[DB Support Ticket] ERROR during addDoc for support ticket:", error.message, "Full error:", error);
    return null;
  }
}

// --- Project Task Functions ---
export async function getProjectTasksFromDB(projectId: string): Promise<ProjectTask[]> {
  console.log(`[DB getProjectTasksFromDB] Fetching tasks for project ID: ${projectId}`);
  if (!projectId) {
    console.error("[DB getProjectTasksFromDB] Project ID is undefined or null. Returning empty array.");
    return [];
  }
  try {
    const { rows } = await query(
      `SELECT pt.*, c.name as candidate_name 
       FROM project_tasks pt
       LEFT JOIN candidates c ON pt.candidate_id = c.id
       WHERE pt.project_id = $1 
       ORDER BY pt.created_at ASC`,
      [projectId]
    );
    console.log(`[DB getProjectTasksFromDB] Found ${rows.length} tasks for project ${projectId}.`);
    return rows.map(row => ({
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      description: row.description,
      status: row.status as ProjectTaskStatus,
      assigneeName: row.assignee_name,
      candidateId: row.candidate_id,
      candidateName: row.candidate_name,
      dueDate: row.due_date ? new Date(row.due_date).toISOString().substring(0, 10) : undefined,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    }));
  } catch (error) {
    console.error(`[DB getProjectTasksFromDB] Failed to fetch tasks for project ${projectId}:`, error);
    return [];
  }
}

export async function saveProjectTaskToDB(
  taskData: Omit<ProjectTask, 'id' | 'createdAt' | 'updatedAt' | 'candidateName'>, // candidateName is derived
  id?: string
): Promise<ProjectTask | null> {
  const { projectId, title, description, status, assigneeName, dueDate, candidateId } = taskData;
  console.log(`[DB saveProjectTaskToDB] Saving task. ID: ${id}, ProjectID: ${projectId}, Title: ${title}, CandidateID: ${candidateId}`);

  try {
    let savedTaskRow;
    if (id) {
      const { rows } = await query(
        `UPDATE project_tasks
         SET title = $1, description = $2, status = $3, assignee_name = $4, due_date = $5, candidate_id = $6, updated_at = NOW()
         WHERE id = $7 AND project_id = $8 RETURNING *`,
        [title, description, status, assigneeName, dueDate || null, candidateId || null, id, projectId]
      );
      savedTaskRow = rows[0];
    } else {
      const newId = `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const { rows } = await query(
        `INSERT INTO project_tasks (id, project_id, title, description, status, assignee_name, due_date, candidate_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [newId, projectId, title, description, status, assigneeName, dueDate || null, candidateId || null]
      );
      savedTaskRow = rows[0];
    }

    if (savedTaskRow) {
      // Fetch candidate_name if candidate_id exists
      let candidateNameValue;
      if (savedTaskRow.candidate_id) {
        const candidateRes = await query('SELECT name FROM candidates WHERE id = $1', [savedTaskRow.candidate_id]);
        if (candidateRes.rows.length > 0) {
          candidateNameValue = candidateRes.rows[0].name;
        }
      }

      const savedTask: ProjectTask = {
        id: savedTaskRow.id,
        projectId: savedTaskRow.project_id,
        title: savedTaskRow.title,
        description: savedTaskRow.description,
        status: savedTaskRow.status as ProjectTaskStatus,
        assigneeName: savedTaskRow.assignee_name,
        candidateId: savedTaskRow.candidate_id,
        candidateName: candidateNameValue, 
        dueDate: savedTaskRow.due_date ? new Date(savedTaskRow.due_date).toISOString().substring(0, 10) : undefined,
        createdAt: new Date(savedTaskRow.created_at).toISOString(),
        updatedAt: new Date(savedTaskRow.updated_at).toISOString(),
      };
      console.log(`[DB saveProjectTaskToDB] Task ${id ? 'updated' : 'created'}:`, savedTask);
      addActivityLog({
        description: `Project task "${savedTask.title}" for project ID ${savedTask.projectId} was ${id ? 'updated' : 'created'}. Status: ${savedTask.status}. ${savedTask.candidateName ? `Related to candidate: ${savedTask.candidateName}.` : ''}`,
        relatedDocId: savedTask.projectId, 
        relatedDocPath: `projects/${savedTask.projectId}/tasks/${savedTask.id}`
      }).catch(logError => console.error("[DB] Failed to add activity log for project task save (non-critical):", logError));
      return savedTask;
    }
    console.error(`[DB saveProjectTaskToDB] No row returned for task save. ID: ${id}, ProjectID: ${projectId}`);
    return null;
  } catch (error) {
    console.error(`[DB saveProjectTaskToDB] Failed to save project task for project ${projectId}:`, error);
    return null;
  }
}

export async function deleteProjectTaskFromDB(taskId: string): Promise<boolean> {
  console.log(`[DB deleteProjectTaskFromDB] Deleting task with ID: ${taskId}`);
  try {
    const task = (await query('SELECT title, project_id FROM project_tasks WHERE id = $1', [taskId])).rows[0];
    const result = await query('DELETE FROM project_tasks WHERE id = $1', [taskId]);
    
    if (result.rowCount > 0 && task) {
        addActivityLog({
          description: `Project task "${task.title}" (for project ID ${task.project_id}) was deleted.`,
          relatedDocId: task.project_id, 
          relatedDocPath: `projects/${task.project_id}/tasks/${taskId}`
        }).catch(logError => console.error("[DB] Failed to add activity log for project task delete (non-critical):", logError));
        console.log(`[DB deleteProjectTaskFromDB] Successfully deleted task ${taskId}.`);
        return true;
    }
    console.warn(`[DB deleteProjectTaskFromDB] Task ${taskId} not found or delete failed. RowCount: ${result.rowCount}`);
    return false;
  } catch (error) {
    console.error(`[DB deleteProjectTaskFromDB] Failed to delete project task ${taskId}:`, error);
    return false;
  }
}

// --- Project Budget Functions ---
export async function getProjectBudgetByProjectId(projectId: string): Promise<ProjectBudget | null> {
  console.log(`[DB getProjectBudgetByProjectId] Fetching budget for project ID: ${projectId}`);
  if (!projectId) {
    console.error("[DB getProjectBudgetByProjectId] Project ID is undefined or null.");
    return null;
  }
  try {
    const { rows } = await query(
      'SELECT * FROM project_budgets WHERE project_id = $1',
      [projectId]
    );
    if (rows.length === 0) {
      console.log(`[DB getProjectBudgetByProjectId] No budget found for project ${projectId}.`);
      return null;
    }
    const row = rows[0];
    return {
      id: row.id,
      projectId: row.project_id,
      totalBudget: parseFloat(row.total_budget),
      spentBudget: parseFloat(row.spent_budget),
      currency: row.currency,
      notes: row.notes,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  } catch (error) {
    console.error(`[DB getProjectBudgetByProjectId] Failed to fetch budget for project ${projectId}:`, error);
    return null;
  }
}

export async function saveProjectBudget(
  budgetData: Omit<ProjectBudget, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ProjectBudget | null> {
  const { projectId, totalBudget, spentBudget, currency, notes } = budgetData;
  console.log(`[DB saveProjectBudget] Upserting budget for project ${projectId}.`);

  try {
    const newBudgetId = `budget-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    // The ON CONFLICT clause handles both inserts and updates based on the unique project_id.
    const { rows } = await query(
      `INSERT INTO project_budgets (id, project_id, total_budget, spent_budget, currency, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (project_id) DO UPDATE 
       SET total_budget = EXCLUDED.total_budget, 
           spent_budget = EXCLUDED.spent_budget, 
           currency = EXCLUDED.currency, 
           notes = EXCLUDED.notes, 
           updated_at = NOW()
       RETURNING *, (xmax = 0) as inserted`,
      [newBudgetId, projectId, totalBudget, spentBudget, currency, notes]
    );
    const savedBudgetRow = rows[0];

    if (savedBudgetRow) {
      const resultBudget: ProjectBudget = {
        id: savedBudgetRow.id,
        projectId: savedBudgetRow.project_id,
        totalBudget: parseFloat(savedBudgetRow.total_budget),
        spentBudget: parseFloat(savedBudgetRow.spent_budget),
        currency: savedBudgetRow.currency,
        notes: savedBudgetRow.notes,
        createdAt: new Date(savedBudgetRow.created_at).toISOString(),
        updatedAt: new Date(savedBudgetRow.updated_at).toISOString(),
      };
      
      const wasInserted = savedBudgetRow.inserted;

      addActivityLog({
        description: `Project budget for project ID ${resultBudget.projectId} was ${wasInserted ? 'created' : 'updated'}. Total: ${resultBudget.currency} ${resultBudget.totalBudget.toFixed(2)}.`,
        relatedDocId: resultBudget.projectId,
        relatedDocPath: `projects/${resultBudget.projectId}/budget`
      }).catch(logError => console.error("[DB] Failed to add activity log for project budget save (non-critical):", logError));
      return resultBudget;
    }
    console.error(`[DB saveProjectBudget] No row returned for budget save. ProjectID: ${projectId}`);
    return null;
  } catch (error) {
    console.error(`[DB saveProjectBudget] Failed to save budget for project ${projectId}:`, error);
    return null;
  }
}

export async function deleteProjectBudgetByProjectId(projectId: string): Promise<boolean> {
  console.log(`[DB deleteProjectBudgetByProjectId] Deleting budget for project ID: ${projectId}`);
  try {
    const budget = await getProjectBudgetByProjectId(projectId);
    const result = await query('DELETE FROM project_budgets WHERE project_id = $1', [projectId]);
    if (result.rowCount > 0 && budget) {
      addActivityLog({
        description: `Budget for project ID ${projectId} (Total: ${budget.currency} ${budget.totalBudget.toFixed(2)}) was deleted.`,
        relatedDocId: projectId,
        relatedDocPath: `projects/${projectId}/budget`
      }).catch(logError => console.error("[DB] Failed to add activity log for project budget delete (non-critical):", logError));
      console.log(`[DB deleteProjectBudgetByProjectId] Successfully deleted budget for project ${projectId}.`);
      return true;
    }
    console.warn(`[DB deleteProjectBudgetByProjectId] Budget for project ${projectId} not found or delete failed. RowCount: ${result.rowCount}`);
    return false;
  } catch (error) {
    console.error(`[DB deleteProjectBudgetByProjectId] Failed to delete budget for project ${projectId}:`, error);
    return false;
  }
}

// --- Project Resource Allocation Functions ---
export async function getProjectResources(projectId: string): Promise<ProjectResource[]> {
  try {
    const { rows } = await query('SELECT * FROM project_resources WHERE project_id = $1 ORDER BY created_at ASC', [projectId]);
    return rows.map(row => ({
      ...row,
      allocatedHours: parseFloat(row.allocated_hours),
      costPerHour: parseFloat(row.cost_per_hour),
      totalCost: parseFloat(row.total_cost),
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    }));
  } catch (error) {
    console.error(`Failed to fetch resources for project ${projectId}:`, error);
    return [];
  }
}

export async function saveProjectResource(
  resourceData: Omit<ProjectResource, 'id' | 'createdAt' | 'updatedAt' | 'totalCost'>,
  id?: string
): Promise<ProjectResource | null> {
  const { projectId, resourceName, role, allocatedHours, costPerHour } = resourceData;
  const totalCost = allocatedHours * costPerHour;

  try {
    let savedResourceRow;
    if (id) {
      const { rows } = await query(
        `UPDATE project_resources
         SET resource_name = $1, role = $2, allocated_hours = $3, cost_per_hour = $4, total_cost = $5, updated_at = NOW()
         WHERE id = $6 AND project_id = $7 RETURNING *`,
        [resourceName, role, allocatedHours, costPerHour, totalCost, id, projectId]
      );
      savedResourceRow = rows[0];
    } else {
      const newId = `res-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const { rows } = await query(
        `INSERT INTO project_resources (id, project_id, resource_name, role, allocated_hours, cost_per_hour, total_cost)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [newId, projectId, resourceName, role, allocatedHours, costPerHour, totalCost]
      );
      savedResourceRow = rows[0];
    }

    if (savedResourceRow) {
      const savedResource = {
        ...savedResourceRow,
        allocatedHours: parseFloat(savedResourceRow.allocated_hours),
        costPerHour: parseFloat(savedResourceRow.cost_per_hour),
        totalCost: parseFloat(savedResourceRow.total_cost),
        createdAt: new Date(savedResourceRow.created_at).toISOString(),
        updatedAt: new Date(savedResourceRow.updated_at).toISOString(),
      };
      addActivityLog({
        description: `Resource "${savedResource.resourceName}" was ${id ? 'updated' : 'allocated'} for project ID ${projectId}.`,
        relatedDocId: projectId,
        relatedDocPath: `projects/${projectId}/resources`
      }).catch(logError => console.error("[DB] Failed to add activity log for resource save (non-critical):", logError));
      return savedResource;
    }
    return null;
  } catch (error) {
    console.error(`Failed to save resource for project ${projectId}:`, error);
    return null;
  }
}

export async function deleteProjectResource(resourceId: string): Promise<boolean> {
  try {
    const resource = (await query('SELECT resource_name, project_id FROM project_resources WHERE id = $1', [resourceId])).rows[0];
    const result = await query('DELETE FROM project_resources WHERE id = $1', [resourceId]);
    if (result.rowCount > 0 && resource) {
      addActivityLog({
        description: `Resource "${resource.resource_name}" was deallocated from project ID ${resource.project_id}.`,
        relatedDocId: resource.project_id,
        relatedDocPath: `projects/${resource.project_id}/resources`
      }).catch(logError => console.error("[DB] Failed to add activity log for resource delete (non-critical):", logError));
    }
    return result.rowCount > 0;
  } catch (error) {
    console.error(`Failed to delete resource ${resourceId}:`, error);
    return false;
  }
}
    

    





