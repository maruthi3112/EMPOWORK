import React, { useState, useEffect, useRef } from "react";
import { 
  Shield, Users, Briefcase, FileText, TrendingUp, AlertTriangle, CheckCircle, 
  RefreshCw, MessageSquare, ShieldAlert, Edit3, Trash2, Star,
  Brain, Scale, FileCheck, Activity, CheckSquare, Square, AlertCircle, Wand2, Info, Sparkles,
  Building, Clock, CreditCard, Bell, Settings, Database, HardDrive, Key, LogOut, Search,
  Plus, X, Trash, Check, Ban, Eye, RotateCcw, AlertOctagon, Send, FileSpreadsheet, KeyRound,
  Lock, ShieldCheck, Mail, Phone, MapPin, BadgeCheck, Coins, Award
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area
} from "recharts";
import { 
  db, 
  auth, 
  collection, 
  getDocs, 
  updateDoc, 
  doc, 
  setDoc, 
  addDoc, 
  signOut 
} from "../lib/firebase";
import { UserProfile, Job, Complaint, WagePayment, JobApplication, AttendanceRecord } from "../types";
import VoiceInputButton from "./VoiceInputButton";
import { useAdminData } from "../context/AdminDataContext";

// Import modular sub-tabs
import UserTab from "./admin/UserTab";
import WorkerEmployerTab from "./admin/WorkerEmployerTab";
import JobsApplicationsTab from "./admin/JobsApplicationsTab";
import PayrollAttendanceTab from "./admin/PayrollAttendanceTab";
import DisputeTab from "./admin/DisputeTab";
import DatabaseBackupTab from "./admin/DatabaseBackupTab";
import SystemLogsTab from "./admin/SystemLogsTab";
import AdminNotificationPanel from "./admin/AdminNotificationPanel";

interface AdminDashboardProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function AdminDashboard({ activeTab, setActiveTab }: AdminDashboardProps) {
  // Navigation tabs (17 modules organized into primary workspace controls)
  const [currentAdminTab, setCurrentAdminTab] = useState<
    "dashboard" | "users" | "credentials" | "jobs" | "payroll" | "disputes" | "integrity" | "logs"
  >("dashboard");

  // Load from unified real-time admin syncing context
  const {
    workers,
    employers,
    admins,
    jobs,
    jobApplications,
    attendanceRecords,
    wagePayments,
    complaints,
    loading,
    refetch,
    logAdminAction
  } = useAdminData();

  const [initialLoaded, setInitialLoaded] = useState(false);

  // Synchronize with parent main sidebar trigger clicks
  useEffect(() => {
    if (activeTab === "admin-complaints" || activeTab === "admin-disputes") {
      setCurrentAdminTab("disputes");
    } else if (activeTab === "admin-dashboard" || activeTab === "dashboard") {
      setCurrentAdminTab("dashboard");
    } else if (activeTab === "admin-users") {
      setCurrentAdminTab("users");
    } else if (activeTab === "admin-credentials") {
      setCurrentAdminTab("credentials");
    } else if (activeTab === "admin-jobs") {
      setCurrentAdminTab("jobs");
    } else if (activeTab === "admin-payroll") {
      setCurrentAdminTab("payroll");
    } else if (activeTab === "admin-integrity") {
      setCurrentAdminTab("integrity");
    } else if (activeTab === "admin-logs") {
      setCurrentAdminTab("logs");
    }
  }, [activeTab]);

  useEffect(() => {
    if (!loading) {
      setInitialLoaded(true);
    }
  }, [loading]);

  const handleLogout = async () => {
    if (window.confirm("🔐 LOGOUT DEMAND\n\nAre you sure you want to log out of the Administrator dashboard?")) {
      await logAdminAction("Sign Out", "Auth & Security", "Admin successfully disconnected from system.");
      await signOut(auth);
    }
  };

  // Compute stats metrics
  const pendingJobsCount = jobs.filter(j => (j as any).status === "pending_approval").length;
  const unresolvedComplaintsCount = complaints.filter(c => c.status !== "resolved").length;
  const pendingVerificationsCount = workers.filter(w => !(w as any).identityVerified).length + employers.filter(e => !(e as any).businessVerified).length;
  
  // Escrow funds calculation
  const totalEscrowHeld = wagePayments
    .filter(p => p.status === "pending")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const totalWagesPaid = wagePayments
    .filter(p => p.status === "paid")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  // Construction Trades specialty counts
  const tradesData = [
    { name: "Masons", count: workers.filter(w => w.trade === "Mason").length, color: "#f59e0b" },
    { name: "Electricians", count: workers.filter(w => w.trade === "Electrician").length, color: "#6366f1" },
    { name: "Plumbers", count: workers.filter(w => w.trade === "Plumber").length, color: "#06b6d4" },
    { name: "Painters", count: workers.filter(w => w.trade === "Painter").length, color: "#10b981" },
    { name: "Carpenters", count: workers.filter(w => w.trade === "Carpenter").length, color: "#ec4899" },
    { name: "Helpers", count: workers.filter(w => !w.trade || w.trade === "Helper" || w.trade === "All").length, color: "#64748b" }
  ].filter(t => t.count > 0);

  // Growth Trend Chart details (simulated dynamic over dates)
  const growthTrendData = [
    { date: "June 28", workers: 42, activeJobs: 12 },
    { date: "June 29", workers: 45, activeJobs: 15 },
    { date: "June 30", workers: 50, activeJobs: 18 },
    { date: "July 01", workers: 58, activeJobs: 21 },
    { date: "July 02", workers: workers.length + 5, activeJobs: jobs.filter(j => j.status === "active").length + 2 },
    { date: "July 03 (Today)", workers: workers.length, activeJobs: jobs.filter(j => j.status === "active").length }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Dynamic Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider font-mono flex items-center gap-1">
            <Shield className="w-3.5 h-3.5" /> SECURE CONTROL CONSOLE (RBAC LAYER V3)
          </span>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight mt-1 flex items-center gap-2">
            EmpoWork Suite Authority
          </h1>
          <p className="text-xs text-slate-500 mt-1">Platform-wide control over user registrations, construction vacancies, digital shift check-ins, and smart escrow disbursements.</p>
        </div>

        {/* Global Controls & Voice Commands */}
        <div className="flex items-center gap-2">
          <AdminNotificationPanel 
            currentTab={currentAdminTab}
            setCurrentTab={setCurrentAdminTab}
          />
          <VoiceInputButton 
            value=""
            onChange={(val) => {
              if (!val) return;
              // Simple voice routing logic
              const txt = val.toLowerCase();
              if (txt.includes("user") || txt.includes("member")) setCurrentAdminTab("users");
              else if (txt.includes("dispute") || txt.includes("complaint") || txt.includes("gemini")) setCurrentAdminTab("disputes");
              else if (txt.includes("work") || txt.includes("employ")) setCurrentAdminTab("credentials");
              else if (txt.includes("job") || txt.includes("vacanc")) setCurrentAdminTab("jobs");
              else if (txt.includes("pay") || txt.includes("escrow") || txt.includes("attendance")) setCurrentAdminTab("payroll");
              else if (txt.includes("backup") || txt.includes("settings") || txt.includes("duplicate")) setCurrentAdminTab("integrity");
              else if (txt.includes("log") || txt.includes("audit") || txt.includes("announc")) setCurrentAdminTab("logs");
              else if (txt.includes("dashboard") || txt.includes("home")) setCurrentAdminTab("dashboard");
            }}
            compact={true}
          />
          <button
            onClick={refetch}
            disabled={loading}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 cursor-pointer disabled:opacity-50 transition-colors"
            title="Refresh database records"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Admin cockpit layout */}
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm min-h-[680px] relative overflow-visible">
          {/* Subtle top edge progress bar when loading in the background */}
          {loading && initialLoaded && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500 animate-pulse z-50" />
          )}
          {loading && !initialLoaded ? (
            <div className="h-[600px] flex flex-col items-center justify-center text-center text-slate-400 space-y-2 animate-fade-in">
              <Activity className="w-10 h-10 text-slate-400 animate-spin" />
              <p className="text-xs font-black text-slate-900 uppercase tracking-wider">Syncing database registries...</p>
              <p className="text-[11px] text-slate-500">Retrieving users, shift check-ins, and escrow ledger documents.</p>
            </div>
          ) : (
            <>
              {/* Tab: Dashboard Overview widgets */}
              {currentAdminTab === "dashboard" && (
                <div className="space-y-6">
                  
                  {/* Executive Bento Widgets */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-2xs space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Platform Workers</span>
                      <h3 className="text-2xl font-black text-slate-900">{workers.length}</h3>
                      <span className="text-[10px] text-emerald-600 font-mono font-bold uppercase block">⚡ Available: {workers.filter(w => w.statusState === "available").length}</span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-2xs space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Contractor Firms</span>
                      <h3 className="text-2xl font-black text-slate-900">{employers.length}</h3>
                      <span className="text-[10px] text-indigo-600 font-mono font-bold uppercase block">🏢 Registered Firms</span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-2xs space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Agreed Escrow Held</span>
                      <h3 className="text-2xl font-black text-emerald-700">₹{totalEscrowHeld}</h3>
                      <span className="text-[10px] text-slate-400 font-mono block">Released: ₹{totalWagesPaid}</span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-2xs space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Audit Indicators</span>
                      <h3 className="text-2xl font-black text-amber-600">{unresolvedComplaintsCount}</h3>
                      <span className="text-[10px] text-red-600 font-mono font-bold uppercase block">⚠️ Grievance Cases</span>
                    </div>

                  </div>

                  {/* Operational Analytics & Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                    
                    {/* Trades specialty Recharts Bar Chart */}
                    <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-4 shadow-2xs">
                      <div>
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                          <Users className="w-4 h-4 text-slate-400" /> Worker Specialties Distribution
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">Census count of certified construction trades registered on the platform.</p>
                      </div>

                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={tradesData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={10} fontStyle="bold" />
                            <YAxis stroke="#64748b" fontSize={10} />
                            <Tooltip cursor={{ fill: "transparent" }} />
                            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                              {tradesData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Platform user growth Recharts Area Chart */}
                    <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-4 shadow-2xs">
                      <div>
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                          <TrendingUp className="w-4 h-4 text-slate-400" /> platform growth indicators
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">Comparison chart monitoring labor signups against active vacancy projects.</p>
                      </div>

                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={growthTrendData}>
                            <defs>
                              <linearGradient id="colorWorkers" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorJobs" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" stroke="#64748b" fontSize={10} fontStyle="bold" />
                            <YAxis stroke="#64748b" fontSize={10} />
                            <Tooltip />
                            <Area type="monotone" dataKey="workers" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorWorkers)" name="Registered Workers" />
                            <Area type="monotone" dataKey="activeJobs" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorJobs)" name="Active Jobs" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                  </div>

                  {/* Alerts and Telemetries block */}
                  <div className="bg-slate-950 border border-slate-900 rounded-xl p-5 text-slate-100 space-y-3.5 shadow-md relative overflow-hidden">
                    <div className="absolute right-0 top-0 opacity-10 font-black text-slate-50 text-8xl font-mono select-none pointer-events-none transform translate-x-12 translate-y-6">HQ</div>
                    <span className="text-[9px] font-black uppercase text-amber-400 tracking-wider font-mono block">Platform Infrastructure Core Status</span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                      <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                        <span className="text-slate-500 block">FIREBASE FIRESTORE:</span>
                        <span className="text-emerald-400 font-bold uppercase flex items-center gap-1 mt-1"><CheckCircle className="w-3.5 h-3.5" /> ONLINE / SYNCED</span>
                      </div>
                      <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                        <span className="text-slate-500 block">GEMINI API ENDPOINT:</span>
                        <span className="text-emerald-400 font-bold uppercase flex items-center gap-1 mt-1"><CheckCircle className="w-3.5 h-3.5" /> READY / V3.5 FLASH</span>
                      </div>
                      <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                        <span className="text-slate-500 block">SECURITY ACCESS LEVEL:</span>
                        <span className="text-amber-500 font-bold uppercase mt-1 block">LEVEL 3 (SUPER ADMIN)</span>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* Tab: User profiles directory */}
              {currentAdminTab === "users" && (
                <UserTab 
                  workers={workers}
                  employers={employers}
                  admins={admins}
                  onRefresh={refetch}
                  logAction={logAdminAction}
                />
              )}

              {/* Tab: Credentials Verifications */}
              {currentAdminTab === "credentials" && (
                <WorkerEmployerTab 
                  workers={workers}
                  employers={employers}
                  onRefresh={refetch}
                  logAction={logAdminAction}
                />
              )}

              {/* Tab: Jobs Vacancies & Applications */}
              {currentAdminTab === "jobs" && (
                <JobsApplicationsTab 
                  jobs={jobs}
                  jobApplications={jobApplications}
                  onRefresh={refetch}
                  logAction={logAdminAction}
                />
              )}

              {/* Tab: Attendance shift logs & Payroll releases */}
              {currentAdminTab === "payroll" && (
                <PayrollAttendanceTab 
                  attendanceRecords={attendanceRecords}
                  wagePayments={wagePayments}
                  onRefresh={refetch}
                  logAction={logAdminAction}
                />
              )}

              {/* Tab: AI Disputes arbitration room */}
              {currentAdminTab === "disputes" && (
                <DisputeTab 
                  complaints={complaints}
                  jobs={jobs}
                  attendanceRecords={attendanceRecords}
                  wagePayments={wagePayments}
                  onRefresh={refetch}
                  logAction={logAdminAction}
                />
              )}

              {/* Tab: Deduplication settings & backups */}
              {currentAdminTab === "integrity" && (
                <DatabaseBackupTab 
                  workers={workers}
                  employers={employers}
                  jobs={jobs}
                  jobApplications={jobApplications}
                  complaints={complaints}
                  onRefresh={refetch}
                  logAction={logAdminAction}
                />
              )}

              {/* Tab: Audit logs table & Announcements broadcasts */}
              {currentAdminTab === "logs" && (
                <SystemLogsTab 
                  onRefresh={refetch}
                  logAction={logAdminAction}
                />
              )}
            </>
          )}
      </div>
    </div>
  );
}
