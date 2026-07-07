export type UserRole = 'worker' | 'employer' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  name: string;
  phone: string;
  location: string;
  createdAt: string;
  statusState?: 'available' | 'busy' | 'offline';
  
  // Worker-specific fields
  trade?: string; // e.g., Mason, Plumber, Carpenter, Electrician, Painter, General Worker
  experience?: string; // e.g., 2 years
  bio?: string;
  wageExpectation?: number; // per day in Rupees/local currency
  skills?: string[];
  avatarUrl?: string;
  workerType?: 'employee' | 'labour'; // classification as employee or daily worker
  averageRating?: number; // average feedback score (1-5 stars)
  ratingCount?: number; // total feedback reviews received
  notificationPrefEnabled?: boolean; // toggle real-time notifications for matching jobs
  notifyWagesPush?: boolean;
  notifyWagesSMS?: boolean;
  notifyWagesEmail?: boolean;
  preShiftReminderEnabled?: boolean;
  preShiftReminderTime?: string;
  preShiftReminderMethod?: string;
  shiftsCompleted?: number; // total shift attendance count
  
  // Employer-specific fields
  companyName?: string;
  businessType?: string;
  tradeCategory?: string; // category of trade
}

export interface Job {
  id: string;
  employerId: string;
  employerName: string;
  title: string;
  trade: string; // trade required
  description: string;
  location: string;
  wage: number; // per day
  startDate: string;
  endDate: string;
  slots: number;
  slotsTaken: number;
  status: 'open' | 'active' | 'completed' | 'cancelled';
  createdAt: string;
  latitude?: number;
  longitude?: number;
}

export interface JobApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  employerId: string;
  employerName: string;
  workerId: string;
  workerName: string;
  workerPhone: string;
  workerTrade: string;
  status: 'pending' | 'accepted' | 'rejected';
  appliedAt: string;
  note?: string;
}

export interface AttendanceRecord {
  id: string;
  jobId: string;
  jobTitle: string;
  workerId: string;
  workerName: string;
  employerId: string;
  date: string; // YYYY-MM-DD
  checkInTime: string; // ISO / hh:mm
  checkOutTime?: string;
  status: 'pending_approval' | 'approved' | 'rejected';
  hoursWorked?: number;
  wageEarned: number;
  notes?: string;
  checkInLatitude?: number;
  checkInLongitude?: number;
  checkInLocationName?: string;
  safetyCleared?: boolean;
  safetyGearConfirmed?: string[];
  qrVerified?: boolean;
  locationLogs?: Array<{ time: string; latitude: number; longitude: number; }>;
}

export interface WagePayment {
  id: string;
  jobId: string;
  jobTitle: string;
  workerId: string;
  workerName: string;
  employerId: string;
  employerName: string;
  amount: number;
  date: string;
  status: 'pending' | 'paid' | 'rejected';
  transactionId?: string;
  notes?: string;
}

export interface Complaint {
  id: string;
  jobId: string;
  jobTitle: string;
  workerId: string;
  workerName: string;
  employerId: string;
  employerName: string;
  raisedBy: 'worker' | 'employer';
  description: string;
  aiRecommendation?: string;
  status: 'open' | 'investigating' | 'resolved';
  adminNotes?: string;
  createdAt: string;
  comments?: Array<{ author: string; text: string; timestamp: string; role?: string; }>;
}

export interface LearningResource {
  id: string;
  title: string;
  trade: string;
  category: 'safety' | 'technical' | 'financial_literacy';
  type: 'video' | 'guide';
  link: string;
  description: string;
  duration?: string;
}

export interface SavingsGoal {
  id: string;
  workerId: string;
  title: string;
  targetAmount: number;
  currentSaved: number;
  allocatedPercentage: number; // e.g., percentage of earnings allocated
  createdAt: string;
  category?: 'tools' | 'health' | 'family' | 'education' | 'festival' | 'other';
}

export interface Review {
  id: string;
  workerId: string;
  workerName: string;
  employerId: string;
  employerName: string;
  jobId: string;
  jobTitle: string;
  rating: number; // 1 to 5 stars
  comment: string;
  createdAt: string;
}

export interface ContactRequest {
  id: string;
  jobId: string;
  jobTitle: string;
  workerId: string;
  workerName: string;
  workerPhone: string;
  employerId: string;
  employerName: string;
  type: "message" | "call_back";
  message?: string;
  status: "pending" | "responded";
  createdAt: string;
}


