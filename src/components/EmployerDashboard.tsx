import React, { useState, useEffect, useRef } from "react";
import { 
  PlusCircle, Users, Briefcase, Clock, CheckCircle2, XCircle, MapPin, Calendar, 
  Coins, FileText, AlertCircle, Sparkles, RefreshCw, Wifi, WifiOff, Star, HardHat,
  QrCode, X, MessageSquare, PhoneCall, Building, Compass, Sliders, Bell,
  Menu, ChevronLeft, LogOut, Search, User, ShieldAlert, Sparkle, LayoutDashboard,
  Globe, ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db, collection, getDocs, getDoc, query, where, addDoc, updateDoc, doc, setDoc, onSnapshot } from "../lib/firebase";
import { UserProfile, Job, JobApplication, AttendanceRecord, WagePayment, Complaint, Review, ContactRequest } from "../types";
import { useToast } from "../context/ToastContext";
import { useLanguage } from "../context/LanguageContext";
import QRCode from "qrcode";

// Import modularized components
import EmployerOverview from "./employer/EmployerOverview";
import EmployerJobs from "./employer/EmployerJobs";
import EmployerWorkers from "./employer/EmployerWorkers";
import EmployerAttendance from "./employer/EmployerAttendance";
import EmployerWages from "./employer/EmployerWages";
import EmployerMessages from "./employer/EmployerMessages";
import EmployerComplaints from "./employer/EmployerComplaints";
import EmployerSettings from "./employer/EmployerSettings";
import EmployerQuickActions from "./employer/EmployerQuickActions";
import EmployerActivityStream from "./employer/EmployerActivityStream";
import { ReplayTourButton } from "./OnboardingTour";

interface EmployerDashboardProps {
  user: UserProfile;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOffline?: boolean;
  isSimulatedOffline?: boolean;
  onToggleOfflineSimulation?: () => void;
  onLogout?: () => void;
}

export default function EmployerDashboard({ 
  user, 
  activeTab, 
  setActiveTab, 
  isOffline = false,
  isSimulatedOffline = false,
  onToggleOfflineSimulation,
  onLogout 
}: EmployerDashboardProps) {
  
  const { showToast } = useToast();
  const { t, language, setLanguage } = useLanguage();


  // Normalize activeTab from App.tsx/Navbar.tsx keys to EmployerDashboard keys
  const normalizedActiveTab = 
    activeTab === "employer-jobs" || activeTab === "post-job" || activeTab === "manage-jobs" ? "manage-jobs" : 
    activeTab === "employer-workers" || activeTab === "hire-workers" || activeTab === "directory" || activeTab === "applications" ? "applications" : 
    activeTab === "employer-disputes" || activeTab === "complaints" ? "complaints" : 
    activeTab === "employer-reports" || activeTab === "reports" || activeTab === "notifications" ? "reports" :
    activeTab === "employer-attendance" || activeTab === "attendance" ? "attendance" :
    activeTab === "employer-wages" || activeTab === "wages" ? "wages" :
    activeTab === "employer-messages" || activeTab === "messages" ? "messages" :
    activeTab === "employer-settings" || activeTab === "settings" ? "settings" :
    activeTab === "company-profile" ? "company-profile" :
    activeTab === "employer-dashboard" || activeTab === "dashboard" ? "dashboard" :
    activeTab;



  // Sidebar State
  const [searchWorkerQuery, setSearchWorkerQuery] = useState("");
  const [autoPayWageId, setAutoPayWageId] = useState<string | null>(null);

  // DB States
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [applicants, setApplicants] = useState<JobApplication[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>([]);
  const [wagePayments, setWagePayments] = useState<WagePayment[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});

  // Batch Settlement States
  const [showBatchSettleModal, setShowBatchSettleModal] = useState(false);
  const [isBatchSettling, setIsBatchSettling] = useState(false);

  // Calculate Overdue Wages based on logged site attendance
  const overdueWages = React.useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    return attendanceLogs.filter(att => {
      if (!att.checkOutTime) return false;
      if (att.status === "rejected") return false;
      if (att.date >= todayStr) return false;
      const isPaid = wagePayments.some(p => 
        p.status === "paid" && 
        (p.id === `wage-${att.id}` || (p.workerId === att.workerId && p.jobId === att.jobId && p.amount === att.wageEarned))
      );
      return !isPaid;
    });
  }, [attendanceLogs, wagePayments]);
  
  // QR Code States
  const [qrJob, setQrJob] = useState<Job | null>(null);
  const [qrUrl, setQrUrl] = useState("");

  // AI Chat Assistant State
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiTyping, setAiTyping] = useState(false);
  const [aiMessages, setAiMessages] = useState<Array<{ sender: "user" | "ai"; text: string }>>([
    { sender: "ai", text: "Hello! I am your EmpoWork AI Site Companion. Ask me to draft a job posting, outline site safety guidelines, or estimate pro-rated daily wages." }
  ]);



  // Firestore Snapshots Setup
  useEffect(() => {
    // 1. Fetch & Listen Jobs
    const qJobs = query(collection(db, "jobs"), where("employerId", "==", user.uid));
    const unsubJobs = onSnapshot(qJobs, (snap) => {
      const list: Job[] = [];
      snap.forEach(d => list.push({ id: d.id, ...(d.data() as any) } as Job));
      setMyJobs(list);
    }, err => console.error("Error reading jobs:", err));

    // 2. Fetch & Listen Applications
    const qApps = query(collection(db, "job_applications"), where("employerId", "==", user.uid));
    const unsubApps = onSnapshot(qApps, (snap) => {
      const list: JobApplication[] = [];
      snap.forEach(d => list.push({ id: d.id, ...(d.data() as any) } as JobApplication));
      setApplicants(list);
    }, err => console.error("Error reading apps:", err));

    // 3. Fetch & Listen Attendance
    const unsubAtt = onSnapshot(collection(db, "attendance"), (snap) => {
      const list: AttendanceRecord[] = [];
      snap.forEach(d => {
        const att = { id: d.id, ...(d.data() as any) } as AttendanceRecord;
        if (att.employerId === user.uid) {
          list.push(att);
        }
      });
      setAttendanceLogs(list);
    }, err => console.error("Error reading attendance:", err));

    // 4. Fetch & Listen Wages
    const unsubWages = onSnapshot(collection(db, "wage_payments"), (snap) => {
      const list: WagePayment[] = [];
      snap.forEach(d => {
        const pay = { id: d.id, ...(d.data() as any) } as WagePayment;
        if (pay.employerId === user.uid) {
          list.push(pay);
        }
      });
      setWagePayments(list);
    }, err => console.error("Error reading wages:", err));

    // 5. Fetch & Listen Disputes/Complaints
    const unsubComplaints = onSnapshot(collection(db, "complaints"), (snap) => {
      const list: Complaint[] = [];
      snap.forEach(d => {
        const comp = { id: d.id, ...(d.data() as any) } as Complaint;
        if (comp.employerId === user.uid) {
          list.push(comp);
        }
      });
      setComplaints(list);
    }, err => console.error("Error reading complaints:", err));

    // 6. Fetch & Listen Registered User Profiles
    const unsubProfiles = onSnapshot(collection(db, "users"), (snap) => {
      const map: Record<string, UserProfile> = {};
      snap.forEach(d => {
        map[d.id] = { uid: d.id, ...(d.data() as any) } as UserProfile;
      });
      setUserProfiles(map);
    }, err => console.error("Error reading profiles:", err));

    return () => {
      unsubJobs();
      unsubApps();
      unsubAtt();
      unsubWages();
      unsubComplaints();
      unsubProfiles();
    };
  }, [user.uid]);

  // QR Generator
  useEffect(() => {
    if (qrJob) {
      QRCode.toDataURL(`EMPOWORK_QR_CHECKIN:${qrJob.id}`, {
        width: 300,
        margin: 1,
        color: { dark: "#090d16", light: "#ffffff" }
      })
      .then(url => setQrUrl(url))
      .catch(err => console.error("Error generating QR:", err));
    } else {
      setQrUrl("");
    }
  }, [qrJob]);

  // Firestore DB Actions
  const handleCreateJob = async (jobPayload: Partial<Job>) => {
    try {
      const jobRef = doc(collection(db, "jobs"));
      const newJob = {
        ...jobPayload,
        id: jobRef.id,
        employerId: user.uid,
        employerName: user.companyName || user.name,
        createdAt: new Date().toISOString().split("T")[0],
        status: "open",
        slotsFilled: 0,
        applicantsCount: 0
      };
      await setDoc(jobRef, newJob);
      showToast("Job Post Published Successfully!", "success");
    } catch (err: any) {
      showToast(`Failed to publish: ${err.message}`, "error");
    }
  };

  const handleUpdateJob = async (jobId: string, updatedFields: Partial<Job>) => {
    try {
      await updateDoc(doc(db, "jobs", jobId), updatedFields);
      showToast("Job Listing Updated Successfully!", "success");
    } catch (err: any) {
      showToast(`Update failed: ${err.message}`, "error");
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      await updateDoc(doc(db, "jobs", jobId), { status: "cancelled" });
      showToast("Job Listing Suspended/Cancelled.", "info");
    } catch (err: any) {
      showToast(`Failed: ${err.message}`, "error");
    }
  };

  // Applications Review
  const handleApproveApplication = async (app: JobApplication) => {
    try {
      // 1. Update applicant status to "hired"
      await updateDoc(doc(db, "job_applications", app.id), { status: "hired" });
      
      // 2. Update job slots count
      const jobRef = doc(db, "jobs", app.jobId);
      const jobData = myJobs.find(j => j.id === app.jobId);
      if (jobData) {
        await updateDoc(jobRef, {
          slotsFilled: Math.min(jobData.slots, (jobData.slotsFilled || 0) + 1)
        });
      }

      showToast(`Hired ${app.workerName} successfully! Direct work guidelines sent.`, "success");
    } catch (err: any) {
      showToast(`Hiring approval failed: ${err.message}`, "error");
    }
  };

  const handleRejectApplication = async (app: JobApplication) => {
    try {
      await updateDoc(doc(db, "job_applications", app.id), { status: "rejected" });
      showToast(`Application declined.`, "info");
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleInviteWorker = async (workerId: string, jobId: string) => {
    try {
      const worker = userProfiles[workerId];
      const job = myJobs.find(j => j.id === jobId);
      if (!worker || !job) return;

      const invitationId = `invite-${workerId}-${Date.now()}`;
      await setDoc(doc(db, "job_applications", invitationId), {
        id: invitationId,
        jobId,
        jobTitle: job.title,
        workerId,
        workerName: worker.name,
        employerId: user.uid,
        employerName: user.companyName || user.name,
        status: "invited",
        appliedAt: new Date().toISOString().split("T")[0]
      });
      showToast(`Direct contract invitation dispatched to ${worker.name}.`, "success");
    } catch (err: any) {
      showToast(`Failed: ${err.message}`, "error");
    }
  };

  // Attendance Review & Auto Wage Generation
  const handleApproveAttendance = async (log: AttendanceRecord) => {
    try {
      // 1. Approve log
      await updateDoc(doc(db, "attendance", log.id), { status: "approved" });

      // 2. Automatically write corresponding pending WagePayment doc to queue disbursal
      const wageId = `wage-${log.id}`;
      await setDoc(doc(db, "wage_payments", wageId), {
        id: wageId,
        workerId: log.workerId,
        workerName: log.workerName,
        employerId: user.uid,
        employerName: user.companyName || user.name,
        jobId: log.jobId,
        jobTitle: log.jobTitle,
        amount: log.wageEarned,
        date: new Date().toISOString().split("T")[0],
        status: "pending",
        transactionId: ""
      });

      // 3. Queue the approved wage for automatic processing
      setAutoPayWageId(wageId);

      // 4. Redirect to Wages & Payments panel immediately
      setActiveTab("employer-wages");

      showToast(`Shift Approved! Redirecting to secure portal to disburse ₹${log.wageEarned} to ${log.workerName}...`, "success");
    } catch (err: any) {
      showToast(`Attendance approval failed: ${err.message}`, "error");
    }
  };

  const handleRejectAttendance = async (log: AttendanceRecord) => {
    try {
      await updateDoc(doc(db, "attendance", log.id), { status: "rejected" });
      showToast(`Attendance shift rejected/disputed.`, "info");
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleLogManualAttendance = async (payload: Partial<AttendanceRecord>) => {
    try {
      const ref = doc(collection(db, "attendance"));
      const attendanceId = ref.id;
      await setDoc(ref, {
        ...payload,
        id: attendanceId,
        createdAt: new Date().toISOString()
      });

      if (payload.checkOutTime) {
        // Automatically write corresponding pending WagePayment doc to queue disbursal
        const wageId = `wage-${attendanceId}`;
        await setDoc(doc(db, "wage_payments", wageId), {
          id: wageId,
          workerId: payload.workerId,
          workerName: payload.workerName,
          employerId: user.uid,
          employerName: user.companyName || user.name,
          jobId: payload.jobId,
          jobTitle: payload.jobTitle,
          amount: payload.wageEarned,
          date: new Date().toISOString().split("T")[0],
          status: "pending",
          transactionId: ""
        });

        // Queue approved wage for automatic processing
        setAutoPayWageId(wageId);

        // Redirect to Wages & Payments panel immediately
        setActiveTab("employer-wages");

        showToast(`Manual foreman clock-in authorized! Redirecting to disburse ₹${payload.wageEarned} to ${payload.workerName}...`, "success");
      } else {
        showToast(`Worker check-in recorded successfully!`, "success");
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`, "error");
    }
  };

  // Wages process
  const handleProcessPayment = async (pay: WagePayment) => {
    try {
      const txHash = `TXN-${Math.floor(100000 + Math.random() * 900000)}B`;
      
      // 1. Update the wage payment record in Firestore
      await updateDoc(doc(db, "wage_payments", pay.id), {
        status: "paid",
        transactionId: txHash,
        paidAt: new Date().toISOString()
      });

      // 2. Update the worker's user profile (shiftsCompleted, walletBalance, totalEarned)
      const workerRef = doc(db, "users", pay.workerId);
      const workerSnap = await getDoc(workerRef);
      if (workerSnap.exists()) {
        const workerData = workerSnap.data() as any;
        await updateDoc(workerRef, {
          shiftsCompleted: (workerData.shiftsCompleted || 0) + 1,
          totalEarned: (workerData.totalEarned || 0) + pay.amount,
          walletBalance: (workerData.walletBalance || 0) + pay.amount
        });
      }

      // 3. Update the worker's active savings goals by applying their allocated percentages
      const sgQuery = query(collection(db, "savings_goals"), where("workerId", "==", pay.workerId));
      const sgSnap = await getDocs(sgQuery);
      
      if (!sgSnap.empty) {
        for (const docItem of sgSnap.docs) {
          const goal = docItem.data() as any;
          const allocPercent = goal.allocatedPercentage || 0;
          if (allocPercent > 0) {
            const allocatedAmount = Math.round(pay.amount * (allocPercent / 100));
            if (allocatedAmount > 0) {
              const currentSaved = goal.currentSaved || 0;
              const targetAmount = goal.targetAmount || 10000;
              await updateDoc(doc(db, "savings_goals", docItem.id), {
                currentSaved: Math.min(targetAmount, currentSaved + allocatedAmount)
              });
            }
          }
        }
      }

      // 4. Log the transaction record accurately in audit_logs before generating a success notification
      const logDoc = {
        action: "Wage Disbursal",
        category: "PAYROLL",
        details: `Successfully disbursed daily wages of ₹${pay.amount} INR to worker ${pay.workerName} (ID: ${pay.workerId}) for job '${pay.jobTitle}' (Job ID: ${pay.jobId}). Transaction Hash ID: ${txHash}.`,
        timestamp: new Date().toISOString(),
        adminEmail: user?.email || "employer@empowork.com",
        ipAddress: "192.168.1.100"
      };
      await addDoc(collection(db, "audit_logs"), logDoc);

      // 5. Create a real-time notification in Firestore for the worker
      const newNotification = {
        id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        workerId: pay.workerId,
        employerId: user.uid,
        title: "💰 Wage Disbursed",
        message: `Your daily wage of ₹${pay.amount} for the shift on '${pay.jobTitle}' has been successfully processed and disbursed.`,
        type: "wage_disbursed",
        read: false,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, "notifications", newNotification.id), newNotification);

      showToast(`Wages successfully transferred! TXN Hash: ${txHash}`, "success");
      return txHash;
    } catch (err: any) {
      showToast(`Payment failed: ${err.message}`, "error");
      throw err;
    }
  };

  const handleRejectPayment = async (pay: WagePayment) => {
    try {
      await updateDoc(doc(db, "wage_payments", pay.id), { status: "rejected" });
      showToast(`Disbursal cancelled/rejected.`, "info");
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleBatchSettleOverdueWages = async () => {
    setIsBatchSettling(true);
    try {
      let settledCount = 0;
      let totalSettledAmount = 0;
      
      for (const att of overdueWages) {
        // 1. Approve attendance log
        if (att.status !== "approved") {
          await updateDoc(doc(db, "attendance", att.id), { status: "approved" });
        }

        // 2. Write or update corresponding pending/paid WagePayment doc
        const wageId = `wage-${att.id}`;
        const txHash = `TXN-${Math.floor(100000 + Math.random() * 900000)}B`;
        await setDoc(doc(db, "wage_payments", wageId), {
          id: wageId,
          workerId: att.workerId,
          workerName: att.workerName,
          employerId: user.uid,
          employerName: user.companyName || user.name,
          jobId: att.jobId,
          jobTitle: att.jobTitle,
          amount: att.wageEarned,
          date: new Date().toISOString().split("T")[0],
          status: "paid",
          transactionId: txHash,
          paidAt: new Date().toISOString()
        });

        // 3. Update the worker's user profile (shiftsCompleted, walletBalance, totalEarned)
        const workerRef = doc(db, "users", att.workerId);
        const workerSnap = await getDoc(workerRef);
        if (workerSnap.exists()) {
          const workerData = workerSnap.data() as any;
          await updateDoc(workerRef, {
            shiftsCompleted: (workerData.shiftsCompleted || 0) + 1,
            totalEarned: (workerData.totalEarned || 0) + att.wageEarned,
            walletBalance: (workerData.walletBalance || 0) + att.wageEarned
          });
        }

        // 4. Update worker's active savings goals by applying allocated percentage
        const sgQuery = query(collection(db, "savings_goals"), where("workerId", "==", att.workerId));
        const sgSnap = await getDocs(sgQuery);
        
        if (!sgSnap.empty) {
          for (const docItem of sgSnap.docs) {
            const goal = docItem.data() as any;
            const allocPercent = goal.allocatedPercentage || 0;
            if (allocPercent > 0) {
              const allocatedAmount = Math.round(att.wageEarned * (allocPercent / 100));
              if (allocatedAmount > 0) {
                const currentSaved = goal.currentSaved || 0;
                const targetAmount = goal.targetAmount || 10000;
                await updateDoc(doc(db, "savings_goals", docItem.id), {
                  currentSaved: Math.min(targetAmount, currentSaved + allocatedAmount)
                });
              }
            }
          }
        }

        // 5. Log the transaction in audit logs
        const logDoc = {
          action: "Batch Wage Disbursal",
          category: "PAYROLL",
          details: `Successfully batch disbursed daily wages of ₹${att.wageEarned} INR to worker ${att.workerName} (ID: ${att.workerId}) for job '${att.jobTitle}' (Job ID: ${att.jobId}). Transaction Hash ID: ${txHash}.`,
          timestamp: new Date().toISOString(),
          adminEmail: user?.email || "employer@empowork.com",
          ipAddress: "192.168.1.100"
        };
        await addDoc(collection(db, "audit_logs"), logDoc);

        settledCount++;
        totalSettledAmount += att.wageEarned;
      }

      showToast(`Success! Fully settled and cleared ${settledCount} outstanding worker wages (Total: ₹${totalSettledAmount} INR).`, "success");
      setShowBatchSettleModal(false);
    } catch (err: any) {
      showToast(`Batch payment failed: ${err.message}`, "error");
    } finally {
      setIsBatchSettling(false);
    }
  };

  // Disputes & complaints
  const handleRaiseComplaint = async (payload: Partial<Complaint>) => {
    try {
      const ref = doc(collection(db, "complaints"));
      await setDoc(ref, {
        ...payload,
        id: ref.id
      });
      showToast("Dispute registered into neutral arbitration queue.", "success");
    } catch (err: any) {
      showToast(`Filing error: ${err.message}`, "error");
    }
  };

  const handleResolveComplaint = async (complaintId: string, notes?: string) => {
    try {
      const updatePayload: any = { status: "resolved" };
      if (notes) {
        updatePayload.resolutionNotes = notes;
        updatePayload.resolvedAt = new Date().toISOString();
      }
      await updateDoc(doc(db, "complaints", complaintId), updatePayload);
      showToast("Complaint resolved & locked successfully.", "success");
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleAddComplaintComment = async (complaintId: string, author: string, text: string, role?: string) => {
    try {
      const cRef = doc(db, "complaints", complaintId);
      const found = complaints.find(c => c.id === complaintId);
      if (found) {
        const comments = [
          ...(found.comments || []),
          { 
            author, 
            text, 
            timestamp: new Date().toISOString(), 
            role: role || "employer" 
          }
        ];
        await updateDoc(cRef, { comments });
        showToast("Arbitration statement recorded.", "success");
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  // Profile Update
  const handleUpdateProfile = async (fields: Partial<UserProfile>) => {
    try {
      await updateDoc(doc(db, "users", user.uid), fields);
      showToast("Corporate profile credentials saved.", "success");
    } catch (err: any) {
      showToast(`Save error: ${err.message}`, "error");
    }
  };

  const handleAcceptAndDeclineOthers = async (app: JobApplication) => {
    try {
      await handleApproveApplication(app);
      const otherApps = applicants.filter(a => a.workerId === app.workerId && a.id !== app.id && a.status === "pending");
      for (const otherApp of otherApps) {
        await updateDoc(doc(db, "job_applications", otherApp.id), { status: "rejected" });
      }
    } catch (err: any) {
      showToast(`Accepting failed: ${err.message}`, "error");
    }
  };

  const handleDeclineAllFromWorker = async (workerId: string, workerName: string) => {
    try {
      const workerApps = applicants.filter(a => a.workerId === workerId && a.status === "pending");
      for (const app of workerApps) {
        await updateDoc(doc(db, "job_applications", app.id), { status: "rejected" });
      }
      showToast(`Declined all applications from ${workerName}`, "info");
    } catch (err: any) {
      showToast(`Decline failed: ${err.message}`, "error");
    }
  };

  // AI Assistant Chat Handler
  const handleSendAiMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim()) return;

    const userText = aiInput.trim();
    const msgs = [...aiMessages, { sender: "user" as const, text: userText }];
    setAiMessages(msgs);
    setAiInput("");
    setAiTyping(true);

    setTimeout(() => {
      setAiTyping(false);
      let reply = "I am analyzing your site requirements. Let me draft a customized labor plan for you.";
      
      const lower = userText.toLowerCase();
      if (lower.includes("post") || lower.includes("job") || lower.includes("draft")) {
        reply = `Draft Site Job Post:\n- Title: Experienced Mason Needed\n- Wage: ₹900/day\n- Requirements: Steel-toed boots, 3+ years experience, helmet clearance.`;
      } else if (lower.includes("safety") || lower.includes("hazard") || lower.includes("ppe")) {
        reply = `EmpoWork Site Safety Protocols:\n1. Safety Helmet (Yellow color code) mandatory.\n2. Fall protection harnesses active above 2 meters.\n3. Daily biometric foreman sign-offs.`;
      } else if (lower.includes("wage") || lower.includes("rate") || lower.includes("calculate")) {
        reply = `Standard EmpoWork Wage Estimate:\n- Base rate pro-rated: ₹800 per 8 hours.\n- Under 4 hours: Half daily rate (₹400).\n- Auto direct UPI credit triggered on supervisor approval.`;
      }
      
      setAiMessages([...msgs, { sender: "ai", text: reply }]);
    }, 1200);
  };

  return (
    <div className="w-full bg-slate-50 relative font-sans select-none text-slate-800 min-h-screen">
      
      {/* Dynamic Panel Views Canvas */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full relative">
          
          {/* GLOBAL OVERDUE WAGE ALERT NOTIFICATION BANNER */}
          {overdueWages.length > 0 && normalizedActiveTab !== "wages" && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex items-start space-x-3 text-left">
                <div className="p-2 bg-red-100 text-red-600 rounded-xl mt-0.5 shrink-0 animate-pulse">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase text-red-950 tracking-wider font-mono">
                    Urgent Compliance Alert: Worker Wage Settlement Overdue
                  </h4>
                  <p className="text-xs text-red-800 font-semibold mt-0.5">
                    There are <span className="font-bold underline">{overdueWages.length} daily worker shift(s)</span> with outstanding wages awaiting same-day disbursal clearance.
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {overdueWages.slice(0, 3).map((w, idx) => (
                      <span key={`overdue-banner-${w.id || idx}-${idx}`} className="px-2.5 py-0.5 bg-white border border-red-200 text-[10px] font-bold text-red-900 rounded-md">
                        {w.workerName} (₹{w.wageEarned}) - {w.date}
                      </span>
                    ))}
                    {overdueWages.length > 3 && (
                      <span className="px-2.5 py-0.5 bg-white border border-red-200 text-[10px] font-bold text-red-900 rounded-md">
                        +{overdueWages.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowBatchSettleModal(true);
                }}
                className="px-4.5 py-2 bg-slate-950 hover:bg-slate-850 text-amber-500 font-black text-xs uppercase rounded-xl tracking-wider cursor-pointer border border-slate-950 hover:scale-103 active:scale-97 transition-all flex items-center justify-center gap-1.5 shadow-md font-mono shrink-0"
              >
                Settle Wages Now <Coins className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* RENDER CURRENT PANEL VIEW */}

          {normalizedActiveTab === "dashboard" && (
            <EmployerOverview
              user={user}
              jobs={myJobs}
              applications={applicants}
              attendance={attendanceLogs}
              payments={wagePayments}
              complaints={complaints}
              companyRating={4.8}
              onNavigateTab={setActiveTab}
            />
          )}

          {normalizedActiveTab === "company-profile" && (
            <EmployerSettings
              user={user}
              subView="profile"
              onUpdateProfile={handleUpdateProfile}
            />
          )}

          {normalizedActiveTab === "manage-jobs" && (
            <EmployerJobs
              jobs={myJobs}
              applications={applicants}
              onPostJob={handleCreateJob}
              onEditJob={handleUpdateJob}
              onDeleteJob={handleDeleteJob}
            />
          )}

          {normalizedActiveTab === "applications" && (
            <EmployerWorkers
              user={user}
              jobs={myJobs}
              applications={applicants}
              userProfiles={userProfiles}
              onAcceptApplication={handleApproveApplication}
              onRejectApplication={handleRejectApplication}
              onDeclineAllFromWorker={handleDeclineAllFromWorker}
              onAcceptAndDeclineOthers={handleAcceptAndDeclineOthers}
              onInviteWorker={handleInviteWorker}
              initialSubTab="applications"
            />
          )}

          {normalizedActiveTab === "attendance" && (
            <EmployerAttendance
              jobs={myJobs}
              attendanceLogs={attendanceLogs}
              userProfiles={userProfiles}
              onApproveAttendance={handleApproveAttendance}
              onRejectAttendance={handleRejectAttendance}
              onLogManualAttendance={handleLogManualAttendance}
              onShowQR={(job) => setQrJob(job)}
            />
          )}

          {normalizedActiveTab === "wages" && (
            <EmployerWages
              wagePayments={wagePayments}
              onProcessPayment={handleProcessPayment}
              onRejectPayment={handleRejectPayment}
              autoPayWageId={autoPayWageId}
              clearAutoPayWageId={() => setAutoPayWageId(null)}
            />
          )}

          {normalizedActiveTab === "messages" && (
            <EmployerMessages
              user={user}
              userProfiles={userProfiles}
            />
          )}

          {normalizedActiveTab === "reports" && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 w-full space-y-6 text-left animate-in fade-in duration-300">
              
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Sliders className="w-5 h-5 text-amber-500" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-950">
                      Activity, Reports & Analytics Portal
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                    A unified console to monitor real-time site check-ins, download payroll summaries, and audit laborer statistics.
                  </p>
                </div>
                
                {/* Actions: Export & Quick Operations */}
                <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
                  <EmployerQuickActions
                    jobs={myJobs}
                    wagePayments={wagePayments}
                    onPostJob={handleCreateJob}
                    onProcessPayment={handleProcessPayment}
                    showToast={showToast}
                  />

                  <button
                    onClick={() => {
                      const headers = ["Worker ID", "Amount", "Status", "Date"];
                      const rows = wagePayments.map(p => [
                        p.workerId?.slice(0, 8) || "N/A",
                        `INR ${p.amount || 0}`,
                        p.status || "Pending",
                        p.timestamp ? p.timestamp.split("T")[0] : "N/A"
                      ]);
                      const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
                      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.setAttribute("href", url);
                      link.setAttribute("download", `EmpoWork_Payroll_Report_${new Date().toISOString().split("T")[0]}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      showToast("Successfully generated and downloaded payroll CSV!", "success");
                    }}
                    className="px-4 py-2 bg-slate-950 hover:bg-slate-850 text-amber-500 hover:text-amber-400 font-bold text-xs uppercase rounded-xl tracking-wider cursor-pointer border border-slate-800 transition-all flex items-center justify-center gap-1.5 shadow-xs font-mono"
                  >
                    <FileText className="w-4 h-4" /> Export Payroll CSV
                  </button>
                </div>
              </div>

              {/* Analytics Summary Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 space-y-1 hover:border-slate-300 transition-all">
                  <span className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider block">Labor Retention Rate</span>
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-2xl font-black text-slate-950 font-mono">92.4%</p>
                    <span className="text-[10px] text-emerald-600 font-bold font-mono">+1.2%</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-semibold">Percentage of repeat hires on site.</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 space-y-1 hover:border-slate-300 transition-all">
                  <span className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider block">Cumulative Payroll</span>
                  <p className="text-2xl font-black text-emerald-600 font-mono">
                    ₹{wagePayments.filter(p => p.status === "paid").reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold">Aggregate disbursed wages queue.</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 space-y-1 hover:border-slate-300 transition-all">
                  <span className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider block">Total Checked Shifts</span>
                  <p className="text-2xl font-black text-slate-950 font-mono">{attendanceLogs.length}</p>
                  <p className="text-[10px] text-slate-500 font-semibold">Total supervisor-approved ledgers.</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 space-y-1 hover:border-slate-300 transition-all">
                  <span className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider block">Active Jobs Listed</span>
                  <p className="text-2xl font-black text-slate-950 font-mono">{myJobs.length}</p>
                  <p className="text-[10px] text-slate-500 font-semibold">Total active vacancies posted.</p>
                </div>
              </div>

              {/* Two Column Layout: Bulletins & Actionable Insights */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                
                {/* Bulletins & Status Updates Scrollable Stream */}
                <EmployerActivityStream
                  attendanceLogs={attendanceLogs}
                  applicants={applicants}
                  wagePayments={wagePayments}
                  complaints={complaints}
                  showToast={showToast}
                />

                {/* Interactive Analytical Insights */}
                <div className="space-y-3.5 text-left">
                  <div className="flex items-center space-x-1.5">
                    <Sparkles className="w-4.5 h-4.5 text-amber-500 animate-pulse" />
                    <h4 className="text-xs font-black uppercase text-slate-950 tracking-wider font-mono">
                      Supervisor AI Insight Center
                    </h4>
                  </div>
                  
                  <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 space-y-3.5">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono font-black text-amber-400 uppercase tracking-widest block">
                        Site Recommendations
                      </span>
                      <p className="text-xs font-bold text-slate-200">
                        Crew performance indices are 4.8% higher than average block masonry benchmarks.
                      </p>
                    </div>
                    
                    <div className="space-y-2 text-[11px] text-slate-400 leading-relaxed font-medium">
                      <p>
                        • <strong className="text-slate-200">Daily Safety Metric:</strong> 100% of attendance sign-ins compiled biometric geofence matching rules.
                      </p>
                      <p>
                        • <strong className="text-slate-200">Payout Integrity:</strong> Escrows released within average of 4.2 hours of supervisor checklist validation.
                      </p>
                      <p>
                        • <strong className="text-slate-200">Optimized Postings:</strong> Masons and concrete mixers receive applications 3x faster when offering direct site helmet allocations.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                      <span className="text-[9px] font-mono text-slate-500 uppercase">Status: Operating Optimum</span>
                      <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase animate-pulse">● System Sync</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {normalizedActiveTab === "complaints" && (
            <EmployerComplaints
              user={user}
              jobs={myJobs}
              complaints={complaints}
              userProfiles={userProfiles}
              attendanceLogs={attendanceLogs}
              wagePayments={wagePayments}
              onRaiseComplaint={handleRaiseComplaint}
              onResolveComplaint={handleResolveComplaint}
              onAddComplaintComment={handleAddComplaintComment}
            />
          )}

          {normalizedActiveTab === "settings" && (
            <EmployerSettings
              user={user}
              subView="settings"
              onUpdateProfile={handleUpdateProfile}
            />
          )}

      </div>

      {/* UNIQUE SITE ENTRANCE QR CODE DIALOG MODAL */}
      {qrJob && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl overflow-hidden border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setQrJob(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-850 p-1 hover:bg-slate-100 rounded-full cursor-pointer"
            >
              ✕
            </button>

            <div className="space-y-1 mb-5">
              <span className="text-[9px] font-mono font-black text-amber-600 uppercase tracking-widest block">Contract Attendance Target</span>
              <h4 className="font-black text-slate-950 uppercase text-xs leading-tight">{qrJob.title}</h4>
              <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">Display this physical QR code at the entrance of your construction site.</p>
            </div>

            {qrUrl ? (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 flex justify-center inline-block mx-auto mb-4">
                <img
                  src={qrUrl}
                  alt="Site QR"
                  referrerPolicy="no-referrer"
                  className="w-48 h-48 rounded-lg"
                />
              </div>
            ) : (
              <div className="w-48 h-48 rounded-2xl bg-slate-100 animate-pulse mx-auto mb-4" />
            )}

            <div className="bg-slate-900 text-slate-100 p-3 rounded-xl border border-slate-800 text-[10px] font-mono text-left space-y-0.5 mb-4 leading-normal">
              <span className="text-amber-400 font-black uppercase text-[8.5px] block tracking-wider">Site Access Rules:</span>
              <p>• Geofenced limits: GPS match tolerance of 100 meters required.</p>
              <p>• Biometric safety compliance must match checked state.</p>
            </div>

            <button
              onClick={() => {
                const link = document.createElement("a");
                link.href = qrUrl;
                link.download = `Site_CheckIn_QR_${qrJob.title.replace(/\s+/g, "_")}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="w-full py-2 bg-slate-950 hover:bg-slate-850 text-amber-500 font-black text-xs uppercase rounded-xl tracking-wider cursor-pointer border border-slate-800 shadow-md"
            >
              Print Entrance Banner PNG
            </button>
          </div>
        </div>
      )}

      {/* INSTANT BATCH WAGE SETTLEMENT DIALOG MODAL */}
      {showBatchSettleModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-left shadow-2xl overflow-hidden border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <button
              onClick={() => setShowBatchSettleModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-850 p-1 hover:bg-slate-100 rounded-full cursor-pointer font-bold w-6 h-6 flex items-center justify-center transition-colors"
            >
              ✕
            </button>

            <div className="space-y-1 mb-4">
              <span className="text-[9px] font-mono font-black text-rose-600 uppercase tracking-widest block">Instant Compliance Gateway</span>
              <h4 className="font-black text-slate-950 uppercase text-sm leading-tight">Secure Batch Wage Settlement</h4>
              <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                Approve and disburse wages instantly for all {overdueWages.length} overdue daily laborer shifts.
              </p>
            </div>

            {/* Scrollable list of overdue shifts */}
            <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 space-y-2 overflow-y-auto flex-1 mb-4 max-h-[240px]">
              {overdueWages.map((w, idx) => (
                <div key={`modal-overdue-${w.id || idx}-${idx}`} className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-100 text-xs shadow-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">{w.workerName}</span>
                    <span className="text-[9px] text-slate-400 font-mono font-bold uppercase">{w.jobTitle} • {w.date}</span>
                  </div>
                  <span className="font-black text-slate-950 font-mono">₹{w.wageEarned}</span>
                </div>
              ))}
            </div>

            {/* Total Section */}
            <div className="bg-slate-950 text-slate-100 p-4 rounded-xl border border-slate-800 space-y-2.5 mb-5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Total Shifts to Clear</span>
                <span className="font-black font-mono text-amber-400">{overdueWages.length}</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-800 pt-2.5">
                <span className="text-slate-200 font-bold uppercase tracking-wider text-[10px]">Total Disbursal Value</span>
                <span className="font-black text-lg font-mono text-amber-500">₹{overdueWages.reduce((sum, w) => sum + w.wageEarned, 0).toLocaleString()}</span>
              </div>
              <p className="text-[9px] text-slate-400 leading-normal border-t border-slate-800 pt-2 font-semibold">
                * Real-time secure UPI/AEPS gateway credits directly to registered laborers' bank accounts. Indian Labor Welfare code compliant.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowBatchSettleModal(false);
                  setActiveTab("employer-wages");
                  showToast("Redirecting to full Wages Ledger view...", "info");
                }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase rounded-xl tracking-wider cursor-pointer border border-slate-200 shadow-xs transition-all text-center"
              >
                Go to Ledger
              </button>
              
              <button
                type="button"
                disabled={isBatchSettling}
                onClick={handleBatchSettleOverdueWages}
                className="flex-1 py-2.5 bg-slate-950 hover:bg-slate-850 text-amber-500 font-black text-xs uppercase rounded-xl tracking-wider cursor-pointer border border-slate-850 shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                {isBatchSettling ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Settling...
                  </>
                ) : (
                  <>
                    Confirm Disbursal <Coins className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SMART AI SITE COMPANION DRAWER WIDGET */}
      <AnimatePresence>
        {showAiAssistant && (
          <>
            {/* Backdrop */}
            <div 
              onClick={() => setShowAiAssistant(false)}
              className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs z-50 transition-opacity" 
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed right-0 top-0 h-screen w-80 md:w-96 bg-white border-l border-slate-250 shadow-2xl z-50 flex flex-col text-left"
            >
              {/* Header */}
              <div className="bg-slate-950 p-4 text-white flex justify-between items-center shrink-0 border-b border-slate-850">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-amber-500 text-slate-950 rounded-lg">
                    <Sparkle className="w-4 h-4 fill-slate-950" />
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">AI Site Companion</h3>
                    <span className="text-[8.5px] font-mono text-amber-400 uppercase tracking-widest block">EmpoWork AI Assistant</span>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAiAssistant(false)}
                  className="text-slate-400 hover:text-white p-1 hover:bg-slate-850 rounded-full cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Chat Stream */}
              <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                {aiMessages.map((msg, idx) => {
                  const isAi = msg.sender === "ai";
                  return (
                    <div key={idx} className={`flex ${isAi ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[85%] space-y-0.5`}>
                        <span className="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
                          {isAi ? "AI Companion" : "Foreman"}
                        </span>
                        <div className={`p-3 rounded-xl text-xs font-semibold leading-relaxed border whitespace-pre-wrap ${
                          isAi ? "bg-white text-slate-800 border-slate-200 shadow-xs" : "bg-slate-950 text-amber-400 border-slate-900 shadow-sm"
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {aiTyping && (
                  <div className="flex justify-start">
                    <div className="space-y-0.5">
                      <span className="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-widest block">AI Companion</span>
                      <div className="bg-white p-3 border border-slate-200 shadow-xs rounded-xl text-xs text-slate-400 flex items-center space-x-1">
                        <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" />
                        <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce delay-100" />
                        <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce delay-200" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Form */}
              <form onSubmit={handleSendAiMessage} className="p-3 border-t border-slate-200 bg-white shrink-0 flex items-center space-x-2">
                <input
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder="Draft experienced mason job post..."
                  className="flex-grow p-2 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-semibold focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="p-2 bg-slate-950 hover:bg-slate-850 text-amber-500 rounded-xl border border-slate-850 shadow-md cursor-pointer shrink-0"
                >
                  <SendIcon />
                </button>
              </form>

            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}

// Compact Send Icon inside
function SendIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  );
}
