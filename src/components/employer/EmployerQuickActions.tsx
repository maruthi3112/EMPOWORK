import React, { useState, useEffect, useRef } from "react";
import { 
  Plus, Briefcase, Coins, Landmark, Check, X, 
  Sparkles, FileText, Lock, User, Calendar, MapPin, Loader2
} from "lucide-react";
import { Job, WagePayment } from "../../types";

interface EmployerQuickActionsProps {
  jobs: Job[];
  wagePayments: WagePayment[];
  onPostJob: (newJob: Partial<Job>) => Promise<any>;
  onProcessPayment: (payment: WagePayment) => Promise<any>;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function EmployerQuickActions({
  jobs,
  wagePayments,
  onPostJob,
  onProcessPayment,
  showToast
}: EmployerQuickActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<"post-job" | "bulk-payment" | null>(null);
  
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Compute pending payments
  const pendingPayments = wagePayments.filter(p => p.status === "pending");
  const totalPendingAmount = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

  // Quick Job Form State
  const [jobTitle, setJobTitle] = useState("");
  const [jobTrade, setJobTrade] = useState("Mason");
  const [jobWage, setJobWage] = useState(800);
  const [jobSlots, setJobSlots] = useState(5);
  const [jobLocation, setJobLocation] = useState("Site Alpha Main Gate, Electronic City");
  const [jobDescription, setJobDescription] = useState("");
  const [jobLoading, setJobLoading] = useState(false);
  const [isAiAutofilling, setIsAiAutofilling] = useState(false);

  // Bulk Payment Form State
  const [paymentPin, setPaymentPin] = useState("");
  const [paymentGateway, setPaymentGateway] = useState<"UPI" | "AEPS">("UPI");
  const [paymentStep, setPaymentStep] = useState<"review" | "processing" | "success">("review");
  const [paymentProgress, setPaymentProgress] = useState(0);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Presets mapping for instant high-fidelity autofills
  const tradePresets: Record<string, { skills: string; wage: number; desc: string }> = {
    Mason: {
      skills: "Bricklaying, Plastering, Mixing Mortar, Leveling Plumb Line",
      wage: 800,
      desc: "Requires active block masonry and cement brick laying for interior room dividers. Safety boots and helmet compulsory on-site."
    },
    Carpenter: {
      skills: "Timber Sawing, Scaffolding Assembly, Door Frame Alignments",
      wage: 900,
      desc: "Scaffolding alignment and timber framing assignment. Setting concrete formwork molds."
    },
    Plumber: {
      skills: "PVC Joining, Pipe Fitting, Pressure Testing, Threading",
      wage: 850,
      desc: "Laying fresh water service PVC line conduits down levels. Must be capable of leak testing and joint sealing."
    },
    Electrician: {
      skills: "Conduit Pulling, Wire Stripping, Schematic Reading, Earth Grounding",
      wage: 950,
      desc: "Drafting electrical wall grooves and threading heavy-duty electrical copper wires inside PVC pipes."
    },
    Welder: {
      skills: "Shielded Metal Arc Welding, Metal Grinding, Blueprint Reading",
      wage: 950,
      desc: "Structural welding of stairwell handrails and reinforcing steel mesh grid joints. Helmet supplied."
    },
    Helper: {
      skills: "Material Moving, Site Clearance, Brick Stacking, Tool Handover",
      wage: 550,
      desc: "General site material handling, concrete mixing labor support, and sorting tools. No prior experience required."
    }
  };

  const handleApplyTradePreset = (tradeName: string) => {
    const preset = tradePresets[tradeName];
    if (preset) {
      setJobTrade(tradeName);
      setJobWage(preset.wage);
      setJobDescription(preset.desc);
      if (!jobTitle) {
        setJobTitle(`Urgent ${tradeName} Needed`);
      }
    }
  };

  // AI Smart Autofill logic
  const handleSmartAutofill = async () => {
    if (!jobTitle.trim()) {
      showToast("Please enter an assignment title first!", "info");
      return;
    }
    setIsAiAutofilling(true);
    try {
      const res = await fetch("/api/gemini/generate-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: jobTitle })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.trade) setJobTrade(data.trade);
        if (data.description) setJobDescription(data.description);
        if (data.wage) setJobWage(Number(data.wage));
        if (data.location) setJobLocation(data.location);
        showToast("Gemini AI has optimized your job description!", "success");
      } else {
        // Fallback local preset match
        const lowerTitle = jobTitle.toLowerCase();
        let matched = false;
        for (const [key, preset] of Object.entries(tradePresets)) {
          if (lowerTitle.includes(key.toLowerCase())) {
            setJobTrade(key);
            setJobWage(preset.wage);
            setJobDescription(preset.desc);
            matched = true;
            break;
          }
        }
        if (!matched) {
          setJobDescription("URGENT: General site assignment requiring safe operations and general crew assistance.");
        }
        showToast("Trade details loaded based on assignment title.", "success");
      }
    } catch (err) {
      console.error("Autofill failure:", err);
      showToast("Autofill processed using default trade metrics.", "success");
    } finally {
      setIsAiAutofilling(false);
    }
  };

  // Job Submission
  const handlePostJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle.trim()) {
      showToast("Please enter a valid job title.", "error");
      return;
    }
    setJobLoading(true);
    try {
      const tmr = new Date();
      const deadline = new Date();
      deadline.setDate(tmr.getDate() + 7);

      await onPostJob({
        title: jobTitle,
        trade: jobTrade,
        wage: Number(jobWage),
        slots: Number(jobSlots),
        slotsTaken: 0,
        location: jobLocation,
        description: jobDescription || `${jobTitle} assignment on modern construction floor plan.`,
        startDate: tmr.toISOString().split("T")[0],
        endDate: deadline.toISOString().split("T")[0],
        status: "open",
        latitude: 12.9716 + (Math.random() * 0.04 - 0.02),
        longitude: 77.5946 + (Math.random() * 0.04 - 0.02)
      });
      
      // Clean form
      setJobTitle("");
      setJobDescription("");
      setActiveModal(null);
    } catch (err: any) {
      showToast(`Creation failed: ${err.message}`, "error");
    } finally {
      setJobLoading(false);
    }
  };

  // Bulk Payment Submission
  const handleBulkPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentPin.length < 4) {
      showToast("Please enter your 4-digit secure payment PIN.", "error");
      return;
    }
    if (pendingPayments.length === 0) {
      showToast("No pending payouts to process.", "info");
      return;
    }

    setPaymentStep("processing");
    setPaymentLoading(true);
    setPaymentProgress(10);

    // Simulate safe biometrics and secure payment rails progress
    const steps = [
      { progress: 30, toast: "Verifying Aadhaar biometrics & escrow balances..." },
      { progress: 60, toast: "Disbursing UPI batch files..." },
      { progress: 100, toast: "Payment batch processed successfully!" }
    ];

    for (const step of steps) {
      await new Promise(r => setTimeout(r, 800));
      setPaymentProgress(step.progress);
    }

    try {
      // Process payments sequentially in Firestore via onProcessPayment
      for (const pay of pendingPayments) {
        await onProcessPayment(pay);
      }
      setPaymentStep("success");
      showToast(`Successfully disbursed ₹${totalPendingAmount.toLocaleString()} INR in batch!`, "success");
    } catch (err: any) {
      showToast(`Payment batch error: ${err.message}`, "error");
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* Floating Action Circle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 bg-slate-950 hover:bg-slate-900 text-amber-500 hover:text-amber-400 font-bold text-xs uppercase rounded-xl tracking-wider cursor-pointer border border-slate-800 transition-all shadow-lg font-mono relative"
        title="Quick Operations Console"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </span>
        Quick Actions
        <Plus className={`w-4 h-4 transition-transform duration-300 ${isOpen ? "rotate-45" : ""}`} />
      </button>

      {/* Speed Dial Menu Dropdown */}
      {isOpen && (
        <div className="absolute right-0 bottom-12 mb-2 w-64 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl z-40 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="p-3.5 bg-slate-900/50 border-b border-slate-900">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">
              Operational Triggers
            </h4>
          </div>

          <div className="p-1.5 space-y-1">
            {/* Post Job Trigger */}
            <button
              onClick={() => {
                setActiveModal("post-job");
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-900 rounded-xl text-left text-xs font-bold text-slate-200 hover:text-amber-400 transition-all cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-950 border border-amber-800/40 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <span className="block">Post New Job</span>
                <span className="text-[10px] text-slate-500 font-mono font-medium block">Publish instant vacancies</span>
              </div>
            </button>

            {/* Bulk Payment Trigger */}
            <button
              onClick={() => {
                setActiveModal("bulk-payment");
                setIsOpen(false);
                setPaymentStep("review");
                setPaymentPin("");
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-900 rounded-xl text-left text-xs font-bold text-slate-200 hover:text-emerald-400 transition-all cursor-pointer group relative"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800/40 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <span className="block">Bulk Payment</span>
                <span className="text-[10px] text-slate-500 font-mono font-medium block">
                  {pendingPayments.length > 0 
                    ? `Pay ${pendingPayments.length} pending laborers`
                    : "No pending payouts pending"
                  }
                </span>
              </div>
              {pendingPayments.length > 0 && (
                <span className="absolute right-3 top-3.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-black font-mono text-white">
                  {pendingPayments.length}
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* --- MODAL DIALOGS --- */}
      {activeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-in fade-in duration-200">
          
          {/* Post Job Modal */}
          {activeModal === "post-job" && (
            <div className="bg-white border border-slate-200 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              
              {/* Header */}
              <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-amber-500" />
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-wider font-mono">Quick Job Publisher</h3>
                    <p className="text-[9px] text-slate-400 font-mono">POST ASSIGNMENT WITHOUT DEVIATING FROM ANALYTICS</p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveModal(null)}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-900 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handlePostJobSubmit} className="p-6 space-y-4 text-left">
                
                {/* Title */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider">Assignment Title</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="e.g. Need Plumber for block basement laying"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-950 placeholder-slate-400 focus:outline-none focus:border-amber-500 font-sans"
                    />
                    
                    <button
                      type="button"
                      onClick={handleSmartAutofill}
                      disabled={isAiAutofilling}
                      className="px-3 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-100 disabled:text-slate-400 text-slate-950 font-black text-[10px] uppercase rounded-lg tracking-wider cursor-pointer border border-amber-500 transition-all flex items-center gap-1 font-mono"
                      title="Generate Optimized Description using AI"
                    >
                      {isAiAutofilling ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      Autofill
                    </button>
                  </div>
                </div>

                {/* Trade Presets */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider block">Trade Category Presets</label>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.keys(tradePresets).map((tradeName) => (
                      <button
                        key={tradeName}
                        type="button"
                        onClick={() => handleApplyTradePreset(tradeName)}
                        className={`px-2.5 py-1 text-[10px] font-mono font-black uppercase tracking-wider rounded border cursor-pointer transition-all ${
                          jobTrade === tradeName
                            ? "bg-slate-900 text-amber-500 border-slate-900"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-400"
                        }`}
                      >
                        {tradeName}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Daily Wage */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider">Daily Wage (₹ INR)</label>
                    <input
                      type="number"
                      required
                      min={100}
                      value={jobWage}
                      onChange={(e) => setJobWage(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-950 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Vacancy slots */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider">Crew Slots Needed</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={50}
                      value={jobSlots}
                      onChange={(e) => setJobSlots(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-950 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider">Site Location Landmark</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Site Alpha Main Gate"
                      value={jobLocation}
                      onChange={(e) => setJobLocation(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-950 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider">Assignment Details</label>
                  <textarea
                    rows={3}
                    placeholder="Briefly detail specialized tools, shifts timings, or safety expectations..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-950 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Action footer */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all font-mono"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={jobLoading}
                    className="px-5 py-2 bg-slate-950 hover:bg-slate-850 text-amber-500 hover:text-amber-400 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer border border-slate-900 transition-all flex items-center gap-1.5 shadow-sm font-mono disabled:opacity-50"
                  >
                    {jobLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Publish Listing
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Bulk Payment Modal */}
          {activeModal === "bulk-payment" && (
            <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              
              {/* Header */}
              <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-emerald-500 animate-pulse" />
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-wider font-mono">Secure Bulk Wages Disbursement</h3>
                    <p className="text-[9px] text-slate-400 font-mono">NATIONAL AGRI-LABOR UPI SYSTEM RAIL</p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveModal(null)}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-900 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Steps views */}
              <form onSubmit={handleBulkPaymentSubmit} className="p-6 space-y-4 text-left">
                {paymentStep === "review" && (
                  <div className="space-y-4">
                    {/* Summary box */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[9px] font-mono uppercase text-slate-400 tracking-wider">Pending Batch Crew</span>
                        <p className="text-xl font-black text-slate-950 font-mono">{pendingPayments.length} Laborers</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-mono uppercase text-slate-400 tracking-wider">Total Wage Disbursal</span>
                        <p className="text-xl font-black text-emerald-600 font-mono">₹{totalPendingAmount.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Pending list */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider block">Recipients Breakdown</label>
                      <div className="border border-slate-100 rounded-xl divide-y divide-slate-100 max-h-40 overflow-y-auto bg-slate-50/50">
                        {pendingPayments.length === 0 ? (
                          <div className="py-6 text-center text-xs text-slate-500 font-medium">
                            No pending labor ledgers waiting for disbursement.
                          </div>
                        ) : (
                          pendingPayments.map((pay, idx) => (
                            <div key={`${pay.id}-${idx}`} className="p-3 flex items-center justify-between text-xs">
                              <div>
                                <p className="font-bold text-slate-900">{pay.workerName}</p>
                                <p className="text-[10px] text-slate-500 font-mono font-semibold">{pay.jobTitle}</p>
                              </div>
                              <p className="font-mono font-black text-slate-950">₹{pay.amount.toLocaleString()}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {pendingPayments.length > 0 && (
                      <div className="space-y-3 pt-2">
                        {/* PIN field */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider block">4-Digit Security PIN</label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <input
                              type="password"
                              maxLength={4}
                              required
                              placeholder="••••"
                              value={paymentPin}
                              onChange={(e) => setPaymentPin(e.target.value.replace(/\D/g, ""))}
                              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs font-bold font-mono text-slate-950 placeholder-slate-300 focus:outline-none focus:border-emerald-500 tracking-widest text-center"
                            />
                          </div>
                          <p className="text-[9px] text-slate-500 font-semibold font-mono">Aadhaar Unified Payment Handshake pin key required.</p>
                        </div>

                        {/* Action buttons */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => setActiveModal(null)}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all font-mono"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-5 py-2 bg-slate-950 hover:bg-slate-850 text-emerald-500 hover:text-emerald-400 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer border border-slate-900 transition-all flex items-center gap-1.5 shadow-sm font-mono"
                          >
                            <Landmark className="w-4 h-4" />
                            Disburse Batch Wages
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {paymentStep === "processing" && (
                  <div className="py-8 text-center space-y-4">
                    <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mx-auto" />
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-black uppercase text-slate-950 tracking-wider font-mono">Processing UPI Batch Transfer</h4>
                      <p className="text-xs text-slate-500 font-semibold">Please do not refresh or close this application panel.</p>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${paymentProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {paymentStep === "success" && (
                  <div className="py-6 text-center space-y-4">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto border border-emerald-200">
                      <Check className="w-6 h-6" />
                    </div>
                    
                    <div className="space-y-1">
                      <h4 className="text-xs font-black uppercase text-slate-950 tracking-wider font-mono">Disbursal Completed</h4>
                      <p className="text-xs text-slate-500 font-semibold">Funds successfully settled to laborers' bank accounts!</p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 max-w-sm mx-auto space-y-1.5 text-xs">
                      <div className="flex justify-between font-medium">
                        <span className="text-slate-500">Total Paid</span>
                        <span className="font-bold text-slate-950 font-mono">₹{totalPendingAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span className="text-slate-500">Recipients Paid</span>
                        <span className="font-bold text-slate-950 font-mono">{pendingPayments.length} Workers</span>
                      </div>
                      <div className="flex justify-between font-medium border-t border-slate-200 pt-1.5">
                        <span className="text-slate-500">Gateway Route</span>
                        <span className="font-bold text-emerald-600 font-mono">UPI-BATCH-OK</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="w-full py-2 bg-slate-950 hover:bg-slate-850 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all font-mono"
                    >
                      Return to Portal
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
