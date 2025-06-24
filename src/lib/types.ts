

export type CandidateStage = "Sourced" | "Screening" | "Interview" | "Offer" | "Hired" | "Rejected";
export const CANDIDATE_STAGES: CandidateStage[] = ["Sourced", "Screening", "Interview", "Offer", "Hired", "Rejected"];

export interface Candidate {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  jobTitle: string;
  stage: CandidateStage;
  appliedDate: string; 
  lastContacted?: string;
  resumeSummary?: string; 
  sentiment?: string; 
  skills?: string[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type JobRequisitionStatus = "Open" | "Closed" | "On Hold" | "Draft";
export const JOB_REQUISITION_STATUSES: JobRequisitionStatus[] = ["Open", "Closed", "On Hold", "Draft"];

export type JobPriority = "High" | "Medium" | "Low";
export const JOB_REQUISITION_PRIORITIES: JobPriority[] = ["High", "Medium", "Low"];

export interface JobRequisition {
  id: string;
  title: string;
  department: string;
  location: string;
  status: JobRequisitionStatus;
  datePosted: string; 
  description: string;
  skillsRequired: string[];
  hiringManager: string; 
  priority?: JobPriority;
  createdAt?: string;
  updatedAt?: string;
}

export interface IdealCandidateProfile {
  id: string;
  profileName: string;
  jobTitle: string;
  keySkills: string[];
  experienceLevel: string;
  educationRequirements: string;
  locationPreferences: string;
  companyBackground?: string;
  culturalFitNotes: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ProjectStatus = "Active" | "Planning" | "Completed" | "On Hold";
export const PROJECT_STATUSES: ProjectStatus[] = ["Active", "Planning", "Completed", "On Hold"];

export interface Project {
  id: string;
  name: string;
  manager: string;
  status: ProjectStatus;
  startDate?: string; 
  endDate?: string; 
  description?: string; 
  jobsCount: number; 
  candidatesInPipeline: number; 
  interviewsCount: number; 
  progress: number; 
  createdAt?: string;
  updatedAt?: string;
}

export interface ManagerProfile {
  id: string;
  name: string;
  email: string;
  department: string;
  avatarUrl?: string;
  activeRequisitions: number;
  teamSize: number;
  hiringSince?: string; 
  createdAt?: string;
  updatedAt?: string;
}

export type InterviewType = "Phone Screen" | "Technical Interview" | "Panel Interview" | "Hiring Manager Interview" | "Cultural Fit" | "AI Initial Screen";
export const INTERVIEW_TYPES: InterviewType[] = ["AI Initial Screen", "Technical Interview", "Cultural Fit", "Phone Screen", "Panel Interview", "Hiring Manager Interview"];

export interface InterviewAnalysis {
  transcript: string;
  summary: string;
  overallScore: number;
  questionScores: { question: string; score: number; reasoning: string }[];
  strengths: string[];
  weaknesses: string[];
}

export interface ScheduledInterview {
  id: string;
  candidateName: string;
  candidateEmail?: string;
  jobTitle: string;
  interviewers?: string[];
  interviewDateTime: string; // ISO string format
  interviewType: InterviewType;
  notes?: string;
  questions?: string[];
  cheatingDetections?: { type: string; timestamp: string }[];
  videoStoragePath?: string;
  analysis?: InterviewAnalysis; // <-- New field
  resumeDataUri?: string;
  jobDescriptionDataUri?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReEngagementCandidate {
  id: string;
  name: string;
  previousRole: string;
  lastContacted: string; 
  reasonNotHired: string;
  potentialFitFor: string[];
  contactedForNewRole?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type InterviewLinkType = "Video Call" | "Assessment" | "Feedback Form" | "Screening Test" | "AI Interview Link";
export const INTERVIEW_LINK_TYPES: InterviewLinkType[] = ["AI Interview Link", "Video Call", "Assessment", "Feedback Form", "Screening Test"];

export interface InterviewLink {
  id: string;
  jobTitle: string;
  candidateName?: string; 
  linkUrl: string;
  type: InterviewLinkType;
  expiresAt?: string; 
  createdAt: string; 
  updatedAt?: string;
}

export interface Client {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone?: string;
  logoUrl?: string;
  activeRequisitions: number;
  totalHires: number;
  createdAt?: string;
  updatedAt?: string;
}

export type UserRole = "Admin" | "Recruiter" | "Hiring Manager" | "Viewer";
export const USER_ROLES: UserRole[] = ["Admin", "Recruiter", "Hiring Manager", "Viewer"];

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  lastLogin: string; 
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ManagedListItem {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: { seconds: number, nanoseconds: number } | Date; 
  description: string;
  user?: string; 
  icon?: string; 
  relatedDocId?: string; 
  relatedDocPath?: string; 
}

export interface GeneralSystemSettings {
  id: string; 
  defaultTimezone: string;
  autoSaveDrafts: boolean;
  availableCountries: string[];
  updatedAt?: string; 
}

export interface NotificationSettings {
  id: string;
  newCandidateEmail: boolean;
  interviewReminderApp: boolean;
  dailySummaryEmail: boolean;
  updatedAt?: string;
}

export interface AppearanceSettings {
  id: string;
  organizationName: string;
  logoUrl?: string | undefined;
  primaryColor: string;
  updatedAt?: string;
}

export interface SecuritySettings {
  id: string;
  sessionTimeoutMinutes: number;
  updatedAt?: string;
}

export interface SupportTicketData {
    subject: string;
    issueDescription: string;
    attachmentName?: string;
    attachmentSize?: number;
    status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
    userId?: string; 
    userEmail?: string; 
    createdAt?: string; 
    updatedAt?: string; 
}

export type ProjectTaskStatus = 'To Do' | 'In Progress' | 'Completed';
export const PROJECT_TASK_STATUSES: ProjectTaskStatus[] = ['To Do', 'In Progress', 'Completed'];

export interface ProjectTask {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: ProjectTaskStatus;
  assigneeName?: string; 
  candidateId?: string;   
  candidateName?: string; 
  dueDate?: string; 
  createdAt: string; 
  updatedAt: string; 
}

// --- New types for Project Budget ---
export interface ProjectBudget {
  id: string;
  projectId: string;
  totalBudget: number;
  spentBudget: number;
  currency: string; // e.g., USD, EUR
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// --- New types for Resource Allocation ---
export interface ProjectResource {
  id: string;
  projectId: string;
  resourceName: string; // e.g., "John Doe" or "Senior Recruiter Role"
  role: string; // e.g., "Recruiter", "Sourcer", "Coordinator"
  allocatedHours: number;
  costPerHour: number;
  totalCost: number; // This will be calculated on save
  createdAt: string;
  updatedAt: string;
}
