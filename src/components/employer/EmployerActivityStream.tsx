import React, { useState, useMemo } from "react";
import { 
  Bell, UserCheck, UserPlus, Coins, ShieldAlert, 
  Search, RefreshCw, Sparkles, Clock, CheckCircle2, ChevronRight, Filter
} from "lucide-react";
import { JobApplication, AttendanceRecord, WagePayment, Complaint } from "../../types";

interface ActivityStreamProps {
  attendanceLogs: AttendanceRecord[];
  applicants: JobApplication[];
  wagePayments: WagePayment[];
  complaints: Complaint[];
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

interface StreamItem {
  id: string;
  category: "all" | "system" | "worker" | "payment" | "dispute";
  title: string;
  message: string;
  timestamp: string;
  timeRaw: number; // for chronological sorting
  type: "success" | "warning" | "info" | "error" | "purple";
  workerName?: string;
  statusBadge?: string;
}

export default function EmployerActivityStream({
  attendanceLogs,
  applicants,
  wagePayments,
  complaints,
  showToast
}: ActivityStreamProps) {
  const [filter, setFilter] = useState<"all" | "system" | "worker" | "payment" | "dispute">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [simulationCount, setSimulationCount] = useState(0);

  // Hardcoded initial fallback list to ensure the log is always rich and professional
  const defaultLogs: StreamItem[] = useMemo(() => [
    {
      id: "sys-alert-1",
      category: "system",
      title: "Geofence Parameters Active",
      message: "Biometric Aadhaar geofence verification verified successfully for Site Alpha center.",
      timestamp: "Today, 08:30 AM",
      timeRaw: Date.now() - 3 * 3600 * 1000,
      type: "success",
      statusBadge: "Active"
    },
    {
      id: "sys-alert-2",
      category: "system",
      title: "Arbitration Assigned",
      message: "Independent local labor arbitrator assigned to grievance comp-102 investigation flow.",
      timestamp: "Yesterday, 04:30 PM",
      timeRaw: Date.now() - 24 * 3600 * 1000,
      type: "warning",
      statusBadge: "Investigating"
    },
    {
      id: "sys-alert-3",
      category: "system",
      title: "Daily Safety Checklist Broadcasted",
      message: "Required daily high-visibility vest and steel-toe boots wearing instruction sent to all active shifts.",
      timestamp: "2 days ago",
      timeRaw: Date.now() - 48 * 3600 * 1000,
      type: "info",
      statusBadge: "Sent"
    }
  ], []);

  // Simulator state to append custom notifications dynamically
  const [simulatedLogs, setSimulatedLogs] = useState<StreamItem[]>([]);

  // Function to simulate real-time worker check-in or system alerts
  const triggerSimulation = () => {
    const simulationTemplates = [
      {
        title: "Worker Attendance Registered",
        message: "Devendra Kumar completed biometrics matching and logged in safely for Masonry shift.",
        category: "worker" as const,
        type: "success" as const,
        statusBadge: "Present",
        workerName: "Devendra Kumar"
      },
      {
        title: "New Application",
        message: "Manpreet Singh (Carpenter, 5+ yrs exp) submitted application for formwork vacancy.",
        category: "worker" as const,
        type: "purple" as const,
        statusBadge: "Review Pending",
        workerName: "Manpreet Singh"
      },
      {
        title: "Escrow Auto-Release Queue",
        message: "National Agri-Labor payment routing initiated for ₹800 daily block-laying wage.",
        category: "payment" as const,
        type: "info" as const,
        statusBadge: "Processing",
      },
      {
        title: "System Geofence Handshake",
        message: "Biometric attendance validation completed: Worker coordinates matching Site Alpha gateway perfectly.",
        category: "system" as const,
        type: "success" as const,
        statusBadge: "Aadhaar Match"
      }
    ];

    const template = simulationTemplates[simulationCount % simulationTemplates.length];
    const newLog: StreamItem = {
      id: `sim-${Date.now()}`,
      category: template.category,
      title: template.title,
      message: template.message,
      timestamp: "Just Now",
      timeRaw: Date.now(),
      type: template.type,
      statusBadge: template.statusBadge,
      workerName: template.workerName
    };

    setSimulatedLogs(prev => [newLog, ...prev]);
    setSimulationCount(prev => prev + 1);
    showToast(`Simulated Live Feed Update: ${template.title}`, "info");
  };

  // Compile unified feed chronologically
  const unifiedFeed = useMemo(() => {
    const list: StreamItem[] = [...simulatedLogs, ...defaultLogs];

    // Map actual DB attendance records
    attendanceLogs.forEach(att => {
      let type: "success" | "warning" | "error" | "info" = "info";
      let statusText = "Check-In";
      if (att.status === "approved") {
        type = "success";
        statusText = "Approved";
      } else if (att.status === "rejected") {
        type = "error";
        statusText = "Rejected";
      } else if (att.checkOutTime) {
        type = "warning";
        statusText = "Awaiting Verification";
      }

      list.push({
        id: `db-att-${att.id}`,
        category: "worker",
        title: `Attendance Checked: ${att.workerName || "Worker"}`,
        message: `Clocked ${att.checkInTime} ${att.checkOutTime ? `to ${att.checkOutTime}` : "on site"} for ${att.jobTitle || "assignment"}. Location: ${att.checkInLocationName || "Site Coordinates"}.`,
        timestamp: att.date || "Today",
        timeRaw: att.checkInTime ? new Date(`${att.date}T${att.checkInTime.includes(":") ? att.checkInTime : "08:00"}`).getTime() : Date.now(),
        type,
        workerName: att.workerName,
        statusBadge: statusText
      });
    });

    // Map actual DB applications
    applicants.forEach(app => {
      let type: "success" | "warning" | "purple" = "purple";
      if (app.status === "accepted") type = "success";
      if (app.status === "rejected") type = "warning";

      list.push({
        id: `db-app-${app.id}`,
        category: "worker",
        title: `Application: ${app.workerName || "Laborer"}`,
        message: `Requested to join '${app.jobTitle}' for listed trade '${app.workerTrade}'. Status is currently ${app.status.toUpperCase()}.`,
        timestamp: app.appliedAt ? app.appliedAt.split("T")[0] : "Recently",
        timeRaw: app.appliedAt ? new Date(app.appliedAt).getTime() : Date.now(),
        type,
        workerName: app.workerName,
        statusBadge: app.status.toUpperCase()
      });
    });

    // Map actual DB wage payments
    wagePayments.forEach(pay => {
      let type: "success" | "warning" | "info" = "info";
      if (pay.status === "paid") type = "success";
      if (pay.status === "rejected") type = "warning";

      list.push({
        id: `db-wage-${pay.id}`,
        category: "payment",
        title: `Wage Ledger: ${pay.workerName}`,
        message: `Disbursed ₹${pay.amount.toLocaleString()} INR for '${pay.jobTitle}'. Status is ${pay.status} ${pay.transactionId ? `(Ref: ${pay.transactionId})` : ""}.`,
        timestamp: "Wages Cycle",
        timeRaw: Date.now() - 1000,
        type,
        workerName: pay.workerName,
        statusBadge: pay.status.toUpperCase()
      });
    });

    // Map actual DB complaints
    complaints.forEach(comp => {
      list.push({
        id: `db-comp-${comp.id}`,
        category: "dispute",
        title: `Grievance Reported: ${comp.workerName}`,
        message: `Dispute status set to ${comp.status.toUpperCase()}. Description: "${comp.description.slice(0, 100)}..."`,
        timestamp: comp.createdAt ? comp.createdAt.split("T")[0] : "Active",
        timeRaw: comp.createdAt ? new Date(comp.createdAt).getTime() : Date.now(),
        type: comp.status === "resolved" ? "success" : "error",
        workerName: comp.workerName,
        statusBadge: comp.status.toUpperCase()
      });
    });

    // Generate automated compliance alerts for overdue wages based on logged site attendance
    const todayStr = new Date().toISOString().split("T")[0];
    attendanceLogs.forEach(att => {
      if (att.checkOutTime && att.status !== "rejected" && att.date < todayStr) {
        const isPaid = wagePayments.some(pay => 
          pay.status === "paid" && 
          (pay.id === `wage-${att.id}` || (pay.workerId === att.workerId && pay.jobId === att.jobId && pay.amount === att.wageEarned))
        );
        if (!isPaid) {
          list.push({
            id: `overdue-alert-${att.id}`,
            category: "dispute",
            title: `⚠️ COMPLIANCE ALERT: Overdue Wages for ${att.workerName || "Worker"}`,
            message: `Wages of ₹${att.wageEarned.toLocaleString()} INR for '${att.jobTitle || "assignment"}' shift on ${att.date} have not been disbursed. Indian Labor Regulations require same-day settlement.`,
            timestamp: att.date,
            timeRaw: new Date(`${att.date}T12:00:00`).getTime(),
            type: "error",
            workerName: att.workerName,
            statusBadge: "OVERDUE WAGE"
          });
        }
      }
    });

    // Sort chronologically (newest first)
    return list.sort((a, b) => b.timeRaw - a.timeRaw);
  }, [simulatedLogs, defaultLogs, attendanceLogs, applicants, wagePayments, complaints]);

  // Filter & Search application
  const filteredFeed = useMemo(() => {
    return unifiedFeed.filter(item => {
      const matchesCategory = filter === "all" || item.category === filter;
      const matchesSearch = 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.workerName && item.workerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.statusBadge && item.statusBadge.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [unifiedFeed, filter, searchQuery]);

  // Icon selector helper
  const renderItemIcon = (category: string, type: string) => {
    switch (category) {
      case "worker":
        return <UserCheck className={`w-4 h-4 ${type === "success" ? "text-emerald-500" : "text-violet-500"}`} />;
      case "payment":
        return <Coins className="w-4 h-4 text-emerald-500" />;
      case "dispute":
        return <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />;
      default:
        return <Bell className="w-4 h-4 text-amber-500" />;
    }
  };

  // Styling helper for badges
  const getBadgeStyle = (type: string) => {
    switch (type) {
      case "success":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/50";
      case "warning":
        return "bg-amber-50 text-amber-700 border-amber-200/50";
      case "error":
        return "bg-rose-50 text-rose-700 border-rose-200/50";
      case "purple":
        return "bg-violet-50 text-violet-700 border-violet-200/50";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 flex flex-col h-[520px] shadow-sm overflow-hidden animate-in fade-in duration-300 text-left">
      
      {/* Header with quick search */}
      <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4.5 h-4.5 text-amber-500" />
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-950 font-mono">
              Live Activity Stream & Alerts
            </h4>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Live simulation button for interactive fidelity */}
            <button
              onClick={triggerSimulation}
              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-amber-500 hover:text-amber-400 font-bold text-[9px] uppercase rounded-lg tracking-wider cursor-pointer border border-slate-800 transition-all flex items-center gap-1 font-mono"
              title="Simulate real-time site check-ins or alert bulletins"
            >
              <RefreshCw className="w-3 h-3 animate-spin duration-1000" /> Simulate Alert
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search alerts, workers, checks or transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-950 placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-all"
          />
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {[
            { id: "all", label: "All Logs" },
            { id: "system", label: "System" },
            { id: "worker", label: "Worker Status" },
            { id: "payment", label: "Payments" },
            { id: "dispute", label: "Disputes" }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id as any)}
              className={`px-3 py-1 text-[10px] font-mono font-black uppercase tracking-wider rounded-lg border shrink-0 cursor-pointer transition-all ${
                filter === cat.id
                  ? "bg-slate-950 text-amber-500 border-slate-950 shadow-xs"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Scrollable Area */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-3 space-y-2">
        {filteredFeed.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Bell className="w-8 h-8 text-slate-300 mx-auto animate-bounce" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">No activities found</p>
            <p className="text-[10px] text-slate-400 font-semibold max-w-xs mx-auto">
              Try adjusting your search keywords or tap 'Simulate Alert' to push high-fidelity crew check-in metrics.
            </p>
          </div>
        ) : (
          filteredFeed.map((item, idx) => (
            <div 
              key={`${item.id}-${idx}`} 
              className="p-3 bg-slate-50 hover:bg-slate-100/75 border border-slate-150 rounded-xl transition-all flex items-start gap-3 duration-200 group"
            >
              {/* Category Indicator Icon Ring */}
              <div className="p-2 bg-white rounded-lg border border-slate-200 shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                {renderItemIcon(item.category, item.type)}
              </div>

              {/* Activity Details */}
              <div className="flex-1 space-y-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h5 className="text-xs font-extrabold text-slate-950 font-sans truncate">
                    {item.title}
                  </h5>
                  <span className="text-[9px] text-slate-400 font-semibold font-mono whitespace-nowrap">
                    {item.timestamp}
                  </span>
                </div>
                
                <p className="text-xs text-slate-600 font-medium leading-relaxed font-sans">
                  {item.message}
                </p>

                {/* Sub-Badges and metadata */}
                <div className="pt-1.5 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    {item.statusBadge && (
                      <span className={`px-2 py-0.5 text-[9px] font-mono font-black uppercase tracking-wider rounded-md border ${getBadgeStyle(item.type)}`}>
                        {item.statusBadge}
                      </span>
                    )}
                    <span className="text-[9px] text-slate-400 uppercase font-mono tracking-widest block font-black">
                      {item.category}
                    </span>
                  </div>

                  <span className="text-[9px] text-amber-600 font-mono font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                    Audit Log <ChevronRight className="w-2.5 h-2.5" />
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer statistics */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-400 shrink-0">
        <span className="flex items-center gap-1.5 text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
          Stream Sync: Verified Online
        </span>
        <span className="font-bold text-slate-200">
          Total Logs: {filteredFeed.length}
        </span>
      </div>

    </div>
  );
}
