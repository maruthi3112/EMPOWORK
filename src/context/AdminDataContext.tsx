import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { 
  db, 
  auth, 
  collection, 
  onSnapshot, 
  addDoc 
} from "../lib/firebase";
import { UserProfile, Job, Complaint, WagePayment, JobApplication, AttendanceRecord } from "../types";

interface AdminDataContextType {
  workers: UserProfile[];
  employers: UserProfile[];
  admins: UserProfile[];
  jobs: Job[];
  jobApplications: JobApplication[];
  attendanceRecords: AttendanceRecord[];
  wagePayments: WagePayment[];
  complaints: Complaint[];
  auditLogs: any[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  logAdminAction: (action: string, category: string, details: string) => Promise<void>;
}

const AdminDataContext = createContext<AdminDataContextType | undefined>(undefined);

export function AdminDataProvider({ children }: { children: React.ReactNode }) {
  const [workers, setWorkers] = useState<UserProfile[]>([]);
  const [employers, setEmployers] = useState<UserProfile[]>([]);
  const [admins, setAdmins] = useState<UserProfile[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobApplications, setJobApplications] = useState<JobApplication[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [wagePayments, setWagePayments] = useState<WagePayment[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Re-usable logAdminAction helper
  const logAdminAction = useCallback(async (action: string, category: string, details: string) => {
    try {
      const email = auth.currentUser?.email || "admin@empowork.com";
      const logDoc = {
        action,
        category,
        details,
        timestamp: new Date().toISOString(),
        adminEmail: email,
        ipAddress: "192.168.1.100"
      };
      await addDoc(collection(db, "audit_logs"), logDoc);
      console.log("Logged security audit log:", logDoc);
    } catch (err: any) {
      console.error("Error logging administrative event:", err);
    }
  }, []);

  // Set up listeners for all administrative collections in parallel
  const setupSync = useCallback(() => {
    setLoading(true);
    setError(null);

    // Track active subscriber count to know when we are done with initial load
    let activeSubscriptions = 7;
    const decrementActive = () => {
      activeSubscriptions--;
      if (activeSubscriptions <= 0) {
        setLoading(false);
      }
    };

    // 1. Users real-time feed
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      const workersList: UserProfile[] = [];
      const employersList: UserProfile[] = [];
      const adminsList: UserProfile[] = [];
      
      snap.forEach((doc) => {
        const u = { uid: doc.id, ...doc.data() } as UserProfile;
        if (u.role === "worker") {
          workersList.push(u);
        } else if (u.role === "employer") {
          employersList.push(u);
        } else if (u.role === "admin") {
          adminsList.push(u);
        }
      });
      
      setWorkers(workersList);
      setEmployers(employersList);
      setAdmins(adminsList);
      decrementActive();
    }, (err) => {
      console.error("Error syncing users registry:", err);
      setError("Failed to sync user registry.");
      decrementActive();
    });

    // 2. Jobs vacancies real-time feed
    const unsubJobs = onSnapshot(collection(db, "jobs"), (snap) => {
      const list: Job[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Job);
      });
      setJobs(list);
      decrementActive();
    }, (err) => {
      console.error("Error syncing jobs vacancies:", err);
      decrementActive();
    });

    // 3. Applications real-time feed
    const unsubApps = onSnapshot(collection(db, "job_applications"), (snap) => {
      const list: JobApplication[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as JobApplication);
      });
      setJobApplications(list);
      decrementActive();
    }, (err) => {
      console.error("Error syncing job applications:", err);
      decrementActive();
    });

    // 4. Attendance logs real-time feed
    const unsubAtt = onSnapshot(collection(db, "attendance"), (snap) => {
      const list: AttendanceRecord[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as AttendanceRecord);
      });
      setAttendanceRecords(list);
      decrementActive();
    }, (err) => {
      console.error("Error syncing shift attendance records:", err);
      decrementActive();
    });

    // 5. Escrow payments real-time feed
    const unsubPay = onSnapshot(collection(db, "wage_payments"), (snap) => {
      const list: WagePayment[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as WagePayment);
      });
      setWagePayments(list);
      decrementActive();
    }, (err) => {
      console.error("Error syncing wage escrow ledger:", err);
      decrementActive();
    });

    // 6. Disputes / Complaints real-time feed
    const unsubComplaints = onSnapshot(collection(db, "complaints"), (snap) => {
      const list: Complaint[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Complaint);
      });
      setComplaints(list);
      decrementActive();
    }, (err) => {
      console.error("Error syncing platform complaints & disputes:", err);
      decrementActive();
    });

    // 7. Security Audit Logs real-time feed
    const unsubAuditLogs = onSnapshot(collection(db, "audit_logs"), (snap) => {
      const list: any[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      // Sort logs by timestamp descending
      list.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
      setAuditLogs(list);
      decrementActive();
    }, (err) => {
      console.error("Error syncing security audit logs:", err);
      decrementActive();
    });

    return () => {
      unsubUsers();
      unsubJobs();
      unsubApps();
      unsubAtt();
      unsubPay();
      unsubComplaints();
      unsubAuditLogs();
    };
  }, []);

  useEffect(() => {
    const cleanup = setupSync();
    return cleanup;
  }, [setupSync]);

  const refetch = useCallback(() => {
    setupSync();
  }, [setupSync]);

  return (
    <AdminDataContext.Provider value={{
      workers,
      employers,
      admins,
      jobs,
      jobApplications,
      attendanceRecords,
      wagePayments,
      complaints,
      auditLogs,
      loading,
      error,
      refetch,
      logAdminAction
    }}>
      {children}
    </AdminDataContext.Provider>
  );
}

export function useAdminData() {
  const context = useContext(AdminDataContext);
  if (context === undefined) {
    throw new Error("useAdminData must be used within an AdminDataProvider");
  }
  return context;
}
