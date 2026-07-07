import React, { useState } from "react";
import { 
  ShieldAlert, Search, PlusCircle, CheckCircle2, Sliders, Play, 
  Trash2, Eye, MessageSquare, AlertCircle, Sparkles, Send, 
  HelpCircle, User, Check, ChevronDown, Award, HardHat, Brain, Activity, Wand2
} from "lucide-react";
import { Complaint, UserProfile, Job, AttendanceRecord, WagePayment } from "../../types";

interface EmployerComplaintsProps {
  user: UserProfile;
  jobs: Job[];
  complaints: Complaint[];
  userProfiles: Record<string, UserProfile>;
  attendanceLogs?: AttendanceRecord[];
  wagePayments?: WagePayment[];
  onRaiseComplaint: (payload: Partial<Complaint>) => Promise<any>;
  onResolveComplaint: (complaintId: string, notes?: string) => Promise<any>;
  onAddComplaintComment: (complaintId: string, author: string, text: string, role?: string) => Promise<any>;
}

export default function EmployerComplaints({
  user,
  jobs = [],
  complaints = [],
  userProfiles = {},
  attendanceLogs = [],
  wagePayments = [],
  onRaiseComplaint,
  onResolveComplaint,
  onAddComplaintComment
}: EmployerComplaintsProps) {
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showRaiseForm, setShowRaiseForm] = useState(false);

  // Detail & Comments Overlay
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [newComment, setNewComment] = useState("");

  // Form states for raising dispute
  const [disputeJobId, setDisputeJobId] = useState("");
  const [disputeWorkerId, setDisputeWorkerId] = useState("");
  const [disputeReason, setDisputeReason] = useState("Unannounced Absence");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // AI Quick Resolve States
  const [quickResolveDispute, setQuickResolveDispute] = useState<Complaint | null>(null);
  const [quickResolveLoading, setQuickResolveLoading] = useState(false);
  const [quickResolveResult, setQuickResolveResult] = useState<{
    suggestedSettlement: string;
    recommendedPayout: number;
    justification: string;
    prefilledResolutionNotes: string;
  } | null>(null);
  const [quickResolveError, setQuickResolveError] = useState<string | null>(null);
  const [applyingQuickResolve, setApplyingQuickResolve] = useState(false);

  const handleQuickResolveClick = async (complaint: Complaint) => {
    setQuickResolveDispute(complaint);
    setQuickResolveLoading(true);
    setQuickResolveResult(null);
    setQuickResolveError(null);
    try {
      const associatedJob = jobs.find(j => j.id === complaint.jobId);
      const wage = associatedJob ? associatedJob.wage : 600;

      // Filter attendance records & wage payments
      const filteredAttendance = attendanceLogs.filter(
        (r) => r.workerId === complaint.workerId && r.jobId === complaint.jobId
      );
      const filteredPayments = wagePayments.filter(
        (p) => p.workerId === complaint.workerId && p.jobId === complaint.jobId
      );

      const response = await fetch("/api/gemini/quick-resolve-dispute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaintText: complaint.description,
          raisedBy: complaint.raisedBy,
          workerName: complaint.workerName,
          employerName: complaint.employerName,
          jobTitle: complaint.jobTitle,
          wage: wage,
          attendanceRecords: filteredAttendance,
          wagePayments: filteredPayments
        })
      });

      if (!response.ok) {
        throw new Error("Failed to load quick resolution suggestion from AI mediator.");
      }

      const data = await response.json();
      setQuickResolveResult(data);
    } catch (err: any) {
      console.error(err);
      setQuickResolveError(err.message || "An error occurred.");
    } finally {
      setQuickResolveLoading(false);
    }
  };

  const handleApplyQuickResolve = async () => {
    if (!quickResolveDispute || !quickResolveResult) return;
    setApplyingQuickResolve(true);
    try {
      await onResolveComplaint(quickResolveDispute.id, quickResolveResult.prefilledResolutionNotes);
      setQuickResolveDispute(null);
      setQuickResolveResult(null);
    } catch (err: any) {
      console.error(err);
      alert("Failed to apply quick resolution: " + err.message);
    } finally {
      setApplyingQuickResolve(false);
    }
  };

  // Compute Metrics
  const openCount = complaints.filter(c => c.status === "open").length;
  const investigatingCount = complaints.filter(c => c.status === "investigating").length;
  const resolvedCount = complaints.filter(c => c.status === "resolved").length;

  // Filters
  const filteredComplaints = complaints.filter(c => {
    const workerName = c.workerName || "Worker";
    const jobTitle = c.jobTitle || "Job";
    const matchesSearch = workerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          jobTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Raise Dispute Submit
  const handleRaiseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeJobId || !disputeWorkerId || !disputeDescription.trim()) {
      alert("Please prefill all required fields.");
      return;
    }

    const job = jobs.find(j => j.id === disputeJobId);
    const worker = Object.values(userProfiles).find(p => p.uid === disputeWorkerId);
    if (!job || !worker) return;

    setFormLoading(true);
    try {
      const payload: Partial<Complaint> = {
        id: `comp-emp-${Date.now()}`,
        jobId: disputeJobId,
        jobTitle: job.title,
        workerId: disputeWorkerId,
        workerName: worker.name,
        employerId: user.uid,
        employerName: user.companyName || user.name,
        description: `Raised by Employer: [${disputeReason}] - ${disputeDescription.trim()}`,
        status: "open",
        createdAt: new Date().toISOString().split("T")[0],
        comments: [
          {
            author: user.companyName || user.name,
            text: `Dispute opened under reason: ${disputeReason}. Description: ${disputeDescription.trim()}`,
            timestamp: new Date().toISOString().split("T")[0]
          }
        ]
      };

      await onRaiseComplaint(payload);
      alert("🎉 Workplace dispute raised successfully. Dispatched to regional labor mediator for neutral arbitration.");
      setShowRaiseForm(false);
      setDisputeDescription("");
    } catch (e) {
      console.error(e);
    } finally {
      setFormLoading(false);
    }
  };

  // Add Comment Submit
  const handleAddCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedComplaint) return;

    try {
      const author = user.companyName || user.name;
      const text = newComment.trim();
      await onAddComplaintComment(selectedComplaint.id, author, text, "employer");

      // Update local overlay state
      setSelectedComplaint(prev => {
        if (!prev) return null;
        return {
          ...prev,
          comments: [
            ...(prev.comments || []),
            { author, text, timestamp: new Date().toISOString(), role: "employer" }
          ]
        };
      });
      setNewComment("");
    } catch (err) {
      console.error(err);
    }
  };

  const listWorkers = Object.values(userProfiles).filter(p => p.role === "worker");

  // Local neutral mediator response generator based on dispute text
  const getAiArbitrationVerdict = (text: string) => {
    const lower = text.toLowerCase();
    if (lower.includes("absent") || lower.includes("leave")) {
      return "AI Mediator Assessment: Absences without prior notice are breaches of site guidelines. Propose employer pays pro-rated wages for completed hours only, and worker is warned. Immediate 1-on-1 reconciliatory call is recommended.";
    }
    if (lower.includes("wage") || lower.includes("pay") || lower.includes("salary")) {
      return "AI Mediator Assessment: Wage discrepancies detected. In accordance with platform terms, Daily wages must be disbursed within 24 hours of supervisor checkout. Propose immediate employer payroll clearing, or escrow hold verification.";
    }
    if (lower.includes("helmet") || lower.includes("ppe") || lower.includes("safety")) {
      return "AI Mediator Assessment: Safety protocol grievance. On-site contractors must wear helmet, gloves and safety boots at all times. Employer must provide standard equipment, and worker must comply or report safety hazard.";
    }
    return "AI Mediator Assessment: Standard workplace dispute. It is recommended both supervisor and labor representative convene in the site cabin to align terms. Pro-rate outstanding balances based on verified check-in hours.";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Header Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-950 uppercase tracking-tight">Workplace Disputes & Arbitration</h2>
          <p className="text-xs text-slate-500">Log grievances, resolve wage/timing discrepancies, and view neutral AI mediations.</p>
        </div>

        {!showRaiseForm && (
          <button
            onClick={() => setShowRaiseForm(true)}
            className="inline-flex items-center px-4 py-2 bg-slate-950 hover:bg-slate-850 text-amber-500 font-extrabold text-xs rounded-xl uppercase tracking-wider transition-all cursor-pointer border border-slate-850 shadow-md"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            File Formal Grievance
          </button>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs text-center">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Active Disputes</span>
          <span className="text-xl font-black text-slate-950 font-mono">{openCount} Grievances</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs text-center">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Under investigation</span>
          <span className="text-xl font-black text-amber-600 font-mono">{investigatingCount} Active</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs text-center">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Arbitrations Resolved</span>
          <span className="text-xl font-black text-emerald-600 font-mono">{resolvedCount} Closed</span>
        </div>
      </div>

      {/* Raised Dispute Form */}
      {showRaiseForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm max-w-2xl">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
            <h3 className="text-xs font-black uppercase text-slate-950 tracking-wider">File Workplace Grievance Form</h3>
            <button onClick={() => setShowRaiseForm(false)} className="text-slate-400 text-xs font-bold p-1 hover:bg-slate-100 rounded-full">✕</button>
          </div>

          <form onSubmit={handleRaiseSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Select Contract Shift</label>
                <select
                  value={disputeJobId}
                  onChange={(e) => setDisputeJobId(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-900 font-bold"
                  required
                >
                  <option value="">-- Choose Job --</option>
                  {jobs.map((j, idx) => (
                    <option key={`${j.id}-${idx}`} value={j.id}>{j.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Select Worker Involved</label>
                <select
                  value={disputeWorkerId}
                  onChange={(e) => setDisputeWorkerId(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-900 font-bold"
                  required
                >
                  <option value="">-- Choose Worker --</option>
                  {listWorkers.map((w, idx) => (
                    <option key={`${w.uid}-${idx}`} value={w.uid}>{w.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Primary Breach Reason</label>
                <select
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-900 font-bold"
                >
                  <option value="Unannounced Absence">Unannounced Absence from contract shift</option>
                  <option value="Safety Gear Neglect">Refusal to wear Safety PPE (Helmet/Boots)</option>
                  <option value="Property Damage">Accidental damage to site tools/property</option>
                  <option value="Misconduct">Insubordinate or unsafe behavior</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Detailed Grievance Description*</label>
                <textarea
                  value={disputeDescription}
                  onChange={(e) => setDisputeDescription(e.target.value)}
                  placeholder="State the exact shift date, witness statements, and safety guidelines breached..."
                  className="w-full p-3 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-900 h-28 resize-none focus:outline-hidden focus:border-amber-500 font-semibold"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRaiseForm(false)}
                className="py-2 px-4 border border-slate-200 text-slate-700 text-xs font-bold uppercase rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Discard Form
              </button>
              <button
                type="submit"
                disabled={formLoading}
                className="py-2 px-5 bg-slate-950 hover:bg-slate-850 text-amber-500 text-xs font-black uppercase rounded-lg border border-slate-800 shadow-md cursor-pointer"
              >
                {formLoading ? "Filing Grievance..." : "File Official Grievance"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Dispute Table list */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Search header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search disputes by worker, job..."
              className="w-full p-2 pl-9 text-xs border border-slate-200 rounded-xl bg-white text-slate-900 font-semibold"
            />
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <span className="font-bold text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-1.5 border border-slate-200 rounded-lg bg-white font-bold text-slate-700"
            >
              <option value="all">All States</option>
              <option value="open">Open Arbitrations</option>
              <option value="resolved">Resolved Disputes</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 font-mono text-[10px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-200">
                <th className="p-4">Case Reference ID</th>
                <th className="p-4">Contract Job</th>
                <th className="p-4">Worker Involved</th>
                <th className="p-4">Description of dispute</th>
                <th className="p-4 font-center">AI neutral mediation recommendation</th>
                <th className="p-4">Date Filed</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Arbitrate action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filteredComplaints.length > 0 ? (
                filteredComplaints.map((c, idx) => {
                  return (
                    <tr key={`${c.id}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-mono font-bold text-slate-400 uppercase">
                        {c.id}
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-slate-900 block truncate max-w-xs">{c.jobTitle}</span>
                      </td>
                      <td className="p-4">
                        <span className="font-black text-slate-900 block">{c.workerName}</span>
                      </td>
                      <td className="p-4 text-slate-600 leading-relaxed max-w-xs truncate">
                        {c.description}
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center space-x-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-800 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-xl">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="truncate max-w-xs">{getAiArbitrationVerdict(c.description).slice(23)}</span>
                        </span>
                      </td>
                      <td className="p-4 font-mono text-slate-500">
                        {c.createdAt || "2026-07-02"}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center border rounded px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                          c.status === "resolved" ? "text-emerald-700 bg-emerald-50 border-emerald-200/50" : 
                          "text-amber-700 bg-amber-50 border-amber-200/50"
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedComplaint(c)}
                            className="p-1.5 text-slate-500 hover:text-slate-950 hover:bg-slate-100 rounded-lg cursor-pointer"
                            title="Inspect Arbitration Case"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {c.status !== "resolved" && (
                            <button
                              onClick={() => handleQuickResolveClick(c)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] uppercase rounded-lg cursor-pointer transition-all shadow-xs hover:scale-105"
                              title="AI Quick Resolve"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              Quick Resolve
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <ShieldAlert className="w-8 h-8 text-slate-300" />
                      <span className="text-xs font-semibold">No workplace disputes logged.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* DISPUTE TIMELINE COMMENT & RESOLUTION OVERLAY */}
      {selectedComplaint && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-left">
            <div className="h-1 bg-amber-500" />
            
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="space-y-0.5">
                <span className="text-[9px] font-mono font-bold uppercase text-amber-600 tracking-wider">Arbitration Case Room</span>
                <h4 className="font-black text-sm text-slate-900 uppercase leading-tight">Case ID: {selectedComplaint.id}</h4>
              </div>
              <button onClick={() => setSelectedComplaint(null)} className="text-slate-400 hover:text-slate-800 text-xs font-bold p-1 hover:bg-slate-100 rounded-full">✕</button>
            </div>

            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              
              {/* Primary case details */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Grievance Description</span>
                <p className="text-slate-700 font-semibold leading-relaxed p-3.5 bg-slate-50 rounded-xl border border-slate-150">
                  {selectedComplaint.description}
                </p>
              </div>

              {/* AI MEDIATOR PANEL */}
              <div className="p-3.5 bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 rounded-xl space-y-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-amber-700 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> AI Mediator Arbitration Assessment
                </span>
                <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                  {getAiArbitrationVerdict(selectedComplaint.description)}
                </p>
              </div>

              {/* Comment logs stream */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider font-mono">
                    💬 Real-Time Mediation Chat Room
                  </span>
                  <span className="bg-indigo-100 text-indigo-900 text-[9px] font-bold font-mono px-2 py-0.5 rounded uppercase">
                    Live Discussion Channel
                  </span>
                </div>

                {/* Chat Feed */}
                <div className="space-y-3.5 max-h-60 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-100">
                  {selectedComplaint.comments && selectedComplaint.comments.length > 0 ? (
                    selectedComplaint.comments.map((comm, idx) => {
                      const isSelf = comm.role === "employer";
                      const isAdmin = comm.role === "admin";
                      const isWorker = comm.role === "worker" || (!isSelf && !isAdmin);

                      return (
                        <div
                          key={idx}
                          className={`flex flex-col ${
                            isSelf ? "items-end" : isAdmin ? "items-center" : "items-start"
                          }`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl p-3 shadow-2xs ${
                              isSelf
                                ? "bg-indigo-600 text-white rounded-tr-none"
                                : isAdmin
                                ? "bg-amber-50 border border-amber-200 text-slate-900"
                                : "bg-white border border-slate-200 text-slate-900 rounded-tl-none"
                            }`}
                          >
                            <div className="flex items-center space-x-1.5 mb-1">
                              <span
                                className={`text-[8px] font-black uppercase font-mono px-1.5 py-0.5 rounded ${
                                  isSelf
                                    ? "bg-indigo-800 text-indigo-100"
                                    : isAdmin
                                    ? "bg-amber-200 text-amber-900"
                                    : "bg-emerald-100 text-emerald-800"
                                }`}
                              >
                                {isSelf ? "You (Employer)" : isAdmin ? "Welfare Officer (Admin)" : "Worker"}
                              </span>
                              <span
                                className={`text-[9px] font-bold ${
                                  isSelf ? "text-indigo-200" : "text-slate-500"
                                }`}
                              >
                                {comm.author}
                              </span>
                            </div>
                            <p className="text-xs font-semibold leading-relaxed">{comm.text}</p>
                            <span
                              className={`text-[8px] block text-right mt-1 font-mono ${
                                isSelf ? "text-indigo-200" : "text-slate-400"
                              }`}
                            >
                              {comm.timestamp ? new Date(comm.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently"}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-10 text-slate-400 text-xs font-mono font-medium">
                      No active statements submitted in this dispute thread.
                      <p className="text-[9px] text-slate-400 mt-0.5">Workers and admins can post statements in real-time.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Comment Input or Resolve panel */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-3">
              {selectedComplaint.status !== "resolved" ? (
                <>
                  <form onSubmit={handleAddCommentSubmit} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Write comment statement to arbitrate case..."
                      className="flex-1 p-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-900 font-semibold"
                      required
                    />
                    <button
                      type="submit"
                      className="p-2 bg-slate-950 hover:bg-slate-850 text-amber-500 rounded-lg border border-slate-850 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={async () => {
                        if (confirm("Lock terms and mark dispute case as RESOLVED? This closes the case file.")) {
                          await onResolveComplaint(selectedComplaint.id);
                          alert("🎉 Case resolved! Locked dispute settlement terms saved.");
                          setSelectedComplaint(null);
                        }
                      }}
                      className="py-1.5 px-4 bg-emerald-600 hover:bg-emerald-5050 text-white hover:bg-emerald-500 font-black text-[10px] uppercase rounded-lg cursor-pointer"
                    >
                      Mark Case Resolved
                    </button>
                    <button
                      onClick={() => setSelectedComplaint(null)}
                      className="py-1.5 px-3 border border-slate-200 text-slate-700 text-[10px] font-bold uppercase rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                      Close Portal
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-emerald-700 text-[10px] font-black uppercase flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> This case is fully Resolved & Locked.
                  </span>
                  <button
                    onClick={() => setSelectedComplaint(null)}
                    className="py-1.5 px-4 bg-slate-950 text-white text-[10px] font-bold uppercase rounded-lg hover:bg-slate-850 cursor-pointer"
                  >
                    Close Room
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* AI QUICK RESOLVE MEDIATOR DIALOG MODAL */}
      {quickResolveDispute && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" id="quick-resolve-modal">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="bg-amber-100 p-2 rounded-xl text-amber-600">
                  <Brain className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-950 text-sm tracking-tight uppercase">AI Quick Resolve Mediator</h3>
                  <p className="text-[10px] text-slate-500 font-mono">Case ID: {quickResolveDispute.id.slice(0, 8).toUpperCase()}</p>
                </div>
              </div>
              <button 
                onClick={() => setQuickResolveDispute(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xs uppercase p-1 rounded-lg hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              
              {quickResolveLoading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-amber-600">
                      <Sparkles className="w-5 h-5 animate-bounce" />
                    </div>
                  </div>
                  <div className="text-center space-y-1 animate-pulse">
                    <p className="font-bold text-xs text-slate-700 uppercase tracking-wider">AI Mediator Formulating Verdict...</p>
                    <p className="text-[10px] text-slate-400 font-mono">Auditing shift logs & payment escrows</p>
                  </div>
                  
                  {/* Micro-loading steps to entertain and inform */}
                  <div className="w-64 space-y-1.5 text-[10px] font-mono font-medium text-slate-400 mx-auto">
                    <div className="flex items-center gap-1.5 text-emerald-600">
                      <Check className="w-3 h-3" /> Matched Worker: {quickResolveDispute.workerName}
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-600">
                      <Check className="w-3 h-3" /> Parsed Grievance Text
                    </div>
                    <div className="flex items-center gap-1.5 text-amber-600 animate-pulse">
                      <Activity className="w-3 h-3" /> Simulating Resolution Scenarios...
                    </div>
                  </div>
                </div>
              ) : quickResolveError ? (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-red-800 text-xs uppercase">Resolution Error</h4>
                    <p className="text-red-600 text-[11px] mt-1">{quickResolveError}</p>
                    <button 
                      onClick={() => handleQuickResolveClick(quickResolveDispute)}
                      className="mt-3 px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-[9px] uppercase rounded-lg"
                    >
                      Retry Analysis
                    </button>
                  </div>
                </div>
              ) : quickResolveResult ? (
                <div className="space-y-5">
                  
                  {/* Case Context Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-1">
                      <span className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-wider block">Grievance Description</span>
                      <p className="text-xs text-slate-700 font-medium italic">"{quickResolveDispute.description}"</p>
                      <div className="pt-2 flex justify-between text-[9px] font-mono text-slate-400 font-bold uppercase">
                        <span>By: {quickResolveDispute.workerName}</span>
                        <span>Role: Worker</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-1">
                      <span className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-wider block">Matched Registry Audit</span>
                      <div className="text-[10px] space-y-1 text-slate-600 font-mono">
                        <div className="flex justify-between border-b border-slate-200/50 pb-1">
                          <span>Total Shifts:</span>
                          <span className="font-bold text-slate-950">
                            {attendanceLogs.filter(r => r.workerId === quickResolveDispute.workerId && r.jobId === quickResolveDispute.jobId).length}
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200/50 pb-1">
                          <span>Approved:</span>
                          <span className="font-bold text-emerald-600">
                            {attendanceLogs.filter(r => r.workerId === quickResolveDispute.workerId && r.jobId === quickResolveDispute.jobId && r.status === "approved").length}
                          </span>
                        </div>
                        <div className="flex justify-between pb-1">
                          <span>Paid:</span>
                          <span className="font-bold text-slate-950">
                            {wagePayments.filter(p => p.workerId === quickResolveDispute.workerId && p.jobId === quickResolveDispute.jobId && p.status === "paid").length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AI Suggested Settlement Panel */}
                  <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-5 space-y-3.5">
                    <div className="flex items-center gap-2">
                      <div className="bg-amber-100 p-1.5 rounded-lg text-amber-600">
                        <Wand2 className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-slate-950 text-xs uppercase tracking-tight">AI Mediator Suggested Settlement</span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <span className="text-[9px] font-mono font-black text-amber-600 uppercase tracking-wider block">Suggested Verdict Action</span>
                        <p className="text-xs text-slate-800 font-medium leading-relaxed mt-0.5">{quickResolveResult.suggestedSettlement}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-1.5">
                        <div className="bg-white border border-amber-200/40 p-3 rounded-lg">
                          <span className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-wider block">Recommended Cash Clearance</span>
                          <span className="text-lg font-black text-slate-950 font-mono block mt-1">₹{quickResolveResult.recommendedPayout.toLocaleString()}</span>
                        </div>
                        <div className="bg-white border border-amber-200/40 p-3 rounded-lg">
                          <span className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-wider block">Audit Justification</span>
                          <p className="text-[10px] text-slate-500 font-medium leading-normal mt-0.5">{quickResolveResult.justification}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pre-filled Verdict Log */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-wider block">Pre-filled Legal Resolution Note</span>
                    <textarea
                      readOnly
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-600 font-mono text-[10px] leading-relaxed resize-none h-18 cursor-default"
                      value={quickResolveResult.prefilledResolutionNotes}
                    />
                  </div>

                </div>
              ) : null}

            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => setQuickResolveDispute(null)}
                className="py-1.5 px-4 text-xs font-bold text-slate-600 uppercase border border-slate-200 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                Close Portal
              </button>

              {quickResolveResult && (
                <button
                  onClick={handleApplyQuickResolve}
                  disabled={applyingQuickResolve}
                  className="inline-flex items-center gap-1.5 py-1.5 px-5 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-200 text-slate-950 font-black text-xs uppercase rounded-xl transition-all shadow-md hover:shadow-lg disabled:cursor-not-allowed cursor-pointer"
                >
                  {applyingQuickResolve ? (
                    <>
                      <div className="w-3 h-3 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                      Applying Verdict...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Apply AI Suggestion & Settle
                    </>
                  )}
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
