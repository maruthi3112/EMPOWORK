import React, { useState, useEffect } from "react";
import { 
  MessageSquare, Scale, Brain, AlertOctagon, CheckCircle2, ChevronRight, 
  RotateCcw, ShieldCheck, Wand2, Star, Sparkles, Activity, FileText, CheckSquare, Square, Check, AlertCircle
} from "lucide-react";
import { Complaint, Job } from "../../types";
import { db, doc, updateDoc } from "../../lib/firebase";

interface DisputeTabProps {
  complaints: Complaint[];
  jobs: Job[];
  attendanceRecords?: any[];
  wagePayments?: any[];
  onRefresh: () => void;
  logAction: (action: string, category: string, details: string) => Promise<void>;
}

export default function DisputeTab({ 
  complaints, 
  jobs, 
  attendanceRecords = [], 
  wagePayments = [], 
  onRefresh, 
  logAction 
}: DisputeTabProps) {
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [adminResolutionNotes, setAdminResolutionNotes] = useState("");
  const [resolvingId, setResolvingId] = useState<string | null>(null);

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
      const filteredAttendance = attendanceRecords.filter(
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
        throw new Error("Failed to load quick resolution suggestion.");
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
      await updateDoc(doc(db, "complaints", quickResolveDispute.id), {
        status: "resolved",
        resolutionNotes: quickResolveResult.prefilledResolutionNotes,
        resolvedAt: new Date().toISOString()
      });
      await logAction(`Settle Dispute #${quickResolveDispute.id.slice(0, 8)}`, "arbitration", `Quick Resolve suggestion applied with recommended payout of ₹${quickResolveResult.recommendedPayout}. Notes: ${quickResolveResult.prefilledResolutionNotes}`);
      onRefresh();
      setQuickResolveDispute(null);
      setQuickResolveResult(null);
    } catch (err: any) {
      console.error(err);
      alert("Failed to apply quick resolution: " + err.message);
    } finally {
      setApplyingQuickResolve(false);
    }
  };

  // Deep Gemini Dispute Analysis States
  const [deepAnalysisLoading, setDeepAnalysisLoading] = useState(false);
  const [deepAnalysisResult, setDeepAnalysisResult] = useState<any | null>(null);
  const [focusArea, setFocusArea] = useState<'wage' | 'safety' | 'behavior' | 'general'>('general');
  const [customDirectives, setCustomDirectives] = useState("");
  const [checkedSteps, setCheckedSteps] = useState<{ [key: number]: boolean }>({});
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  const loadingMessages = [
    "🔍 Connecting to Gemini 3.5 Decider...",
    "⚖️ Scanning historic dispute records...",
    "💡 Analyzing worker and employer testimonies...",
    "🛡️ Cross-referencing safe construction wage directives...",
    "✍️ Generating legally-compliant resolution suggestions..."
  ];

  useEffect(() => {
    let interval: any;
    if (deepAnalysisLoading) {
      interval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
      }, 2000);
    } else {
      setLoadingMessageIndex(0);
    }
    return () => clearInterval(interval);
  }, [deepAnalysisLoading]);

  // Sync / Reset deep analysis when selected complaint changes
  useEffect(() => {
    if (selectedComplaint) {
      if ((selectedComplaint as any).deepAnalysis) {
        setDeepAnalysisResult((selectedComplaint as any).deepAnalysis);
      } else {
        setDeepAnalysisResult(null);
      }
      setCheckedSteps({});
      setCustomDirectives("");
      setFocusArea("general");
      setAdminResolutionNotes(selectedComplaint.resolutionNotes || "");
    } else {
      setDeepAnalysisResult(null);
      setAdminResolutionNotes("");
    }
  }, [selectedComplaint]);

  const handleDeepDisputeAudit = async () => {
    if (!selectedComplaint) return;
    setDeepAnalysisLoading(true);
    try {
      // Find the associated job to get wage information
      const associatedJob = jobs.find(j => j.id === selectedComplaint.jobId);
      const wage = associatedJob ? associatedJob.wage : 600;

      const response = await fetch("/api/gemini/deep-analyze-dispute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaintText: selectedComplaint.description,
          raisedBy: selectedComplaint.raisedBy,
          workerName: selectedComplaint.workerName,
          employerName: selectedComplaint.employerName,
          jobTitle: selectedComplaint.jobTitle,
          wage: wage,
          focusArea,
          customDirectives
        })
      });

      const data = await response.json();
      setDeepAnalysisResult(data);

      // Save to Firebase durably
      await updateDoc(doc(db, "complaints", selectedComplaint.id), {
        deepAnalysis: data
      });

      await logAction(
        `Gemini AI Dispute Audit: Complaint ${selectedComplaint.id.slice(0, 8)}`,
        "Complaints & Support",
        `Admin ran Gemini 3.5 dispute analyzer on complaint filed by ${selectedComplaint.raisedBy} for job ${selectedComplaint.jobTitle}`
      );

      onRefresh();
    } catch (e) {
      console.error("Error conducting deep dispute audit:", e);
    } finally {
      setDeepAnalysisLoading(false);
    }
  };

  const toggleStep = (index: number) => {
    setCheckedSteps(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const handleAutoFillNotes = () => {
    if (!deepAnalysisResult) return;
    setAdminResolutionNotes(deepAnalysisResult.prefilledResolutionNotes);
  };

  const handleResolveComplaint = async () => {
    if (!selectedComplaint) return;
    setResolvingId(selectedComplaint.id);
    try {
      await updateDoc(doc(db, "complaints", selectedComplaint.id), {
        status: "resolved",
        resolutionNotes: adminResolutionNotes,
        resolvedAt: new Date().toISOString()
      });
      
      await logAction(
        `Resolved Complaint: #${selectedComplaint.id.slice(0,8)}`,
        "Complaints & Support",
        `Verdict issued. Resolution notes logged: "${adminResolutionNotes}"`
      );

      setSelectedComplaint(null);
      onRefresh();
    } catch (error) {
      console.error("Error resolving complaint:", error);
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <>
      <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center">
          <Scale className="w-5 h-5 mr-2 text-slate-900" /> Welfare Disputes & AI Arbitration Room
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">Audit site accidents, wage holdbacks, behavior reports, and use the Google Gemini 3.5 ombudsman model to evaluate fair settlements.</p>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Unresolved Complaints Table (Left Column) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs h-[650px] flex flex-col">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider font-mono">Dispute Registry ({complaints.length})</span>
            <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded text-[9px] font-black uppercase tracking-wider">
              {complaints.filter(c => c.status !== "resolved").length} Unresolved
            </span>
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
            {complaints.length > 0 ? (
              complaints.map(c => {
                const isResolved = c.status === "resolved";
                return (
                  <div 
                    key={c.id}
                    onClick={() => setSelectedComplaint(c)}
                    className={`p-4 cursor-pointer text-xs hover:bg-slate-50 transition-colors ${selectedComplaint?.id === c.id ? "bg-amber-50/50 border-r-2 border-slate-900" : ""}`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[10px] font-mono text-slate-400">ID: {c.id.slice(0, 8).toUpperCase()}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                        isResolved 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                          : "bg-red-50 text-red-700 border border-red-200 animate-pulse"
                      }`}>
                        {c.status}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 uppercase mt-1.5 tracking-tight line-clamp-1">{c.jobTitle}</h4>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">"{c.description}"</p>

                    <div className="mt-2.5 flex items-center justify-between text-[9px] font-mono font-bold text-slate-400 uppercase">
                      <span>By: {c.raisedBy} ({c.workerName.split(' ')[0]})</span>
                      <span>{c.createdAt ? c.createdAt.slice(0, 10) : "2026-07-02"}</span>
                    </div>

                    {!isResolved && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickResolveClick(c);
                        }}
                        className="w-full mt-2.5 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[9px] uppercase rounded-lg transition-all shadow-xs hover:scale-[1.01] cursor-pointer"
                        title="AI Quick Resolve"
                      >
                        <Sparkles className="w-3 h-3 text-slate-950" />
                        AI Quick Resolve
                      </button>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 font-bold uppercase tracking-wider text-[10px] font-mono">
                No disputes filed yet.
              </div>
            )}
          </div>
        </div>

        {/* Gemini Arbitration workspace (Right Column) */}
        <div className="lg:col-span-8 space-y-6">
          {selectedComplaint ? (
            <div className="space-y-6">
              {/* Grievance Testimonies Summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
                <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-mono">Incident Registry</span>
                  <span className="text-xs font-bold text-slate-700 uppercase">Project: {selectedComplaint.jobTitle}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Worker Testimonial Card */}
                  <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs relative">
                    <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded absolute right-3 top-3 font-mono">Worker</span>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block font-mono">Testifier</span>
                    <h5 className="font-bold text-slate-900 uppercase text-xs mt-0.5">{selectedComplaint.workerName}</h5>
                    <p className="text-[11px] text-slate-500 mt-2 italic leading-relaxed">
                      {selectedComplaint.raisedBy === "worker" ? `"${selectedComplaint.description}"` : "Agreed to daily site duties and check-in rosters."}
                    </p>
                  </div>

                  {/* Employer Testimonial Card */}
                  <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs relative">
                    <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded absolute right-3 top-3 font-mono">Employer</span>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block font-mono">Testifier</span>
                    <h5 className="font-bold text-slate-900 uppercase text-xs mt-0.5">{selectedComplaint.employerName}</h5>
                    <p className="text-[11px] text-slate-500 mt-2 italic leading-relaxed">
                      {selectedComplaint.raisedBy === "employer" ? `"${selectedComplaint.description}"` : "Required shift delivery checkouts and quality check validations."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Gemini AI deep audit control console */}
              <div className="bg-slate-900 border border-slate-950 rounded-xl p-5 text-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute right-0 top-0 opacity-10 font-black text-slate-50 text-8xl font-mono select-none pointer-events-none transform translate-x-12 translate-y-6">AI</div>
                
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-black text-amber-400 uppercase tracking-tight flex items-center">
                    <Brain className="w-5 h-5 mr-2 text-amber-400 animate-pulse" /> Gemini AI Deep Dispute Room
                  </h3>
                  <span className="text-[8px] font-mono uppercase bg-slate-800 px-2 py-0.5 rounded text-amber-300 font-bold border border-amber-900/60">
                    Gemini 3.5 Decider
                  </span>
                </div>

                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono">Analysis Core Focus Area</label>
                      <select
                        value={focusArea}
                        onChange={(e: any) => setFocusArea(e.target.value)}
                        className="w-full p-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-xs focus:outline-none focus:border-amber-400 font-bold uppercase tracking-wide font-mono"
                      >
                        <option value="general">General Arbitration</option>
                        <option value="wage">Wage & Escrow Holdbacks</option>
                        <option value="safety">Safety Compliance & PPE Violations</option>
                        <option value="behavior">Behavior & Workplace Conduct</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono">Custom Directives to AI (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Prioritize safe construction well-being regulations"
                        value={customDirectives}
                        onChange={(e) => setCustomDirectives(e.target.value)}
                        className="w-full p-2 bg-slate-800 border border-slate-700 text-slate-100 rounded-lg text-xs placeholder-slate-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  {/* Trigger audit */}
                  <button
                    onClick={handleDeepDisputeAudit}
                    disabled={deepAnalysisLoading}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-md disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed"
                  >
                    <Sparkles className="w-4 h-4 text-slate-950 shrink-0" />
                    {deepAnalysisLoading ? "RUNNING HEURISTICS..." : "EXECUTE DEEP AI MEDIATION AUDIT"}
                  </button>

                  {/* Loading Screen */}
                  {deepAnalysisLoading && (
                    <div className="p-4 bg-slate-950/80 border border-slate-800/80 rounded-lg flex items-center justify-center gap-3">
                      <Activity className="w-5 h-5 text-amber-400 animate-spin" />
                      <span className="text-xs font-bold text-amber-300 font-mono animate-pulse">
                        {loadingMessages[loadingMessageIndex]}
                      </span>
                    </div>
                  )}

                  {/* Deep Analysis Outcome display */}
                  {deepAnalysisResult && (
                    <div className="p-5 bg-slate-950 border border-slate-800 rounded-lg space-y-4 shadow-inner text-xs">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
                        <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider font-mono">AI Audit Diagnostics Report</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                          deepAnalysisResult.severityLevel === "Critical" 
                            ? "bg-red-950/80 text-red-400 border border-red-900/60" 
                            : deepAnalysisResult.severityLevel === "High"
                            ? "bg-amber-950/80 text-amber-400 border border-amber-900/60"
                            : "bg-slate-900 text-slate-400"
                        }`}>
                          Severity: {deepAnalysisResult.severityLevel || "Medium"}
                        </span>
                      </div>

                      <div className="space-y-3 leading-relaxed text-slate-300">
                        <div>
                          <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono">Executive Conflict Summary</span>
                          <p className="mt-1 font-medium">{deepAnalysisResult.executiveSummary}</p>
                        </div>
                        <div>
                          <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono">Root Cause Diagnostic</span>
                          <p className="mt-1 text-slate-400 italic">"{deepAnalysisResult.rootCauseAnalysis}"</p>
                        </div>
                        <div className="bg-slate-900/80 p-3.5 rounded border border-slate-800/60">
                          <span className="block text-[9px] text-amber-400 font-black uppercase tracking-wider font-mono">Suggested Mediator Verdict</span>
                          <p className="mt-1 font-bold text-white leading-relaxed">{deepAnalysisResult.suggestedVerdict}</p>
                        </div>

                        {/* Action checklist list */}
                        <div className="space-y-2">
                          <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono">Mediation Checklist Guidelines</span>
                          <div className="space-y-1.5">
                            {deepAnalysisResult.actionSteps?.map((step: string, i: number) => {
                              const checked = !!checkedSteps[i];
                              return (
                                <div 
                                  key={i}
                                  onClick={() => toggleStep(i)}
                                  className="flex items-start gap-2.5 p-2 bg-slate-900 border border-slate-800 rounded hover:border-slate-700 cursor-pointer transition-colors"
                                >
                                  {checked ? (
                                    <CheckSquare className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                  ) : (
                                    <Square className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                                  )}
                                  <span className={`text-[11px] ${checked ? "line-through text-slate-500" : "text-slate-300"}`}>{step}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Prefilled verdict template notes */}
                        <div className="pt-3 border-t border-slate-800/80 flex justify-between items-center">
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono">Official Verdict Draft</span>
                          <button
                            onClick={handleAutoFillNotes}
                            className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded font-black uppercase text-[9px] tracking-wider cursor-pointer transition-all flex items-center gap-1.5"
                          >
                            <Wand2 className="w-3 h-3 text-amber-400 shrink-0" /> Autofill Resolution Notes
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Verdict Logging & Submission Form */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3.5">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-mono block">Log Binding Resolution Notes</span>
                
                <textarea
                  rows={3}
                  value={adminResolutionNotes}
                  onChange={(e) => setAdminResolutionNotes(e.target.value)}
                  placeholder="Draft resolution notes, specific wage release percentages, or warnings issued..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 bg-slate-50 font-medium"
                />

                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <button
                    onClick={handleResolveComplaint}
                    disabled={!adminResolutionNotes.trim() || resolvingId !== null}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-950 text-amber-500 font-black text-xs uppercase tracking-widest rounded-lg flex items-center gap-1.5 cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" /> 
                    {resolvingId ? "SUBMITTING Notes..." : "ISSUE BINDING PLATFORM VERDICT"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[650px] bg-white border border-slate-200 rounded-xl flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <MessageSquare className="w-12 h-12 text-slate-200 mb-2" />
              <p className="text-xs font-black text-slate-900 uppercase tracking-wider">No dispute selected for arbitration.</p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-sm">Select any filed complaint from the registry list to load details and deploy the Gemini arbitration models.</p>
            </div>
          )}
        </div>
      </div>
    </div>

      {/* AI QUICK RESOLVE MEDIATOR DIALOG MODAL */}
      {quickResolveDispute && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" id="admin-quick-resolve-modal">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="bg-amber-100 p-2 rounded-xl text-amber-600">
                  <Brain className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-950 text-sm tracking-tight uppercase">AI Quick Resolve Mediator (Admin)</h3>
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
                            {attendanceRecords.filter(r => r.workerId === quickResolveDispute.workerId && r.jobId === quickResolveDispute.jobId).length}
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200/50 pb-1">
                          <span>Approved:</span>
                          <span className="font-bold text-emerald-600">
                            {attendanceRecords.filter(r => r.workerId === quickResolveDispute.workerId && r.jobId === quickResolveDispute.jobId && r.status === "approved").length}
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
    </>
  );
}
