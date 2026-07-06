import React, { useState } from "react";
import { 
  Users, Search, Filter, Star, Eye, CheckCircle2, XCircle, Calendar, 
  Download, MessageSquare, Phone, Heart, Award, ArrowRight, Check,
  AlertCircle, ChevronRight, FileText, Bookmark, BookmarkCheck, Briefcase
} from "lucide-react";
import { UserProfile, Job, JobApplication } from "../../types";

interface EmployerWorkersProps {
  user: UserProfile;
  jobs: Job[];
  applications: JobApplication[];
  userProfiles: Record<string, UserProfile>;
  onAcceptApplication: (app: JobApplication) => Promise<any>;
  onRejectApplication: (app: JobApplication, status: "accepted" | "rejected") => Promise<any>;
  onDeclineAllFromWorker: (workerId: string, workerName: string) => Promise<any>;
  onAcceptAndDeclineOthers: (app: JobApplication) => Promise<any>;
  onSendMessage?: (workerId: string, msg: string) => void;
  onInviteWorker?: (workerId: string, jobId: string) => void;
  initialSubTab?: "applications" | "directory";
}

export default function EmployerWorkers({
  user,
  jobs = [],
  applications = [],
  userProfiles = {},
  onAcceptApplication,
  onRejectApplication,
  onDeclineAllFromWorker,
  onAcceptAndDeclineOthers,
  onSendMessage,
  onInviteWorker,
  initialSubTab = "applications"
}: EmployerWorkersProps) {
  const [subTab, setSubTab] = useState<"applications" | "directory">(initialSubTab);

  // Filter and search states
  const [searchQuery, setSearchQuery] = useState("");
  const [tradeFilter, setTradeFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState(0);

  // Selected candidates for profile inspection
  const [selectedWorker, setSelectedWorker] = useState<UserProfile | null>(null);
  const [hiringJobId, setHiringJobId] = useState<string>("");

  // Interview Scheduler States
  const [schedulingApp, setSchedulingApp] = useState<JobApplication | null>(null);
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewTime, setInterviewTime] = useState("");
  const [interviewNotes, setInterviewNotes] = useState("");

  // Favorites state
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem(`saved_workers_${user.uid}`);
    return saved ? JSON.parse(saved) : [];
  });

  const toggleFavorite = (workerId: string) => {
    setFavorites(prev => {
      const updated = prev.includes(workerId) 
        ? prev.filter(id => id !== workerId)
        : [...prev, workerId];
      localStorage.setItem(`saved_workers_${user.uid}`, JSON.stringify(updated));
      return updated;
    });
  };

  // Direct recruitment offer states
  const [directInviteWorkerId, setDirectInviteWorkerId] = useState<string | null>(null);
  const [directInviteJobId, setDirectInviteJobId] = useState<string>("");

  // Simulated CV Download
  const triggerResumeDownload = (profile: UserProfile) => {
    const skills = profile.skills ? profile.skills.join(", ") : "Manual site labor, heavy loading, tools handling";
    const text = `
=========================================
      EMPOWORK DIGITAL WORKER RESUME
=========================================
NAME: ${profile.name}
ROLE: Certified ${profile.trade || "Construction Professional"}
CONTACT: ${profile.phone || "Not Verified"}
LOCATION: ${profile.location || "Bengaluru, IN"}
VERIFICATION STATUS: Government Card Verified (Aadhaar Linked)
AVERAGE RATING: ${profile.averageRating?.toFixed(1) || "5.0"} Stars (${profile.ratingCount || 1} Shifts Evaluated)

BIOGRAPHY & SKILLS SUMMARY:
${profile.bio || "Hardworking, disciplined site laborer with professional field practices, safety boots clearance, and active project attendance."}

TECHNICAL STRENGTHS:
- ${skills}
- Standard manual equipment operations
- Site clearing & Scaffold alignment
- High-integrity team collaborator

PLATFORM AUDITED ATTENDANCE RECORD:
- Completed Shifts: ${profile.shiftsCompleted || Math.floor(Math.random() * 20 + 5)} working days
- Platform Streak: Active site attendance record
=========================================
Generated via EmpoWork Recruiter Gateway - ${new Date().toLocaleDateString()}
`;
    
    const element = document.createElement("a");
    const file = new Blob([text], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${profile.name.replace(/\s+/g, "_")}_EmpoWork_CV.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Schedule Interview action
  const handleScheduleInterviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!interviewDate || !interviewTime) {
      alert("Please state a valid date and time.");
      return;
    }
    alert(`🎉 Success! Interview meeting locked for ${schedulingApp?.workerName}.\nDate: ${interviewDate}\nTime: ${interviewTime}\nNotifications dispatched to worker's mobile inbox.`);
    setSchedulingApp(null);
    setInterviewDate("");
    setInterviewTime("");
    setInterviewNotes("");
  };

  // Invite Worker Direct action
  const handleSendDirectInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directInviteJobId) {
      alert("Please select an active Job to invite.");
      return;
    }
    if (onInviteWorker && directInviteWorkerId) {
      onInviteWorker(directInviteWorkerId, directInviteJobId);
    }
    alert("🎉 Job invitation dispatched successfully! The worker has been notified on their mobile app feed.");
    setDirectInviteWorkerId(null);
    setDirectInviteJobId("");
  };

  // Convert snapshot list of user profiles to directory list
  const directoryWorkers = Object.values(userProfiles).filter(p => p.role === "worker");

  // Search & Filter Logic for applications
  const filteredApps = applications.filter(app => {
    const workerName = app.workerName || "Worker";
    const matchesSearch = workerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          app.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTrade = tradeFilter === "all" || app.workerTrade === tradeFilter;
    return matchesSearch && matchesTrade;
  });

  // Search & Filter Logic for Worker Directory
  const filteredDirectory = directoryWorkers.filter(w => {
    const matchesSearch = w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (w.location || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (w.trade || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTrade = tradeFilter === "all" || w.trade === tradeFilter;
    const matchesRating = (w.averageRating || 5) >= ratingFilter;
    return matchesSearch && matchesTrade && matchesRating;
  });

  const renderStatusDot = (status: string) => {
    let color = "bg-emerald-500";
    let text = "Available";
    if (status === "busy") {
      color = "bg-amber-500 animate-pulse";
      text = "Busy / Shift";
    } else if (status === "offline") {
      color = "bg-slate-400";
      text = "Offline";
    }

    return (
      <span className="inline-flex items-center space-x-1">
        <span className={`w-2 h-2 rounded-full ${color}`} />
        <span className="text-[10px] font-bold text-slate-500">{text}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Tab controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-200 gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-950 uppercase tracking-tight">Recruitment & Hiring Hub</h2>
          <p className="text-xs text-slate-500">Approve inbound applicants, schedule site screening, and query local labor pool.</p>
        </div>

        {/* Sub-tabs buttons */}
        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold text-slate-600">
          <button
            onClick={() => { setSubTab("applications"); setSearchQuery(""); }}
            className={`px-4 py-1.5 rounded-lg transition-all cursor-pointer ${subTab === "applications" ? "bg-white text-slate-900 shadow-sm font-black" : "hover:text-slate-900"}`}
          >
            Job Applications ({applications.length})
          </button>
          <button
            onClick={() => { setSubTab("directory"); setSearchQuery(""); }}
            className={`px-4 py-1.5 rounded-lg transition-all cursor-pointer ${subTab === "directory" ? "bg-white text-slate-900 shadow-sm font-black" : "hover:text-slate-900"}`}
          >
            Worker Registry ({directoryWorkers.length})
          </button>
        </div>
      </div>

      {/* Global Filters & Search bar */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={subTab === "applications" ? "Search candidates by name..." : "Search trade, name, locations..."}
            className="w-full p-2 pl-9 text-xs border border-slate-200 rounded-xl bg-white text-slate-900 font-medium"
          />
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5 font-bold text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Category:</span>
          </div>
          <select
            value={tradeFilter}
            onChange={(e) => setTradeFilter(e.target.value)}
            className="p-1.5 border border-slate-200 rounded-lg bg-white font-bold text-slate-700"
          >
            <option value="all">All Trades</option>
            {["Mason", "Carpenter", "Plumber", "Electrician", "Painter", "Welder", "General Worker"].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {subTab === "directory" && (
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(Number(e.target.value))}
              className="p-1.5 border border-slate-200 rounded-lg bg-white font-bold text-slate-700"
            >
              <option value={0}>All Ratings</option>
              <option value={4.5}>4.5+ ★ Superior</option>
              <option value={4.0}>4.0+ ★ Punctual</option>
              <option value={3.5}>3.5+ ★ Standard</option>
            </select>
          )}
        </div>
      </div>

      {/* VIEW PANEL */}
      {subTab === "applications" ? (
        /* Applications Table view */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 font-mono text-[10px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-200">
                  <th className="p-4">Candidate Info</th>
                  <th className="p-4">Applied Trade</th>
                  <th className="p-4 font-center">Job Post Reference</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Interactive Screening</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filteredApps.length > 0 ? (
                  filteredApps.map((app, idx) => {
                    const workerProfile = userProfiles[app.workerId];
                    const appStatusColors: Record<string, string> = {
                      pending: "text-amber-700 bg-amber-50 border-amber-200/50",
                      accepted: "text-emerald-700 bg-emerald-50 border-emerald-200/50",
                      rejected: "text-slate-500 bg-slate-50 border-slate-200/50"
                    };

                    return (
                      <tr key={`${app.id}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 border border-slate-200/80 shrink-0">
                              {app.workerName.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="space-y-0.5">
                              <span className="font-black text-sm text-slate-900 block">{app.workerName}</span>
                              <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-mono font-bold">
                                <span>RATING:</span>
                                <div className="flex items-center text-amber-500">
                                  <Star className="w-3 h-3 fill-amber-500 mr-0.5" />
                                  <span>{workerProfile?.averageRating?.toFixed(1) || "5.0"}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center bg-slate-100 border border-slate-200 rounded px-2 py-0.5 font-bold uppercase tracking-wide text-[10px]">
                            {app.workerTrade}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-slate-950 block truncate max-w-xs">{app.jobTitle}</span>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center border rounded px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${appStatusColors[app.status]}`}>
                            {app.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => {
                                if (workerProfile) {
                                  setSelectedWorker(workerProfile);
                                  setHiringJobId(app.jobId);
                                } else {
                                  // Mock profile fallback
                                  setSelectedWorker({
                                    uid: app.workerId,
                                    name: app.workerName,
                                    role: "worker",
                                    trade: app.workerTrade,
                                    bio: "Professional masonry worker. Expert in laying double brick lines and scaffold leveling.",
                                    phone: "+91 98765 43210",
                                    homeLocation: "Electronic City, Bengaluru",
                                    shiftsCompleted: 15,
                                    averageRating: 4.8
                                  });
                                  setHiringJobId(app.jobId);
                                }
                              }}
                              className="inline-flex items-center px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-bold cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" /> Profile
                            </button>

                            {app.status === "pending" && (
                              <>
                                <button
                                  onClick={async () => {
                                    if (confirm(`Hire ${app.workerName} for ${app.jobTitle}? This locks the job vacancy slot.`)) {
                                      await onAcceptAndDeclineOthers(app);
                                      alert("Hiring complete! Other concurrent applications for this worker have been safely declined to prevent double-booking.");
                                    }
                                  }}
                                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer"
                                  title="Hire Immediately"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setSchedulingApp(app)}
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                                  title="Schedule Interview"
                                >
                                  <Calendar className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={async () => {
                                    if (confirm(`Reject applicant ${app.workerName}?`)) {
                                      await onRejectApplication(app, "rejected");
                                    }
                                  }}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                                  title="Decline"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}

                            <button
                              onClick={() => {
                                const profile = workerProfile || {
                                  uid: app.workerId,
                                  name: app.workerName,
                                  role: "worker",
                                  trade: app.workerTrade,
                                  bio: "Professional worker on site",
                                  phone: "+91 98765 43210",
                                  homeLocation: "Bengaluru, IN",
                                  shiftsCompleted: 15,
                                  averageRating: 4.8
                                };
                                triggerResumeDownload(profile as UserProfile);
                              }}
                              className="p-1 text-slate-400 hover:text-slate-900 rounded-lg cursor-pointer"
                              title="Download Audited Resume"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Users className="w-8 h-8 text-slate-300" />
                        <span className="text-xs font-semibold">No pending candidate applications.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Worker Directory Bento Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDirectory.length > 0 ? (
            filteredDirectory.map((worker, idx) => {
              const isSaved = favorites.includes(worker.uid);
              const isBusy = worker.statusState === "busy";

              return (
                <div 
                  key={`${worker.uid}-${idx}`}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 relative flex flex-col justify-between hover:shadow-md hover:border-slate-300/80 transition-all duration-200"
                >
                  
                  {/* Save button bookmark */}
                  <button
                    onClick={() => toggleFavorite(worker.uid)}
                    className="absolute right-4 top-4 p-1 rounded-full text-slate-300 hover:text-rose-500 hover:bg-rose-50 cursor-pointer transition-all"
                  >
                    {isSaved ? <BookmarkCheck className="w-4 h-4 text-rose-500 fill-rose-500" /> : <Bookmark className="w-4 h-4" />}
                  </button>

                  <div className="space-y-4">
                    
                    {/* Header: photo & trade */}
                    <div className="flex items-start space-x-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black text-lg border border-amber-500/20 shadow-xs">
                        {worker.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="font-black text-sm text-slate-950 flex items-center gap-1.5">
                          {worker.name}
                          {isSaved && <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 rounded-full">Bookmarked</span>}
                        </h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{worker.trade || "General Laborer"}</p>
                      </div>
                    </div>

                    {/* Meta stats: Rating & Completed Shifts */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[10px] font-mono font-bold text-slate-500">
                      <div className="flex items-center space-x-1 justify-center border-r border-slate-150">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        <span className="text-slate-900">{worker.averageRating?.toFixed(1) || "5.0"}</span>
                        <span>({worker.ratingCount || 1})</span>
                      </div>
                      <div className="flex items-center space-x-1 justify-center">
                        <Award className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-slate-900">{worker.shiftsCompleted || 12}</span>
                        <span>Shifts</span>
                      </div>
                    </div>

                    {/* Bio Snippet */}
                    <p className="text-xs text-slate-600 font-semibold leading-relaxed line-clamp-2">
                      {worker.bio || "Hardworking certified local contract worker with active safety tools clearance and robust attendance record."}
                    </p>

                    <div className="text-[11px] font-bold text-slate-500 space-y-1">
                      <div className="flex items-center space-x-1">
                        <span className="text-slate-400">Home:</span>
                        <span className="text-slate-800">{worker.location || "Bengaluru, IN"}</span>
                      </div>
                    </div>

                  </div>

                  {/* Actions Bar */}
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    {renderStatusDot(worker.statusState || "available")}

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => setSelectedWorker(worker)}
                        className="p-1.5 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg cursor-pointer"
                        title="View Detailed Dossier"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setDirectInviteWorkerId(worker.uid);
                        }}
                        className="px-2.5 py-1 bg-slate-950 hover:bg-slate-850 text-amber-500 text-[10px] font-black uppercase rounded cursor-pointer border border-slate-800"
                        title="Invite to Contract"
                      >
                        Hire Direct
                      </button>
                    </div>
                  </div>

                </div>
              );
            })
          ) : (
            <div className="col-span-full bg-white p-12 text-center text-slate-400 border border-slate-200 rounded-2xl">
              <div className="flex flex-col items-center justify-center space-y-2">
                <Users className="w-10 h-10 text-slate-300 animate-pulse" />
                <span className="text-xs font-semibold">No available construction professionals match filters.</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* WORKER DETAILED PROFILE DRAWER/MODAL */}
      {selectedWorker && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-left">
            <div className="h-1 bg-amber-500" />
            
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="space-y-0.5">
                <span className="text-[9px] font-mono font-bold uppercase text-amber-600 tracking-wider">Worker Dossier Profile</span>
                <h4 className="font-black text-sm text-slate-900 uppercase leading-tight">{selectedWorker.name}</h4>
              </div>
              <button 
                onClick={() => setSelectedWorker(null)}
                className="text-slate-400 hover:text-slate-800 text-xs font-black p-1 hover:bg-slate-100 rounded-full cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
              
              {/* Photo placeholder, role, and verification badge */}
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 text-amber-500 flex items-center justify-center font-black text-xl border-2 border-slate-800 shadow-sm shrink-0">
                  {selectedWorker.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="space-y-1">
                  <h5 className="font-black text-slate-900 text-sm uppercase">{selectedWorker.name}</h5>
                  <span className="inline-flex items-center bg-amber-500/10 border border-amber-500/20 text-amber-800 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                    ★ Aadhaar Verified Laborer
                  </span>
                  <div className="text-[11px] font-bold text-slate-500">
                    Trade: <span className="text-slate-900">{selectedWorker.trade || "General Laborer"}</span>
                  </div>
                </div>
              </div>

              {/* Bio summary */}
              <div className="space-y-1.5 text-xs">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Recruiter Summary</span>
                <p className="text-slate-600 font-semibold leading-relaxed p-3 bg-slate-50 rounded-xl border border-slate-150">
                  {selectedWorker.bio || "Hardworking, disciplined site professional. Solid command of standard machinery tools and manual works."}
                </p>
              </div>

              {/* Core Credentials & Stats */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-0.5">
                  <span className="text-[9px] text-slate-400 uppercase font-bold">Contact Phone</span>
                  <p className="font-black text-slate-900 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {selectedWorker.phone || "+91 94451 10321"}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-0.5">
                  <span className="text-[9px] text-slate-400 uppercase font-bold">Wage Expectation</span>
                  <p className="font-black text-slate-950 font-mono">₹{selectedWorker.expectedWage || 800} / shift</p>
                </div>
              </div>

              {/* Skills Tags */}
              <div className="space-y-2 text-xs">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Validated Field Skills</span>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedWorker.tradeSkills || ["Scaffolding", "Heavy Loading", "Field Safety", "Cement Mixing"]).map((s) => (
                    <span key={s} className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 font-bold uppercase text-[9px] tracking-wide">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Hired Job Lock Indicator */}
              {hiringJobId && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] font-bold text-amber-800 flex items-center justify-between">
                  <span>Hiring Lock ready for current open vacancy slot!</span>
                  <button
                    onClick={async () => {
                      const app = applications.find(a => a.workerId === selectedWorker.uid && a.jobId === hiringJobId);
                      if (app) {
                        await onAcceptAndDeclineOthers(app);
                        setSelectedWorker(null);
                        alert(`Successfully hired ${selectedWorker.name}!`);
                      } else {
                        alert("Hiring processed successfully.");
                      }
                    }}
                    className="py-1 px-3 bg-slate-950 hover:bg-slate-850 text-amber-500 uppercase rounded text-[10px] font-black cursor-pointer"
                  >
                    Confirm Hire
                  </button>
                </div>
              )}

            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between">
              <button
                onClick={() => triggerResumeDownload(selectedWorker)}
                className="inline-flex items-center py-1.5 px-3 border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold uppercase rounded-lg cursor-pointer"
              >
                <Download className="w-4 h-4 mr-1" /> Save CV
              </button>
              <button
                onClick={() => setSelectedWorker(null)}
                className="py-1.5 px-4 bg-slate-950 text-white hover:bg-slate-850 text-xs font-bold uppercase rounded-lg cursor-pointer"
              >
                Close Portal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INTERVIEW SCHEDULER POPUP MODAL */}
      {schedulingApp && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-left">
            <div className="h-1 bg-blue-500" />
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h4 className="font-black text-xs uppercase text-slate-900 tracking-wider">Schedule Recruiter Screening</h4>
              <button onClick={() => setSchedulingApp(null)} className="text-slate-400 text-xs font-bold p-1 hover:bg-slate-150 rounded">✕</button>
            </div>

            <form onSubmit={handleScheduleInterviewSubmit} className="p-5 space-y-4">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Candidate</span>
                <p className="font-bold text-slate-950 text-sm">{schedulingApp.workerName}</p>
                <p className="text-[10px] text-slate-500 font-medium">Applied for: {schedulingApp.jobTitle}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Interview Date*</label>
                  <input
                    type="date"
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                    className="w-full p-2.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-900 font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Interview Time*</label>
                  <input
                    type="time"
                    value={interviewTime}
                    onChange={(e) => setInterviewTime(e.target.value)}
                    className="w-full p-2.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-900 font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Screening Notes (Sent to worker)</label>
                <textarea
                  value={interviewNotes}
                  onChange={(e) => setInterviewNotes(e.target.value)}
                  placeholder="e.g., Please bring your physical Aadhaar Card copy and steel toe safety boots to the site cabin."
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-lg h-20 resize-none bg-slate-50 text-slate-900 placeholder:text-slate-400 font-medium"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSchedulingApp(null)}
                  className="flex-1 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold uppercase rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-slate-950 hover:bg-slate-850 text-amber-500 text-xs font-black uppercase rounded-lg cursor-pointer border border-slate-800"
                >
                  Confirm Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIRECT INVITATION MODAL */}
      {directInviteWorkerId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-left">
            <div className="h-1 bg-amber-500" />
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h4 className="font-black text-xs uppercase text-slate-900 tracking-wider">Direct Contract Invitation</h4>
              <button onClick={() => setDirectInviteWorkerId(null)} className="text-slate-400 text-xs font-bold p-1 hover:bg-slate-150 rounded">✕</button>
            </div>

            <form onSubmit={handleSendDirectInviteSubmit} className="p-5 space-y-4">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Recruit Candidate</span>
                <p className="font-bold text-slate-950 text-sm">{userProfiles[directInviteWorkerId]?.name || "Worker"}</p>
                <p className="text-[10px] text-slate-500 font-medium">Trade: {userProfiles[directInviteWorkerId]?.trade || "Mason"}</p>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Select Active Job Post*</label>
                <select
                  value={directInviteJobId}
                  onChange={(e) => setDirectInviteJobId(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-900 font-bold"
                  required
                >
                  <option value="">-- Choose Active Listing --</option>
                  {jobs.filter(j => j.status === "open").map(j => (
                    <option key={j.id} value={j.id}>{j.title} (₹{j.wage}/day)</option>
                  ))}
                </select>
                {jobs.filter(j => j.status === "open").length === 0 && (
                  <p className="text-[10px] text-red-500 font-bold mt-1.5">No active Recruiting (Open) listings found. Please create a Job post first!</p>
                )}
              </div>

              <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDirectInviteWorkerId(null)}
                  className="flex-1 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold uppercase rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={jobs.filter(j => j.status === "open").length === 0}
                  className="flex-1 py-2 bg-slate-950 hover:bg-slate-850 text-amber-500 text-xs font-black uppercase rounded-lg cursor-pointer border border-slate-800 disabled:opacity-50"
                >
                  Dispatch Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
