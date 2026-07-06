import React, { useState } from "react";
import { 
  Clock, Search, FileSpreadsheet, PlusCircle, CheckCircle, XCircle, MapPin, 
  QrCode, AlertCircle, Sparkles, Filter, ShieldCheck, HardHat, Calendar,
  User, Check, ChevronDown, CheckCircle2, Sliders, Play, X
} from "lucide-react";
import { Job, AttendanceRecord, UserProfile } from "../../types";
import QRCameraScanner from "../QRCameraScanner";

interface EmployerAttendanceProps {
  jobs: Job[];
  attendanceLogs: AttendanceRecord[];
  userProfiles: Record<string, UserProfile>;
  onApproveAttendance: (record: AttendanceRecord) => Promise<any>;
  onRejectAttendance: (record: AttendanceRecord) => Promise<any>;
  onLogManualAttendance?: (payload: Partial<AttendanceRecord>) => Promise<any>;
  onShowQR?: (job: Job) => void;
}

export default function EmployerAttendance({
  jobs = [],
  attendanceLogs = [],
  userProfiles = {},
  onApproveAttendance,
  onRejectAttendance,
  onLogManualAttendance,
  onShowQR
}: EmployerAttendanceProps) {
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showManualForm, setShowManualForm] = useState(false);

  // Pass Scanner states
  const [showPassScanner, setShowPassScanner] = useState(false);
  const [scannedWorkerData, setScannedWorkerData] = useState<any | null>(null);
  const [selectedScanJobId, setSelectedScanJobId] = useState<string>("");
  const [scanMessage, setScanMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [simulateWorkerId, setSimulateWorkerId] = useState<string>("");

  // Manual form states
  const [manualJobId, setManualJobId] = useState("");
  const [manualWorkerId, setManualWorkerId] = useState("");
  const [manualCheckIn, setManualCheckIn] = useState("08:00");
  const [manualCheckOut, setManualCheckOut] = useState("17:00");
  const [manualPpeHelmet, setManualPpeHelmet] = useState(true);
  const [manualPpeBoots, setManualPpeBoots] = useState(true);
  const [manualPpeGloves, setManualPpeGloves] = useState(true);
  const [manualPpeHarness, setManualPpeHarness] = useState(false);
  const [manualLoading, setManualLoading] = useState(false);

  // Compute Metrics
  const todayStr = new Date().toISOString().split("T")[0];
  const activeToday = attendanceLogs.filter(a => a.date === todayStr);
  const presentCount = activeToday.length;
  const pendingApprovals = attendanceLogs.filter(a => a.status === "pending_approval").length;
  const approvedShifts = attendanceLogs.filter(a => a.status === "approved").length;

  // Filter attendance list
  const filteredLogs = attendanceLogs.filter(log => {
    const workerName = log.workerName || "Worker";
    const jobTitle = log.jobTitle || "Job";
    const matchesSearch = workerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          jobTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Export CSV Helper
  const handleExportCSV = () => {
    if (attendanceLogs.length === 0) {
      alert("No attendance logs available to export.");
      return;
    }

    const headers = [
      "Record ID", "Worker ID", "Worker Name", "Job Title", "Date", 
      "Check-In Time", "Check-In Latitude", "Check-In Longitude", 
      "Check-Out Time", "Hours Worked", "Wage Earned (INR)", "Verification", "Status"
    ];

    const rows = attendanceLogs.map(log => [
      log.id,
      log.workerId,
      log.workerName,
      log.jobTitle,
      log.date,
      log.checkInTime || "N/A",
      log.checkInLatitude || "N/A",
      log.checkInLongitude || "N/A",
      log.checkOutTime || "N/A",
      log.hoursWorked || "N/A",
      log.wageEarned,
      log.qrVerified ? "QR Verified" : "Manual",
      log.status
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `EmpoWork_Attendance_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Manual Mark Submit
  const handleManualMarkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualJobId || !manualWorkerId) {
      alert("Please choose a valid active job and laborer.");
      return;
    }

    const selectedJob = jobs.find(j => j.id === manualJobId);
    const selectedWorker = Object.values(userProfiles).find(p => p.uid === manualWorkerId);
    if (!selectedJob || !selectedWorker) return;

    setManualLoading(true);
    try {
      const partsIn = manualCheckIn.split(":");
      const partsOut = manualCheckOut.split(":");
      const hours = Number(partsOut[0]) - Number(partsIn[0]) + (Number(partsOut[1]) - Number(partsIn[1])) / 60;
      const hoursWorked = Math.max(0, Number(hours.toFixed(1)));
      const wageEarned = Math.round(selectedJob.wage * (hoursWorked / 8)); // pro-rated by 8 hours standard

      const payload: Partial<AttendanceRecord> = {
        id: `att-${manualWorkerId}-${Date.now()}`,
        workerId: manualWorkerId,
        workerName: selectedWorker.name,
        employerId: selectedJob.employerId,
        jobId: manualJobId,
        jobTitle: selectedJob.title,
        date: todayStr,
        checkInTime: manualCheckIn,
        checkOutTime: manualCheckOut,
        hoursWorked,
        wageEarned,
        status: "approved", // auto-approved by foreman override
        qrVerified: false,
        checkInLatitude: selectedJob.latitude || 12.9716,
        checkInLongitude: selectedJob.longitude || 77.5946,
        safetyCleared: manualPpeHelmet && manualPpeBoots && manualPpeGloves,
        safetyGearConfirmed: [
          manualPpeHelmet ? "helmet" : "",
          manualPpeBoots ? "boots" : "",
          manualPpeGloves ? "gloves" : "",
          manualPpeHarness ? "harness" : ""
        ].filter(Boolean)
      };

      if (onLogManualAttendance) {
        await onLogManualAttendance(payload);
        alert(`🎉 Manual override completed! Logged ${hoursWorked} hours for ${selectedWorker.name} on ${selectedJob.title}. Pro-rated wages: ₹${wageEarned}.`);
        setShowManualForm(false);
      }
    } catch (err: any) {
      alert(`Manual override failed: ${err.message || err}`);
    } finally {
      setManualLoading(false);
    }
  };

  const handlePassScanSuccess = (qrData: string) => {
    try {
      let parsed: any;
      try {
        parsed = JSON.parse(qrData);
      } catch (e) {
        if (qrData.startsWith("EMPOWORK_PERSONAL_QR:")) {
          const uid = qrData.split(":")[1];
          const prof = userProfiles[uid];
          parsed = {
            type: "EMPOWORK_PERSONAL_QR",
            uid,
            name: prof?.name || "Verified Worker",
            trade: prof?.trade || "General Laborer",
            phone: prof?.phone || ""
          };
        } else {
          throw new Error("Invalid entry pass format");
        }
      }

      if (parsed?.type !== "EMPOWORK_PERSONAL_QR") {
        throw new Error("This is not a valid Empowork Personal Entry Pass!");
      }

      setScannedWorkerData(parsed);
      setScanMessage({
        text: `✅ Identity Verified: ${parsed.name} (${parsed.trade})`,
        type: "success"
      });
      
      const employerOpenJobs = jobs.filter(j => j.status === "open" || j.status === "active");
      if (employerOpenJobs.length > 0) {
        setSelectedScanJobId(employerOpenJobs[0].id);
      }
    } catch (err: any) {
      setScanMessage({
        text: `❌ Scanning failed: ${err.message || err}`,
        type: "error"
      });
    }
  };

  const handleAuthorizeScanCheckIn = async () => {
    if (!scannedWorkerData || !selectedScanJobId) return;
    setScanLoading(true);
    try {
      const selectedJob = jobs.find(j => j.id === selectedScanJobId);
      if (!selectedJob) throw new Error("Invalid job selected");

      const payload: Partial<AttendanceRecord> = {
        workerId: scannedWorkerData.uid,
        workerName: scannedWorkerData.name,
        jobId: selectedJob.id,
        jobTitle: selectedJob.title,
        employerId: selectedJob.employerId,
        date: new Date().toISOString().split("T")[0],
        checkInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        checkOutTime: "",
        hoursWorked: 0,
        wageEarned: selectedJob.wage || 800,
        status: "pending_approval",
        qrVerified: true,
        checkInLatitude: selectedJob.latitude || 12.9716,
        checkInLongitude: selectedJob.longitude || 77.5946,
        safetyCleared: true,
        safetyGearConfirmed: ["helmet", "boots", "gloves"]
      };

      if (onLogManualAttendance) {
        await onLogManualAttendance(payload);
        setScanMessage({
          text: `🎉 Verified and Checked-In Successfully! ${scannedWorkerData.name} logged for ${selectedJob.title} at ${payload.checkInTime}.`,
          type: "success"
        });
        setScannedWorkerData(null);
        setSimulateWorkerId("");
        setTimeout(() => {
          setShowPassScanner(false);
          setScanMessage(null);
        }, 3000);
      } else {
        throw new Error("Manual check-in handler is missing in dashboard context");
      }
    } catch (err: any) {
      setScanMessage({
        text: `❌ Authorization failed: ${err.message || err}`,
        type: "error"
      });
    } finally {
      setScanLoading(false);
    }
  };

  const handleSimulateScan = (workerId: string) => {
    if (!workerId) return;
    const worker = userProfiles[workerId];
    if (!worker) return;

    const simulatedQR = JSON.stringify({
      type: "EMPOWORK_PERSONAL_QR",
      uid: worker.uid,
      name: worker.name,
      trade: worker.trade || "General Laborer",
      phone: worker.phone || ""
    });

    handlePassScanSuccess(simulatedQR);
  };

  const listWorkers = Object.values(userProfiles).filter(p => p.role === "worker");

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Header Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-950 uppercase tracking-tight">Shift Attendance & Safety Audit</h2>
          <p className="text-xs text-slate-500">Examine daily worker clock-ins, coordinates map check, and override logs.</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setShowPassScanner(!showPassScanner);
              setShowManualForm(false);
            }}
            className="inline-flex items-center px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl uppercase tracking-wider transition-all cursor-pointer border border-amber-600 shadow-md"
          >
            <QrCode className="w-4 h-4 mr-2" />
            {showPassScanner ? "Close Pass Scanner" : "Scan Worker Pass"}
          </button>

          <button
            onClick={() => {
              setShowManualForm(!showManualForm);
              setShowPassScanner(false);
            }}
            className="inline-flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 font-extrabold text-xs rounded-xl uppercase tracking-wider transition-all cursor-pointer border border-slate-200"
          >
            <PlusCircle className="w-4 h-4 mr-2 text-slate-650" />
            {showManualForm ? "Close Override Form" : "Foreman Override (Manual)"}
          </button>
          
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center px-4 py-2 bg-slate-950 hover:bg-slate-850 text-amber-500 font-extrabold text-xs rounded-xl uppercase tracking-wider transition-all cursor-pointer border border-slate-850 shadow-md"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export CSV Report
          </button>
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Today Present</span>
            <span className="text-xl font-black text-slate-900 font-mono">{presentCount} Workers</span>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg"><Clock className="w-4 h-4" /></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Awaiting Approval</span>
            <span className="text-xl font-black text-slate-950 font-mono">{pendingApprovals} Shifts</span>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg"><Sliders className="w-4 h-4" /></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Verified Shifts</span>
            <span className="text-xl font-black text-slate-900 font-mono">{approvedShifts} Completed</span>
          </div>
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg"><ShieldCheck className="w-4 h-4" /></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Safety Standard PPE</span>
            <span className="text-xl font-black text-slate-900 font-mono">100% Cleared</span>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg"><HardHat className="w-4 h-4" /></div>
        </div>
      </div>

      {/* Collapsible Foreman Override Form */}
      {showManualForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm max-w-2xl">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
            <h3 className="text-xs font-black uppercase text-slate-950 tracking-wider">Foreman Manual Attendance Override</h3>
            <button onClick={() => setShowManualForm(false)} className="text-slate-400 text-xs font-bold p-1 hover:bg-slate-100 rounded-full">✕</button>
          </div>

          <form onSubmit={handleManualMarkSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Select Active Contract Job</label>
                <select
                  value={manualJobId}
                  onChange={(e) => setManualJobId(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-900 font-bold"
                  required
                >
                  <option value="">-- Choose Job --</option>
                  {jobs.filter(j => j.status === "open" || j.status === "active").map(j => (
                    <option key={j.id} value={j.id}>{j.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Select Registered Laborer</label>
                <select
                  value={manualWorkerId}
                  onChange={(e) => setManualWorkerId(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-900 font-bold"
                  required
                >
                  <option value="">-- Choose Worker --</option>
                  {listWorkers.map(w => (
                    <option key={w.uid} value={w.uid}>{w.name} ({w.trade || "Laborer"})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Check-In Time</label>
                <input
                  type="time"
                  value={manualCheckIn}
                  onChange={(e) => setManualCheckIn(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-900 font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Check-Out Time</label>
                <input
                  type="time"
                  value={manualCheckOut}
                  onChange={(e) => setManualCheckOut(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-900 font-bold"
                />
              </div>
            </div>

            {/* Manual PPE Checklist */}
            <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 block">Foreman On-Site Safety Gear Verification (PPE)</span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <label className="flex items-center space-x-2 cursor-pointer p-2 bg-white rounded-lg border border-slate-150">
                  <input type="checkbox" checked={manualPpeHelmet} onChange={(e) => setManualPpeHelmet(e.target.checked)} className="rounded text-amber-500" />
                  <span className="font-bold text-slate-700">Safety Helmet</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer p-2 bg-white rounded-lg border border-slate-150">
                  <input type="checkbox" checked={manualPpeBoots} onChange={(e) => setManualPpeBoots(e.target.checked)} className="rounded text-amber-500" />
                  <span className="font-bold text-slate-700">Safety Boots</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer p-2 bg-white rounded-lg border border-slate-150">
                  <input type="checkbox" checked={manualPpeGloves} onChange={(e) => setManualPpeGloves(e.target.checked)} className="rounded text-amber-500" />
                  <span className="font-bold text-slate-700">Gloves</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer p-2 bg-white rounded-lg border border-slate-150">
                  <input type="checkbox" checked={manualPpeHarness} onChange={(e) => setManualPpeHarness(e.target.checked)} className="rounded text-amber-500" />
                  <span className="font-bold text-slate-700">Fall Harness</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowManualForm(false)}
                className="py-2 px-4 border border-slate-200 text-slate-700 text-xs font-bold uppercase rounded-lg cursor-pointer hover:bg-slate-50"
              >
                Discard Override
              </button>
              <button
                type="submit"
                disabled={manualLoading}
                className="py-2 px-5 bg-slate-950 hover:bg-slate-850 text-amber-500 text-xs font-black uppercase rounded-lg cursor-pointer border border-slate-800 shadow-md"
              >
                {manualLoading ? "Logging Override..." : "Authorize Manual Log"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Collapsible Pass Scanner / Verification Panel */}
      {showPassScanner && (
        <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-6 shadow-xl max-w-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 pointer-events-none opacity-10">
            <QrCode className="w-40 h-40" />
          </div>
          
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-850 z-10 relative">
            <div>
              <span className="text-[9px] font-mono font-black text-amber-400 uppercase tracking-widest block">Security Gate Scanner</span>
              <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                <QrCode className="w-4.5 h-4.5 text-amber-400" /> Worker Entry Pass Reader
              </h3>
            </div>
            <button 
              onClick={() => {
                setShowPassScanner(false);
                setScannedWorkerData(null);
                setScanMessage(null);
              }} 
              className="text-slate-400 hover:text-white text-xs font-bold p-1 bg-slate-800 rounded-full cursor-pointer transition-all"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 z-10 relative">
            {/* Left side: Scan / Camera stream or Simulator select */}
            <div className="space-y-4">
              <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
                <span className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-wider block mb-2">Option A: Live Video Scanner</span>
                <div className="bg-slate-900 border border-slate-800 rounded-lg flex flex-col items-center justify-center relative overflow-hidden p-4 min-h-[160px]">
                  <QRCameraScanner 
                    onScanSuccess={(data) => {
                      handlePassScanSuccess(data);
                    }}
                    onClose={() => {
                      setShowPassScanner(false);
                    }}
                  />
                </div>
              </div>

              <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
                <span className="text-[9px] font-mono font-bold uppercase text-amber-400 tracking-wider block mb-2">Option B: Quick Simulation (Superb for Testing)</span>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Select Worker to Simulate Scan</label>
                <select
                  value={simulateWorkerId}
                  onChange={(e) => {
                    setSimulateWorkerId(e.target.value);
                    handleSimulateScan(e.target.value);
                  }}
                  className="w-full p-2.5 text-xs border border-slate-800 rounded-lg bg-slate-900 text-white font-bold cursor-pointer"
                >
                  <option value="">-- Choose Registered Worker --</option>
                  {listWorkers.map(w => (
                    <option key={w.uid} value={w.uid}>{w.name} ({w.trade || "General Laborer"})</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1.5 leading-normal">
                  Select any worker to simulate parsing their personal QR code pass exactly as if you scanned it with a device camera.
                </p>
              </div>
            </div>

            {/* Right side: Verification results & authorization details */}
            <div className="flex flex-col justify-between bg-slate-950/50 border border-slate-850 rounded-xl p-4">
              <div className="space-y-4">
                <span className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-wider block border-b border-slate-850 pb-1.5">Verification Details</span>
                
                {scanMessage && (
                  <div className={`p-3 rounded-lg text-xs leading-normal font-bold ${
                    scanMessage.type === "success" ? "bg-emerald-950/60 border border-emerald-900 text-emerald-300" :
                    scanMessage.type === "error" ? "bg-rose-950/60 border border-rose-900 text-rose-300" :
                    "bg-blue-950/60 border border-blue-900 text-blue-300"
                  }`}>
                    {scanMessage.text}
                  </div>
                )}

                {scannedWorkerData ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[9px] text-slate-500 block uppercase font-bold">Worker Name</span>
                        <span className="font-extrabold text-white text-sm">{scannedWorkerData.name}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block uppercase font-bold">Designated Trade</span>
                        <span className="font-bold text-amber-400">{scannedWorkerData.trade}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block uppercase font-bold">Mobile Link</span>
                        <span className="font-bold text-slate-300">{scannedWorkerData.phone || "Not linked"}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block uppercase font-bold">Identity Token</span>
                        <span className="font-mono text-[10px] text-indigo-300">{scannedWorkerData.uid.slice(0, 10)}...</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-850">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Assign to Active Job Site</label>
                      <select
                        value={selectedScanJobId}
                        onChange={(e) => setSelectedScanJobId(e.target.value)}
                        className="w-full p-2 border border-slate-800 rounded bg-slate-900 text-white font-bold text-xs"
                        required
                      >
                        <option value="">-- Choose Job --</option>
                        {jobs.filter(j => j.status === "open" || j.status === "active").map(j => (
                          <option key={j.id} value={j.id}>{j.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                    <Clock className="w-8 h-8 text-slate-700 animate-pulse" />
                    <span className="text-[11px] font-bold">Awaiting QR scan payload or simulator input...</span>
                  </div>
                )}
              </div>

              {scannedWorkerData && (
                <div className="pt-4 border-t border-slate-850 flex space-x-2">
                  <button
                    onClick={() => {
                      setScannedWorkerData(null);
                      setScanMessage(null);
                    }}
                    className="flex-1 py-2 text-center text-slate-400 hover:text-white border border-slate-800 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-900 transition-all animate-none"
                  >
                    Reset
                  </button>
                  <button
                    onClick={handleAuthorizeScanCheckIn}
                    disabled={scanLoading || !selectedScanJobId}
                    className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 disabled:opacity-50 text-xs font-black uppercase tracking-wider rounded-lg shadow-md transition-all cursor-pointer flex items-center justify-center"
                  >
                    {scanLoading ? "Logging..." : "Authorize Entry"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Attendance Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Table Filters header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by worker name, job title..."
              className="w-full p-2 pl-9 text-xs border border-slate-200 rounded-xl bg-white text-slate-900 font-semibold"
            />
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <span className="font-bold text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-1.5 border border-slate-200 rounded-lg bg-white font-bold"
            >
              <option value="all">All States</option>
              <option value="pending_approval">Awaiting Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 font-mono text-[10px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-200">
                <th className="p-4">Worker Info</th>
                <th className="p-4">Assigned Shift</th>
                <th className="p-4">Timing Logs</th>
                <th className="p-4">PPE Safety Checked</th>
                <th className="p-4">Verification</th>
                <th className="p-4">Geofence (GPS Anchor)</th>
                <th className="p-4 text-right">Wages</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Review Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => {
                  const ppeColors = (checked: boolean) => checked ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100";

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <div className="space-y-0.5">
                          <span className="font-black text-slate-900 text-sm block">{log.workerName}</span>
                          <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">{log.workerId.slice(0, 8)}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-900 truncate block max-w-xs">{log.jobTitle}</span>
                          <span className="text-[10px] text-slate-400 font-bold block">{log.date}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-800">
                            IN: <span className="text-slate-900 font-black">{log.checkInTime || "08:00 AM"}</span> | OUT: <span className="text-slate-900 font-black">{log.checkOutTime || "05:00 PM"}</span>
                          </p>
                          <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">{log.hoursWorked || 8} Hours Logged</span>
                        </div>
                      </td>
                      <td className="p-4">
                        {log.safetyGearConfirmed ? (
                          <div className="flex flex-wrap gap-1 text-[9px] font-bold uppercase">
                            <span className={`px-1.5 py-0.5 border rounded ${ppeColors((log.safetyGearConfirmed || []).some(g => g.toLowerCase() === "helmet"))}`}>Helmet</span>
                            <span className={`px-1.5 py-0.5 border rounded ${ppeColors((log.safetyGearConfirmed || []).some(g => g.toLowerCase() === "boots"))}`}>Boots</span>
                            <span className={`px-1.5 py-0.5 border rounded ${ppeColors((log.safetyGearConfirmed || []).some(g => g.toLowerCase() === "gloves"))}`}>Gloves</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Not Standard</span>
                        )}
                      </td>
                      <td className="p-4">
                        {log.qrVerified ? (
                          <span className="inline-flex items-center space-x-1 text-[9px] font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                            <QrCode className="w-3 h-3" />
                            <span>QR Verified</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-[9px] font-bold uppercase text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full">
                            <span>Foreman Override</span>
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-mono">
                        <div className="space-y-0.5 text-[10px]">
                          <div className="flex items-center space-x-1 text-slate-800">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>GPS Acc: 14m</span>
                          </div>
                          <span className="text-[9px] text-slate-400 block font-bold">Lat: {log.checkInLatitude?.toFixed(4) || "12.9716"}, Lon: {log.checkInLongitude?.toFixed(4) || "77.5946"}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right font-black text-slate-950 font-mono">
                        ₹{log.wageEarned}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center border rounded px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                          log.status === "approved" ? "text-emerald-700 bg-emerald-50 border-emerald-200/50" : 
                          log.status === "rejected" ? "text-red-700 bg-rose-50 border-rose-200/50" : 
                          "text-amber-700 bg-amber-50 border-amber-200/50"
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="p-4">
                        {log.status === "pending_approval" ? (
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={async () => {
                                if (confirm(`Approve attendance and queue wage disbursement of ₹${log.wageEarned} for ${log.workerName}?`)) {
                                  await onApproveAttendance(log);
                                }
                              }}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer border border-slate-100"
                              title="Approve Shift"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm(`Reject shift attendance log for ${log.workerName}?`)) {
                                  await onRejectAttendance(log);
                                }
                              }}
                              className="p-1 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer border border-slate-100"
                              title="Reject Shift"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reviewed</p>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Clock className="w-8 h-8 text-slate-300" />
                      <span className="text-xs font-semibold">No shift attendance logs found.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Unique Site QR Code Launcher */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 relative overflow-hidden">
        <div className="absolute -right-16 -bottom-16 w-48 h-48 bg-amber-500/10 rounded-full filter blur-xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 z-10">
            <span className="text-[9px] font-mono font-black text-amber-400 uppercase tracking-widest block">Digital Entrance Check-point</span>
            <h3 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
              <QrCode className="w-5 h-5 text-amber-400" /> Print Site Attendance QR Banners
            </h3>
            <p className="text-xs text-slate-300 font-semibold leading-relaxed max-w-xl">
              Display unique check-in QR codes at your construction site. Workers scan the code directly from their mobile camera to log in instantly. The platform automatically verifies GPS presence limits.
            </p>
          </div>

          <button
            onClick={() => {
              const activeJob = jobs.find(j => j.status === "open" || j.status === "active");
              if (activeJob && onShowQR) {
                onShowQR(activeJob);
              } else {
                alert("Please publish a Job post first to generate its unique entrance QR Code.");
              }
            }}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase rounded-xl tracking-wider shadow-lg transition-all duration-200 cursor-pointer border border-amber-600 shrink-0 z-10"
          >
            Generate Banner QR
          </button>
        </div>
      </div>

    </div>
  );
}
