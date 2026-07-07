import React, { useState, useEffect, useRef } from "react";
import { 
  Bell, Check, X, AlertCircle, ShieldAlert, UserCheck, 
  Building, Award, Activity, ChevronRight, Inbox, RefreshCw 
} from "lucide-react";
import { useAdminData } from "../../context/AdminDataContext";

interface AdminNotificationPanelProps {
  currentTab: string;
  setCurrentTab: (tab: "dashboard" | "users" | "credentials" | "jobs" | "payroll" | "disputes" | "integrity" | "logs") => void;
}

export interface AdminAlert {
  id: string;
  type: "warning" | "danger" | "info" | "success";
  category: "Verification" | "Disputes" | "Financial" | "Anomaly" | "Security";
  title: string;
  description: string;
  timestamp: string;
  tabTarget: "dashboard" | "users" | "credentials" | "jobs" | "payroll" | "disputes" | "integrity" | "logs";
  icon: any;
  meta?: any;
}

export default function AdminNotificationPanel({ currentTab, setCurrentTab }: AdminNotificationPanelProps) {
  const { 
    workers, 
    employers, 
    complaints, 
    wagePayments, 
    auditLogs, 
    loading,
    refetch 
  } = useAdminData();

  const [isOpen, setIsOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("empowork_admin_dismissed_alerts");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const panelRef = useRef<HTMLDivElement>(null);

  // Sync dismissed IDs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("empowork_admin_dismissed_alerts", JSON.stringify(dismissedIds));
    } catch (e) {
      console.error("Failed to save dismissed alerts:", e);
    }
  }, [dismissedIds]);

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Compute live alerts from state
  const alerts: AdminAlert[] = [];

  // 1. Pending worker verifications (unverified workers)
  workers.forEach(w => {
    const isVerified = !!(w as any).identityVerified;
    if (!isVerified) {
      alerts.push({
        id: `verify-worker-${w.uid}`,
        type: "warning",
        category: "Verification",
        title: "Worker Credentials Pending",
        description: `Worker "${w.fullName || w.email}" requires Aadhaar Card / National ID clearance.`,
        timestamp: (w as any).createdAt || new Date().toISOString(),
        tabTarget: "credentials",
        icon: UserCheck,
        meta: { uid: w.uid }
      });
    }
  });

  // 2. Pending employer verifications (unverified employers)
  employers.forEach(e => {
    const isVerified = !!(e as any).businessVerified;
    if (!isVerified) {
      alerts.push({
        id: `verify-employer-${e.uid}`,
        type: "warning",
        category: "Verification",
        title: "Employer Audit Required",
        description: `Employer "${e.fullName || e.companyName || e.email}" requires Corporate GST / TIN audit.`,
        timestamp: (e as any).createdAt || new Date().toISOString(),
        tabTarget: "credentials",
        icon: Building,
        meta: { uid: e.uid }
      });
    }
  });

  // 3. New dispute cases (unresolved platform disputes)
  complaints.forEach(c => {
    if (c.status !== "resolved") {
      alerts.push({
        id: `dispute-${c.id}`,
        type: "danger",
        category: "Disputes",
        title: "Active Wage Dispute Filed",
        description: `Dispute: "${c.subject || c.message}" filed by worker against ${c.employerName || 'employer'}.`,
        timestamp: c.createdAt || new Date().toISOString(),
        tabTarget: "disputes",
        icon: AlertCircle,
        meta: { complaintId: c.id }
      });
    }
  });

  // 4. Financial alert: high value payments (e.g. > ₹10,000)
  wagePayments.forEach(p => {
    if (p.amount && p.amount > 10000) {
      alerts.push({
        id: `high-wage-${p.id}`,
        type: "info",
        category: "Financial",
        title: "High Value Escrow Released",
        description: `A payout of ₹${p.amount.toLocaleString()} has been processed for worker ID: ${p.workerId?.slice(0, 8)}...`,
        timestamp: p.timestamp || new Date().toISOString(),
        tabTarget: "payroll",
        icon: Award,
        meta: { paymentId: p.id }
      });
    }
  });

  // 5. System anomalies from audit logs (detect keywords indicating suspicious activities)
  auditLogs.forEach(l => {
    const actionLower = (l.action || "").toLowerCase();
    const detailsLower = (l.details || "").toLowerCase();
    const isAnomalous = 
      actionLower.includes("fail") || 
      actionLower.includes("unauthorized") || 
      actionLower.includes("abnormal") || 
      actionLower.includes("anomaly") ||
      detailsLower.includes("fail") ||
      detailsLower.includes("unauthorized") ||
      detailsLower.includes("abnormal") ||
      detailsLower.includes("anomaly") ||
      l.category === "Auth & Security" && actionLower.includes("boot"); // High priority auth event

    if (isAnomalous) {
      // Limit to entries from last 7 days to keep it tidy
      const isRecent = new Date(l.timestamp).getTime() > Date.now() - 3600000 * 24 * 7;
      if (isRecent) {
        alerts.push({
          id: `anomaly-log-${l.id}`,
          type: "danger",
          category: "Security",
          title: `Security Event: ${l.action}`,
          description: l.details || "Anomalous system security log generated.",
          timestamp: l.timestamp || new Date().toISOString(),
          tabTarget: "logs",
          icon: ShieldAlert,
          meta: { logId: l.id }
        });
      }
    }
  });

  // Filter out dismissed alerts and deduplicate by ID
  const seenAlertIds = new Set<string>();
  const activeAlerts = alerts.filter(a => {
    if (dismissedIds.includes(a.id)) return false;
    if (seenAlertIds.has(a.id)) return false;
    seenAlertIds.add(a.id);
    return true;
  });

  // Sort alerts: priority (danger first, then warning, then info/success), then newest first
  const priorityScore = { danger: 4, warning: 3, info: 2, success: 1 };
  activeAlerts.sort((a, b) => {
    const scoreDiff = priorityScore[b.type] - priorityScore[a.type];
    if (scoreDiff !== 0) return scoreDiff;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedIds(prev => [...prev, id]);
  };

  const handleDismissAll = () => {
    const allActiveIds = activeAlerts.map(a => a.id);
    setDismissedIds(prev => [...prev, ...allActiveIds]);
  };

  const handleAlertClick = (alert: AdminAlert) => {
    setCurrentTab(alert.tabTarget);
    setIsOpen(false);
  };

  // Human-readable time helper
  const formatTimeAgo = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
      if (seconds < 60) return "Just now";
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } catch {
      return "Recent";
    }
  };

  return (
    <div className="relative inline-block" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg border border-slate-200 cursor-pointer transition-all"
        title="Admin Incident & Verification Alerts"
      >
        <Bell className={`w-4 h-4 ${activeAlerts.length > 0 ? "animate-swing" : ""}`} />
        {activeAlerts.length > 0 && (
          <>
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-black font-mono text-white animate-pulse">
              {activeAlerts.length}
            </span>
            <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-red-500 opacity-75 animate-ping" />
          </>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[340px] sm:w-[420px] max-h-[550px] bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-3 duration-200">
          
          {/* Panel Header */}
          <div className="p-4 border-b border-slate-900 bg-slate-900/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider font-mono">Incident & Action Center</h3>
                <p className="text-[10px] text-slate-400 font-mono">REAL-TIME PLATFORM SECURITY & WORKFLOWS</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              <button
                onClick={refetch}
                disabled={loading}
                className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded border border-slate-700 cursor-pointer disabled:opacity-50 transition-colors"
                title="Sync from Firebase"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
              </button>
              {activeAlerts.length > 0 && (
                <button
                  onClick={handleDismissAll}
                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded text-[8px] font-mono font-black uppercase tracking-wider cursor-pointer transition-all"
                >
                  Dismiss All
                </button>
              )}
            </div>
          </div>

          {/* Panel Alerts List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-900/60 max-h-[380px] scrollbar-thin">
            {activeAlerts.length === 0 ? (
              <div className="py-12 px-6 flex flex-col items-center justify-center text-center">
                <div className="p-3 bg-slate-900 rounded-full border border-slate-800 text-slate-600 mb-3 animate-pulse">
                  <Inbox className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">Operational Green</h4>
                <p className="text-[10px] text-slate-500 mt-1 max-w-[240px]">
                  No unresolved disputes, pending credential reviews, or system anomalies currently detected.
                </p>
              </div>
            ) : (
              activeAlerts.map((alert) => {
                const AlertIcon = alert.icon;
                
                // Set color theme styles based on severity
                let colorClass = "bg-amber-500/10 border-amber-500/30 text-amber-400";
                let hoverClass = "hover:bg-amber-500/5";
                let iconBg = "bg-amber-950 border-amber-800 text-amber-400";
                let tagColor = "bg-amber-950 text-amber-400 border-amber-800/40";
                
                if (alert.type === "danger") {
                  colorClass = "bg-red-500/10 border-red-500/30 text-red-400";
                  hoverClass = "hover:bg-red-500/5";
                  iconBg = "bg-red-950 border-red-800 text-red-400";
                  tagColor = "bg-red-950 text-red-400 border-red-800/40";
                } else if (alert.type === "info") {
                  colorClass = "bg-blue-500/10 border-blue-500/30 text-blue-400";
                  hoverClass = "hover:bg-blue-500/5";
                  iconBg = "bg-blue-950 border-blue-800 text-blue-400";
                  tagColor = "bg-blue-950 text-blue-400 border-blue-800/40";
                } else if (alert.type === "success") {
                  colorClass = "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
                  hoverClass = "hover:bg-emerald-500/5";
                  iconBg = "bg-emerald-950 border-emerald-800 text-emerald-400";
                  tagColor = "bg-emerald-950 text-emerald-400 border-emerald-800/40";
                }

                return (
                  <div
                    key={alert.id}
                    onClick={() => handleAlertClick(alert)}
                    className={`p-4 border-l-4 ${colorClass} ${hoverClass} transition-all cursor-pointer flex gap-3 relative group`}
                  >
                    {/* Severity Icon */}
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${iconBg}`}>
                      <AlertIcon className="w-4 h-4" />
                    </div>

                    {/* Alert text detail */}
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[8px] font-black uppercase font-mono px-1.5 py-0.5 rounded border ${tagColor}`}>
                          {alert.category}
                        </span>
                        <span className="text-[9px] font-mono text-slate-500">
                          {formatTimeAgo(alert.timestamp)}
                        </span>
                      </div>
                      <h4 className="text-xs font-black text-slate-100 uppercase tracking-tight mt-1 truncate">
                        {alert.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                        {alert.description}
                      </p>
                    </div>

                    {/* Interactive resolution indicators */}
                    <div className="flex flex-col items-center justify-between shrink-0 self-stretch">
                      <button
                        onClick={(e) => handleDismiss(alert.id, e)}
                        className="p-1 hover:bg-slate-800 text-slate-500 hover:text-white rounded transition-colors cursor-pointer"
                        title="Dismiss alert"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      
                      <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Panel Footer */}
          <div className="p-3 border-t border-slate-900 bg-slate-950 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>Status: SYSTEM INTEGRITY ACTIVE</span>
            <span>Total alerts: {activeAlerts.length}</span>
          </div>

        </div>
      )}
    </div>
  );
}
