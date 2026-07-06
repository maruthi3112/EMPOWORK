import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Search, MapPin, Coins, Calendar, Check, Play, BookOpen, AlertCircle, 
  MessageSquare, User, Send, Sparkles, Compass, ShieldAlert, CheckCircle2, Clock, CheckCircle, WifiOff,
  TrendingUp, Target, PiggyBank, Plus, Trash2, Percent, Heart, Award, Smile, Star, Bell, BellOff, X,
  HardHat, QrCode, ScanLine, Settings, Copy, FileText, Wrench, Inbox, Upload, Lock, ShieldCheck, ClipboardList,
  Download, Mail, Smartphone, Filter, Receipt
} from "lucide-react";
import QRCode from "qrcode";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell,
  PieChart, Pie, Legend
} from "recharts";
import { UserProfile, Job, JobApplication, AttendanceRecord, Complaint, LearningResource, WagePayment, SavingsGoal, Review } from "../types";
import { db, collection, getDocs, query, where, addDoc, updateDoc, doc, setDoc, deleteDoc, onSnapshot, orderBy } from "../lib/firebase";
import VoiceInputButton from "./VoiceInputButton";
import QRCameraScanner from "./QRCameraScanner";
import VerifiedSkillBadges from "./VerifiedSkillBadges";
import AttendanceCalendar from "./AttendanceCalendar";
import EmergencySOS from "./EmergencySOS";
import { useToast } from "../context/ToastContext";
import { useLanguage } from "../context/LanguageContext";
import WorkerLifecycleFlowchart from "./WorkerLifecycleFlowchart";

interface WorkerDashboardProps {
  user: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOffline?: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 110, damping: 14 } },
};

function uniqById<T extends { id: string }>(arr: T[]): T[] {
  const seen = new Set<string>();
  return arr.filter(item => {
    if (!item) return false;
    const key = item.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isNearby(userLocation: string, jobLocation: string): boolean {
  if (!userLocation || !jobLocation) return false;
  const uLoc = userLocation.toLowerCase();
  const jLoc = jobLocation.toLowerCase();
  
  if (uLoc.includes(jLoc) || jLoc.includes(uLoc)) {
    return true;
  }
  
  const ignoreWords = new Set(["lane", "road", "street", "area", "station", "sector", "gate", "block", "vihar", "nagar", "market", "phase", "near", "opposite", "behind", "at", "the", "and", "for", "with", "of", "in"]);
  const uWords = uLoc.split(/[\s,.-]+/).filter(w => w.length > 2 && !ignoreWords.has(w));
  const jWords = jLoc.split(/[\s,.-]+/).filter(w => w.length > 2 && !ignoreWords.has(w));
  
  return uWords.some(w => jWords.includes(w));
}

function matchesSkills(job: Job, user: UserProfile): boolean {
  const jobTrade = (job.trade || "").toLowerCase();
  const userTrade = user.trade?.toLowerCase() || "";
  
  if (jobTrade && jobTrade === userTrade) {
    return true;
  }
  
  if (user.skills && user.skills.length > 0) {
    const titleAndDesc = `${job.title || ""} ${job.description || ""}`.toLowerCase();
    return user.skills.some(skill => {
      if (!skill) return false;
      const s = skill.toLowerCase();
      return titleAndDesc.includes(s) || jobTrade.includes(s);
    });
  }
  
  return false;
}

// Compute distance between two coordinates in kilometers using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
}

// Retrieve coordinates for a job, generating deterministic fallback coordinates if not present
function getJobCoordinates(job: Job): { latitude: number; longitude: number } {
  if (job.latitude !== undefined && job.longitude !== undefined) {
    return { latitude: job.latitude, longitude: job.longitude };
  }
  // Deterministic fallback based on job's ID and title
  let hash = 0;
  const str = job.id + job.title;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const offsetLat = ((Math.abs(hash) % 100) / 1000) - 0.05; // -0.05 to +0.05 degree offset
  const offsetLng = (((Math.abs(hash) >> 8) % 100) / 1000) - 0.05; // -0.05 to +0.05 degree offset
  return {
    latitude: 12.9716 + offsetLat,
    longitude: 77.5946 + offsetLng
  };
}

export default function WorkerDashboard({ 
  user, 
  onUpdateProfile, 
  activeTab, 
  setActiveTab,
  isOffline = false
}: WorkerDashboardProps) {
  const { showToast } = useToast();
  const { t, language, setLanguage } = useLanguage();

  const jobsSectionRef = useRef<HTMLDivElement>(null);
  const attendanceSectionRef = useRef<HTMLDivElement>(null);
  const skillsSectionRef = useRef<HTMLDivElement>(null);
  const complaintsSectionRef = useRef<HTMLDivElement>(null);
  const safetySectionRef = useRef<HTMLDivElement>(null);

  // Smooth scroll to the active module section when clicked/tab changes
  useEffect(() => {
    const refs: Record<string, React.RefObject<HTMLDivElement | null>> = {
      jobs: jobsSectionRef,
      dashboard: jobsSectionRef,
      attendance: attendanceSectionRef,
      skills: skillsSectionRef,
      complaints: complaintsSectionRef,
      safety: safetySectionRef,
    };

    const targetRef = refs[activeTab];
    if (targetRef) {
      setTimeout(() => {
        targetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    }
  }, [activeTab]);

  // User Profile States for Real-Time Status Lookups
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      const profilesMap: Record<string, UserProfile> = {};
      snapshot.forEach((docSnap) => {
        profilesMap[docSnap.id] = { id: docSnap.id, ...docSnap.data() } as any;
      });
      setUserProfiles(profilesMap);
    }, (error) => {
      console.error("Error subscribing to user profiles:", error);
    });
    return () => unsubscribe();
  }, []);

  const renderStatusDot = (uid: string, size: "xs" | "sm" | "md" = "sm") => {
    const profile = userProfiles[uid];
    const status = profile?.statusState || "available"; // default to available as in seed data
    
    let dotColor = "bg-emerald-500";
    let titleText = "Available";
    
    if (status === "busy") {
      dotColor = "bg-amber-500 animate-pulse";
      titleText = "Busy / On Shift";
    } else if (status === "offline") {
      dotColor = "bg-slate-400";
      titleText = "Offline";
    }
    
    const sizeClasses = {
      xs: "w-1.5 h-1.5",
      sm: "w-2 h-2",
      md: "w-2.5 h-2.5"
    };
    
    return (
      <span 
        className={`inline-block ${sizeClasses[size]} rounded-full ${dotColor} shrink-0 cursor-help`}
        title={`Status: ${titleText}`}
      />
    );
  };

  // Database States
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [learningResources, setLearningResources] = useState<LearningResource[]>([]);
  const [wagePayments, setWagePayments] = useState<WagePayment[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  // Savings Goal States
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalCategory, setGoalCategory] = useState<'tools' | 'health' | 'family' | 'education' | 'festival' | 'other'>("tools");
  const [goalAllocPercent, setGoalAllocPercent] = useState("20");
  const [goalSuccessMsg, setGoalSuccessMsg] = useState("");
  const [savingLoading, setSavingLoading] = useState(false);
  const [manualSavedAmount, setManualSavedAmount] = useState<{[key: string]: string}>({});
  const [wageSubTab, setWageSubTab] = useState<'logs' | 'analytics'>('analytics');

  // UI Control States
  const [loading, setLoading] = useState(false);
  const [tradeFilter, setTradeFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  
  // New Worker Tab States
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tools, setTools] = useState([
    { id: "tool-1", name: "Heavy Duty Shovel", category: "Excavation", condition: "Good", availability: "Active" },
    { id: "tool-2", name: "Steel Brick Trowel", category: "Masonry", condition: "New", availability: "Active" },
    { id: "tool-3", name: "Impact Safety Helmet", category: "Protective Gear", condition: "Good", availability: "Active" },
    { id: "tool-4", name: "Safety Steel-Toe Boots", category: "Safety PPE", condition: "Fair", availability: "Active" }
  ]);
  const [requestToolName, setRequestToolName] = useState("");
  const [requestToolCategory, setRequestToolCategory] = useState("Masonry");
  const [requestToolCondition, setRequestToolCondition] = useState("Good");
  const [aadhaarNumber, setAadhaarNumber] = useState("•••• •••• 9812");
  const [bankAccount, setBankAccount] = useState("••••••••5432");
  const [bankName, setBankName] = useState("State Bank of India (SBI)");
  const [bankIfsc, setBankIfsc] = useState("SBIN0001024");
  const [isAadhaarEditing, setIsAadhaarEditing] = useState(false);
  const [isBankEditing, setIsBankEditing] = useState(false);
  const [aadhaarInput, setAadhaarInput] = useState("1234 5678 9812");
  const [bankInput, setBankInput] = useState("309485745432");

  // Notifications mock feed state
  const [notifications, setNotifications] = useState([
    { id: "notif-1", title: "🛠️ New Job Match", message: "A new Masonry job has been posted by Metro Build Corp matching your trade in Central Bengaluru.", date: "Today", read: false },
    { id: "notif-2", title: "💰 Wage Credited", message: "Your daily wage of ₹850 for the shift on 01 Jul has been successfully transferred to your SBI account.", date: "Yesterday", read: false },
    { id: "notif-3", title: "✓ Application Approved", message: "Your application for Tile Layer Assistant at Rajesh Sharma Builders has been accepted! Check in tomorrow.", date: "2 days ago", read: true },
    { id: "notif-4", title: "⚖️ Dispute Resolved", message: "Grievance ID #GP-9412 has been resolved. The builder has credited the outstanding ₹400.", date: "3 days ago", read: true }
  ]);
  
  // Job Details Modal States
  const [detailedJob, setDetailedJob] = useState<Job | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // AI Profile Generator states
  const [bioInput, setBioInput] = useState("");
  const [generatingBio, setGeneratingBio] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState("");

  // AI Complaint submission states
  const [complaintJobId, setComplaintJobId] = useState("");
  const [complaintText, setComplaintText] = useState("");
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const [aiDisputeAdvice, setAiDisputeAdvice] = useState<{ summary: string; analysis: string; recommendations: string[] } | null>(null);

  // Notification states
  const [notificationPermission, setNotificationPermission] = useState<string>("default");
  const [toasts, setToasts] = useState<Array<{
    id: string;
    type: "job_match" | "application_status" | "wage_payment";
    title: string;
    message: string;
    timestamp: number;
    job?: Job;
    application?: JobApplication;
    payment?: WagePayment;
  }>>([]);
  const initialJobIds = useRef<Set<string>>(new Set());
  const initialApplicationIds = useRef<Set<string>>(new Set());
  const initialWagePaymentIds = useRef<Set<string>>(new Set());
  const initialAppStatuses = useRef<Record<string, string>>({});

  // Wage History Feed States
  const [wageTimelineFilter, setWageTimelineFilter] = useState<'all' | 'paid' | 'pending' | 'rejected'>('all');
  const [wageTimelineSearch, setWageTimelineSearch] = useState('');
  const [selectedWageSlip, setSelectedWageSlip] = useState<WagePayment | null>(null);

  // Wage Inquiry Support Ticket States
  const [inquiryPayment, setInquiryPayment] = useState<WagePayment | null>(null);
  const [inquiryReason, setInquiryReason] = useState<string>("Amount mismatch");
  const [inquiryDetails, setInquiryDetails] = useState<string>("");
  const [submittingInquiry, setSubmittingInquiry] = useState<boolean>(false);

  // Profile Settings states
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [editName, setEditName] = useState(user.name || "");
  const [editPhone, setEditPhone] = useState(user.phone || "");
  const [editTrade, setEditTrade] = useState(user.trade || "Mason");
  const [editWageExpectation, setEditWageExpectation] = useState(user.wageExpectation || 600);
  const [editNotificationPref, setEditNotificationPref] = useState(user.notificationPrefEnabled !== false);
  const [notifyWagesPush, setNotifyWagesPush] = useState(user.notifyWagesPush !== false);
  const [notifyWagesSMS, setNotifyWagesSMS] = useState(user.notifyWagesSMS !== false);
  const [notifyWagesEmail, setNotifyWagesEmail] = useState(user.notifyWagesEmail !== false);

  useEffect(() => {
    if (user) {
      setEditName(user.name || "");
      setEditPhone(user.phone || "");
      setEditTrade(user.trade || "Mason");
      setEditWageExpectation(user.wageExpectation || 600);
      setEditNotificationPref(user.notificationPrefEnabled !== false);
      setNotifyWagesPush(user.notifyWagesPush !== false);
      setNotifyWagesSMS(user.notifyWagesSMS !== false);
      setNotifyWagesEmail(user.notifyWagesEmail !== false);
    }
  }, [user]);

  // Job Application note/modal states
  const [applyingJob, setApplyingJob] = useState<Job | null>(null);
  const [applicationNote, setApplicationNote] = useState("");
  const [isApplyingModalOpen, setIsApplyingModalOpen] = useState(false);

  // Quick Contact states
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactJob, setContactJob] = useState<Job | null>(null);
  const [contactType, setContactType] = useState<"message" | "call_back">("message");
  const [contactMessage, setContactMessage] = useState("");
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);

  // AI Learning Guru Chat states
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "guru"; text: string }[]>([
    { role: "guru", text: "Namaste! I am EmpoGuru, your AI skill and finance coach. Ask me anything about safety equipment, construction secrets, bank accounts, or how to get better daily wages!" }
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  // Active check-in state
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [activeCheckInRecord, setActiveCheckInRecord] = useState<AttendanceRecord | null>(null);

  // Personal QR Code state
  const [personalQrUrl, setPersonalQrUrl] = useState<string>("");

  useEffect(() => {
    if (user && user.uid) {
      QRCode.toDataURL(JSON.stringify({
        type: "EMPOWORK_PERSONAL_QR",
        uid: user.uid,
        name: user.name,
        trade: user.trade || "General Laborer",
        phone: user.phone || ""
      }), {
        width: 350,
        margin: 2,
        color: { dark: "#0f172a", light: "#ffffff" }
      })
      .then(url => setPersonalQrUrl(url))
      .catch(err => console.error("Error generating personal QR:", err));
    }
  }, [user]);

  // Geolocation states for improved verification
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Geolocation states for job card distance indicator
  const [workerCoords, setWorkerCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isWorkerLocating, setIsWorkerLocating] = useState(false);
  const [workerLocationError, setWorkerLocationError] = useState<string | null>(null);

  const fetchWorkerLocation = () => {
    if (!navigator.geolocation) {
      setWorkerLocationError("Geolocation is not supported by your browser.");
      return;
    }
    setIsWorkerLocating(true);
    setWorkerLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setWorkerCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setIsWorkerLocating(false);
      },
      (error) => {
        console.error("Error obtaining worker location:", error);
        let errorMsg = "Location access denied. Using standard Bengaluru center coords for demo.";
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = "Location access denied. Using standard Bengaluru center coords for demo.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = "Location information is unavailable. Using standard Bengaluru center coords.";
        } else if (error.code === error.TIMEOUT) {
          errorMsg = "Location request timed out. Using standard Bengaluru center coords.";
        }
        setWorkerLocationError(errorMsg);
        setIsWorkerLocating(false);
        // Fallback to Bengaluru Central so we can show distance metrics for demo
        setWorkerCoords({
          latitude: 12.9716,
          longitude: 77.5946
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    fetchWorkerLocation();
  }, []);

  // Industrial Pre-Shift Safety Checklist
  const [showPreshiftModal, setShowPreshiftModal] = useState(false);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [qrCodeInput, setQrCodeInput] = useState("");
  const [qrScannerError, setQrScannerError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [ppeHelmet, setPpeHelmet] = useState(false);
  const [ppeBoots, setPpeBoots] = useState(false);
  const [ppeVest, setPpeVest] = useState(false);
  const [ppeAffirmation, setPpeAffirmation] = useState(false);

  // Worker Safety & Well-being Portal States
  const [selectedInfographic, setSelectedInfographic] = useState(0);
  const [selectedSafetyTask, setSelectedSafetyTask] = useState("Scaffolding Assembly");
  const [customSafetyTask, setCustomSafetyTask] = useState("");
  const [safetyChecklist, setSafetyChecklist] = useState<{
    task: string;
    hazards: string[];
    checklist: string[];
    safetyEquipmentRequired: string[];
    encouragingTip: string;
  } | null>(null);
  const [isGeneratingChecklist, setIsGeneratingChecklist] = useState(false);
  const [checklistError, setChecklistError] = useState<string | null>(null);
  const [checkedSafetyItems, setCheckedSafetyItems] = useState<Record<number, boolean>>({});

  // Load initial data from Firestore
  useEffect(() => {
    fetchData();
  }, [user]);

  // Load initial safety checklist when opening Safety Tab
  useEffect(() => {
    if (activeTab === "safety" && !safetyChecklist && !isGeneratingChecklist) {
      handleGenerateSafetyChecklist("Scaffolding Assembly");
    }
  }, [activeTab]);

  // Real-time listener for new matching jobs
  useEffect(() => {
    if (!user) return;

    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }

    const q = query(collection(db, "jobs"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const newJob = { id: change.doc.id, ...(change.doc.data() as any) } as Job;
          
          // Check if it's a genuinely new job (not part of initial fetch)
          if (initialJobIds.current.size > 0 && !initialJobIds.current.has(newJob.id)) {
            initialJobIds.current.add(newJob.id);
            
            // Filter: open status, matches trade/skills, and is nearby
            const skillMatch = matchesSkills(newJob, user);
            const locationMatch = isNearby(user.location, newJob.location);
            
            if (newJob.status === "open" && skillMatch && locationMatch) {
              if (user.notificationPrefEnabled !== false) {
                triggerNotification(newJob);
              } else {
                console.log("Real-time job notification suppressed due to user preferences.");
              }
            }

            // Real-time update jobs list
            setJobs(prev => {
              if (prev.some(j => j.id === newJob.id)) return prev;
              if (newJob.status === "open") {
                return [newJob, ...prev];
              }
              return prev;
            });
          }
        }
      });
    }, (error) => {
      console.error("Jobs subscription error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Real-time listener for job applications and wage payments status updates
  useEffect(() => {
    if (!user) return;

    // 1. Subscribe to job applications
    const appsQuery = query(
      collection(db, "job_applications"),
      where("workerId", "==", user.uid)
    );
    const unsubscribeApps = onSnapshot(appsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const app = { id: change.doc.id, ...(change.doc.data() as any) } as JobApplication;
        
        if (change.type === "modified") {
          const oldStatus = initialAppStatuses.current[app.id];
          if (oldStatus !== app.status) {
            initialAppStatuses.current[app.id] = app.status;
            triggerStatusChangeToast(app);
          }
        } else if (change.type === "added") {
          // If it's a new application added in real-time
          if (initialApplicationIds.current.size > 0 && !initialApplicationIds.current.has(app.id)) {
            initialApplicationIds.current.add(app.id);
            initialAppStatuses.current[app.id] = app.status;
          }
        }

        // Sync local applications state
        setApplications(prev => {
          const exists = prev.some(a => a.id === app.id);
          if (exists) {
            return prev.map(a => a.id === app.id ? app : a);
          } else {
            return [app, ...prev];
          }
        });
      });
    }, (error) => {
      console.error("Applications subscription error:", error);
    });

    // 2. Subscribe to wage payments
    const wpQuery = query(
      collection(db, "wage_payments"),
      where("workerId", "==", user.uid)
    );
    const unsubscribeWp = onSnapshot(wpQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const wp = { id: change.doc.id, ...(change.doc.data() as any) } as WagePayment;

        if (change.type === "modified") {
          // Check if status changed to 'paid'
          if (wp.status === "paid") {
            triggerWageProcessedToast(wp);
            // Append to in-app notification feed in real-time
            setNotifications(prev => {
              if (prev.some(n => n.id === `wp-paid-${wp.id}`)) return prev;
              return [
                {
                  id: `wp-paid-${wp.id}`,
                  title: "💰 Wage Credited",
                  message: `Your daily wage of ₹${wp.amount} for "${wp.jobTitle}" has been successfully paid. Ref ID: ${wp.transactionId || 'N/A'}.`,
                  date: "Just Now",
                  read: false
                },
                ...prev
              ];
            });
          }
        } else if (change.type === "added") {
          if (initialWagePaymentIds.current.size > 0 && !initialWagePaymentIds.current.has(wp.id)) {
            initialWagePaymentIds.current.add(wp.id);
            if (wp.status === "paid") {
              triggerWageProcessedToast(wp);
              // Append to in-app notification feed in real-time
              setNotifications(prev => {
                if (prev.some(n => n.id === `wp-paid-${wp.id}`)) return prev;
                return [
                  {
                    id: `wp-paid-${wp.id}`,
                    title: "💰 Wage Credited",
                    message: `Your daily wage of ₹${wp.amount} for "${wp.jobTitle}" has been successfully paid. Ref ID: ${wp.transactionId || 'N/A'}.`,
                    date: "Just Now",
                    read: false
                  },
                  ...prev
                ];
              });
            }
          }
        }

        // Sync local wage payments state
        setWagePayments(prev => {
          const exists = prev.some(w => w.id === wp.id);
          if (exists) {
            return prev.map(w => w.id === wp.id ? wp : w);
          } else {
            return [wp, ...prev];
          }
        });
      });
    }, (error) => {
      console.error("Wage payments subscription error:", error);
    });

    return () => {
      unsubscribeApps();
      unsubscribeWp();
    };
  }, [user]);

  const triggerNotification = (job: Job) => {
    // 1. Browser Notification (if permission is granted)
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        const notification = new Notification("🛠️ New Local Job Posted!", {
          body: `${job.title} at ${job.location}. Pay: ₹${job.wage}/day. Click to apply!`,
          icon: "/favicon.ico"
        });

        notification.onclick = () => {
          window.focus();
          triggerApplyJob(job);
        };
      } catch (e) {
        console.error("Failed to trigger browser notification:", e);
      }
    }

    // 2. In-App Elegant Toast
    const toastId = `toast-${Date.now()}-${job.id}`;
    const newToast = {
      id: toastId,
      type: "job_match" as const,
      title: "New Match Nearby!",
      message: `${job.title} at ${job.location}. Pay: ₹${job.wage}/day. Click to apply!`,
      job,
      timestamp: Date.now()
    };

    setToasts(prev => [newToast, ...prev]);

    // Auto-remove toast after 10 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toastId));
    }, 10000);
  };

  const triggerStatusChangeToast = (app: JobApplication) => {
    let statusLabel: string = app.status;
    let emoji = "📋";
    if (app.status === "accepted") {
      emoji = "🎉";
      statusLabel = "Hired / Accepted";
    } else if (app.status === "rejected") {
      emoji = "❌";
      statusLabel = "Rejected";
    }

    const toastId = `toast-status-${Date.now()}-${app.id}`;
    const newToast = {
      id: toastId,
      type: "application_status" as const,
      title: `${emoji} Application Status Updated!`,
      message: `Your application for "${app.jobTitle}" has been ${statusLabel} by the employer.`,
      application: app,
      timestamp: Date.now()
    };

    setToasts(prev => [newToast, ...prev]);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toastId));
    }, 10000);

    // Try a browser notification too
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(`${emoji} Application Status Updated`, {
          body: `Your application for "${app.jobTitle}" is now ${statusLabel}.`,
          icon: "/favicon.ico"
        });
      } catch (e) {
        console.error("Failed to trigger status change browser notification:", e);
      }
    }
  };

  const triggerWageProcessedToast = (payment: WagePayment) => {
    const toastId = `toast-wage-${Date.now()}-${payment.id}`;
    const newToast = {
      id: toastId,
      type: "wage_payment" as const,
      title: `💰 Wage Payment Processed!`,
      message: `Your wage payment of ₹${payment.amount} for "${payment.jobTitle}" has been successfully paid.`,
      payment,
      timestamp: Date.now()
    };

    setToasts(prev => [newToast, ...prev]);

    // Also call global showToast
    showToast(
      `Your wage payment of ₹${payment.amount} for "${payment.jobTitle}" has been successfully paid.`,
      "wage",
      "💰 Wage Payment Processed!"
    );

    // Auto-remove after 10 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toastId));
    }, 10000);

    // Browser Notification
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(`💰 Wage Payment Paid`, {
          body: `Processed: ₹${payment.amount} for "${payment.jobTitle}".`,
          icon: "/favicon.ico"
        });
      } catch (e) {
        console.error("Failed to trigger wage browser notification:", e);
      }
    }
  };

  const requestNotificationPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
      } catch (e) {
        console.error("Error requesting notification permission:", e);
      }
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch open jobs
      const jobsSnap = await getDocs(collection(db, "jobs"));
      const jobsList: Job[] = [];
      jobsSnap.forEach((doc) => {
        jobsList.push({ id: doc.id, ...(doc.data() as any) } as Job);
      });
      // Populate initialJobIds ref so we don't notify for pre-existing jobs
      jobsList.forEach(job => {
        initialJobIds.current.add(job.id);
      });
      setJobs(jobsList);

      // 2. Fetch worker applications
      const appsSnap = await getDocs(
        query(collection(db, "job_applications"), where("workerId", "==", user.uid))
      );
      const appsList: JobApplication[] = [];
      appsSnap.forEach((doc) => {
        appsList.push({ id: doc.id, ...(doc.data() as any) } as JobApplication);
      });
      appsList.forEach(app => {
        initialApplicationIds.current.add(app.id);
        initialAppStatuses.current[app.id] = app.status;
      });
      setApplications(appsList);

      // 3. Fetch attendance history
      const attSnap = await getDocs(
        query(collection(db, "attendance"), where("workerId", "==", user.uid))
      );
      const attList: AttendanceRecord[] = [];
      attSnap.forEach((doc) => {
        attList.push({ id: doc.id, ...(doc.data() as any) } as AttendanceRecord);
      });
      setAttendance(attList);

      // Check if there is an active check-in today without check-out
      const activeRec = attList.find(r => r.status === "pending_approval" && !r.checkOutTime);
      if (activeRec) {
        setIsCheckedIn(true);
        setActiveCheckInRecord(activeRec);
        const j = jobsList.find(job => job.id === activeRec.jobId);
        if (j) {
          setActiveJob(j);
        } else {
          setActiveJob({
            id: activeRec.jobId,
            title: activeRec.jobTitle,
            employerId: activeRec.employerId,
            employerName: "Apex Infrastructure Ltd",
            trade: "labor",
            description: "Industrial site duty, general assistance, and high-visibility operations.",
            location: "Sector 62 Industrial Complex, Noida",
            wage: activeRec.wageEarned,
            startDate: new Date().toISOString().split("T")[0],
            endDate: new Date().toISOString().split("T")[0],
            slots: 10,
            slotsTaken: 1,
            status: "active",
            createdAt: new Date().toISOString()
          });
        }
      } else {
        // Find if user is hired for any active job to check-in
        const acceptedApp = appsList.find(a => a.status === "accepted");
        if (acceptedApp) {
          const j = jobsList.find(job => job.id === acceptedApp.jobId);
          if (j) {
            setActiveJob(j);
          } else {
            setActiveJob({
              id: acceptedApp.jobId,
              title: acceptedApp.jobTitle,
              employerId: acceptedApp.employerId,
              employerName: acceptedApp.employerName,
              trade: "labor",
              description: "Industrial site duty, general assistance, and high-visibility operations.",
              location: "Sector 62 Industrial Complex, Noida",
              wage: 850,
              startDate: new Date().toISOString().split("T")[0],
              endDate: new Date().toISOString().split("T")[0],
              slots: 10,
              slotsTaken: 1,
              status: "active",
              createdAt: new Date().toISOString()
            });
          }
        } else {
          // Fallback to make the check-in and scan QR buttons ALWAYS available and functional for demo and interactive use
          const fallbackJob = jobsList.length > 0 ? jobsList[0] : {
            id: "demo-job-active",
            title: "General Site Duty",
            description: "Industrial site duty, general assistance, and high-visibility operations.",
            location: "Noida Sector 62 Industrial Yard",
            wage: 850,
            trade: "labor",
            startDate: new Date().toISOString().split("T")[0],
            endDate: new Date().toISOString().split("T")[0],
            slots: 10,
            slotsTaken: 2,
            status: "active" as const,
            employerId: "demo-employer-id",
            employerName: "Apex Infrastructure Ltd",
            createdAt: new Date().toISOString()
          };
          setActiveJob(fallbackJob);
        }
      }

      // 4. Fetch complaints
      const compSnap = await getDocs(
        query(collection(db, "complaints"), where("workerId", "==", user.uid))
      );
      const compList: Complaint[] = [];
      compSnap.forEach((doc) => {
        compList.push({ id: doc.id, ...(doc.data() as any) } as Complaint);
      });
      setComplaints(compList);

      // 5. Fetch learning resources
      const lrSnap = await getDocs(collection(db, "learning_resources"));
      const lrList: LearningResource[] = [];
      lrSnap.forEach((doc) => {
        lrList.push({ id: doc.id, ...(doc.data() as any) } as LearningResource);
      });
      setLearningResources(lrList);

      // 6. Fetch wage payments
      const wpSnap = await getDocs(
        query(collection(db, "wage_payments"), where("workerId", "==", user.uid))
      );
      const wpList: WagePayment[] = [];
      wpSnap.forEach((doc) => {
        wpList.push({ id: doc.id, ...(doc.data() as any) } as WagePayment);
      });
      wpList.forEach(wp => {
        initialWagePaymentIds.current.add(wp.id);
      });
      setWagePayments(wpList);

      const paidNotifications = wpList
        .filter(wp => wp.status === "paid")
        .map(wp => ({
          id: `wp-paid-${wp.id}`,
          title: "💰 Wage Credited",
          message: `Your daily wage of ₹${wp.amount} for "${wp.jobTitle}" has been successfully paid. Ref ID: ${wp.transactionId || 'N/A'}.`,
          date: wp.date || "Recently",
          read: true
        }));
      setNotifications(prev => {
        const filteredPrev = prev.filter(n => !n.id.startsWith("wp-paid-"));
        return [...paidNotifications, ...filteredPrev];
      });

      // 7. Fetch savings goals
      const sgSnap = await getDocs(
        query(collection(db, "savings_goals"), where("workerId", "==", user.uid))
      );
      const sgList: SavingsGoal[] = [];
      sgSnap.forEach((doc) => {
        sgList.push({ id: doc.id, ...(doc.data() as any) } as SavingsGoal);
      });

      if (sgList.length === 0) {
        const defaultGoals: SavingsGoal[] = [
          {
            id: `sg-default-1-${user.uid}`,
            workerId: user.uid,
            title: "Waterproof Steel-Toe Safety Boots",
            targetAmount: 3500,
            currentSaved: 1400,
            allocatedPercentage: 15,
            createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
            category: "tools"
          },
          {
            id: `sg-default-2-${user.uid}`,
            workerId: user.uid,
            title: "Family Medical Reserve Fund",
            targetAmount: 12000,
            currentSaved: 4800,
            allocatedPercentage: 20,
            createdAt: new Date(Date.now() - 45 * 24 * 3600 * 1000).toISOString(),
            category: "health"
          }
        ];
        setSavingsGoals(defaultGoals);
      } else {
        setSavingsGoals(sgList);
      }

      // 8. Fetch reviews received by this worker
      const revSnap = await getDocs(
        query(collection(db, "reviews"), where("workerId", "==", user.uid))
      );
      const revList: Review[] = [];
      revSnap.forEach((doc) => {
        revList.push({ id: doc.id, ...(doc.data() as any) } as Review);
      });
      setReviews(revList);

    } catch (e) {
      console.error("Error fetching worker data:", e);
    } finally {
      setLoading(false);
    }
  };

  // 1. Optimize Bio using Gemini
  const handleOptimizeProfile = async () => {
    if (!bioInput.trim()) return;
    setGeneratingBio(true);
    setProfileSuccessMsg("");
    try {
      const response = await fetch("/api/gemini/generate-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawInput: bioInput,
          trade: user.trade,
          experience: user.experience
        })
      });
      const data = await response.json();
      if (data.optimizedBio) {
        onUpdateProfile({
          bio: data.optimizedBio,
          skills: data.skills
        });
        setProfileSuccessMsg("AI matched and optimized your bio and practical skills successfully!");
        setBioInput("");
      }
    } catch (e) {
      console.error("AI Profile optimization error:", e);
    } finally {
      setGeneratingBio(false);
    }
  };

  // 2. Trigger Job Application Modal
  const triggerApplyJob = (job: Job) => {
    setApplyingJob(job);
    setApplicationNote("");
    setIsApplyingModalOpen(true);
  };

  // Trigger Quick Contact modal
  const triggerQuickContact = (job: Job) => {
    setContactJob(job);
    setContactType("message");
    setContactMessage("");
    setIsContactModalOpen(true);
  };

  // Submit Contact Request
  const handleContactSubmit = async () => {
    if (!contactJob) return;
    setIsSubmittingContact(true);
    try {
      const contactId = `contact-${user.uid}-${contactJob.id}-${Date.now()}`;
      
      const newContact = {
        id: contactId,
        jobId: contactJob.id,
        jobTitle: contactJob.title,
        workerId: user.uid,
        workerName: user.name || "Worker",
        workerPhone: user.phone || "",
        employerId: contactJob.employerId,
        employerName: contactJob.employerName,
        type: contactType,
        message: contactType === "message" ? contactMessage : `Requesting a callback at ${user.phone || ''}`,
        status: "pending",
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, "contact_requests", contactId), newContact);

      showToast({
        type: "success" as any,
        title: "Contact Request Sent!",
        message: contactType === "message" 
          ? "Your platform message has been sent to the employer." 
          : "The employer has been requested to call you back."
      });

      setIsContactModalOpen(false);
      setContactJob(null);
      setContactMessage("");
    } catch (error) {
      console.error("Error submitting contact request:", error);
      showToast({
        type: "error" as any,
        title: "Submission Failed",
        message: "Could not send the request. Please try again."
      });
    } finally {
      setIsSubmittingContact(false);
    }
  };

  // Actually Submit Job Application with optional Note
  const handleConfirmApplyJob = async () => {
    if (!applyingJob) return;
    try {
      const appId = `app-${user.uid}-${applyingJob.id}`;
      const newApp: JobApplication = {
        id: appId,
        jobId: applyingJob.id,
        jobTitle: applyingJob.title,
        employerId: applyingJob.employerId,
        employerName: applyingJob.employerName,
        workerId: user.uid,
        workerName: user.name,
        workerPhone: user.phone,
        workerTrade: user.trade || "Helper",
        status: "pending",
        appliedAt: new Date().toISOString(),
        note: applicationNote.trim() || undefined
      };

      await setDoc(doc(db, "job_applications", appId), newApp);
      setApplications(prev => [...prev, newApp]);
      
      // Trigger success toast notification
      showToast(
        `Successfully registered for the job: "${applyingJob.title}" with ${applyingJob.employerName}.`,
        "job",
        "👷 Registered For Job"
      );

      setIsApplyingModalOpen(false);
      setApplyingJob(null);
    } catch (e) {
      console.error("Apply job error:", e);
      showToast("Failed to submit job registration. Please try again.", "error", "Registration Failed");
    }
  };

  // 3. Simulated Attendance Check-In with Geolocation API
  const handleCheckIn = async () => {
    if (!activeJob) return;
    setIsLocating(true);
    setLocationError(null);

    const checkInRecord = (lat?: number, lon?: number) => {
      const attId = `att-${user.uid}-${Date.now()}`;
      const confirmedGear: string[] = [];
      if (ppeHelmet) confirmedGear.push("helmet");
      if (ppeBoots) confirmedGear.push("boots");
      if (ppeVest) confirmedGear.push("vest");
      if (ppeAffirmation) confirmedGear.push("rules");

      const newRecord: AttendanceRecord = {
        id: attId,
        jobId: activeJob.id,
        jobTitle: activeJob.title,
        workerId: user.uid,
        workerName: user.name,
        employerId: activeJob.employerId,
        date: new Date().toISOString().split("T")[0],
        checkInTime: new Date().toLocaleTimeString(),
        status: "pending_approval",
        wageEarned: activeJob.wage,
        checkInLatitude: lat,
        checkInLongitude: lon,
        safetyCleared: ppeHelmet && ppeBoots && ppeVest && ppeAffirmation,
        safetyGearConfirmed: confirmedGear
      };
      return newRecord;
    };

    const saveRecord = async (record: AttendanceRecord) => {
      await setDoc(doc(db, "attendance", record.id), record);
      setIsCheckedIn(true);
      setActiveCheckInRecord(record);
      setAttendance(prev => [record, ...prev]);
      setIsLocating(false);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          const newRecord = checkInRecord(lat, lon);
          await saveRecord(newRecord);
        },
        async (error) => {
          console.error("Geolocation error during Check-In:", error);
          let errMsg = "Could not fetch GPS coordinates.";
          if (error.code === error.PERMISSION_DENIED) {
            errMsg = "Location access denied. Check-In proceeded without GPS verification.";
          }
          setLocationError(errMsg);
          // Fallback to check-in without GPS, keeping it functional!
          const newRecord = checkInRecord();
          await saveRecord(newRecord);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setLocationError("Geolocation is not supported by your browser. Check-In proceeded without GPS verification.");
      const newRecord = checkInRecord();
      await saveRecord(newRecord);
    }
  };

  // QR Code Site Check-In handler
  const handleQrCodeVerifyAndCheckIn = async (codeToVerify: string) => {
    if (!activeJob) {
      setQrScannerError("You are not hired for any active job. Please apply for a job first!");
      return;
    }

    const cleanCode = codeToVerify.replace("EMPOWORK_SITE_CHECKIN:", "").trim();

    if (cleanCode !== activeJob.id) {
      setQrScannerError(`Invalid site code! This code is for a different project. Please scan the QR code displayed at: ${activeJob.location}`);
      return;
    }

    setIsScanning(true);
    setQrScannerError(null);

    // Simulate scanning/decoding delay
    setTimeout(async () => {
      try {
        const attId = `att-${user.uid}-${Date.now()}`;
        const newRecord: AttendanceRecord = {
          id: attId,
          jobId: activeJob.id,
          jobTitle: activeJob.title,
          workerId: user.uid,
          workerName: user.name,
          employerId: activeJob.employerId,
          date: new Date().toISOString().split("T")[0],
          checkInTime: new Date().toLocaleTimeString(),
          status: "pending_approval",
          wageEarned: activeJob.wage,
          qrVerified: true,
          safetyCleared: true,
          safetyGearConfirmed: ["Helmet", "Boots", "Vest"]
        };

        // Attempt GPS retrieval but guarantee success even if offline/denied
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              newRecord.checkInLatitude = position.coords.latitude;
              newRecord.checkInLongitude = position.coords.longitude;
              await setDoc(doc(db, "attendance", attId), newRecord);
              setAttendance(prev => [newRecord, ...prev]);
            },
            async () => {
              await setDoc(doc(db, "attendance", attId), newRecord);
              setAttendance(prev => [newRecord, ...prev]);
            },
            { enableHighAccuracy: true, timeout: 5000 }
          );
        } else {
          await setDoc(doc(db, "attendance", attId), newRecord);
          setAttendance(prev => [newRecord, ...prev]);
        }

        setIsCheckedIn(true);
        setActiveCheckInRecord(newRecord);
        setScanSuccess(true);
        setIsScanning(false);
      } catch (err) {
        console.error("QR Code check-in error:", err);
        setQrScannerError("Failed to verify QR check-in on cloud server. Try again.");
        setIsScanning(false);
      }
    }, 1500);
  };

  // 4. Simulated Check-Out
  const handleCheckOut = async () => {
    if (!activeCheckInRecord) return;
    try {
      const updatedRecord = {
        ...activeCheckInRecord,
        checkOutTime: new Date().toLocaleTimeString(),
        hoursWorked: 8 // standard full day shift
      };

      await setDoc(doc(db, "attendance", activeCheckInRecord.id), updatedRecord);
      setIsCheckedIn(false);
      setActiveCheckInRecord(null);
      setAttendance(prev => prev.map(r => r.id === activeCheckInRecord.id ? updatedRecord : r));
      
      showToast(
        `Shift checked out successfully! Daily wage of ₹${activeCheckInRecord.wageEarned} has been logged and queued for contractor approval.`,
        "wage",
        "💰 Wage Logged Successfully"
      );

      // Reset safety checklist selections
      setPpeHelmet(false);
      setPpeBoots(false);
      setPpeVest(false);
      setPpeAffirmation(false);
      setShowPreshiftModal(false);
    } catch (e) {
      console.error("Check-out error:", e);
    }
  };

  // 4b. Log Current Location using Geolocation API
  const handleLogLocation = async () => {
    if (!activeCheckInRecord) {
      showToast("You must be checked in to log your current location.", "error", "Not Checked-In");
      return;
    }
    setIsLocating(true);
    setLocationError(null);

    const logLocation = async (lat?: number, lon?: number) => {
      try {
        const timestamp = new Date().toLocaleTimeString();
        const newLog = {
          time: timestamp,
          latitude: lat || 0,
          longitude: lon || 0,
        };

        const currentLogs = activeCheckInRecord.locationLogs || [];
        const updatedRecord: AttendanceRecord = {
          ...activeCheckInRecord,
          locationLogs: [...currentLogs, newLog],
        };

        await setDoc(doc(db, "attendance", activeCheckInRecord.id), updatedRecord);
        setActiveCheckInRecord(updatedRecord);
        setAttendance(prev => prev.map(r => r.id === activeCheckInRecord.id ? updatedRecord : r));
        setIsLocating(false);

        showToast(
          `Location logged successfully at ${timestamp}! GPS verified: ${lat?.toFixed(5) || "N/A"}, ${lon?.toFixed(5) || "N/A"}.`,
          "success",
          "📍 Location Logged"
        );
      } catch (err) {
        console.error("Error logging location:", err);
        setIsLocating(false);
        showToast("Failed to log location to cloud storage.", "error", "Logging Failed");
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          await logLocation(lat, lon);
        },
        async (error) => {
          console.error("Geolocation error during location log:", error);
          let errMsg = "Could not fetch GPS coordinates.";
          if (error.code === error.PERMISSION_DENIED) {
            errMsg = "Location access denied. Please enable GPS permissions in your browser.";
          }
          setLocationError(errMsg);
          setIsLocating(false);
          showToast(errMsg, "error", "Location Error");
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      const errMsg = "Geolocation is not supported by your browser.";
      setLocationError(errMsg);
      setIsLocating(false);
      showToast(errMsg, "error", "Location Not Supported");
    }
  };

  // 5. AI Dispute Resolution (Complaints)
  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintText.trim() || !complaintJobId) return;

    setSubmittingComplaint(true);
    setAiDisputeAdvice(null);
    try {
      const selectedJob = jobs.find(j => j.id === complaintJobId) || { title: "Daily Wage Job", wage: 500, employerId: "unknown", employerName: "Contractor" };
      
      // Call Gemini for instant fair mediation advisory
      const response = await fetch("/api/gemini/analyze-complaint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaintText,
          raisedBy: "worker",
          jobTitle: selectedJob.title,
          wage: selectedJob.wage
        })
      });
      const aiAdvice = await response.json();
      setAiDisputeAdvice(aiAdvice);

      // Write complaint log to firestore
      const compId = `comp-${user.uid}-${Date.now()}`;
      const newComplaint: Complaint = {
        id: compId,
        jobId: complaintJobId,
        jobTitle: selectedJob.title,
        workerId: user.uid,
        workerName: user.name,
        employerId: selectedJob.employerId,
        employerName: selectedJob.employerName,
        raisedBy: "worker",
        description: complaintText,
        aiRecommendation: aiAdvice.analysis + " Recommendations: " + aiAdvice.recommendations.join(" | "),
        status: "open",
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, "complaints", compId), newComplaint);
      setComplaints(prev => [newComplaint, ...prev]);
      
      showToast(
        `Your dispute for "${selectedJob.title}" has been successfully logged with Gemini AI Mediation.`,
        "dispute",
        "⚖️ Dispute Filed Successfully"
      );

      setComplaintText("");
    } catch (e) {
      console.error("Complaint error:", e);
      showToast("Failed to submit dispute. Please try again.", "error", "Submission Failed");
    } finally {
      setSubmittingComplaint(false);
    }
  };

  // 5b. Handle Payment Inquiry Support Ticket
  const handleSubmitInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryPayment) return;

    setSubmittingInquiry(true);
    try {
      const selectedJob = {
        title: inquiryPayment.jobTitle,
        wage: inquiryPayment.amount,
        employerId: inquiryPayment.employerId,
        employerName: inquiryPayment.employerName
      };

      const fullInquiryText = `[Payment Inquiry: ${inquiryReason}] ${inquiryDetails}`;

      // Call Gemini for instant fair mediation advisory
      const response = await fetch("/api/gemini/analyze-complaint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaintText: fullInquiryText,
          raisedBy: "worker",
          jobTitle: selectedJob.title,
          wage: selectedJob.wage
        })
      });
      const aiAdvice = await response.json();

      // Write complaint log to firestore
      const compId = `comp-${user.uid}-${Date.now()}`;
      const newComplaint: Complaint = {
        id: compId,
        jobId: inquiryPayment.jobId || "unknown",
        jobTitle: selectedJob.title,
        workerId: user.uid,
        workerName: user.name || "Worker",
        employerId: selectedJob.employerId || "unknown",
        employerName: selectedJob.employerName || "Employer",
        raisedBy: "worker",
        description: fullInquiryText,
        aiRecommendation: aiAdvice.analysis + " Recommendations: " + aiAdvice.recommendations.join(" | "),
        status: "open",
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, "complaints", compId), newComplaint);
      setComplaints(prev => [newComplaint, ...prev]);

      // Add an in-app notification about the new ticket/complaint automatically
      const newNotif = {
        id: `notif-inquiry-${Date.now()}`,
        title: `🎫 Ticket Opened: ${inquiryReason}`,
        message: `Support ticket #${compId.substring(compId.length - 6).toUpperCase()} has been submitted. Our Gemini Advisor is mediating.`,
        date: "Just Now",
        read: false
      };
      setNotifications(prev => [newNotif, ...prev]);

      showToast(
        `Support ticket for "${selectedJob.title}" has been successfully opened.`,
        "success",
        "🎫 Ticket Opened Successfully"
      );

      setInquiryPayment(null);
    } catch (err) {
      console.error("Payment inquiry error:", err);
      showToast("Failed to open support ticket. Please try again.", "error", "Submission Failed");
    } finally {
      setSubmittingInquiry(false);
    }
  };

  // 6. Gemini Coach Conversational Learning Chat
  const handleSendChatMessage = async () => {
    if (!chatMessage.trim()) return;
    const userMsg = chatMessage;
    setChatMessage("");
    setChatHistory(prev => [...prev, { role: "user", text: userMsg }]);
    setChatLoading(true);

    try {
      const payloadHistory = chatHistory.map(h => ({
        role: h.role === "user" ? "user" : "model",
        text: h.text
      }));

      const response = await fetch("/api/gemini/learning-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          chatHistory: payloadHistory,
          trade: user.trade
        })
      });

      const data = await response.json();
      if (data.reply) {
        setChatHistory(prev => [...prev, { role: "guru", text: data.reply }]);
      }
    } catch (e) {
      console.error("Learning chat error:", e);
      setChatHistory(prev => [...prev, { role: "guru", text: "I'm sorry, I could not connect. Please try again!" }]);
    } finally {
      setChatLoading(false);
    }
  };

  // 7. Gemini Safety Task Checklist Generator
  const handleGenerateSafetyChecklist = async (taskName: string) => {
    if (!taskName.trim()) return;
    setIsGeneratingChecklist(true);
    setChecklistError(null);
    setCheckedSafetyItems({});
    try {
      const response = await fetch("/api/gemini/safety-checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: taskName })
      });
      if (!response.ok) {
        throw new Error("Failed to generate safety checklist");
      }
      const data = await response.json();
      setSafetyChecklist(data);
    } catch (e: any) {
      console.error("Safety checklist generation error:", e);
      setChecklistError(e.message || "Failed to generate safety checklist. Please try again.");
    } finally {
      setIsGeneratingChecklist(false);
    }
  };

  // Savings Goal Handlers
  const handleAddSavingsGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim() || !goalTarget) return;

    setSavingLoading(true);
    setGoalSuccessMsg("");

    try {
      const goalId = `sg-${user.uid}-${Date.now()}`;
      const newGoal: SavingsGoal = {
        id: goalId,
        workerId: user.uid,
        title: goalTitle,
        targetAmount: Number(goalTarget),
        currentSaved: 0,
        allocatedPercentage: Number(goalAllocPercent),
        createdAt: new Date().toISOString(),
        category: goalCategory
      };

      await setDoc(doc(db, "savings_goals", goalId), newGoal);
      setSavingsGoals(prev => [...prev, newGoal]);
      setGoalTitle("");
      setGoalTarget("");
      setGoalSuccessMsg("Savings goal created successfully!");
      
      setTimeout(() => setGoalSuccessMsg(""), 4000);
    } catch (e) {
      console.error("Error creating savings goal:", e);
    } finally {
      setSavingLoading(false);
    }
  };

  const handleDepositToGoal = async (goalId: string) => {
    const amountStr = manualSavedAmount[goalId];
    if (!amountStr) return;
    const amount = Number(amountStr);
    if (isNaN(amount) || amount <= 0) return;

    try {
      const goal = savingsGoals.find(g => g.id === goalId);
      if (!goal) return;

      const updatedGoal: SavingsGoal = {
        ...goal,
        currentSaved: Math.min(goal.targetAmount, goal.currentSaved + amount)
      };

      await setDoc(doc(db, "savings_goals", goalId), updatedGoal);
      setSavingsGoals(prev => prev.map(g => g.id === goalId ? updatedGoal : g));
      setManualSavedAmount(prev => ({ ...prev, [goalId]: "" }));
    } catch (e) {
      console.error("Error depositing to goal:", e);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      await deleteDoc(doc(db, "savings_goals", goalId));
      setSavingsGoals(prev => prev.filter(g => g.id !== goalId));
    } catch (e) {
      console.error("Error deleting goal:", e);
      setSavingsGoals(prev => prev.filter(g => g.id !== goalId));
    }
  };

  // Filter and Search logic for Jobs list
  const filteredJobs = jobs.filter(j => {
    const matchesTrade = tradeFilter === "All" || j.trade === tradeFilter;
    const matchesSearch = (j.title || "").toLowerCase().includes((searchQuery || "").toLowerCase()) || 
                          (j.location || "").toLowerCase().includes((searchQuery || "").toLowerCase()) ||
                          (j.employerName || "").toLowerCase().includes((searchQuery || "").toLowerCase());
    return matchesTrade && matchesSearch && j.status === "open";
  });

  // Calculate earnings analytics
  const totalEarned = wagePayments.reduce((acc, curr) => curr.status === "paid" ? acc + curr.amount : acc, 0);
  const pendingWages = wagePayments.reduce((acc, curr) => curr.status === "pending" ? acc + curr.amount : acc, 0);
  
  // Advanced Cumulative Earnings data for line/area chart
  const getSavingsChartData = () => {
    const paidPayments = wagePayments.filter(p => p.status === "paid");
    if (paidPayments.length > 0) {
      let cumulativeSum = 0;
      const sortedPaid = [...paidPayments]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
      return sortedPaid.map((p, index) => {
        cumulativeSum += p.amount;
        const formattedDate = p.date ? new Date(p.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : `Day ${index + 1}`;
        return {
          name: formattedDate,
          "Daily Earnings": p.amount,
          "Cumulative Wealth": cumulativeSum
        };
      });
    } else {
      return [
        { name: "Jun 1", "Daily Earnings": 850, "Cumulative Wealth": 850 },
        { name: "Jun 5", "Daily Earnings": 950, "Cumulative Wealth": 1800 },
        { name: "Jun 10", "Daily Earnings": 900, "Cumulative Wealth": 2700 },
        { name: "Jun 15", "Daily Earnings": 850, "Cumulative Wealth": 3550 },
        { name: "Jun 20", "Daily Earnings": 950, "Cumulative Wealth": 4500 },
        { name: "Jun 25", "Daily Earnings": 900, "Cumulative Wealth": 5400 },
      ];
    }
  };
  
  const chartData = getSavingsChartData();

  // Aggregate monthly earnings for the last 6 months
  const getLast6MonthsEarnings = () => {
    const paidPayments = wagePayments.filter(p => p.status === "paid");
    const monthsData = [];
    const currentDate = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthLabel = d.toLocaleDateString(undefined, { month: 'short' });
      monthsData.push({
        name: monthLabel,
        "Monthly Income": 0,
        year: d.getFullYear(),
        month: d.getMonth(),
      });
    }

    paidPayments.forEach(p => {
      if (!p.date) return;
      const pDate = new Date(p.date);
      const pYear = pDate.getFullYear();
      const pMonth = pDate.getMonth();
      
      const targetMonth = monthsData.find(m => m.year === pYear && m.month === pMonth);
      if (targetMonth) {
        targetMonth["Monthly Income"] += p.amount;
      }
    });

    const totalAggregated = monthsData.reduce((sum, m) => sum + m["Monthly Income"], 0);
    if (totalAggregated === 0) {
      // Fallback trend values
      const fallbackValues = [4500, 5200, 4800, 6100, 5800, 7200];
      monthsData.forEach((m, idx) => {
        m["Monthly Income"] = fallbackValues[idx] || 5000;
      });
    }

    return monthsData.map(m => ({
      name: m.name,
      "Monthly Income": m["Monthly Income"]
    }));
  };

  const last6MonthsEarningsData = getLast6MonthsEarnings();

  // Get filtered chronological wage disbursements for notifications timeline
  const getTimelinePayments = () => {
    let payments = [...wagePayments];
    if (payments.length === 0) {
      // High fidelity fallback items so it's always testable
      payments = [
        {
          id: "fallback-wp-1",
          jobId: "job-1",
          jobTitle: "Senior Masonry Supervisor",
          workerId: user.uid,
          workerName: user.name || "Worker",
          employerId: "emp-1",
          employerName: "Metro Build Corp Ltd",
          amount: 850,
          date: "2026-07-04",
          status: "paid",
          transactionId: "IMPS9834281A",
          notes: "Excellent shift, safety standards cleared perfectly."
        },
        {
          id: "fallback-wp-2",
          jobId: "job-2",
          jobTitle: "Plastering Assistant",
          workerId: user.uid,
          workerName: user.name || "Worker",
          employerId: "emp-2",
          employerName: "Rajesh Builders & Contractors",
          amount: 720,
          date: "2026-07-02",
          status: "paid",
          transactionId: "UPI209485741",
          notes: "Shift completed on time. Digital signature verified."
        },
        {
          id: "fallback-wp-3",
          jobId: "job-3",
          jobTitle: "Bricklaying Contract",
          workerId: user.uid,
          workerName: user.name || "Worker",
          employerId: "emp-1",
          employerName: "Metro Build Corp Ltd",
          amount: 600,
          date: "2026-06-29",
          status: "paid",
          transactionId: "NEFT8472910B",
          notes: "Approved by Site Foreman."
        },
        {
          id: "fallback-wp-4",
          jobId: "job-4",
          jobTitle: "Foundation Concrete Pouring",
          workerId: user.uid,
          workerName: user.name || "Worker",
          employerId: "emp-3",
          employerName: "Shiva Foundations",
          amount: 900,
          date: "2026-07-05",
          status: "pending",
          notes: "Shift under verification by Site supervisor."
        },
        {
          id: "fallback-wp-5",
          jobId: "job-5",
          jobTitle: "Tile Placement",
          workerId: user.uid,
          workerName: user.name || "Worker",
          employerId: "emp-4",
          employerName: "Elegant Designs Ltd",
          amount: 650,
          date: "2026-06-25",
          status: "rejected",
          notes: "Foreman reported non-attendance. Disputed by worker."
        }
      ];
    }

    // Apply status filter
    if (wageTimelineFilter !== 'all') {
      payments = payments.filter(p => p.status === wageTimelineFilter);
    }

    // Apply search
    if (wageTimelineSearch.trim()) {
      const q = wageTimelineSearch.toLowerCase();
      payments = payments.filter(p => 
        p.jobTitle.toLowerCase().includes(q) || 
        p.employerName.toLowerCase().includes(q) || 
        (p.transactionId && p.transactionId.toLowerCase().includes(q))
      );
    }

    // Sort by date descending
    return uniqById(payments).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  // Employer Breakdown for PieChart
  const getEmployerBreakdown = () => {
    const paidPayments = wagePayments.filter(p => p.status === "paid");
    if (paidPayments.length > 0) {
      const counts: {[key: string]: number} = {};
      paidPayments.forEach(p => {
        counts[p.employerName] = (counts[p.employerName] || 0) + p.amount;
      });
      return Object.keys(counts).map(name => ({
        name: name.split(" ")[0] || name,
        value: counts[name]
      }));
    } else {
      return [
        { name: "Metro Build", value: 3500 },
        { name: "Rajesh Sharma", value: 1900 },
      ];
    }
  };

  const employerBreakdownData = getEmployerBreakdown();

  // Savings progress calculations
  const totalSaved = savingsGoals.reduce((acc, curr) => acc + curr.currentSaved, 0);
  const totalSavingsTarget = savingsGoals.reduce((acc, curr) => acc + curr.targetAmount, 0);
  const savingsPercentage = totalSavingsTarget > 0 ? Math.round((totalSaved / totalSavingsTarget) * 100) : 0;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 bg-slate-100 min-h-screen text-slate-900">
      
      {/* Offline sync banner */}
      {isOffline && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="mb-6 p-4 bg-gradient-to-r from-rose-50 to-amber-50 border border-rose-200/60 shadow-lg rounded-xl text-xs flex items-start space-x-3 relative overflow-hidden"
        >
          {/* Decorative glowing backdrops */}
          <div className="absolute -top-12 -left-12 w-24 h-24 bg-rose-200/30 rounded-full filter blur-xl pointer-events-none animate-pulse" />
          <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-amber-200/20 rounded-full filter blur-xl pointer-events-none animate-pulse" />

          <div className="p-2.5 bg-rose-500 text-white rounded-xl shadow-md shrink-0 flex items-center justify-center relative">
            <motion.div
              animate={{ 
                rotate: [0, 10, -10, 10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 4,
                ease: "easeInOut"
              }}
            >
              <WifiOff className="w-5 h-5 text-white filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]" />
            </motion.div>
          </div>

          <div className="space-y-1 z-10">
            <p className="font-extrabold uppercase tracking-widest text-[10px] text-rose-700 flex items-center gap-1.5">
              <span>⚠️</span>
              OPERATING SECURELY IN OFFLINE MODE
            </p>
            <p className="text-slate-700 leading-relaxed font-semibold">
              Low network coverage detected. Your safety check-ins, shift completions, and grievances are being <b>safely stored in your device's offline database</b>. They will automatically sync to the contractor's server as soon as you reach solid cellular reception.
            </p>
            <div className="inline-flex items-center space-x-2 bg-rose-500/10 text-rose-800 px-3 py-1 rounded-full font-mono text-[9px] mt-2 font-bold uppercase tracking-wider border border-rose-200/40">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <span>Cloud Queue: Ready & Secured (Will Auto-Sync on Signal Detect)</span>
            </div>
          </div>
        </motion.div>
      )}

      {(activeTab === "worker-dashboard" || activeTab === "dashboard") && (
        <>
          {/* Real-time Job Alerts & Notification Permission Card */}
          <div className="mb-6 bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
            <Bell className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Real-Time Local Job Alerts
              <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Active Match
              </span>
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Get notified immediately when a contractor posts a job in <strong className="text-slate-800 font-semibold">{user.location || "your location"}</strong> matching your trade (<strong className="text-indigo-600 font-semibold">{user.trade || "any trade"}</strong>) or skills.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {notificationPermission === "granted" ? (
            <span className="text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded flex items-center gap-1.5 font-mono">
              <Check className="w-4 h-4 text-emerald-600" />
              Alerts Enabled
            </span>
          ) : notificationPermission === "denied" ? (
            <div className="text-right">
              <span className="text-xs font-black uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded flex items-center gap-1.5 font-mono">
                <BellOff className="w-4 h-4 text-amber-600" />
                Alerts Blocked
              </span>
            </div>
          ) : (
            <button
              onClick={requestNotificationPermission}
              className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded hover:bg-indigo-700 shadow-xs hover:shadow-sm transition uppercase tracking-wider flex items-center gap-2 cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" />
              Enable Alerts
            </button>
          )}

          {/* Test Match Button */}
          <button
            onClick={() => {
              if (user.notificationPrefEnabled === false) {
                showToast("Real-time job alerts are currently disabled in your profile settings!", "error");
                return;
              }
              const demoJob: Job = {
                id: `demo-${Date.now()}`,
                employerId: "demo-emp",
                employerName: "Metro Build Corp",
                title: `${user.trade || "Mason"} Assistant Needed Immediately`,
                trade: user.trade || "Mason",
                description: `Urgent requirement for a skilled hand to assist with ongoing local structural masonry and cement works. Standard daily payout.`,
                location: user.location || "Central Area",
                wage: 950,
                startDate: new Date().toISOString().split("T")[0],
                endDate: new Date().toISOString().split("T")[0],
                slots: 2,
                slotsTaken: 0,
                status: "open",
                createdAt: new Date().toISOString()
              };
              triggerNotification(demoJob);
            }}
            className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-250 rounded uppercase tracking-wider flex items-center gap-1 cursor-pointer"
            title="Test a simulated job match notification"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" />
            Test Alert
          </button>


        </div>
      </div>

      <div className="mb-6">
        <WorkerLifecycleFlowchart 
          user={user} 
          applications={applications} 
          attendance={attendance} 
          wagePayments={wagePayments} 
        />
      </div>
      
      {/* 1. Worker Profile Highlights (Aesthetic Bento Cards) */}
      <motion.section 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6"
      >
        
        {/* Worker Badge */}
        <motion.div 
          variants={itemVariants}
          className="bg-slate-900 border border-slate-800 text-white rounded-lg p-5 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 px-2 py-0.5 rounded">
                Verified Worker
              </span>
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => setIsSettingsModalOpen(true)}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                  title="Profile Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <div className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-750 px-2 py-0.5 rounded border border-slate-700 transition-all">
                  <span className="text-[10px] font-mono text-slate-300">
                    ID: {user.uid.slice(0, 8)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(user.uid);
                      showToast("Worker ID copied to clipboard!", "success");
                    }}
                    className="p-0.5 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                    title="Copy full ID to clipboard"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
            
            <h2 className="text-xl font-black mt-3 tracking-tight text-white uppercase">{user.name}</h2>
            <p className="text-slate-300 font-bold text-xs mt-1">{user.trade || "General Worker"} • {user.experience || "Fresher"}</p>
            
            <div className="flex items-center space-x-1.5 mt-2.5 bg-slate-800/50 p-1.5 px-2 rounded border border-slate-800 inline-flex">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
              <span className="text-xs font-black text-amber-400">
                {user.averageRating ? `${user.averageRating} / 5` : "No ratings"}
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                ({user.ratingCount || 0} reviews)
              </span>
            </div>

            <p className="text-slate-400 text-xs mt-3 leading-normal">
              {user.bio || "Describe your skills using our AI Profile Builder below to attract employers!"}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
            <div>
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Expectation</span>
              <span className="text-sm font-bold text-amber-500">{user.wageExpectation || 600} / Day</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Contact</span>
              <span className="text-sm font-bold text-slate-200">{user.phone}</span>
            </div>
          </div>
        </motion.div>

        {/* AI Profile Assistant Card */}
        <motion.div 
          variants={itemVariants}
          className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center space-x-2 text-slate-900">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-xs tracking-tight uppercase">AI Voice / Text Profile Builder</h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Speak or write simply about your work. Gemini will structure it professionally for contractors!
            </p>
            <textarea
              placeholder="e.g., I have been laying tiles for 3 years, also know painting and general cement mixing. Always reach site early..."
              value={bioInput}
              onChange={(e) => setBioInput(e.target.value)}
              className="w-full mt-3 p-2.5 text-xs border border-slate-250 rounded focus:outline-hidden focus:border-slate-900 h-24 resize-none bg-slate-50 text-slate-900"
            />
            <VoiceInputButton value={bioInput} onChange={setBioInput} className="mt-2" fieldName="Profile" />
          </div>

          <div className="mt-3">
            {profileSuccessMsg && (
              <p className="text-[10px] text-emerald-800 font-bold mb-2 flex items-center bg-emerald-50 p-1.5 rounded border border-emerald-150">
                <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> {profileSuccessMsg}
              </p>
            )}
            <button
              onClick={handleOptimizeProfile}
              disabled={generatingBio || !bioInput.trim()}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wide rounded transition-all shadow-xs flex items-center justify-center cursor-pointer"
            >
              {generatingBio ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  AI is optimizing...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                  Generate AI Professional Profile
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Dynamic Check-in Area */}
        <motion.div 
          variants={itemVariants}
          className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2 text-slate-800">
                <Compass className="w-4 h-4 text-slate-600" />
                <h3 className="font-bold text-xs uppercase tracking-tight">Active Job Check-In</h3>
              </div>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${isCheckedIn ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"} uppercase`}>
                {isCheckedIn ? "Checked-In" : "Offline"}
              </span>
            </div>

            {activeJob ? (
              <div className="mt-3 space-y-1.5">
                <p className="text-xs font-bold text-slate-900 leading-tight uppercase">{activeJob.title}</p>
                <p className="text-[10px] text-slate-500 flex items-center">
                  <MapPin className="w-3 h-3 mr-1" /> {activeJob.location}
                </p>
                <p className="text-xs font-black text-amber-600">Daily wage: ₹{activeJob.wage}</p>
                {isCheckedIn && activeCheckInRecord && (
                  <div className="space-y-1 w-full mt-1.5">
                    <p className="text-[10px] text-emerald-800 font-bold flex flex-wrap items-center justify-between gap-1 bg-emerald-50 p-1.5 rounded border border-emerald-100 w-full">
                      <span className="flex items-center">
                        <Clock className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Logged at: {activeCheckInRecord.checkInTime}
                      </span>
                      {isOffline && (
                        <span className="bg-amber-100 text-amber-800 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded animate-pulse font-mono shrink-0">
                          Saved Locally
                        </span>
                      )}
                    </p>
                    {activeCheckInRecord.checkInLatitude !== undefined && activeCheckInRecord.checkInLongitude !== undefined && (
                      <p className="text-[9px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-1.5 flex items-center font-mono">
                        <MapPin className="w-3.5 h-3.5 text-indigo-600 mr-1.5 shrink-0" />
                        <span>GPS Verified: {activeCheckInRecord.checkInLatitude.toFixed(5)}, {activeCheckInRecord.checkInLongitude.toFixed(5)}</span>
                      </p>
                    )}
                    {activeCheckInRecord.locationLogs && activeCheckInRecord.locationLogs.length > 0 && (
                      <div className="mt-1.5 p-1.5 bg-indigo-50 border border-indigo-100 rounded w-full space-y-1 text-[9px]">
                        <p className="font-bold text-indigo-800 flex items-center uppercase tracking-wider">
                          <MapPin className="w-3 h-3 text-indigo-600 mr-1 animate-pulse" /> Presence Logs ({activeCheckInRecord.locationLogs.length}):
                        </p>
                        <div className="max-h-[80px] overflow-y-auto space-y-0.5 font-mono text-slate-600 divide-y divide-indigo-50">
                          {activeCheckInRecord.locationLogs.map((log, idx) => (
                            <p key={idx} className="flex justify-between py-0.5">
                              <span>⏱️ {log.time}</span>
                              <span className="font-bold text-indigo-700">{log.latitude.toFixed(5)}, {log.longitude.toFixed(5)}</span>
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                You are currently not hired or active. Find and apply for a trade job in the jobs panel below!
              </p>
            )}

            {isLocating && (
              <div className="mt-2.5 flex items-center space-x-2 text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-2 py-1 font-bold animate-pulse uppercase tracking-wider">
                <span className="h-1.5 w-1.5 bg-indigo-600 rounded-full animate-ping shrink-0" />
                <span>Requesting GPS Geolocation...</span>
              </div>
            )}

            {locationError && (
              <div className="mt-2.5 text-[9px] text-amber-600 bg-amber-50 border border-amber-100 rounded px-2 py-1 font-bold uppercase tracking-wide">
                ⚠️ {locationError}
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2">
            {activeJob && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setShowPreshiftModal(true)}
                    disabled={isCheckedIn}
                    className={`py-1.5 px-3 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center transition-all cursor-pointer ${
                      isCheckedIn
                        ? "bg-slate-100 text-slate-400 border border-slate-200"
                        : "bg-slate-900 hover:bg-slate-800 text-white shadow-xs"
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 mr-1" /> Check-In
                  </button>
                  <button
                    onClick={handleCheckOut}
                    disabled={!isCheckedIn}
                    className={`py-1.5 px-3 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center transition-all cursor-pointer ${
                      !isCheckedIn
                        ? "bg-slate-100 text-slate-400 border border-slate-200"
                        : "bg-red-600 hover:bg-red-700 text-white shadow-xs"
                    }`}
                  >
                    Check-Out
                  </button>
                </div>
                {isCheckedIn && (
                  <button
                    onClick={handleLogLocation}
                    disabled={isLocating}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-black uppercase tracking-wider flex items-center justify-center transition-all cursor-pointer shadow-xs border border-emerald-500 hover:shadow-md"
                  >
                    <MapPin className="w-3.5 h-3.5 mr-1.5" /> Log Current Location
                  </button>
                )}
                {!isCheckedIn && (
                  <button
                    onClick={() => {
                      setQrCodeInput("");
                      setQrScannerError(null);
                      setScanSuccess(false);
                      setIsScanning(false);
                      setShowQrScanner(true);
                    }}
                    className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded text-xs font-black uppercase tracking-wider flex items-center justify-center transition-all cursor-pointer shadow-xs border border-amber-400"
                  >
                    <QrCode className="w-3.5 h-3.5 mr-1.5" /> Scan QR Check-In
                  </button>
                )}
                <button
                  onClick={() => triggerQuickContact(activeJob)}
                  className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-black uppercase tracking-wider flex items-center justify-center transition-all cursor-pointer shadow-xs"
                >
                  <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Quick Contact Builder
                </button>
              </>
            )}
          </div>
        </motion.div>

        {/* Unique Personal Site Entry QR Code Card */}
        <motion.div 
          variants={itemVariants}
          className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2 text-slate-800">
                <QrCode className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-xs tracking-tight uppercase">Digital Entry Pass</h3>
              </div>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 uppercase animate-pulse">
                Active QR
              </span>
            </div>
            
            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
              Show this pass at the gate. Contractors can scan it to instantly verify your identity and log your shift check-in.
            </p>
            
            {/* QR Image Box */}
            <div className="flex flex-col items-center justify-center my-4 p-3.5 bg-slate-50 rounded-lg border border-slate-100 relative group">
              {personalQrUrl ? (
                <>
                  <div className="bg-white p-1.5 rounded-md shadow-xs border border-slate-200/50">
                    <img 
                      src={personalQrUrl} 
                      alt="Site Entry QR Pass" 
                      className="w-28 h-28 object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="text-[9px] font-mono font-bold text-slate-500 mt-2 uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-slate-200 shadow-3xs flex items-center gap-1">
                    <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full" />
                    PASSID: {user.uid.slice(0, 8)}
                  </div>
                </>
              ) : (
                <div className="w-28 h-28 flex flex-col items-center justify-center text-slate-400 gap-1.5">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-amber-500 border-t-transparent"></div>
                  <span className="text-[9px] font-bold">Creating Pass...</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2 mt-auto">
            <div className="bg-slate-50 border border-slate-200 rounded p-2 text-[10px] text-slate-600 leading-normal">
              🌐 <strong>Gate Verification:</strong> Includes verified trade, contact number, and Aadhaar-matched identity credentials.
            </div>
            <button
              onClick={() => {
                if (!personalQrUrl) return;
                const link = document.createElement("a");
                link.href = personalQrUrl;
                link.download = `Empowork_Site_Pass_${user.name.replace(/\s+/g, "_")}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                showToast("Personal entry pass downloaded!", "success");
              }}
              disabled={!personalQrUrl}
              className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wide rounded transition-all shadow-xs flex items-center justify-center cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Download Pass
            </button>
          </div>
        </motion.div>

      </motion.section>
        </>
      )}

      {/* 2. Worker Core Functionalities Tabs */}
      {/* Tab content renders below */}
      <AnimatePresence mode="wait">
        {activeTab === "worker-profile" && (
          <motion.section
            key="worker-profile"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left"
          >
            {/* Left Column: Identity Card & Aadhaar/Bank */}
            <div className="lg:col-span-1 space-y-4">
              {/* Identity Badge */}
              <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-5 shadow-sm">
                <span className="text-[10px] font-mono font-black uppercase tracking-wider bg-amber-500 text-slate-950 px-2 py-0.5 rounded">
                  Verified Trade Identity
                </span>
                <h2 className="text-xl font-black mt-3 tracking-tight text-white uppercase">{user.name}</h2>
                <p className="text-slate-300 font-bold text-xs mt-1">{user.trade || "General Helper"} • {user.experience || "1 Year"}</p>
                
                <div className="flex items-center space-x-1.5 mt-2.5 bg-slate-800/50 p-1.5 px-2 rounded border border-slate-800 inline-flex">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
                  <span className="text-xs font-black text-amber-400">
                    {user.averageRating ? `${user.averageRating} / 5` : "No ratings"}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    ({user.ratingCount || 0} reviews)
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Expectation</span>
                    <span className="text-sm font-bold text-amber-500">₹{user.wageExpectation || 600} / Day</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Phone</span>
                    <span className="text-sm font-bold text-slate-200">{user.phone}</span>
                  </div>
                </div>
              </div>

              {/* Verification & KYC (Aadhaar/Bank details) */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="font-bold text-xs text-slate-900 uppercase tracking-tight flex items-center">
                  <ShieldCheck className="w-4 h-4 mr-1.5 text-emerald-600" />
                  Labor KYC & Bank Verification
                </h3>

                {/* Aadhaar */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Aadhaar Card (UIDAI)</span>
                    <button
                      onClick={() => {
                        if (isAadhaarEditing) {
                          setAadhaarNumber(aadhaarInput);
                          showToast("Aadhaar Number submitted for verification update!", "success");
                        } else {
                          setAadhaarInput(aadhaarNumber === "•••• •••• 9812" ? "1234 5678 9812" : aadhaarNumber);
                        }
                        setIsAadhaarEditing(!isAadhaarEditing);
                      }}
                      className="text-[10px] font-bold text-indigo-650 hover:text-indigo-850 uppercase cursor-pointer"
                    >
                      {isAadhaarEditing ? "Verify & Save" : "Edit Details"}
                    </button>
                  </div>
                  {isAadhaarEditing ? (
                    <input
                      type="text"
                      value={aadhaarInput}
                      onChange={(e) => setAadhaarInput(e.target.value)}
                      className="w-full p-2 text-xs border border-slate-250 rounded bg-white font-mono text-slate-900 font-bold"
                    />
                  ) : (
                    <p className="text-xs font-mono font-black text-slate-900">{aadhaarNumber}</p>
                  )}
                  <span className="text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 font-bold uppercase inline-block">
                    Verified Bio-metric Status
                  </span>
                </div>

                {/* Bank Transfer details */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Wage Payout Account</span>
                    <button
                      onClick={() => {
                        if (isBankEditing) {
                          setBankAccount(bankInput);
                          showToast("Wage deposit account details saved!", "success");
                        } else {
                          setBankInput(bankAccount === "••••••••5432" ? "309485745432" : bankAccount);
                        }
                        setIsBankEditing(!isBankEditing);
                      }}
                      className="text-[10px] font-bold text-indigo-650 hover:text-indigo-850 uppercase cursor-pointer"
                    >
                      {isBankEditing ? "Save Account" : "Edit Account"}
                    </button>
                  </div>
                  {isBankEditing ? (
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        placeholder="Account Number"
                        value={bankInput}
                        onChange={(e) => setBankInput(e.target.value)}
                        className="w-full p-2 text-xs border border-slate-250 rounded bg-white font-mono text-slate-900 font-bold"
                      />
                      <input
                        type="text"
                        placeholder="Bank Name"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full p-2 text-xs border border-slate-250 rounded bg-white text-slate-900 font-bold"
                      />
                      <input
                        type="text"
                        placeholder="IFSC Code"
                        value={bankIfsc}
                        onChange={(e) => setBankIfsc(e.target.value)}
                        className="w-full p-2 text-xs border border-slate-250 rounded bg-white font-mono text-slate-900 font-bold"
                      />
                    </div>
                  ) : (
                    <div className="text-xs space-y-1 font-medium">
                      <p className="font-mono font-black text-slate-900">Acc: {bankAccount}</p>
                      <p className="text-slate-600">{bankName}</p>
                      <p className="font-mono text-slate-500 text-[10px]">IFSC: {bankIfsc}</p>
                    </div>
                  )}
                  <span className="text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 font-bold uppercase inline-block">
                    Enabled for Direct Bank Transfer
                  </span>
                </div>
              </div>
            </div>

            {/* Center/Right Column: Bio, Skill Badges & Reviews */}
            <div className="lg:col-span-2 space-y-4">
              {/* Professional Bio with Gemini optimizing */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <h3 className="font-bold text-xs uppercase tracking-tight text-slate-900">Verify and Optimize Professional Bio</h3>
                </div>
                <p className="text-xs text-slate-500">
                  Current bio: <span className="font-semibold text-slate-700">"{user.bio || 'Not provided yet'}"</span>
                </p>
                
                <div className="pt-2">
                  <textarea
                    placeholder="Type details about your daily trade experience, locations, and special projects. AI will polish it!"
                    value={bioInput}
                    onChange={(e) => setBioInput(e.target.value)}
                    className="w-full p-2.5 text-xs border border-slate-250 rounded focus:outline-hidden focus:border-slate-900 h-20 resize-none bg-slate-50 text-slate-900"
                  />
                  <VoiceInputButton value={bioInput} onChange={setBioInput} className="mt-2" fieldName="Profile Bio" />
                </div>

                {profileSuccessMsg && (
                  <p className="text-[10px] text-emerald-800 font-bold flex items-center bg-emerald-50 p-1.5 rounded border border-emerald-150">
                    <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> {profileSuccessMsg}
                  </p>
                )}

                <button
                  onClick={handleOptimizeProfile}
                  disabled={generatingBio || !bioInput.trim()}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded flex items-center justify-center cursor-pointer"
                >
                  {generatingBio ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Generating Professional Bio...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                      Structure with Gemini AI Profile Engine
                    </>
                  )}
                </button>
              </div>

              {/* Skill Badges */}
              <VerifiedSkillBadges user={user} onUpdateProfile={onUpdateProfile} />

              {/* Employer Reviews Feed */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="font-bold text-xs text-slate-900 uppercase tracking-tight flex items-center">
                  <Star className="w-4 h-4 mr-1.5 text-amber-500 fill-amber-500" />
                  Contractor Feedback & Performance Log
                </h3>
                
                <div className="space-y-3">
                  {uniqById<Review>(reviews).length > 0 ? (
                    uniqById<Review>(reviews).map((rev) => (
                      <div key={rev.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-800 uppercase">{rev.employerName}</span>
                          <div className="flex items-center space-x-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${
                                  i < rev.rating ? "text-amber-500 fill-amber-500" : "text-slate-200"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 italic">"{rev.comment}"</p>
                        <span className="text-[9px] font-mono font-bold text-slate-400 block uppercase">{rev.createdAt?.split("T")[0]}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      No contractor reviews yet. Excellent check-in attendance will earn you five-star feedback!
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {activeTab === "worker-applications" && (
          <motion.section
            key="worker-applications"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 text-left"
          >
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center">
                <FileText className="w-5 h-5 text-indigo-650 mr-2" />
                My Submitted Applications
              </h2>
              <p className="text-xs text-slate-500">Track the approval status of your registrations with local contractors</p>
            </div>

            <div className="space-y-3">
              {uniqById<JobApplication>(applications).length > 0 ? (
                uniqById<JobApplication>(applications).map((app) => (
                  <div key={app.id} className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5 text-left">
                      <span className="text-[9px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded uppercase">
                        {app.workerTrade || "Masonry"}
                      </span>
                      <h3 className="text-xs font-black text-slate-900 uppercase leading-snug">{app.jobTitle}</h3>
                      <p className="text-xs text-slate-600 font-medium">Employer: <strong>{app.employerName}</strong></p>
                      {app.note && (
                        <p className="text-[11px] text-slate-500 italic mt-1 pl-2.5 border-l-2 border-slate-300">
                          "{app.note}"
                        </p>
                      )}
                      <p className="text-[9px] font-mono font-bold text-slate-400 uppercase">Applied: {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : "N/A"}</p>
                    </div>

                    <div className="flex flex-col sm:items-end gap-2 shrink-0">
                      <span className={`px-2.5 py-1 rounded text-xs font-black uppercase tracking-wider text-center ${
                        app.status === "accepted"
                          ? "bg-emerald-100 text-emerald-800"
                          : app.status === "rejected"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        {app.status === "accepted" ? "✓ Accepted / Hired" : app.status === "rejected" ? "✕ Rejected" : "⏱ Pending Approval"}
                      </span>
                      
                      {app.status === "accepted" && (
                        <button
                          onClick={() => setActiveTab("attendance")}
                          className="py-1 px-2.5 bg-slate-900 hover:bg-slate-800 text-amber-500 font-bold text-[10px] rounded uppercase tracking-wider cursor-pointer"
                        >
                          Check-In Shift
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-400 space-y-3">
                  <FileText className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-xs font-black uppercase tracking-wider">No job registrations found</p>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">You haven't applied for any local trade contracts yet. Head to the "Find Jobs" tab to search active openings!</p>
                  <button
                    onClick={() => setActiveTab("jobs")}
                    className="px-4 py-2 bg-slate-900 text-amber-500 hover:bg-slate-800 rounded font-bold text-xs uppercase tracking-wider cursor-pointer"
                  >
                    Browse Active Contracts
                  </button>
                </div>
              )}
            </div>
          </motion.section>
        )}

        {activeTab === "worker-earnings" && (
          <motion.section
            key="worker-earnings"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="space-y-4 text-left"
          >
            {/* Section Header */}
            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <h2 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center">
                <Coins className="w-5 h-5 text-amber-500 mr-2" />
                Wage, Earnings & Savings Planner
              </h2>
              <p className="text-xs text-slate-500">Analyze your career payouts history, model automated savings targets, and track builder receipts</p>
            </div>

            {/* Financial Metrics Indicators Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Career Wealth</span>
                  <span className="text-xl font-black text-slate-900 block mt-0.5">₹{totalEarned}</span>
                </div>
                <div className="w-10 h-10 rounded bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <Coins className="w-5 h-5" />
                </div>
              </div>
              
              <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Unpaid / Locked Income</span>
                  <span className="text-xl font-black text-slate-900 block mt-0.5">₹{pendingWages}</span>
                </div>
                <div className="w-10 h-10 rounded bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                  <Clock className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Saved in Active Goals</span>
                  <span className="text-xl font-black text-amber-600 block mt-0.5">₹{totalSaved} <span className="text-xs text-slate-400 font-medium">/ ₹{totalSavingsTarget}</span></span>
                </div>
                <div className="w-10 h-10 rounded bg-amber-50 flex items-center justify-center text-amber-500">
                  <PiggyBank className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Goals Completion Rate</span>
                  <span className="text-xl font-black text-slate-900 block mt-0.5">{savingsPercentage}%</span>
                </div>
                <div className="w-10 h-10 rounded bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <Target className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Graphical and Interactive Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Left Panel: Earnings Chart and Savings Goals list */}
              <div className="lg:col-span-2 space-y-4">
                {/* Accumulated Wealth Curve */}
                <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="font-bold text-xs text-slate-900 uppercase tracking-tight">Accumulated Wealth Over Time</h3>
                      <p className="text-[10px] text-slate-400 uppercase">Growth curve of verified contractor payments</p>
                    </div>
                    <div className="flex items-center space-x-1.5 bg-slate-100 px-2 py-1 rounded text-[10px] font-bold text-slate-600 border border-slate-200">
                      <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                      <span>Cumulative Value</span>
                    </div>
                  </div>
                  <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorCumulativeEarningsTab" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: "#0f172a", borderRadius: "6px", border: "none" }} 
                          labelStyle={{ color: "#94a3b8", fontWeight: "bold", fontSize: "10px" }}
                          itemStyle={{ color: "#f59e0b", fontSize: "11px" }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="Cumulative Wealth" 
                          stroke="#f59e0b" 
                          strokeWidth={3} 
                          fillOpacity={1} 
                          fill="url(#colorCumulativeEarningsTab)" 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="Daily Earnings" 
                          stroke="#0f172a" 
                          strokeWidth={1.5} 
                          strokeDasharray="4 4"
                          fill="none" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 6-Month Earnings Trend Chart */}
                <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="font-bold text-xs text-slate-900 uppercase tracking-tight">Monthly Income Trend (Last 6 Months)</h3>
                      <p className="text-[10px] text-slate-400 uppercase">Monthly aggregates of cleared daily wages</p>
                    </div>
                    <div className="flex items-center space-x-1.5 bg-slate-100 px-2 py-1 rounded text-[10px] font-bold text-slate-600 border border-slate-200">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Monthly Income</span>
                    </div>
                  </div>
                  <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={last6MonthsEarningsData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: "#0f172a", borderRadius: "6px", border: "none" }} 
                          labelStyle={{ color: "#94a3b8", fontWeight: "bold", fontSize: "10px" }}
                          itemStyle={{ color: "#10b981", fontSize: "11px" }}
                        />
                        <Bar 
                          dataKey="Monthly Income" 
                          fill="#10b981" 
                          radius={[4, 4, 0, 0]}
                          maxBarSize={45}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Savings Goals List and Creator */}
                <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-5">
                  <div className="border-b border-slate-100 pb-5">
                    <h3 className="font-bold text-xs text-slate-900 uppercase tracking-tight flex items-center">
                      <Target className="w-4 h-4 mr-1.5 text-amber-500" />
                      Set a New Potential Savings Goal
                    </h3>
                    
                    <form onSubmit={handleAddSavingsGoal} className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">What are you saving for?</label>
                        <input 
                          type="text"
                          required
                          placeholder="e.g., Cement Mixer, Wife's treatment, Kid's tuition"
                          value={goalTitle}
                          onChange={(e) => setGoalTitle(e.target.value)}
                          className="w-full text-xs p-2 border border-slate-200 rounded bg-slate-50 focus:outline-hidden focus:border-slate-900 font-medium text-slate-900 font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Target Amount (₹)</label>
                        <input 
                          type="number"
                          required
                          min="100"
                          placeholder="₹ Target"
                          value={goalTarget}
                          onChange={(e) => setGoalTarget(e.target.value)}
                          className="w-full text-xs p-2 border border-slate-200 rounded bg-slate-50 focus:outline-hidden focus:border-slate-900 font-bold text-slate-900"
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          type="submit"
                          disabled={savingLoading}
                          className="w-full py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold text-xs rounded uppercase tracking-wider flex items-center justify-center cursor-pointer h-[34px]"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Lock Goal
                        </button>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Goal Category</label>
                        <select
                          value={goalCategory}
                          onChange={(e) => setGoalCategory(e.target.value as any)}
                          className="w-full text-xs p-2 border border-slate-200 rounded bg-white focus:outline-hidden text-slate-700 font-bold cursor-pointer"
                        >
                          <option value="tools">🛠️ Professional Trade Tools / Safety gear</option>
                          <option value="health">🏥 Family Health & Medical Emergency</option>
                          <option value="family">🏡 Home Construction & Land lease</option>
                          <option value="education">📚 Children Education & Training</option>
                          <option value="festival">🎉 Family Festive & Marriage Savings</option>
                          <option value="other">📌 Other General Reserve</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Daily Earmark Rate (% of shifts income)</label>
                        <select
                          value={goalAllocPercent}
                          onChange={(e) => setGoalAllocPercent(e.target.value)}
                          className="w-full text-xs p-2 border border-slate-200 rounded bg-white focus:outline-hidden text-slate-700 font-bold cursor-pointer"
                        >
                          <option value="10">10% of Daily Wage (Slow & Steady)</option>
                          <option value="15">15% of Daily Wage (Recommended)</option>
                          <option value="20">20% of Daily Wage (Fast Savings)</option>
                          <option value="30">30% of Daily Wage (Aggressive)</option>
                          <option value="40">40% of Daily Wage (Priority Target)</option>
                        </select>
                      </div>
                    </form>

                    {goalSuccessMsg && (
                      <p className="mt-2 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 p-2 rounded uppercase tracking-wide">
                        ✓ {goalSuccessMsg}
                      </p>
                    )}
                  </div>

                  {/* Active Goals Grid */}
                  <div>
                    <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-wider mb-4">Your Active Savings Roadmaps</h4>
                    
                    {uniqById<SavingsGoal>(savingsGoals).length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {uniqById<SavingsGoal>(savingsGoals).map(goal => {
                          const percent = Math.min(100, Math.round((goal.currentSaved / goal.targetAmount) * 100));
                          const dailyWage = user.wageExpectation || 800;
                          const dailyAlloc = dailyWage * (goal.allocatedPercentage / 100);
                          const remaining = goal.targetAmount - goal.currentSaved;
                          const daysRequired = remaining > 0 ? Math.ceil(remaining / dailyAlloc) : 0;

                          return (
                            <div key={goal.id} className="border border-slate-200 bg-slate-50 p-4 rounded-lg flex flex-col justify-between hover:border-slate-300 transition-colors relative">
                              <button
                                onClick={() => handleDeleteGoal(goal.id)}
                                className="absolute top-3 right-3 text-slate-300 hover:text-red-500 transition-colors cursor-pointer"
                                title="Delete Goal"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>

                              <div className="space-y-2 text-left">
                                <div className="flex items-center space-x-1.5">
                                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-slate-900 text-amber-500 rounded">
                                    {goal.category === "tools" && "🛠️ Tools"}
                                    {goal.category === "health" && "🏥 Health"}
                                    {goal.category === "family" && "🏡 Family"}
                                    {goal.category === "education" && "📚 Education"}
                                    {goal.category === "festival" && "🎉 Festive"}
                                    {goal.category === "other" && "📌 Reserve"}
                                  </span>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase">
                                    Allocating {goal.allocatedPercentage}%
                                  </span>
                                </div>

                                <h5 className="font-black text-slate-900 uppercase text-xs leading-tight pr-6 mt-1">{goal.title}</h5>

                                <div className="pt-2">
                                  <div className="flex justify-between text-[11px] font-bold mb-1">
                                    <span className="text-slate-500">Saved: ₹{goal.currentSaved}</span>
                                    <span className="text-slate-900">Target: ₹{goal.targetAmount}</span>
                                  </div>
                                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                    <div 
                                      className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                                      style={{ width: `${percent}%` }}
                                    />
                                  </div>
                                  <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                                    <span>Goal Achieved</span>
                                    <span className="font-bold text-amber-600">{percent}%</span>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-3">
                                {remaining > 0 ? (
                                  <p className="text-[10px] text-slate-500 italic leading-snug text-left">
                                    💡 At your trade rate of ₹{dailyWage}/day, you will complete this in approx. <strong className="text-slate-800 font-bold">{daysRequired} shifts</strong>.
                                  </p>
                                ) : (
                                  <div className="flex items-center space-x-1 text-emerald-700 bg-emerald-50 border border-emerald-100 p-1 px-2 rounded font-bold text-[10px] uppercase tracking-wide">
                                    <Award className="w-3.5 h-3.5" />
                                    <span>Goal Achieved & Fully Funded!</span>
                                  </div>
                                )}

                                {remaining > 0 && (
                                  <div className="flex items-center space-x-2 mt-2">
                                    <input 
                                      type="number"
                                      placeholder="Add savings ₹"
                                      value={manualSavedAmount[goal.id] || ""}
                                      onChange={(e) => setManualSavedAmount(prev => ({...prev, [goal.id]: e.target.value}))}
                                      className="text-[10px] p-1.5 w-24 border border-slate-200 rounded focus:outline-hidden font-bold"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleDepositToGoal(goal.id)}
                                      className="py-1 px-2 bg-slate-900 hover:bg-slate-800 text-amber-500 rounded font-black text-[10px] uppercase tracking-wider cursor-pointer"
                                    >
                                      Deposit
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-8 border border-dashed border-slate-200 rounded-lg text-center">
                        <AlertCircle className="w-5 h-5 text-slate-400 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-500 uppercase">No goals locked yet.</p>
                        <p className="text-xs text-slate-400">Lock your first tool purchase or medical reserve goal above!</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Panel: Employer Breakdowns & History receipts */}
              <div className="space-y-4">
                {/* Earnings Snapshot */}
                <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
                  <h3 className="font-bold text-xs text-slate-900 uppercase tracking-tight">Earnings Snapshot</h3>
                  
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="bg-slate-900 border border-slate-800 p-3 rounded">
                      <span className="text-[10px] text-slate-400 uppercase block font-bold">Total Paid</span>
                      <span className="text-lg font-black text-amber-500 block">₹{totalEarned}</span>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 p-3 rounded">
                      <span className="text-[10px] text-amber-800 uppercase block font-bold">Pending</span>
                      <span className="text-lg font-black text-slate-900 block">₹{pendingWages}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Completed Shifts</span>
                      <span className="font-bold text-slate-900">{attendance.filter(r => r.status === "approved").length}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Unpaid Days</span>
                      <span className="font-bold text-slate-900">{wagePayments.filter(p => p.status === "pending").length}</span>
                    </div>
                  </div>
                </div>

                {/* Graphical earnings visualizer */}
                <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs h-60 flex flex-col justify-between">
                  <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-wider">Daily Earnings Curve</h4>
                  <div className="w-full h-36">
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorWageEarningsTab" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                          <Tooltip />
                          <Area type="monotone" dataKey="Daily Earnings" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorWageEarningsTab)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400">
                        No earnings completed yet.
                      </div>
                    )}
                  </div>
                </div>

                {/* Employer Income Breakdown donut chart */}
                <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-xs text-slate-900 uppercase tracking-tight">Income Distribution</h3>
                    <p className="text-[10px] text-slate-400 uppercase">Share of paychecks by contractor entity</p>
                  </div>
                  
                  <div className="w-full h-44 my-2 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={employerBreakdownData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {employerBreakdownData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={["#0f172a", "#f59e0b", "#10b981", "#6366f1"][index % 4]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: "10px", fontWeight: "bold" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Wage receipts list card */}
                <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4 text-left">
                  <div className="border-b border-slate-100 pb-2">
                    <h3 className="font-bold text-xs text-slate-900 uppercase tracking-tight flex items-center">
                      <FileText className="w-4 h-4 mr-1.5 text-indigo-650" />
                      Recent Direct Deposit Slips
                    </h3>
                    <p className="text-[10px] text-slate-400 uppercase">Bank verification transaction receipts</p>
                  </div>
                  
                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
                    {uniqById<WagePayment>(wagePayments).length > 0 ? (
                      uniqById<WagePayment>(wagePayments).map((p) => (
                        <div key={p.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs font-medium">
                          <div className="space-y-0.5">
                            <p className="font-black text-slate-900 uppercase leading-tight">{p.jobTitle}</p>
                            <p className="text-[10px] text-slate-400 uppercase font-bold">{p.employerName} • {p.date}</p>
                            <p className="font-mono text-[9px] text-indigo-600 font-bold">TXN ID: #{p.id.slice(0, 10)}</p>
                          </div>
                          <div className="text-right space-y-1">
                            <span className="text-sm font-black text-slate-900 block">₹{p.amount}</span>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                              p.status === "paid" 
                                ? "bg-emerald-100 text-emerald-800" 
                                : "bg-amber-100 text-amber-800 animate-pulse"
                            }`}>
                              {p.status}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-slate-400 text-[11px]">
                        No verified bank payouts registered yet. Direct wage payouts are dispatched automatically at check-out!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {activeTab === "worker-notifications" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left/Main Column - Feeds Container */}
            <div className="lg:col-span-2 space-y-6">
              {/* In-App Notification Feed */}
              <motion.section
                key="worker-notifications-feed"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 text-left h-fit"
              >
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center">
                      <Bell className="w-5 h-5 text-amber-500 mr-2" />
                      In-App Notification Feed
                    </h2>
                    <p className="text-xs text-slate-500">Stay updated on local matches, dispute resolutions, and application updates</p>
                  </div>
                  {notifications.some(n => !n.read) && (
                    <button
                      onClick={() => {
                        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                        showToast("All notifications marked as read!", "success");
                      }}
                      className="px-2.5 py-1 text-[10px] font-bold text-indigo-700 hover:text-white border border-indigo-200 hover:bg-indigo-600 rounded uppercase tracking-wider cursor-pointer"
                    >
                      Mark All as Read
                    </button>
                  )}
                </div>

                <div className="space-y-2.5">
                  {uniqById<any>(notifications).length > 0 ? (
                    uniqById<any>(notifications).map((notif) => {
                      const isWageDisbursement = notif.title === "💰 Wage Credited" || notif.id.startsWith("wp-paid-");
                      return (
                        <div
                          key={notif.id}
                          className={`p-3.5 border rounded-lg flex items-start gap-3 transition-colors ${
                            notif.read ? "bg-white border-slate-200 text-slate-700" : "bg-indigo-50/40 border-indigo-150 text-slate-900 shadow-3xs"
                          }`}
                        >
                          <div className={`p-1.5 rounded-full mt-0.5 ${
                            isWageDisbursement 
                              ? "bg-emerald-100 text-emerald-700" 
                              : notif.read 
                              ? "bg-slate-100 text-slate-500" 
                              : "bg-indigo-100 text-indigo-700"
                          }`}>
                            {isWageDisbursement ? <Coins className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 space-y-0.5 text-left">
                            <div className="flex justify-between items-center">
                              <h4 className="text-xs font-black uppercase leading-tight">{notif.title}</h4>
                              <span className="text-[9px] font-mono font-bold text-slate-400 uppercase">{notif.date}</span>
                            </div>
                            <p className="text-xs text-slate-500 leading-normal font-medium">{notif.message}</p>
                            {isWageDisbursement && (
                              <div className="pt-2">
                                <button
                                  onClick={() => {
                                    setActiveTab("worker-earnings");
                                    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
                                  }}
                                  className="px-2 py-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Coins className="w-3 h-3" />
                                  View Earnings Panel
                                </button>
                              </div>
                            )}
                          </div>
                          {!notif.read && (
                            <button
                              onClick={() => {
                                setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
                              }}
                              className="text-[9px] font-bold text-slate-400 hover:text-slate-800 uppercase shrink-0"
                            >
                              Dismiss
                            </button>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-10 text-slate-400">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                      <p className="text-xs font-black uppercase tracking-wider">Your inbox is completely clear!</p>
                      <p className="text-xs text-slate-500 mt-1">We will notify you here the second a new job matches or a payment drops.</p>
                    </div>
                  )}
                </div>
              </motion.section>

              {/* Wage History Feed & Chronological Timeline */}
              <motion.section
                key="worker-wage-history-feed"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25, ease: "easeOut", delay: 0.05 }}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 text-left"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center">
                      <Coins className="w-5 h-5 text-emerald-600 mr-2" />
                      Wage History Feed & Chronological Timeline
                    </h2>
                    <p className="text-xs text-slate-500">Scrollable timeline of previous wage disbursement alerts & certified payslips</p>
                  </div>
                </div>

                {/* Filters and search */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search by job title or contractor name..."
                      value={wageTimelineSearch}
                      onChange={(e) => setWageTimelineSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-250 rounded bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-slate-900"
                    />
                    {wageTimelineSearch && (
                      <button 
                        onClick={() => setWageTimelineSearch("")} 
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[10px] font-bold"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Status Filters */}
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-md">
                    <Filter className="w-3 h-3 text-slate-400 ml-1.5 mr-1" />
                    <div className="flex gap-1 flex-1">
                      {(['all', 'paid', 'pending', 'rejected'] as const).map((filterValue) => (
                        <button
                          key={filterValue}
                          onClick={() => setWageTimelineFilter(filterValue)}
                          className={`flex-1 text-[9px] font-bold uppercase tracking-wider py-1 rounded transition-colors cursor-pointer ${
                            wageTimelineFilter === filterValue
                              ? "bg-slate-900 text-white"
                              : "text-slate-500 hover:bg-slate-150"
                          }`}
                        >
                          {filterValue}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Timeline Items */}
                <div className="space-y-1 max-h-[420px] overflow-y-auto pr-2 scrollbar-thin">
                  {getTimelinePayments().length > 0 ? (
                    getTimelinePayments().map((pay, idx, arr) => {
                      const isPaid = pay.status === "paid";
                      const isPending = pay.status === "pending";
                      const isRejected = pay.status === "rejected";
                      const isLast = idx === arr.length - 1;

                      return (
                        <div key={pay.id} className="relative pl-7 pb-5">
                          {/* Left Timeline Line */}
                          {!isLast && (
                            <div className="absolute left-3 top-4 bottom-0 w-0.5 bg-slate-100" />
                          )}

                          {/* Timeline bullet */}
                          <div className="absolute left-1 top-2.5 w-4.5 h-4.5 rounded-full border border-slate-200 bg-white flex items-center justify-center shadow-3xs z-10">
                            <div className={`w-2.5 h-2.5 rounded-full ${
                              isPaid ? "bg-emerald-500" : isPending ? "bg-amber-500 animate-pulse" : "bg-rose-500"
                            }`} />
                          </div>

                          {/* Timeline Card */}
                          <div className="p-3.5 border border-slate-150 rounded-lg hover:border-slate-300 bg-white transition-all shadow-3xs hover:shadow-2xs text-left">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                                    {pay.date}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-[4px] text-[8px] font-black uppercase tracking-wider ${
                                    isPaid 
                                      ? "bg-emerald-50 text-emerald-750 border border-emerald-150" 
                                      : isPending 
                                      ? "bg-amber-50 text-amber-750 border border-amber-150" 
                                      : "bg-rose-50 text-rose-750 border border-rose-150"
                                  }`}>
                                    {pay.status === "paid" ? "💰 Paid" : pay.status === "pending" ? "⏱ Pending" : "✕ Disputed"}
                                  </span>
                                </div>
                                <h4 className="text-xs font-black text-slate-900 uppercase leading-snug">{pay.jobTitle}</h4>
                                <p className="text-[11px] text-slate-600 font-medium">Employer: <strong>{pay.employerName}</strong></p>
                                {pay.notes && (
                                  <p className="text-[10px] text-slate-500 italic font-medium leading-normal pl-2 border-l border-slate-200 mt-1">
                                    "{pay.notes}"
                                  </p>
                                )}
                              </div>

                              <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                                <div className="text-left sm:text-right">
                                  <span className="text-base font-black text-slate-900">₹{pay.amount}</span>
                                  {pay.transactionId && (
                                    <span className="font-mono text-[9px] text-indigo-655 block font-bold uppercase tracking-wide">
                                      Ref: {pay.transactionId}
                                    </span>
                                  )}
                                </div>
                                <div className="flex sm:flex-col gap-1.5 w-full sm:w-auto">
                                  <button
                                    onClick={() => {
                                      setSelectedWageSlip(pay);
                                    }}
                                    className="flex-1 sm:w-full px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-500 hover:text-amber-400 font-bold text-[10px] rounded uppercase tracking-wider transition-colors inline-flex items-center justify-center gap-1 cursor-pointer shadow-3xs"
                                  >
                                    <Receipt className="w-3.5 h-3.5" />
                                    View Payslip
                                  </button>
                                  <button
                                    onClick={() => {
                                      setInquiryPayment(pay);
                                      setInquiryReason("Amount mismatch");
                                      setInquiryDetails(`Inquiry regarding wage payment of ₹${pay.amount} for ${pay.jobTitle} on ${pay.date}. (Transaction Ref: ${pay.transactionId || "N/A"}).`);
                                    }}
                                    className="flex-1 sm:w-full px-2.5 py-1.5 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[10px] rounded uppercase tracking-wider transition-colors inline-flex items-center justify-center gap-1 cursor-pointer shadow-3xs"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                                    Inquire
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 text-slate-400 space-y-2 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                      <AlertCircle className="w-6 h-6 mx-auto text-slate-300" />
                      <p className="text-xs font-black uppercase tracking-wider">No matching wage alerts found</p>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto">Try adjusting your filters or search term to discover previous records.</p>
                    </div>
                  )}
                </div>
              </motion.section>
            </div>

            {/* Right Column - Notification Settings Panel */}
            <motion.section
              key="worker-notifications-settings"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: "easeOut", delay: 0.05 }}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-5 text-left h-fit"
            >
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center">
                  <Settings className="w-4 h-4 text-indigo-650 mr-2" />
                  Alert Settings
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Customize how you receive alerts when your daily wages are processed.</p>
              </div>

              <div className="space-y-4">
                {/* Push Toggle */}
                <div className="flex items-start justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div className="flex gap-2.5">
                    <div className="p-1.5 rounded-full bg-indigo-50 text-indigo-700 mt-0.5 shrink-0">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-xs font-bold text-slate-900 cursor-pointer block">In-App Alerts</label>
                      <span className="text-[10px] text-slate-500 leading-normal block">Instant alerts in your dashboard feed</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotifyWagesPush(!notifyWagesPush)}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      notifyWagesPush ? "bg-emerald-600" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        notifyWagesPush ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* SMS Toggle */}
                <div className="flex items-start justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div className="flex gap-2.5">
                    <div className="p-1.5 rounded-full bg-emerald-50 text-emerald-700 mt-0.5 shrink-0">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-xs font-bold text-slate-900 cursor-pointer block">SMS Text Messages</label>
                      <span className="text-[10px] text-slate-500 leading-normal block">
                        Wage deposit SMS to <span className="font-mono font-bold text-slate-700">{user.phone || "(no phone)"}</span>
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotifyWagesSMS(!notifyWagesSMS)}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      notifyWagesSMS ? "bg-emerald-600" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        notifyWagesSMS ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Email Toggle */}
                <div className="flex items-start justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div className="flex gap-2.5">
                    <div className="p-1.5 rounded-full bg-amber-50 text-amber-700 mt-0.5 shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-xs font-bold text-slate-900 cursor-pointer block">Email Receipts</label>
                      <span className="text-[10px] text-slate-500 leading-normal block">
                        Direct wage invoices to <span className="font-mono font-bold text-slate-700">{user.email || "(no email)"}</span>
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotifyWagesEmail(!notifyWagesEmail)}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      notifyWagesEmail ? "bg-emerald-600" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        notifyWagesEmail ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Demo preview of a notification */}
              <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-lg space-y-1.5 text-[10px]">
                <span className="font-black text-amber-800 uppercase tracking-wider block">Live Alert Preview</span>
                <div className="bg-white border border-amber-100 p-2 rounded font-mono text-slate-600 leading-normal">
                  {notifyWagesPush && <p className="text-slate-900 font-bold mb-1">🔔 App: "💰 Wage Credited! ₹600 received."</p>}
                  {notifyWagesSMS && <p className="mb-1">💬 SMS: "EmpoWork: Your daily wage of ₹600 for Masonry has been credited. Ref ID: TXN89762."</p>}
                  {notifyWagesEmail && <p>📧 Email: "Salary payment slip issued for shifts completed on 05-Jul."</p>}
                  {!notifyWagesPush && !notifyWagesSMS && !notifyWagesEmail && (
                    <p className="text-slate-400 italic">All delivery channels muted. Turn on options above to stay informed.</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <button
                type="button"
                onClick={() => {
                  onUpdateProfile({
                    notifyWagesPush,
                    notifyWagesSMS,
                    notifyWagesEmail
                  });
                  showToast("Wage alert settings successfully saved!", "success");
                }}
                className="w-full py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded uppercase tracking-wider cursor-pointer text-center flex items-center justify-center gap-1.5 transition-all"
              >
                <CheckCircle className="w-4 h-4" />
                Save Alert Settings
              </button>
            </motion.section>
          </div>
        )}

        {/* Digital Signed Payslip Modal Dialog */}
        <AnimatePresence>
          {selectedWageSlip && (
            <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-55 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="bg-white border border-slate-200 shadow-xl rounded-xl max-w-md w-full overflow-hidden text-left relative"
              >
                {/* Header pattern */}
                <div className="bg-slate-900 text-white p-5 relative">
                  <button 
                    onClick={() => setSelectedWageSlip(null)}
                    className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-emerald-400">EMPOWORK SECURE DEPOSIT</span>
                      <h3 className="text-sm font-black uppercase tracking-tight">Verified Wage Payslip</h3>
                    </div>
                  </div>
                </div>

                {/* Payslip content body */}
                <div className="p-6 space-y-5">
                  <div className="border-b border-dashed border-slate-200 pb-4 flex justify-between items-start">
                    <div className="space-y-1 text-left">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Employer / Contracting Entity</span>
                      <p className="text-xs font-black text-slate-800 uppercase leading-tight">{selectedWageSlip.employerName}</p>
                      <p className="text-[10px] text-slate-500 font-medium">Digital Payroll Dispatch Division</p>
                    </div>
                    <div className="text-right space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Shift/Payout Date</span>
                      <p className="text-xs font-black text-slate-800 font-mono">{selectedWageSlip.date}</p>
                    </div>
                  </div>

                  {/* Wage Slip Details Grid */}
                  <div className="bg-slate-50 border border-slate-150 rounded-lg p-4 space-y-3.5 font-medium text-left">
                    <div className="flex justify-between text-xs border-b border-slate-200/50 pb-2">
                      <span className="text-slate-500">Contract Employee</span>
                      <span className="font-bold text-slate-800 uppercase">{selectedWageSlip.workerName || user.name || "Contract Worker"} (You)</span>
                    </div>
                    <div className="flex justify-between text-xs border-b border-slate-200/50 pb-2">
                      <span className="text-slate-500">Contract Reference</span>
                      <span className="font-bold text-slate-800 uppercase leading-none text-right">{selectedWageSlip.jobTitle}</span>
                    </div>
                    <div className="flex justify-between text-xs border-b border-slate-200/50 pb-2">
                      <span className="text-slate-500">Disbursement Method</span>
                      <span className="font-mono text-[11px] font-bold text-slate-800 flex items-center gap-1 uppercase">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        Direct Bank (SBI)
                      </span>
                    </div>
                    <div className="flex justify-between text-xs pb-1">
                      <span className="text-slate-500">Disbursement Status</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                        selectedWageSlip.status === "paid" 
                          ? "bg-emerald-100 text-emerald-800" 
                          : selectedWageSlip.status === "pending"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}>
                        {selectedWageSlip.status}
                      </span>
                    </div>
                  </div>

                  {/* Financial calculation breakout */}
                  <div className="space-y-2 border-t border-slate-100 pt-4 text-left">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Gross Day Shift Earnings</span>
                      <span className="font-bold text-slate-900">₹{selectedWageSlip.amount}.00</span>
                    </div>
                    <div className="flex justify-between text-xs font-medium text-amber-650">
                      <span>Less: Savings Auto-Lock (20%)</span>
                      <span className="font-bold">-₹{(selectedWageSlip.amount * 0.20).toFixed(0)}.00</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-900 text-white p-3.5 rounded-lg border border-slate-800 shadow-sm mt-3">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block leading-none">Net Dispatched</span>
                        <span className="text-[10px] text-emerald-400 font-mono font-medium block mt-1 uppercase">Cleared & Credited</span>
                      </div>
                      <span className="text-xl font-black text-emerald-400 font-mono">₹{(selectedWageSlip.amount * 0.80).toFixed(0)}.00</span>
                    </div>
                  </div>

                  {/* Verification footer with seal and signatures */}
                  <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-4 text-[10px]">
                    <div className="space-y-1 text-left">
                      <span className="text-slate-400 font-bold uppercase tracking-wider block">Transaction reference</span>
                      <span className="font-mono font-bold text-slate-800 block uppercase tracking-wide bg-slate-100 p-1 rounded border border-slate-150 text-center">
                        {selectedWageSlip.transactionId || "TXN9482103B"}
                      </span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-1.5 border border-emerald-100 bg-emerald-50/50 rounded-lg text-center space-y-0.5">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      <span className="font-black text-emerald-800 uppercase tracking-wider text-[8px] leading-tight">Secure Digital Signature</span>
                    </div>
                  </div>

                  {/* Download Action button */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() => {
                        showToast("Payslip receipt PDF downloaded successfully!", "success");
                      }}
                      className="py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-lg uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      Download PDF
                    </button>
                    <button
                      onClick={() => setSelectedWageSlip(null)}
                      className="py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg uppercase tracking-wider flex items-center justify-center transition-colors cursor-pointer"
                    >
                      Close Receipt
                    </button>
                    <button
                      onClick={() => {
                        const pay = selectedWageSlip;
                        setSelectedWageSlip(null);
                        setInquiryPayment(pay);
                        setInquiryReason("Amount mismatch");
                        setInquiryDetails(`Inquiry regarding wage payment of ₹${pay.amount} for ${pay.jobTitle} on ${pay.date}. (Transaction Ref: ${pay.transactionId || "N/A"}).`);
                      }}
                      className="col-span-2 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-150 font-bold text-xs rounded-lg uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Inquire About This Payment
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Payment Inquiry Modal Dialog */}
        <AnimatePresence>
          {inquiryPayment && (
            <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-55 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="bg-white border border-slate-200 shadow-xl rounded-xl max-w-md w-full overflow-hidden text-left relative"
              >
                {/* Header */}
                <div className="bg-slate-900 text-white p-5 relative">
                  <button 
                    onClick={() => setInquiryPayment(null)}
                    className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-indigo-400">EMPOWORK SECURE SUPPORT</span>
                      <h3 className="text-sm font-black uppercase tracking-tight">Open Payment Inquiry Ticket</h3>
                    </div>
                  </div>
                </div>

                {/* Inquiry Form */}
                <form onSubmit={handleSubmitInquiry} className="p-6 space-y-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Target wage record</span>
                    <div className="p-3 bg-slate-50 border border-slate-150 rounded-lg space-y-1">
                      <p className="text-xs font-black text-slate-800 uppercase leading-none">{inquiryPayment.jobTitle}</p>
                      <p className="text-[10px] text-slate-500 font-medium">Employer: <b>{inquiryPayment.employerName}</b></p>
                      <div className="flex justify-between items-center pt-1.5 border-t border-slate-200/50 mt-1.5 text-[10px] font-mono">
                        <span className="text-slate-500 font-medium">Date: {inquiryPayment.date}</span>
                        <span className="font-bold text-slate-800">Amount: ₹{inquiryPayment.amount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Inquiry Reason dropdown */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Reason for Inquiry</label>
                    <select
                      value={inquiryReason}
                      onChange={(e) => {
                        const reason = e.target.value;
                        setInquiryReason(reason);
                        setInquiryDetails(`Inquiry regarding wage payment of ₹${inquiryPayment.amount} for ${inquiryPayment.jobTitle} on ${inquiryPayment.date}. Issue: ${reason}. (Transaction Ref: ${inquiryPayment.transactionId || "N/A"}).`);
                      }}
                      required
                      className="w-full p-2 text-xs border border-slate-200 rounded bg-white text-slate-700 focus:outline-hidden focus:border-indigo-500"
                    >
                      <option value="Amount mismatch">Amount mismatch (Received less than expected)</option>
                      <option value="Delayed credit">Delayed credit (Status paid but not in bank)</option>
                      <option value="Incorrect hours recorded">Incorrect hours recorded</option>
                      <option value="Safety gear deduction dispute">Safety gear deduction dispute</option>
                      <option value="Other">Other payment issues</option>
                    </select>
                  </div>

                  {/* Inquiry Details textarea */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Inquiry Description</label>
                    <textarea
                      value={inquiryDetails}
                      onChange={(e) => setInquiryDetails(e.target.value)}
                      required
                      rows={4}
                      className="w-full p-2.5 text-xs border border-slate-250 rounded bg-white text-slate-800 focus:outline-hidden focus:border-indigo-500 leading-normal font-medium"
                      placeholder="Describe your payment issue in detail..."
                    />
                    <VoiceInputButton value={inquiryDetails} onChange={setInquiryDetails} className="mt-1" fieldName="Inquiry Details" />
                  </div>

                  {/* Actions buttons */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setInquiryPayment(null)}
                      className="py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-lg uppercase tracking-wider flex items-center justify-center transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingInquiry}
                      className="py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg uppercase tracking-wider flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {submittingInquiry ? "Opening Ticket..." : "Submit Ticket"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {activeTab === "worker-settings" && (
          <motion.section
            key="worker-settings"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-6 text-left"
          >
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center">
                <Settings className="w-5 h-5 text-indigo-650 mr-2" />
                Worker Console Settings
              </h2>
              <p className="text-xs text-slate-500">Customize your employment preferences, contact details, and platform alerts</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              {/* Preferences Form */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Account Preferences</h3>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Full Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full p-2.5 text-xs border border-slate-250 rounded focus:outline-hidden focus:border-slate-900 bg-slate-50 text-slate-900 font-bold"
                    placeholder="Ramesh Kumar"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Phone Number</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full p-2.5 text-xs border border-slate-250 rounded focus:outline-hidden focus:border-slate-900 bg-slate-50 text-slate-900 font-bold"
                    placeholder="e.g. 9876543210"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Primary Trade</label>
                    <select
                      value={editTrade}
                      onChange={(e) => setEditTrade(e.target.value)}
                      className="w-full p-2.5 text-xs border border-slate-250 rounded focus:outline-hidden focus:border-slate-900 bg-slate-50 text-slate-900 font-bold cursor-pointer"
                    >
                      <option value="Mason">Mason (राजमिस्त्री)</option>
                      <option value="Plumber">Plumber (प्लंबर)</option>
                      <option value="Carpenter">Carpenter (बढ़ई)</option>
                      <option value="Electrician">Electrician (बिजली मिस्त्री)</option>
                      <option value="Painter">Painter (पेंटर)</option>
                      <option value="Helper">General Helper (मददगार)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Expected Wage (₹ / Day)</label>
                    <input
                      type="number"
                      value={editWageExpectation}
                      onChange={(e) => setEditWageExpectation(Number(e.target.value))}
                      className="w-full p-2.5 text-xs border border-slate-250 rounded focus:outline-hidden focus:border-slate-900 bg-slate-50 text-slate-900 font-bold"
                      min="100"
                      max="5000"
                    />
                  </div>
                </div>

                {/* Alert pref toggle */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-indigo-700 font-mono block">Real-Time Job Alerts</label>
                      <p className="text-[10px] text-slate-500 leading-normal font-medium">
                        Enable instant mobile-like match alarms for local contractor contracts matching your skills.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditNotificationPref(!editNotificationPref)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        editNotificationPref ? "bg-indigo-650" : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          editNotificationPref ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateProfile({
                        name: editName,
                        phone: editPhone,
                        trade: editTrade,
                        wageExpectation: editWageExpectation,
                        notificationPrefEnabled: editNotificationPref
                      });
                      showToast("Profile settings and notification preferences saved inline!", "success");
                    }}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded uppercase tracking-wider cursor-pointer"
                  >
                    Save Settings
                  </button>
                </div>
              </div>

              {/* Language & Security Settings */}
              <div className="space-y-4 border-t md:border-t-0 md:border-l border-slate-150 pt-4 md:pt-0 md:pl-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Platform Security & Language</h3>
                
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Security Credentials</span>
                  <div className="space-y-1.5">
                    <input
                      type="password"
                      placeholder="Current Password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full p-2 text-xs border border-slate-250 rounded bg-white text-slate-950 font-mono"
                    />
                    <input
                      type="password"
                      placeholder="New Password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full p-2 text-xs border border-slate-250 rounded bg-white text-slate-950 font-mono"
                    />
                    <input
                      type="password"
                      placeholder="Confirm New Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full p-2 text-xs border border-slate-250 rounded bg-white text-slate-950 font-mono"
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (!currentPassword || !newPassword || !confirmPassword) {
                        showToast("Please fill all password fields!", "error");
                        return;
                      }
                      if (newPassword !== confirmPassword) {
                        showToast("Passwords do not match!", "error");
                        return;
                      }
                      showToast("Password updated successfully!", "success");
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                    className="py-1.5 px-3 bg-slate-800 hover:bg-slate-900 text-white font-bold text-[10px] rounded uppercase tracking-wider cursor-pointer"
                  >
                    Update Password
                  </button>
                </div>

                <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-lg space-y-2">
                  <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">System Language</span>
                  <p className="text-[11px] text-slate-500">Choose your language preference for audio transcriptions and translations:</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {["English (US)", "हिंदी (Hindi)", "ಕನ್ನಡ (Kannada)"].map((lang) => (
                      <span key={lang} className="px-2.5 py-1 bg-white border border-indigo-100 text-[10px] font-bold text-slate-700 rounded-full">
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {activeTab === "worker-tools" && (
          <motion.section
            key="worker-tools"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left"
          >
            {/* Left Column: Register New Tool with Receipt Upload */}
            <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-xs uppercase tracking-tight text-slate-900 flex items-center">
                    <Wrench className="w-4 h-4 text-indigo-650 mr-1.5" />
                    Register Professional Tool
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-1">Register verified assets to unlock higher wage-rate matches on sites</p>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!requestToolName.trim()) return;
                  const newTool = {
                    id: `tool-${Date.now()}`,
                    name: requestToolName,
                    category: requestToolCategory,
                    condition: requestToolCondition,
                    availability: "Active"
                  };
                  setTools(prev => [...prev, newTool]);
                  setRequestToolName("");
                  showToast(`Tool "${requestToolName}" successfully registered to your profile!`, "success");
                }} className="space-y-3 text-left">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Tool Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Laser Level, Plastering Trowel"
                      value={requestToolName}
                      onChange={(e) => setRequestToolName(e.target.value)}
                      className="w-full p-2 text-xs border border-slate-250 rounded focus:outline-hidden focus:border-slate-900 bg-slate-50 text-slate-900 font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Category</label>
                      <select
                        value={requestToolCategory}
                        onChange={(e) => setRequestToolCategory(e.target.value)}
                        className="w-full p-2 text-xs border border-slate-250 rounded focus:outline-hidden focus:border-slate-900 bg-white text-slate-700 cursor-pointer font-bold"
                      >
                        <option value="Masonry">Masonry</option>
                        <option value="Plumbing">Plumbing</option>
                        <option value="Electrical">Electrical</option>
                        <option value="Safety PPE">Safety PPE</option>
                        <option value="Excavation">Excavation</option>
                        <option value="General tools">General Tools</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Condition</label>
                      <select
                        value={requestToolCondition}
                        onChange={(e) => setRequestToolCondition(e.target.value)}
                        className="w-full p-2 text-xs border border-slate-250 rounded focus:outline-hidden focus:border-slate-900 bg-white text-slate-700 cursor-pointer font-bold"
                      >
                        <option value="New">New</option>
                        <option value="Good">Good</option>
                        <option value="Fair">Fair</option>
                      </select>
                    </div>
                  </div>

                  {/* FILE UPLOAD USABILITY PATTERN COMPLIANT (DRAG AND DROP + CLICK) */}
                  <div className="space-y-1 pt-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Upload Tool Certification / Receipt Photo</label>
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files[0];
                        if (file) {
                          setUploadedFileName(file.name);
                          showToast(`File "${file.name}" uploaded successfully via drag and drop!`, "success");
                        }
                      }}
                      className="border-2 border-dashed border-slate-200 hover:border-slate-900 rounded-lg p-4 text-center cursor-pointer transition bg-slate-50 hover:bg-slate-100 flex flex-col items-center justify-center space-y-1.5"
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = "image/*,application/pdf";
                        input.onchange = (e: any) => {
                          const file = e.target.files[0];
                          if (file) {
                            setUploadedFileName(file.name);
                            showToast(`File "${file.name}" uploaded successfully!`, "success");
                          }
                        };
                        input.click();
                      }}
                    >
                      <Upload className="w-5 h-5 text-slate-400" />
                      <p className="text-[11px] font-bold text-slate-600 uppercase">Drag & Drop or click to upload</p>
                      <p className="text-[9px] text-slate-400">PDF, JPG, or PNG (Max 5MB)</p>
                    </div>
                    {uploadedFileName && (
                      <p className="text-[10px] text-emerald-800 font-bold flex items-center bg-emerald-50 p-1 rounded border border-emerald-100 mt-1.5">
                        <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Uploaded: {uploadedFileName}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded transition-all cursor-pointer"
                  >
                    Add Registered Tool
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column: List of Certified Tools & Allocation Benefits */}
            <div className="lg:col-span-2 space-y-4 text-left">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="font-bold text-xs text-slate-900 uppercase tracking-tight">Your Registered Profile Assets</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {tools.map((t) => (
                    <div key={t.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                      <div className="space-y-0.5 text-left">
                        <span className="text-[9px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-150 px-1.5 py-0.5 rounded uppercase">
                          {t.category}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 uppercase pt-1">{t.name}</h4>
                        <p className="text-[10px] text-slate-500">Condition: <strong>{t.condition}</strong></p>
                      </div>
                      <button
                        onClick={() => {
                          setTools(prev => prev.filter(item => item.id !== t.id));
                          showToast(`Removed tool: "${t.name}"`, "info");
                        }}
                        className="text-[10px] text-red-650 hover:text-red-800 uppercase font-bold cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Asset benefits tips card */}
              <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 space-y-3">
                <span className="text-[9px] font-mono font-bold tracking-widest text-amber-500 block">ASSET-WAGE OVER LIABILITY BLUEPRINT</span>
                <h4 className="text-xs font-black uppercase leading-tight text-white">Why register your personal gear?</h4>
                <p className="text-xs text-slate-300 leading-normal">
                  Contractors and building operators in the Metro areas routinely reward labor crews who arrive with specialized certified equipment:
                </p>
                <div className="space-y-2 pt-1 font-sans text-xs">
                  <div className="flex items-start gap-2 text-slate-300">
                    <span className="text-amber-500 font-bold">•</span>
                    <span><b>+15% Daily Premium:</b> Bringing your own laser alignment tool or trowel gear cuts contractor rental logistics, increasing your daily wage from ₹800 to ₹920+ instantly.</span>
                  </div>
                  <div className="flex items-start gap-2 text-slate-300">
                    <span className="text-amber-500 font-bold">•</span>
                    <span><b>Priority Hiring Index:</b> Registered tools elevate your profile algorithm score on the EmpoWork match feed, resulting in 3x faster application approvals from builders.</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {(activeTab === "jobs") && (
          <motion.section
            ref={jobsSectionRef}
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="space-y-4"
          >

          {/* Employer Feedback & Endorsements */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
            <h3 className="font-black text-xs text-slate-900 uppercase tracking-tight mb-1 flex items-center">
              <Star className="w-4 h-4 mr-1.5 text-amber-500 fill-amber-500 shrink-0" /> Employer Feedback & Endorsements
            </h3>
            <p className="text-[11px] text-slate-500 mb-4">Official ratings and commendations submitted by verified builder contractors upon job completion.</p>

            {uniqById<Review>(reviews).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {uniqById<Review>(reviews).map((rev) => (
                  <div key={rev.id} className="border border-slate-150 p-3.5 rounded-lg bg-slate-50/50 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-[11px] font-bold text-slate-900 uppercase tracking-tight flex items-center space-x-1.5">
                          {renderStatusDot(rev.employerId, "xs")}
                          <span>{rev.employerName}</span>
                        </span>
                        <div className="flex items-center space-x-0.5 text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-mono text-[10px] font-black">
                          <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500 shrink-0" />
                          <span>{rev.rating}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">Job: {rev.jobTitle}</span>
                      {rev.comment ? (
                        <p className="text-xs text-slate-600 mt-2 italic leading-relaxed">
                          "{rev.comment}"
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 mt-2 italic">No comments provided.</p>
                      )}
                    </div>
                    <div className="text-[9px] text-slate-400 mt-3 pt-2 border-t border-slate-100 font-mono text-right">
                      {rev.createdAt ? rev.createdAt.split("T")[0] : "Recently received"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border border-dashed border-slate-200 bg-slate-50/30 rounded-lg">
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">No employer reviews yet.</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Complete your first job assignment to receive certified rating logs!</p>
              </div>
            )}
          </div>

          <div ref={jobsSectionRef} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-3.5 rounded border border-slate-200">
            <div>
              <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">{t("tradeJobsAvailable")}</h2>
              <p className="text-xs text-slate-500">{t("applyForHighPayingWages")}</p>
              
              {/* Geolocation API Status Indicator */}
              <div className="flex items-center space-x-2 mt-1.5 border-t border-slate-100 pt-1.5">
                <span className="text-[9px] uppercase font-bold text-slate-400">{t("gpsTracker")}:</span>
                {isWorkerLocating ? (
                  <span className="inline-flex items-center text-[9px] font-mono text-indigo-600 font-bold uppercase animate-pulse">
                    <Compass className="w-3 h-3 mr-1 animate-spin" /> {t("accessingGps")}
                  </span>
                ) : workerCoords ? (
                  <button 
                    onClick={fetchWorkerLocation}
                    className="inline-flex items-center text-[9px] font-mono text-emerald-700 bg-emerald-50/50 border border-emerald-150 px-2 py-0.5 rounded-full font-bold hover:bg-emerald-100 transition-all uppercase"
                    title="Click to refresh your real-time coordinates"
                  >
                    <span className="relative flex h-1.5 w-1.5 mr-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    {t("activeLat")}: {workerCoords.latitude.toFixed(4)}, Lng: {workerCoords.longitude.toFixed(4)} ↻
                  </button>
                ) : (
                  <button 
                    onClick={fetchWorkerLocation}
                    className="inline-flex items-center text-[9px] font-mono text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full font-bold hover:bg-amber-100 transition-all uppercase"
                    title="Click to enable GPS tracker"
                  >
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-1.5"></span>
                    {t("gpsOff")} ↻
                  </button>
                )}
              </div>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={t("searchJobsPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-4 py-1.5 text-xs border border-slate-200 rounded focus:outline-hidden focus:border-slate-900 w-48 bg-slate-50"
                />
              </div>

              <select
                value={tradeFilter}
                onChange={(e) => setTradeFilter(e.target.value)}
                className="p-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-hidden text-slate-700 font-medium"
              >
                <option value="All">All Trades</option>
                <option value="Mason">Mason</option>
                <option value="Plumber">Plumber</option>
                <option value="Electrician">Electrician</option>
                <option value="Carpenter">Carpenter</option>
                <option value="Painter">Painter</option>
                <option value="Helper">Helper</option>
              </select>
            </div>
          </div>

          {/* Jobs Listing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {uniqById<Job>(filteredJobs).length > 0 ? (
                uniqById<Job>(filteredJobs).map(job => {
                  const hasApplied = applications.some(a => a.jobId === job.id);
                  const application = applications.find(a => a.jobId === job.id);
                  
                  // Calculate live distance based on Geolocation API coordinates
                  const jobCoords = getJobCoordinates(job);
                  let distanceText = "";
                  if (workerCoords) {
                    const dist = calculateDistance(
                      workerCoords.latitude,
                      workerCoords.longitude,
                      jobCoords.latitude,
                      jobCoords.longitude
                    );
                    distanceText = dist < 1 
                      ? `${Math.round(dist * 1000)}m away` 
                      : `${dist.toFixed(1)} km away`;
                  }

                  return (
                    <motion.div
                      key={job.id}
                      layout
                      initial={{ opacity: 0, scale: 0.94, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.94, y: -20 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 26,
                        opacity: { duration: 0.2 }
                      }}
                      className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col justify-between hover:border-slate-350 hover:shadow-md transition-all duration-300"
                    >
                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-black px-2 py-0.5 bg-slate-900 text-amber-500 rounded uppercase tracking-wider">
                              {job.trade}
                            </span>
                            <h3 
                              onClick={() => { setDetailedJob(job); setIsDetailsModalOpen(true); }}
                              className="text-sm font-black text-slate-900 mt-2 leading-tight uppercase cursor-pointer hover:text-amber-600 transition-colors"
                            >
                              {job.title}
                            </h3>
                          </div>
                          <span className="text-base font-black text-slate-900">₹{job.wage}/Day</span>
                        </div>
   
                        <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-normal">
                          {job.description}
                        </p>
   
                        <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100 text-[11px] text-slate-500">
                          <span className="flex items-center flex-wrap gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 mr-1 shrink-0" /> 
                            <span className="truncate max-w-[130px] font-semibold">{job.location}</span>
                            {distanceText && (
                              <span 
                                className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-50 border border-indigo-150 text-indigo-700 font-mono shrink-0"
                                title={`Distance calculated live using device GPS`}
                              >
                                <Compass className="w-2.5 h-2.5 mr-0.5 text-indigo-500 animate-spin-slow" />
                                {distanceText}
                              </span>
                            )}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 mr-1" /> {job.startDate} to {job.endDate}
                          </span>
                          <span className="flex items-center space-x-1">
                            <User className="w-3.5 h-3.5 text-slate-400 mr-1" /> 
                            <span>Builder:</span>
                            {renderStatusDot(job.employerId, "xs")}
                            <span>{job.employerName}</span>
                          </span>
                          <span className="flex items-center font-bold text-slate-800">
                            <Check className="w-3.5 h-3.5 text-amber-500 mr-1 font-bold" /> {job.slots - job.slotsTaken} Slots Left
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col gap-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setDetailedJob(job); setIsDetailsModalOpen(true); }}
                            className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded uppercase tracking-wider transition-all cursor-pointer text-center border border-slate-200 h-[36px]"
                            type="button"
                          >
                            Details
                          </button>
                          {hasApplied ? (
                            <div className="flex-1">
                              <div className={`w-full py-2 rounded text-center font-extrabold text-[10px] flex items-center justify-center border h-[36px] uppercase tracking-wider ${
                                application?.status === "accepted"
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                  : application?.status === "rejected"
                                  ? "bg-red-50 border-red-200 text-red-800"
                                  : "bg-amber-50 border-amber-200 text-amber-800"
                              }`}>
                                {application?.status}
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => triggerApplyJob(job)}
                              className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded uppercase tracking-wider transition-all cursor-pointer h-[36px]"
                              type="button"
                            >
                              Quick Apply
                            </button>
                          )}
                        </div>
                        {hasApplied && application?.status === "accepted" && (
                          <button
                            onClick={() => triggerQuickContact(job)}
                            className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded uppercase tracking-wider flex items-center justify-center transition-all cursor-pointer shadow-xs"
                            type="button"
                          >
                            <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Quick Contact Builder
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <motion.div
                  key="no-jobs"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="col-span-full py-10 text-center bg-white border border-slate-200 rounded-lg"
                >
                  <AlertCircle className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-900 uppercase">{t("noJobsFound")}</p>
                  <p className="text-xs text-slate-500 mt-1">{t("tryChangingFilters")}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.section>
      )}

      {activeTab === "attendance" && (
        <motion.section
          ref={attendanceSectionRef}
          key="attendance"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="space-y-4"
        >
          {/* Section Header */}
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <div>
              <h2 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center">
                <Calendar className="w-5 h-5 text-amber-500 mr-2" />
                Attendance & Shifts History
              </h2>
              <p className="text-xs text-slate-500">Verify your active job check-ins, presence logs, and historical shifts</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Check-In Status Column */}
            <div className="lg:col-span-1 space-y-4">
                {/* Active Job Check-In Console */}
                <div 
                  className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2 text-slate-800">
                        <Compass className="w-4 h-4 text-slate-600" />
                        <h3 className="font-bold text-xs uppercase tracking-tight">Active Job Check-In</h3>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${isCheckedIn ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"} uppercase`}>
                        {isCheckedIn ? "Checked-In" : "Offline"}
                      </span>
                    </div>

                    {activeJob ? (
                      <div className="mt-3 space-y-1.5">
                        <p className="text-xs font-bold text-slate-900 leading-tight uppercase">{activeJob.title}</p>
                        <p className="text-[10px] text-slate-500 flex items-center">
                          <MapPin className="w-3 h-3 mr-1" /> {activeJob.location}
                        </p>
                        <p className="text-xs font-black text-amber-600">Daily wage: ₹{activeJob.wage}</p>
                        {isCheckedIn && activeCheckInRecord && (
                          <div className="space-y-1 w-full mt-1.5">
                            <p className="text-[10px] text-emerald-800 font-bold flex flex-wrap items-center justify-between gap-1 bg-emerald-50 p-1.5 rounded border border-emerald-100 w-full">
                              <span className="flex items-center">
                                <Clock className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Logged at: {activeCheckInRecord.checkInTime}
                              </span>
                              {isOffline && (
                                <span className="bg-amber-100 text-amber-800 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded animate-pulse font-mono shrink-0">
                                  Saved Locally
                                </span>
                              )}
                            </p>
                            {activeCheckInRecord.checkInLatitude !== undefined && activeCheckInRecord.checkInLongitude !== undefined && (
                              <p className="text-[9px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-1.5 flex items-center font-mono">
                                <MapPin className="w-3.5 h-3.5 text-indigo-600 mr-1.5 shrink-0" />
                                <span>GPS Verified: {activeCheckInRecord.checkInLatitude.toFixed(5)}, {activeCheckInRecord.checkInLongitude.toFixed(5)}</span>
                              </p>
                            )}
                            {activeCheckInRecord.locationLogs && activeCheckInRecord.locationLogs.length > 0 && (
                              <div className="mt-1.5 p-1.5 bg-indigo-50 border border-indigo-100 rounded w-full space-y-1 text-[9px]">
                                <p className="font-bold text-indigo-800 flex items-center uppercase tracking-wider">
                                  <MapPin className="w-3 h-3 text-indigo-600 mr-1 animate-pulse" /> Presence Logs ({activeCheckInRecord.locationLogs.length}):
                                </p>
                                <div className="max-h-[80px] overflow-y-auto space-y-0.5 font-mono text-slate-600 divide-y divide-indigo-50">
                                  {activeCheckInRecord.locationLogs.map((log, idx) => (
                                    <p key={idx} className="flex justify-between py-0.5">
                                      <span>⏱️ {log.time}</span>
                                      <span className="font-bold text-indigo-700">{log.latitude.toFixed(5)}, {log.longitude.toFixed(5)}</span>
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                        You are currently not hired or active. Find and apply for a trade job in the jobs panel!
                      </p>
                    )}

                    {isLocating && (
                      <div className="mt-2.5 flex items-center space-x-2 text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-2 py-1 font-bold animate-pulse uppercase tracking-wider">
                        <span className="h-1.5 w-1.5 bg-indigo-600 rounded-full animate-ping shrink-0" />
                        <span>Requesting GPS Geolocation...</span>
                      </div>
                    )}

                    {locationError && (
                      <div className="mt-2.5 text-[9px] text-amber-600 bg-amber-50 border border-amber-100 rounded px-2 py-1 font-bold uppercase tracking-wide">
                        ⚠️ {locationError}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 space-y-2">
                    {activeJob && (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setShowPreshiftModal(true)}
                            disabled={isCheckedIn}
                            className={`py-1.5 px-3 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center transition-all cursor-pointer ${
                              isCheckedIn
                                ? "bg-slate-100 text-slate-400 border border-slate-200"
                                : "bg-slate-900 hover:bg-slate-800 text-white shadow-xs"
                            }`}
                          >
                            <Play className="w-3.5 h-3.5 mr-1" /> Check-In
                          </button>
                          <button
                            onClick={handleCheckOut}
                            disabled={!isCheckedIn}
                            className={`py-1.5 px-3 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center transition-all cursor-pointer ${
                              !isCheckedIn
                                ? "bg-slate-100 text-slate-400 border border-slate-200"
                                : "bg-red-600 hover:bg-red-700 text-white shadow-xs"
                            }`}
                          >
                            Check-Out
                          </button>
                        </div>
                        {isCheckedIn && (
                          <button
                            onClick={handleLogLocation}
                            disabled={isLocating}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-black uppercase tracking-wider flex items-center justify-center transition-all cursor-pointer shadow-xs border border-emerald-500 hover:shadow-md"
                          >
                            <MapPin className="w-3.5 h-3.5 mr-1.5" /> Log Current Location
                          </button>
                        )}
                        {!isCheckedIn && (
                          <button
                            onClick={() => {
                              setQrCodeInput("");
                              setQrScannerError(null);
                              setScanSuccess(false);
                              setIsScanning(false);
                              setShowQrScanner(true);
                            }}
                            className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded text-xs font-black uppercase tracking-wider flex items-center justify-center transition-all cursor-pointer shadow-xs border border-amber-400"
                          >
                            <QrCode className="w-3.5 h-3.5 mr-1.5" /> Scan QR Check-In
                          </button>
                        )}
                        <button
                          onClick={() => triggerQuickContact(activeJob)}
                          className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-black uppercase tracking-wider flex items-center justify-center transition-all cursor-pointer shadow-xs"
                        >
                          <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Quick Contact Builder
                        </button>
                      </>
                    )}
                  </div>
                </div>

              </div>

              {/* Attendance & Wage Logs table */}
              <div className="lg:col-span-2 space-y-4">
                {/* Visual Attendance Consistency Calendar */}
                <AttendanceCalendar attendance={attendance} />

                <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
                  <h3 className="font-bold text-xs text-slate-900 uppercase tracking-tight mb-4">Shifts & Check-In History</h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                        <th className="pb-2">Job Details</th>
                        <th className="pb-2">Date</th>
                        <th className="pb-2">Shift Log</th>
                        <th className="pb-2">Est. Wage</th>
                        <th className="pb-2 text-right">Approval</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uniqById<AttendanceRecord>(attendance).length > 0 ? (
                        uniqById<AttendanceRecord>(attendance).map(rec => (
                          <tr key={rec.id} className="border-b border-slate-100 text-xs text-slate-700 hover:bg-slate-50">
                            <td className="py-2.5">
                              <div className="font-bold text-slate-900 uppercase flex items-center flex-wrap gap-1.5">
                                <span>{rec.jobTitle}</span>
                                {rec.qrVerified && (
                                  <span className="bg-amber-100 text-amber-800 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded flex items-center font-mono border border-amber-200">
                                    <QrCode className="w-2 h-2 mr-0.5 text-amber-600 shrink-0" /> QR Checked-In
                                  </span>
                                )}
                              </div>
                              {rec.checkInLatitude !== undefined && rec.checkInLongitude !== undefined && (
                                <div className="text-[9px] text-indigo-700 font-mono mt-0.5 flex items-center font-bold">
                                  <MapPin className="w-2.5 h-2.5 text-indigo-500 mr-1" />
                                  GPS: {rec.checkInLatitude.toFixed(4)}, {rec.checkInLongitude.toFixed(4)}
                                </div>
                              )}
                              {rec.locationLogs && rec.locationLogs.length > 0 && (
                                <div className="mt-1.5 flex flex-col gap-0.5 pl-2 border-l-2 border-indigo-200">
                                  <span className="text-[8px] uppercase tracking-wider font-bold text-slate-400 flex items-center">
                                    <MapPin className="w-2.5 h-2.5 text-indigo-500 mr-0.5" /> Presence Logs ({rec.locationLogs.length}):
                                  </span>
                                  {rec.locationLogs.map((log, idx) => (
                                    <div key={idx} className="text-[8px] text-slate-500 font-mono flex items-center justify-between">
                                      <span>⏱️ {log.time}</span>
                                      <span className="font-bold text-indigo-600">({log.latitude.toFixed(4)}, {log.longitude.toFixed(4)})</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5">{rec.date}</td>
                            <td className="py-2.5">
                              <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded text-[10px] font-mono">
                                {rec.checkInTime} - {rec.checkOutTime || "Active"}
                              </span>
                            </td>
                            <td className="py-2.5 font-black text-slate-900">₹{rec.wageEarned}</td>
                            <td className="py-2.5 text-right">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                rec.status === "approved"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : rec.status === "rejected"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}>
                                {rec.status === "approved" ? "Approved" : rec.status === "rejected" ? "Disputed" : "Pending"}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                            No shifts checked in yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      )}

      {activeTab === "skills" && (
        <motion.section
          ref={skillsSectionRef}
          key="skills"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="space-y-6"
        >
          {/* Visual Badge System for Verified Skills */}
          <VerifiedSkillBadges user={user} onUpdateProfile={onUpdateProfile} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Skill Videos / Safety Tutorials */}
            {(() => {
              const tradeVideos = learningResources.filter(r => 
                r.type === "video" && 
                user.trade && 
                r.trade?.toLowerCase() === user.trade.toLowerCase()
              );

              if (tradeVideos.length === 0) {
                return null;
              }

              return (
                <div className="lg:col-span-2 space-y-4">
                  <div className="bg-white p-3.5 rounded border border-slate-200 flex justify-between items-center">
                    <div>
                      <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Recommended Learning Guides</h2>
                      <p className="text-xs text-slate-500">Custom selected videos to upgrade your daily wage capabilities</p>
                    </div>
                    <span className="p-1 px-2 bg-slate-900 text-amber-500 rounded text-[10px] font-bold uppercase tracking-wider">
                      {user.trade} Category
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {tradeVideos.map(res => (
                      <div key={res.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs flex flex-col justify-between">
                        <div>
                          {/* Video embed / visual cover */}
                          {res.type === "video" ? (
                            <div className="aspect-video w-full bg-slate-900 flex items-center justify-center relative">
                              <iframe
                                src={res.link}
                                title={res.title}
                                className="w-full h-full border-none"
                                allowFullScreen
                              />
                            </div>
                          ) : (
                            <div className="aspect-video w-full bg-slate-900 flex flex-col justify-between p-4 text-white">
                              <BookOpen className="w-6 h-6 text-amber-500" />
                              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{res.duration}</span>
                            </div>
                          )}

                          <div className="p-4 space-y-1.5">
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                              res.category === "safety"
                                ? "bg-red-50 border-red-200 text-red-700"
                                : res.category === "technical"
                                ? "bg-slate-100 border-slate-200 text-slate-900 font-bold"
                                : "bg-amber-50 border-amber-200 text-amber-800"
                            }`}>
                              {res.category.replace("_", " ")}
                            </span>
                            <h4 className="font-bold text-xs text-slate-900 line-clamp-2 uppercase leading-tight">{res.title}</h4>
                            <p className="text-xs text-slate-500 leading-normal line-clamp-3">{res.description}</p>
                          </div>
                        </div>

                        <div className="p-4 pt-0">
                          <a
                            href={res.link}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full py-1.5 border border-slate-800 text-slate-800 hover:bg-slate-50 font-bold text-xs rounded uppercase tracking-wider flex items-center justify-center transition-colors cursor-pointer"
                          >
                            {res.type === "video" ? "Watch Video Session" : "Read Full Guide"}
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* AI Learning Coach Chatbox (EmpoGuru AI) */}
            <div className={`${
              learningResources.some(r => 
                r.type === "video" && 
                user.trade && 
                r.trade?.toLowerCase() === user.trade.toLowerCase()
              ) ? "lg:col-span-1" : "lg:col-span-3"
            } bg-white border border-slate-200 rounded-lg shadow-xs flex flex-col max-h-[600px] justify-between overflow-hidden`}>
            <div className="bg-slate-900 text-white p-3.5 border-b border-slate-850">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-white">EmpoGuru AI Coach</h3>
                  <span className="text-[9px] text-slate-400 uppercase font-bold">Instant technical help & wage planning</span>
                </div>
              </div>
            </div>

            {/* Chat screen */}
            <div className="flex-1 p-3.5 overflow-y-auto space-y-3 min-h-[300px] bg-slate-50">
              {chatHistory.map((h, i) => (
                <div key={i} className={`flex ${h.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded px-3 py-1.5 text-xs leading-normal ${
                    h.role === "user"
                      ? "bg-slate-900 text-white font-medium"
                      : "bg-white text-slate-800 border border-slate-200 shadow-2xs"
                  }`}>
                    {h.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white rounded px-3 py-1.5 text-xs text-slate-500 border border-slate-200 flex items-center">
                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce mr-1"></span>
                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce mr-1 delay-75"></span>
                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-150"></span>
                    Guru is typing...
                  </div>
                </div>
              )}
            </div>

            {/* Helper quick prompts */}
            <div className="p-3 bg-slate-100 border-t border-slate-200 space-y-1.5">
              <p className="text-[9px] font-bold text-slate-500 uppercase block tracking-wider">Tap helper question:</p>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setChatMessage("Give me plastering safety tips.")}
                  className="px-2 py-1 bg-white border border-slate-200 hover:border-slate-900 text-[9px] rounded font-bold text-slate-600 cursor-pointer"
                >
                  🧱 Safety Tips
                </button>
                <button
                  onClick={() => setChatMessage("How to open zero balance bank account?")}
                  className="px-2 py-1 bg-white border border-slate-200 hover:border-slate-900 text-[9px] rounded font-bold text-slate-600 cursor-pointer"
                >
                  💰 Open Account
                </button>
                <button
                  onClick={() => setChatMessage("What tools does a painter need?")}
                  className="px-2 py-1 bg-white border border-slate-200 hover:border-slate-900 text-[9px] rounded font-bold text-slate-600 cursor-pointer"
                >
                  🖌️ Painter Tools
                </button>
              </div>
            </div>

            {/* Chat Input panel */}
            <div className="p-2.5 border-t border-slate-200 flex items-center space-x-2 bg-white">
              <input
                type="text"
                placeholder="Ask Guru anything in simple words..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendChatMessage()}
                className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded focus:outline-hidden focus:border-slate-900 bg-slate-50"
              />
              <button
                onClick={handleSendChatMessage}
                className="p-1.5 bg-slate-900 text-amber-500 rounded hover:bg-slate-800 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
          </div>

        </motion.section>
      )}

      {activeTab === "complaints" && (
        <motion.section
          ref={complaintsSectionRef}
          key="complaints"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          
          {/* Dispute submission panel */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
              <div className="flex items-center space-x-2 text-red-700">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                <h3 className="font-black text-xs uppercase tracking-tight">Dispute Resolution</h3>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Having issues with a builder regarding payments, hours, or attendance? Lodge a secure dispute here.
              </p>

              <form onSubmit={handleSubmitComplaint} className="space-y-3 mt-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Select Job</label>
                  <select
                    value={complaintJobId}
                    onChange={(e) => setComplaintJobId(e.target.value)}
                    required
                    className="w-full p-2 text-xs border border-slate-200 rounded bg-white text-slate-700 focus:outline-hidden"
                  >
                    <option value="">-- Choose Job --</option>
                    {jobs.map(j => (
                      <option key={j.id} value={j.id}>{j.title}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Dispute Explanation</label>
                  <textarea
                    placeholder="Describe what happened simply. For example: Contractor is refusing to pay ₹800 wage for yesterday shift although I checked in and worked full day..."
                    value={complaintText}
                    onChange={(e) => setComplaintText(e.target.value)}
                    required
                    className="w-full p-2 h-28 text-xs border border-slate-200 rounded focus:outline-hidden focus:border-slate-900 resize-none bg-slate-50 text-slate-900"
                  />
                  
                  {/* Multilingual Voice Guidance Card */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-[10px] text-slate-700 font-medium space-y-0.5 mt-1.5 flex items-start gap-2 shadow-xs">
                    <span className="text-xs">🎙️</span>
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-900 uppercase tracking-tight">Speak in your Language! / अपनी भाषा में बोलें! / ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಮಾತನಾಡಿ!</p>
                      <p className="text-slate-500 leading-relaxed">
                        Tap <span className="text-slate-800 font-bold">Voice Input</span> below to dictate your dispute automatically in <b>हिंदी (Hindi)</b>, <b>ಕನ್ನಡ (Kannada)</b>, or <b>English</b>.
                      </p>
                    </div>
                  </div>

                  <VoiceInputButton value={complaintText} onChange={setComplaintText} className="mt-1" fieldName="Dispute" />
                </div>

                <button
                  type="submit"
                  disabled={submittingComplaint}
                  className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                >
                  {submittingComplaint ? "Sending dispute..." : "File Official Complaint"}
                </button>
              </form>
            </div>

            {/* AI Advisor Response Panel */}
            {aiDisputeAdvice && (
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-3 shadow-xs text-white">
                <div className="flex items-center space-x-2 text-amber-500">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <h4 className="font-black text-xs uppercase tracking-tight">AI Fair-Mediator Preview</h4>
                </div>
                
                <p className="text-xs text-amber-400 leading-normal font-bold">
                  {aiDisputeAdvice.summary}
                </p>
                <p className="text-[11px] text-slate-300 leading-normal">
                  {aiDisputeAdvice.analysis}
                </p>

                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  <span className="text-[10px] font-bold text-amber-500 uppercase block">Action items for Welfare Officer:</span>
                  {aiDisputeAdvice.recommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-start text-[10px] text-slate-400 leading-tight">
                      <span className="text-amber-500 mr-1.5 font-bold">•</span>
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Historical dispute logs */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
            <h3 className="font-black text-xs text-slate-900 uppercase tracking-tight mb-4">Lodge Status & Dispute Logs</h3>

            <div className="space-y-3">
              {uniqById<Complaint>(complaints).length > 0 ? (
                uniqById<Complaint>(complaints).map(c => (
                  <div key={c.id} className="border border-slate-200 p-4 rounded space-y-2 bg-slate-50">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-900 uppercase">{c.jobTitle}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                        c.status === "resolved"
                          ? "bg-emerald-100 text-emerald-800"
                          : c.status === "investigating"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-800"
                      }`}>
                        {c.status.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-normal">"{c.description}"</p>
                    
                    {c.adminNotes && (
                      <div className="mt-3 bg-white p-2.5 rounded border border-slate-200 text-[10px] text-slate-700">
                        <span className="font-bold text-slate-900 uppercase block mb-1">Admin Resolution notes:</span>
                        {c.adminNotes}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-slate-400">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  <p className="text-xs font-black uppercase tracking-wider">No complaints registered.</p>
                  <p className="text-xs text-slate-500 mt-1">Your employment transparency record is fully green!</p>
                </div>
              )}
            </div>
          </div>

        </motion.section>
      )}

      {activeTab === "safety" && (
        <motion.section
          ref={safetySectionRef}
          key="safety"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* LEFT COLUMN: INDUSTRIAL SAFETY INFOGRAPHICS */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 text-left">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center">
                <ShieldAlert className="w-4 h-4 mr-1.5 text-amber-500 shrink-0" />
                Safety Infographics
              </h2>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Select a visual hazard guidelines blueprint to review official site regulations:
              </p>
            </div>

            {/* Infographics Sidebar/Tabs */}
            <div className="space-y-2">
              {[
                {
                  title: "1. PPE Gear Blueprint",
                  desc: "Helmets, boots, eye & glove guidelines",
                  badge: "EQUIPMENT",
                  color: "border-emerald-500",
                  textColor: "text-emerald-700",
                  bgColor: "bg-emerald-50"
                },
                {
                  title: "2. Heights & Scaffold Rules",
                  desc: "Anchor harness & guard rails",
                  badge: "HEIGHTS",
                  color: "border-amber-500",
                  textColor: "text-amber-700",
                  bgColor: "bg-amber-50"
                },
                {
                  title: "3. Electrical & Hot Work",
                  desc: "LOTO protocols & insulated tools",
                  badge: "CIRCUITS",
                  color: "border-indigo-500",
                  textColor: "text-indigo-700",
                  bgColor: "bg-indigo-50"
                },
                {
                  title: "4. Lifting & Body Strain",
                  desc: "Knee-lifts & summer hydration",
                  badge: "BODY WELLNESS",
                  color: "border-rose-500",
                  textColor: "text-rose-700",
                  bgColor: "bg-rose-50"
                }
              ].map((info, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedInfographic(idx)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                    selectedInfographic === idx
                      ? `bg-slate-900 text-white ${info.color} border-l-4 shadow-md`
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                  type="button"
                >
                  <div className="space-y-0.5 pr-2">
                    <span className={`text-[9px] font-bold uppercase tracking-wider block ${selectedInfographic === idx ? "text-amber-400" : info.textColor}`}>
                      {info.badge}
                    </span>
                    <h4 className="font-bold text-xs leading-snug uppercase">{info.title}</h4>
                    <p className={`text-[10px] leading-relaxed line-clamp-1 ${selectedInfographic === idx ? "text-slate-400" : "text-slate-500"}`}>
                      {info.desc}
                    </p>
                  </div>
                  <Check className={`w-4 h-4 shrink-0 ${selectedInfographic === idx ? "text-emerald-400" : "text-slate-300"}`} />
                </button>
              ))}
            </div>

            {/* Infographic Detail Panel (Rendered Blueprint Style) */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              {/* Caution Stripes */}
              <div className="h-1.5 bg-gradient-to-r from-amber-400 via-slate-900 to-amber-400" />
              
              <div className="p-4 space-y-3">
                <div className="flex items-center space-x-2 text-left">
                  <div className="w-7 h-7 rounded bg-slate-900 text-amber-500 flex items-center justify-center font-bold text-xs">
                    {(selectedInfographic + 1)}
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-slate-900 uppercase">
                      {[
                        "PPE Gear Requirements",
                        "Scaffold & Heights Directives",
                        "Electrical Circuit Procedures",
                        "Ergonomics & Well-being"
                      ][selectedInfographic]}
                    </h3>
                    <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 block mt-0.5">
                      OFFICIAL LABOR WELFARE COMPLIANCE
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  {[
                    // 1. PPE
                    [
                      { label: "Class-A Helmet", desc: "Guards head from dropping rivets, steel joints, or cement splatter." },
                      { label: "Steel-Toe Boots", desc: "Protects toes from nails, iron bars, and heavy block drops." },
                      { label: "Reflective Vest", desc: "Allows machinery and truck drivers to spot you instantly." },
                      { label: "Safety Gloves", desc: "Prevents skin abrasions and burns from rough brick or wet mortar." }
                    ],
                    // 2. Heights
                    [
                      { label: "Safety Harness", desc: "Must be anchored to a heavy-duty structure overhead (D-ring locked)." },
                      { label: "Scaffold Rails", desc: "Ensure dual safety railings are firmly clamped at hip and chest heights." },
                      { label: "Scaffold Boards", desc: "Never step on wooden planks that look wet, sagging, or cracked." },
                      { label: "Tool Tie-Downs", desc: "Buckle heavy spanners to your belt so they cannot drop on helpers below." }
                    ],
                    // 3. Electrical
                    [
                      { label: "LOTO Protocol", desc: "Ensure main power breakers are turned off and labeled prior to rewiring." },
                      { label: "Dry Hands & Feet", desc: "Never operate power chisels, saws, or welders in water pools." },
                      { label: "Insulated Grip Tools", desc: "Verify that rubber hand casings are free of cracks or tears." },
                      { label: "Hot Work Shield", desc: "Place fireproof canvas blankets underneath welding or grinding areas." }
                    ],
                    // 4. Ergonomics
                    [
                      { label: "Knee Lift Rule", desc: "Keep back straight and lift with leg muscles. Never bend your waist." },
                      { label: "Two-Person Carry", desc: "Always seek assistance for payloads weighing over 25 kilograms." },
                      { label: "Summer Hydration", desc: "Drink clean water every 45 minutes on hot summer days to protect kidneys." },
                      { label: "Rest Intervals", desc: "Take a 5-minute break in shaded areas every 2 hours of hard physical work." }
                    ]
                  ][selectedInfographic].map((item, index) => (
                    <div key={index} className="flex items-start space-x-2 text-left bg-slate-50 p-2.5 rounded border border-slate-150">
                      <div className="w-1.5 h-1.5 bg-slate-900 rounded-full mt-1.5 shrink-0" />
                      <div>
                        <span className="font-bold text-[11px] text-slate-800 uppercase font-mono tracking-wide block leading-none">
                          {item.label}
                        </span>
                        <span className="text-[10px] text-slate-500 leading-normal block mt-1">
                          {item.desc}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: AI SAFETY CHECKLIST GENERATOR */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Generator Controls */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs text-left">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center">
                    <Sparkles className="w-4 h-4 mr-1.5 text-amber-500 animate-pulse shrink-0" />
                    AI Construction Safety Checklist Generator
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Select a task or type custom work to generate an instant, AI-guided well-being checklist for your shift.
                  </p>
                </div>
                <span className="hidden sm:inline-flex p-1 px-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[9px] font-black uppercase tracking-wider font-mono">
                  Gemini-3.5 Safety Advisor Active
                </span>
              </div>

              {/* Task Presets */}
              <div className="mt-4">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Common Site Tasks (Select to Auto-Generate):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { label: "🏗️ Scaffold Assembly", value: "Scaffolding Assembly and Rigging" },
                    { label: "🧱 Masonry & Brickwork", value: "Bricklaying at Heights" },
                    { label: "⚡ Wiring Panel Boards", value: "Wiring and Electric Panel Installation" },
                    { label: "👨‍🏭 Welding & Cutting", value: "Arc Welding and Steel Cutting" },
                    { label: "🚰 Excavating Trenches", value: "Digging and Excavating Pipes in Trench" },
                    { label: "🎨 High-Wall Painting", value: "Wall Painting on High Scaffold Boards" }
                  ].map((task) => (
                    <button
                      key={task.value}
                      onClick={() => {
                        setSelectedSafetyTask(task.value);
                        setCustomSafetyTask("");
                        handleGenerateSafetyChecklist(task.value);
                      }}
                      disabled={isGeneratingChecklist}
                      className={`p-2 rounded-lg text-[11px] font-bold text-left transition-all border cursor-pointer ${
                        selectedSafetyTask === task.value && !customSafetyTask
                          ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 disabled:opacity-50"
                      }`}
                      type="button"
                    >
                      {task.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Task input */}
              <div className="mt-4 pt-4 border-t border-slate-150 space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Or Type Custom Work Assignment:
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="e.g., Repairing rusted tin sheets on high industrial warehouse roof..."
                      value={customSafetyTask}
                      onChange={(e) => setCustomSafetyTask(e.target.value)}
                      className="w-full pl-3 pr-10 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-slate-900 bg-slate-50 text-slate-900"
                    />
                    <VoiceInputButton 
                      value={customSafetyTask} 
                      onChange={setCustomSafetyTask} 
                      className="absolute right-2 top-1/2 -translate-y-1/2" 
                      fieldName="Custom Safety Task" 
                      compact={true}
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (customSafetyTask.trim()) {
                        setSelectedSafetyTask("");
                        handleGenerateSafetyChecklist(customSafetyTask);
                      }
                    }}
                    disabled={isGeneratingChecklist || !customSafetyTask.trim()}
                    className={`py-2 px-4 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                      customSafetyTask.trim() && !isGeneratingChecklist
                        ? "bg-slate-900 text-amber-500 hover:bg-slate-800 shadow-md"
                        : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                    }`}
                    type="button"
                  >
                    Generate Checklist
                  </button>
                </div>
              </div>
            </div>

            {/* Checklist Output Area */}
            {isGeneratingChecklist ? (
              <div className="bg-white border border-slate-200 rounded-xl p-10 text-center flex flex-col items-center justify-center space-y-4">
                <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-black tracking-widest text-amber-500 block uppercase">
                    CONSULTING EMPOWORK SAFETY ADVISOR AI
                  </span>
                  <p className="text-xs font-black text-slate-900 uppercase">
                    Building a custom well-being check...
                  </p>
                  <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                    Analyzing hazards, recommended equipment, and high-safety guidelines for "{customSafetyTask || selectedSafetyTask}".
                  </p>
                </div>
              </div>
            ) : checklistError ? (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-5 text-center text-xs space-y-2">
                <p className="font-bold">⚠️ {checklistError}</p>
                <button
                  onClick={() => handleGenerateSafetyChecklist(customSafetyTask || selectedSafetyTask)}
                  className="px-3 py-1 bg-red-600 text-white font-bold rounded uppercase hover:bg-red-700 text-[10px]"
                  type="button"
                >
                  Try Again
                </button>
              </div>
            ) : safetyChecklist ? (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm text-left">
                {/* Yellow & Dark Caution Stripe */}
                <div className="h-2 bg-gradient-to-r from-amber-400 via-slate-900 to-amber-400" />
                
                <div className="p-5 space-y-4">
                  {/* Title & Metadata */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-150">
                    <div>
                      <span className="text-[9px] font-mono font-black text-amber-500 uppercase tracking-widest block">
                        TAILORED WELL-BEING REPORT
                      </span>
                      <h3 className="font-black text-sm text-slate-900 uppercase leading-none mt-0.5 font-sans">
                        {safetyChecklist.task}
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 bg-slate-950 text-white rounded text-[9px] font-mono font-bold tracking-wider self-start uppercase">
                      ID: SHIFT-S3288
                    </span>
                  </div>

                  {/* Hazards Briefing Section */}
                  <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-3 space-y-2">
                    <span className="text-[9px] font-bold text-amber-800 uppercase tracking-wider flex items-center font-sans">
                      <ShieldAlert className="w-3.5 h-3.5 mr-1" /> Core Hazards Identified (Risk Level: Moderate/High)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {safetyChecklist.hazards.map((hazard, index) => (
                        <div key={index} className="text-[10px] text-slate-700 flex items-start space-x-1.5 font-medium leading-normal bg-white p-2 rounded border border-amber-100">
                          <span className="text-amber-500 font-bold shrink-0">⚠️</span>
                          <span>{hazard}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Safety Equipment Required */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider block">
                      Required Gear Checklist:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {safetyChecklist.safetyEquipmentRequired.map((equipment, index) => (
                        <span
                          key={index}
                          className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-full text-[10px] font-bold text-slate-700 uppercase tracking-wide flex items-center font-sans"
                        >
                          <HardHat className="w-3 h-3 text-slate-500 mr-1 shrink-0" />
                          {equipment}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Interactive Checklist Items */}
                  <div className="space-y-2 pt-2 border-t border-slate-150">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider">
                        Verify Site Safety Checklist Items:
                      </span>
                      <span className="text-[10px] font-black text-indigo-700 uppercase font-mono">
                        Progress: {Object.values(checkedSafetyItems).filter(Boolean).length} / {safetyChecklist.checklist.length} Verified
                      </span>
                    </div>

                    {/* Progress indicator bar */}
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{
                          width: `${(Object.values(checkedSafetyItems).filter(Boolean).length / safetyChecklist.checklist.length) * 100}%`
                        }}
                      />
                    </div>

                    <div className="space-y-2 mt-2">
                      {safetyChecklist.checklist.map((item, index) => {
                        const isChecked = !!checkedSafetyItems[index];
                        return (
                          <label
                            key={index}
                            className={`flex items-start p-3 rounded-lg border transition-all cursor-pointer select-none ${
                              isChecked
                                ? "bg-emerald-50/50 border-emerald-500/40 text-emerald-950"
                                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                setCheckedSafetyItems(prev => ({
                                  ...prev,
                                  [index]: e.target.checked
                                }));
                              }}
                              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 mt-0.5 mr-3 cursor-pointer"
                            />
                            <div className="text-left">
                              <span className="font-bold text-[11px] uppercase font-mono tracking-wide flex items-center text-slate-800">
                                Safety Measure {(index + 1)}
                              </span>
                              <span className="text-[10px] text-slate-500 block mt-0.5 leading-relaxed font-sans">
                                {item}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Encouraging Tip & Final Success State */}
                  <div className="pt-3 border-t border-slate-150">
                    {Object.values(checkedSafetyItems).filter(Boolean).length === safetyChecklist.checklist.length ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 text-center text-emerald-900 font-bold text-xs flex items-center justify-center space-x-2 shadow-sm uppercase font-mono"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Clearance Approved - Work Safely on Site Today!</span>
                      </motion.div>
                    ) : (
                      <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 flex items-start space-x-2 text-left">
                        <Heart className="w-4 h-4 text-rose-500 mt-0.5 shrink-0 animate-pulse" />
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-sans">
                            SAFETY ADVISOR'S WORD OF CARE
                          </span>
                          <p className="text-[10px] text-slate-600 font-medium italic leading-relaxed mt-0.5 font-sans">
                            "{safetyChecklist.encouragingTip}"
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl p-10 text-center text-slate-400 text-xs font-sans">
                Select a safety task or type custom work to generate an on-the-fly shift clearance.
              </div>
            )}
          </div>
        </motion.section>
      )}
      </AnimatePresence>

      {/* Job Application Modal with Voice Input */}
      {isApplyingModalOpen && applyingJob && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-slate-900 px-6 py-4 text-white">
              <h3 className="text-sm font-black uppercase tracking-tight flex items-center">
                <Sparkles className="w-4 h-4 text-amber-400 mr-2" />
                Submit Job Application
              </h3>
              <p className="text-[10px] text-slate-300 font-medium uppercase tracking-wider mt-1">
                Applying for: {applyingJob.title} at {applyingJob.location}
              </p>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>Daily Wage Rate:</span>
                  <span className="text-amber-600">₹ {applyingJob.wage} / Shift</span>
                </div>
                <div className="flex justify-between">
                  <span>Required Trade:</span>
                  <span className="font-bold text-slate-800">{applyingJob.tradeType}</span>
                </div>
                <div className="flex justify-between">
                  <span>Employer:</span>
                  <span className="font-bold text-slate-800">{applyingJob.employerName}</span>
                </div>
              </div>

              {/* Optional Voice / Text Application Message */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-700 uppercase block">
                  Add Application Note / Spoken Message (Optional)
                </label>
                <textarea
                  placeholder="e.g., I am available to start immediately, have my own tools, and live near this site..."
                  value={applicationNote}
                  onChange={(e) => setApplicationNote(e.target.value)}
                  className="w-full p-2.5 h-24 text-xs border border-slate-250 rounded focus:outline-hidden focus:border-slate-900 resize-none bg-slate-50 text-slate-900"
                />
                <VoiceInputButton 
                  value={applicationNote} 
                  onChange={setApplicationNote} 
                  className="mt-1" 
                  fieldName="Application" 
                />
              </div>
            </div>

            {/* Footer buttons */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setIsApplyingModalOpen(false);
                  setApplyingJob(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-transparent border border-slate-250 hover:border-slate-350 rounded uppercase tracking-wider cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApplyJob}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded uppercase tracking-wider cursor-pointer"
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Contact Modal with Voice Input */}
      {isContactModalOpen && contactJob && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-slate-900 px-6 py-4 text-white">
              <h3 className="text-sm font-black uppercase tracking-tight flex items-center">
                <MessageSquare className="w-4 h-4 text-amber-400 mr-2" />
                Quick Contact Builder
              </h3>
              <p className="text-[10px] text-slate-300 font-medium uppercase tracking-wider mt-1">
                Contact: {contactJob.employerName} (Job: {contactJob.title})
              </p>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Type selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-700 uppercase block">
                  Select Contact Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setContactType("message")}
                    className={`py-2 px-3 border rounded text-xs font-bold uppercase tracking-wider text-center transition-all ${
                      contactType === "message"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-50 text-slate-700 border-slate-250 hover:bg-slate-100"
                    }`}
                  >
                    Send Message
                  </button>
                  <button
                    type="button"
                    onClick={() => setContactType("call_back")}
                    className={`py-2 px-3 border rounded text-xs font-bold uppercase tracking-wider text-center transition-all ${
                      contactType === "call_back"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-50 text-slate-700 border-slate-250 hover:bg-slate-100"
                    }`}
                  >
                    Request Call Back
                  </button>
                </div>
              </div>

              {contactType === "message" ? (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-700 uppercase block">
                    Your Message
                  </label>
                  <textarea
                    placeholder="Type your message to the builder here (e.g., I have a question about the shift timings or safety gear needed)..."
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    className="w-full p-2.5 h-24 text-xs border border-slate-250 rounded focus:outline-hidden focus:border-slate-900 resize-none bg-slate-50 text-slate-900 font-medium"
                  />
                  <VoiceInputButton 
                    value={contactMessage} 
                    onChange={setContactMessage} 
                    className="mt-1" 
                    fieldName="Contact Message" 
                  />
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-100 p-3.5 rounded-lg space-y-2 text-xs text-slate-700">
                  <p className="font-bold text-slate-900 uppercase tracking-wide text-[10px] flex items-center text-amber-800">
                    <Clock className="w-3.5 h-3.5 mr-1 text-amber-600" /> Confirm Call-Back Phone
                  </p>
                  <p className="leading-relaxed">
                    By submitting, the builder (<strong>{contactJob.employerName}</strong>) will receive an instant notification to call you back on your registered phone number:
                  </p>
                  <div className="p-2 bg-white rounded border border-amber-200/60 font-mono text-center font-black text-sm text-slate-900">
                    {user.phone || "No phone registered"}
                  </div>
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setIsContactModalOpen(false);
                  setContactJob(null);
                  setContactMessage("");
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-transparent border border-slate-250 hover:border-slate-350 rounded uppercase tracking-wider cursor-pointer"
                disabled={isSubmittingContact}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleContactSubmit}
                disabled={isSubmittingContact || (contactType === "message" && !contactMessage.trim())}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded uppercase tracking-wider cursor-pointer flex items-center"
              >
                {isSubmittingContact ? "Sending..." : "Send Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Settings Modal */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-lg overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center text-left">
              <div className="flex items-center space-x-2.5">
                <Settings className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="font-black text-[10px] uppercase tracking-wider text-slate-400">Preferences</h3>
                  <h2 className="font-black text-sm uppercase tracking-tight">Worker Profile Settings</h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-250 rounded focus:outline-hidden focus:border-slate-900 bg-slate-50 text-slate-900 font-bold"
                  placeholder="Ramesh Kumar"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Phone Number</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-250 rounded focus:outline-hidden focus:border-slate-900 bg-slate-50 text-slate-900 font-bold"
                  placeholder="e.g. 9876543210"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Primary Trade</label>
                  <select
                    value={editTrade}
                    onChange={(e) => setEditTrade(e.target.value)}
                    className="w-full p-2 text-xs border border-slate-250 rounded focus:outline-hidden focus:border-slate-900 bg-slate-50 text-slate-900 font-bold cursor-pointer"
                  >
                    <option value="Mason">Mason (राजमिस्त्री)</option>
                    <option value="Plumber">Plumber (प्लंबर)</option>
                    <option value="Carpenter">Carpenter (बढ़ई)</option>
                    <option value="Electrician">Electrician (बिजली मिस्त्री)</option>
                    <option value="Painter">Painter (पेंटर)</option>
                    <option value="Helper">General Helper (मददगार)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Expected Wage (₹ / Day)</label>
                  <input
                    type="number"
                    value={editWageExpectation}
                    onChange={(e) => setEditWageExpectation(Number(e.target.value))}
                    className="w-full p-2 text-xs border border-slate-250 rounded focus:outline-hidden focus:border-slate-900 bg-slate-50 text-slate-900 font-bold"
                    min="100"
                    max="5000"
                  />
                </div>
              </div>

              {/* REAL-TIME NOTIFICATIONS PREFERENCE TOGGLE */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-indigo-700 font-mono block">Real-Time Job Alerts</label>
                    <p className="text-[10px] text-slate-500 leading-normal font-medium">
                      Enable push-like instant alerts for local contractor postings that match your registered skills and trade. Turn off to suppress match alarms.
                    </p>
                  </div>

                  {/* High Contrast iOS Style Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setEditNotificationPref(!editNotificationPref)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      editNotificationPref ? "bg-indigo-650" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        editNotificationPref ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-transparent border border-slate-250 hover:border-slate-350 rounded uppercase tracking-wider cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateProfile({
                    name: editName,
                    phone: editPhone,
                    trade: editTrade,
                    wageExpectation: editWageExpectation,
                    notificationPrefEnabled: editNotificationPref
                  });
                  showToast("Profile settings and notification preferences saved!", "success");
                  setIsSettingsModalOpen(false);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded uppercase tracking-wider cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating In-App Toast Notifications Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => {
            const isJobMatch = toast.type === "job_match";
            const isAppStatus = toast.type === "application_status";
            const isWagePayment = toast.type === "wage_payment";

            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, x: 50, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 50, scale: 0.9, transition: { duration: 0.2 } }}
                className="bg-slate-950 text-white rounded-lg shadow-2xl border border-slate-800 p-4 pointer-events-auto flex flex-col space-y-2 relative"
              >
                {/* Close Button */}
                <button
                  onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                  className="absolute top-2 right-2 text-slate-400 hover:text-white transition cursor-pointer"
                  type="button"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Toast Header & Body */}
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-full shrink-0 ${
                    isJobMatch 
                      ? "bg-indigo-500 text-white" 
                      : isWagePayment 
                      ? "bg-emerald-500 text-slate-950" 
                      : toast.application?.status === "accepted"
                      ? "bg-emerald-500 text-slate-950"
                      : toast.application?.status === "rejected"
                      ? "bg-rose-500 text-white"
                      : "bg-amber-500 text-slate-950"
                  }`}>
                    {isJobMatch && <Bell className="w-4 h-4 animate-bounce" />}
                    {isWagePayment && <Coins className="w-4 h-4" />}
                    {isAppStatus && (
                      toast.application?.status === "accepted" ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : toast.application?.status === "rejected" ? (
                        <AlertCircle className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )
                    )}
                  </div>
                  <div className="space-y-1 pr-4">
                    <span className={`text-[10px] font-black uppercase tracking-wider font-mono ${
                      isJobMatch 
                        ? "text-amber-400" 
                        : isWagePayment 
                        ? "text-emerald-400" 
                        : toast.application?.status === "accepted"
                        ? "text-emerald-400"
                        : toast.application?.status === "rejected"
                        ? "text-rose-400"
                        : "text-amber-400"
                    }`}>
                      {isJobMatch && "New Match Nearby!"}
                      {isWagePayment && "Payment Processed"}
                      {isAppStatus && `Status: ${toast.application?.status || "Updated"}`}
                    </span>
                    <h5 className="text-xs font-bold leading-snug">{toast.title}</h5>
                    <p className="text-[10px] text-slate-400 line-clamp-2">{toast.message}</p>
                  </div>
                </div>

                {/* Toast Footer / Actions */}
                <div className="border-t border-slate-900 pt-2 flex items-center justify-between">
                  {isJobMatch && toast.job ? (
                    <>
                      <div className="text-[10px] text-slate-400 flex flex-col">
                        <span>Wage: <b className="text-emerald-400">₹{toast.job.wage}/day</b></span>
                        <span>Loc: <b className="text-indigo-400">{toast.job.location}</b></span>
                      </div>
                      <button
                        onClick={() => {
                          setToasts(prev => prev.filter(t => t.id !== toast.id));
                          setActiveTab("jobs");
                          triggerApplyJob(toast.job!);
                        }}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-[10px] font-bold rounded text-white uppercase tracking-wider transition cursor-pointer"
                        type="button"
                      >
                        Apply Now
                      </button>
                    </>
                  ) : isWagePayment && toast.payment ? (
                    <>
                      <div className="text-[10px] text-slate-400 flex flex-col">
                        <span>Amount: <b className="text-emerald-400">₹{toast.payment.amount}</b></span>
                        <span>Date: <b className="text-indigo-400">{toast.payment.date}</b></span>
                      </div>
                      <button
                        onClick={() => {
                          setToasts(prev => prev.filter(t => t.id !== toast.id));
                          setActiveTab("attendance");
                        }}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-slate-950 font-bold text-[10px] rounded uppercase tracking-wider transition cursor-pointer"
                        type="button"
                      >
                        View Payments
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="text-[10px] text-slate-400 flex flex-col">
                        <span>Job: <b className="text-indigo-400">{toast.application?.jobTitle}</b></span>
                        <span>Employer: <b className="text-slate-300">{toast.application?.employerName}</b></span>
                      </div>
                      <button
                        onClick={() => {
                          setToasts(prev => prev.filter(t => t.id !== toast.id));
                          setActiveTab("jobs");
                        }}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10px] rounded uppercase tracking-wider transition cursor-pointer"
                        type="button"
                      >
                        View Jobs
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* PRE-SHIFT INDUSTRIAL SAFETY COMPLIANCE MODAL */}
      <AnimatePresence>
        {showPreshiftModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-md bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-2xl"
            >
              {/* Amber & Black Industrial Striped Accent Bar */}
              <div className="h-2 bg-gradient-to-r from-amber-400 via-slate-950 to-amber-400" />
              
              <div className="p-6 space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
                    <ShieldAlert className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-black tracking-widest text-amber-500 block uppercase">PPE VERIFICATION REQUIRED</span>
                    <h3 className="font-black text-slate-950 text-sm leading-tight uppercase">Pre-Shift Safety Clearance</h3>
                  </div>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  By central industrial safety guidelines, you must verify your personal safety equipment before signing in for active duty on site: <span className="font-bold text-slate-800">{activeJob?.title}</span>.
                </p>

                <div className="space-y-3 pt-2">
                  {/* 1. Helmet check */}
                  <label className={`flex items-start p-3 rounded-xl border transition-all cursor-pointer select-none ${ppeHelmet ? "bg-emerald-50/50 border-emerald-500/45 text-emerald-950" : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"}`}>
                    <input
                      type="checkbox"
                      checked={ppeHelmet}
                      onChange={(e) => setPpeHelmet(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 mt-0.5 mr-3 cursor-pointer"
                    />
                    <div className="text-left">
                      <span className="font-bold text-xs uppercase font-mono tracking-wide flex items-center text-slate-800">
                        <HardHat className="w-3.5 h-3.5 mr-1 text-slate-600" /> Class-A Safety Helmet
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">Secure chin-strap locked. Intact shell with zero cracks.</span>
                    </div>
                  </label>

                  {/* 2. Boots check */}
                  <label className={`flex items-start p-3 rounded-xl border transition-all cursor-pointer select-none ${ppeBoots ? "bg-emerald-50/50 border-emerald-500/45 text-emerald-950" : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"}`}>
                    <input
                      type="checkbox"
                      checked={ppeBoots}
                      onChange={(e) => setPpeBoots(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 mt-0.5 mr-3 cursor-pointer"
                    />
                    <div className="text-left">
                      <span className="font-bold text-xs uppercase font-mono tracking-wide flex items-center text-slate-800">
                        <Award className="w-3.5 h-3.5 mr-1 text-slate-600" /> Steel-Toe Safety Boots
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">Approved thick heavy-grip boots to protect from heavy steel drops.</span>
                    </div>
                  </label>

                  {/* 3. Vest check */}
                  <label className={`flex items-start p-3 rounded-xl border transition-all cursor-pointer select-none ${ppeVest ? "bg-emerald-50/50 border-emerald-500/45 text-emerald-950" : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"}`}>
                    <input
                      type="checkbox"
                      checked={ppeVest}
                      onChange={(e) => setPpeVest(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 mt-0.5 mr-3 cursor-pointer"
                    />
                    <div className="text-left">
                      <span className="font-bold text-xs uppercase font-mono tracking-wide flex items-center text-slate-800">
                        <ShieldAlert className="w-3.5 h-3.5 mr-1 text-slate-600" /> High-Visibility Safety Vest
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">Hi-vis reflective stripes active for machine visibility.</span>
                    </div>
                  </label>

                  {/* 4. Affirmation check */}
                  <label className={`flex items-start p-3 rounded-xl border transition-all cursor-pointer select-none ${ppeAffirmation ? "bg-emerald-50/50 border-emerald-500/45 text-emerald-950" : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"}`}>
                    <input
                      type="checkbox"
                      checked={ppeAffirmation}
                      onChange={(e) => setPpeAffirmation(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 mt-0.5 mr-3 cursor-pointer"
                    />
                    <div className="text-left">
                      <span className="font-bold text-xs uppercase font-mono tracking-wide flex items-center text-slate-800">
                        <CheckCircle className="w-3.5 h-3.5 mr-1 text-slate-600" /> Site Regulations Affirmation
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">I agree to abide by all site hazard protocols & incident reports.</span>
                    </div>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => {
                      setShowPreshiftModal(false);
                      // Clear state
                      setPpeHelmet(false);
                      setPpeBoots(false);
                      setPpeVest(false);
                      setPpeAffirmation(false);
                    }}
                    className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!(ppeHelmet && ppeBoots && ppeVest && ppeAffirmation)}
                    onClick={() => {
                      setShowPreshiftModal(false);
                      handleCheckIn();
                    }}
                    className={`py-2.5 px-4 text-xs font-black uppercase tracking-wider rounded-xl transition-all text-center flex items-center justify-center cursor-pointer ${
                      ppeHelmet && ppeBoots && ppeVest && ppeAffirmation
                        ? "bg-slate-900 hover:bg-slate-800 text-amber-400 shadow-lg"
                        : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Sign & Check-In
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SITE QR CODE SCANNER MODAL */}
      <AnimatePresence>
        {showQrScanner && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-md bg-slate-900 text-white rounded-2xl overflow-hidden border border-slate-800 shadow-2xl text-left"
            >
              {/* Amber & Black Industrial Accent */}
              <div className="h-1.5 bg-gradient-to-r from-amber-400 via-slate-950 to-amber-400" />

              <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                <div className="flex items-center space-x-2 text-amber-400">
                  <QrCode className="w-4 h-4" />
                  <span className="text-xs font-black uppercase tracking-wider text-white">QR Code Site Scanner</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQrScanner(false)}
                  className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded transition-all cursor-pointer font-bold text-xs uppercase"
                >
                  ✕ Close
                </button>
              </div>

              <div className="p-6 space-y-5">
                {!scanSuccess ? (
                  <>
                    {/* Live Camera QR Scanner with Offline Frame Analysis */}
                    {isScanning ? (
                      <div className="relative w-full h-64 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex flex-col items-center justify-center">
                        {/* Scanner target brackets */}
                        <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-amber-500 rounded-tl-sm" />
                        <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-amber-500 rounded-tr-sm" />
                        <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-amber-500 rounded-bl-sm" />
                        <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-amber-500 rounded-br-sm" />

                        <div className="text-center z-20 space-y-2 select-none p-4">
                          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                          <p className="text-xs font-bold text-amber-400 uppercase tracking-widest animate-pulse font-mono">
                            Analyzing Site QR Code...
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            Verifying GPS coordinates in background
                          </p>
                        </div>
                      </div>
                    ) : (
                      <QRCameraScanner
                        onScanSuccess={(code) => handleQrCodeVerifyAndCheckIn(code)}
                        onClose={() => setShowQrScanner(false)}
                        activeJobLocation={activeJob?.location}
                      />
                    )}

                    {qrScannerError && (
                      <div className="p-3 bg-red-950/80 border border-red-900/60 rounded-xl text-[11px] text-red-200 leading-relaxed uppercase font-bold tracking-wide">
                        ⚠️ {qrScannerError}
                      </div>
                    )}

                    {/* Simulation Triggers */}
                    <div className="space-y-4 pt-1">
                      {activeJob && !isScanning && (
                        <button
                          type="button"
                          onClick={() => handleQrCodeVerifyAndCheckIn(`EMPOWORK_SITE_CHECKIN:${activeJob.id}`)}
                          className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center cursor-pointer transition-all border border-amber-400 shadow-lg font-mono"
                        >
                          <QrCode className="w-4 h-4 mr-2" /> Simulate Instant QR Scan on Site
                        </button>
                      )}

                      {/* Manual Entry Divider */}
                      <div className="flex items-center my-3 text-slate-500">
                        <hr className="flex-grow border-slate-800" />
                        <span className="px-3 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">
                          Or Enter Site Code Manually
                        </span>
                        <hr className="flex-grow border-slate-800" />
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={qrCodeInput}
                          onChange={(e) => setQrCodeInput(e.target.value)}
                          placeholder="e.g. EMPOWORK_SITE_CHECKIN:job-123"
                          disabled={isScanning}
                          className="flex-grow bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono font-bold text-white placeholder:text-slate-600"
                        />
                        <button
                          type="button"
                          disabled={isScanning || !qrCodeInput.trim()}
                          onClick={() => handleQrCodeVerifyAndCheckIn(qrCodeInput)}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 text-slate-300 disabled:text-slate-600 font-bold text-xs uppercase rounded-xl transition-all font-mono border border-slate-800"
                        >
                          Verify
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  /* GORGEOUS VERIFIED SUCCESS SCREEN */
                  <div className="text-center py-6 space-y-5 animate-in fade-in zoom-in-95 duration-200 select-none">
                    <div className="relative mx-auto w-16 h-16 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="absolute inset-0 bg-emerald-500/10 rounded-2xl animate-ping"
                      />
                      <CheckCircle2 className="w-10 h-10 text-emerald-500 z-10" />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-mono font-black uppercase text-emerald-400 tracking-widest block">
                        VERIFICATION SUCCESSFUL
                      </span>
                      <h4 className="text-lg font-black uppercase leading-tight text-white">
                        Attendance Logged Instantly
                      </h4>
                      <p className="text-xs text-slate-400 leading-normal max-w-xs mx-auto">
                        Your unique site QR code check-in has been validated against the employer's registry and GPS boundaries.
                      </p>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 text-left space-y-2 text-xs font-mono">
                      <div className="flex justify-between border-b border-slate-900 pb-1.5">
                        <span className="text-slate-500">Project Title:</span>
                        <span className="font-bold text-slate-200 uppercase">{activeJob?.title}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-900 pb-1.5">
                        <span className="text-slate-500">Check-In Time:</span>
                        <span className="font-bold text-slate-200">{new Date().toLocaleTimeString()}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-900 pb-1.5">
                        <span className="text-slate-500">GPS Status:</span>
                        <span className="font-bold text-emerald-400">CORRELATED</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Method:</span>
                        <span className="font-bold text-amber-400 uppercase">QR CODE SCAN</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowQrScanner(false);
                        setScanSuccess(false);
                      }}
                      className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider cursor-pointer transition-all border border-emerald-400 shadow-md font-mono"
                    >
                      Awesome, Let's Start Work
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GORGEOUS JOB DETAILS MODAL */}
      <AnimatePresence>
        {isDetailsModalOpen && detailedJob && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative flex flex-col max-h-[90vh] text-left"
            >
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-black px-2 py-0.5 bg-slate-900 text-amber-500 rounded uppercase tracking-wider">
                    {detailedJob.trade}
                  </span>
                  <h3 className="text-base font-black text-slate-900 mt-2 leading-tight uppercase">
                    {detailedJob.title}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Posted by Builder: <strong className="text-slate-700">{detailedJob.employerName}</strong>
                  </p>
                </div>
                <button
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
                  type="button"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-grow overflow-y-auto py-4 space-y-4 pr-1">
                {/* Wage & Slots */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-150">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Wages Offered</span>
                    <span className="text-lg font-black text-slate-900">₹{detailedJob.wage} <span className="text-xs text-slate-500 font-bold">/ Day</span></span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Remaining Slots</span>
                    <span className="text-lg font-black text-slate-900">{detailedJob.slots - detailedJob.slotsTaken} <span className="text-xs text-slate-500 font-bold">Left</span></span>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight mb-1.5">
                    Job Description & Contract Scope
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {detailedJob.description}
                  </p>
                </div>

                {/* Logistics */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight">
                    Schedule & Logistics
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center space-x-2 text-slate-600">
                      <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                      <span><strong>Dates:</strong> {detailedJob.startDate} to {detailedJob.endDate}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-600">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate"><strong>Location:</strong> {detailedJob.location}</span>
                    </div>
                  </div>
                </div>

                {/* Required Skills / Equipment */}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight mb-1.5">
                    Required Equipment & Site Guidelines
                  </h4>
                  <div className="p-3 bg-amber-50/40 border border-amber-100 rounded-lg text-[11px] text-slate-600 space-y-1.5">
                    <p className="flex items-center font-semibold text-amber-800">
                      <ShieldCheck className="w-4 h-4 mr-1 text-amber-600" /> Professional PPE and verified trade skills are mandatory.
                    </p>
                    <p className="leading-normal">
                      Applicants are expected to possess their own basic tools (e.g., masonry trowel, safe working boots) as highlighted under the EmpoWork certified tool list.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="border-t border-slate-100 pt-4 flex gap-3">
                <button
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-800 font-bold text-xs rounded-xl uppercase tracking-wider hover:bg-slate-50 transition-all cursor-pointer text-center"
                  type="button"
                >
                  Close Details
                </button>
                {applications.some(a => a.jobId === detailedJob.id) ? (
                  <div className="flex-1">
                    <div className={`w-full py-2.5 rounded-xl text-center font-black text-xs flex items-center justify-center border uppercase tracking-wider h-[38px] ${
                      applications.find(a => a.jobId === detailedJob.id)?.status === "accepted"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : applications.find(a => a.jobId === detailedJob.id)?.status === "rejected"
                        ? "bg-red-50 border-red-200 text-red-800"
                        : "bg-amber-50 border-amber-200 text-amber-800"
                    }`}>
                      Status: {applications.find(a => a.jobId === detailedJob.id)?.status}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      triggerApplyJob(detailedJob);
                      setIsDetailsModalOpen(false);
                    }}
                    className="flex-grow-[1.5] py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-black text-xs rounded-xl uppercase tracking-wider transition-all cursor-pointer text-center flex items-center justify-center h-[38px]"
                    type="button"
                  >
                    Apply with Trade Profile
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Real-time Emergency SOS Button and Dispatch Portal Overlay */}
      <EmergencySOS user={user} attendance={attendance} />

    </main>
  );
}
