import React, { useState } from "react";
import { 
  Calendar, Coins, Check, X, Shield, Search, Clock, CreditCard, 
  MapPin, User, CheckCircle, AlertTriangle, ShieldCheck, HelpCircle 
} from "lucide-react";
import { AttendanceRecord, WagePayment } from "../../types";
import { db, doc, updateDoc, getDoc, getDocs, query, where, collection } from "../../lib/firebase";

interface PayrollAttendanceTabProps {
  attendanceRecords: AttendanceRecord[];
  wagePayments: WagePayment[];
  onRefresh: () => void;
  logAction: (action: string, category: string, details: string) => Promise<void>;
}

export default function PayrollAttendanceTab({ attendanceRecords, wagePayments, onRefresh, logAction }: PayrollAttendanceTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<"attendance" | "payroll">("attendance");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<WagePayment | null>(null);

  // Filter attendance records
  const filteredAttendance = attendanceRecords.filter(rec => 
    rec.workerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rec.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter wage payments
  const filteredPayments = wagePayments.filter(pay => 
    pay.workerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pay.employerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pay.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleApproveAttendance = async (rec: AttendanceRecord) => {
    try {
      await updateDoc(doc(db, "attendance", rec.id), {
        status: "approved"
      });
      await logAction(
        `Approved Attendance: ${rec.workerName}`,
        "Attendance Validation",
        `Admin approved shift attendance for ${rec.workerName} on date ${rec.date} (Wage earned: ₹${rec.wageEarned})`
      );
      
      // Auto-trigger wage payment creation or update if exists
      // Check if there is an associated wage payment document and set it to pending/approved
      onRefresh();
      if (selectedRecord?.id === rec.id) {
        setSelectedRecord({ ...rec, status: "approved" });
      }
    } catch (error) {
      console.error("Error approving attendance:", error);
    }
  };

  const handleRejectAttendance = async (rec: AttendanceRecord) => {
    try {
      await updateDoc(doc(db, "attendance", rec.id), {
        status: "rejected"
      });
      await logAction(
        `Rejected Attendance: ${rec.workerName}`,
        "Attendance Validation",
        `Admin rejected shift attendance for ${rec.workerName} on date ${rec.date} due to audit criteria failure`
      );
      onRefresh();
      if (selectedRecord?.id === rec.id) {
        setSelectedRecord({ ...rec, status: "rejected" });
      }
    } catch (error) {
      console.error("Error rejecting attendance:", error);
    }
  };

  const handleReleasePayment = async (pay: WagePayment) => {
    try {
      const mockTxId = `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      // 1. Update the wage payment record in Firestore
      await updateDoc(doc(db, "wage_payments", pay.id), {
        status: "paid",
        transactionId: mockTxId,
        clearedAt: new Date().toISOString()
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

      await logAction(
        `Released Escrow Payment: ${pay.workerName}`,
        "Payroll & Payments",
        `Cleared wage escrow of ₹${pay.amount} for worker ${pay.workerName}. Disbursed Tx ID: ${mockTxId}`
      );
      onRefresh();
      if (selectedPayment?.id === pay.id) {
        setSelectedPayment({ ...pay, status: "paid", transactionId: mockTxId } as any);
      }
    } catch (error) {
      console.error("Error releasing payment:", error);
    }
  };

  const handleRejectPayment = async (pay: WagePayment) => {
    try {
      await updateDoc(doc(db, "wage_payments", pay.id), {
        status: "rejected"
      });
      await logAction(
        `Rejected Wage Payout: ${pay.workerName}`,
        "Payroll & Payments",
        `Rejected pending escrow release of ₹${pay.amount} for worker ${pay.workerName}`
      );
      onRefresh();
      if (selectedPayment?.id === pay.id) {
        setSelectedPayment({ ...pay, status: "rejected" });
      }
    } catch (error) {
      console.error("Error rejecting payment:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab bar headers */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4 gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center">
            <Coins className="w-5 h-5 mr-2 text-slate-900" /> Attendance Ledger & Smart Escrow Payouts
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Audit site biometric / QR check-ins, verify worker protective safety lists, and dispatch pending escrow payments.</p>
        </div>

        {/* Sub-tab selection */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-black uppercase tracking-wider font-mono shrink-0">
          <button
            onClick={() => { setActiveSubTab("attendance"); setSelectedRecord(null); }}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${activeSubTab === "attendance" ? "bg-slate-900 text-amber-500" : "text-slate-500 hover:text-slate-950"}`}
          >
            Attendance Validation ({attendanceRecords.length})
          </button>
          <button
            onClick={() => { setActiveSubTab("payroll"); setSelectedPayment(null); }}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${activeSubTab === "payroll" ? "bg-slate-900 text-amber-500" : "text-slate-500 hover:text-slate-950"}`}
          >
            Payroll & Escrows ({wagePayments.length})
          </button>
        </div>
      </div>

      {/* Control Console Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder={activeSubTab === "attendance" ? "Search check-ins by worker name, project title..." : "Search payouts by worker, employer, project..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 bg-white"
        />
      </div>

      {/* Main split dashboard layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table layout left */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          {activeSubTab === "attendance" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-black tracking-wider font-mono">
                    <th className="p-3">Worker / Shift Details</th>
                    <th className="p-3">Date & Time</th>
                    <th className="p-3">Wage Earned</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAttendance.length > 0 ? (
                    filteredAttendance.map(rec => {
                      const isPending = rec.status === "pending_approval";
                      return (
                        <tr 
                          key={rec.id}
                          onClick={() => setSelectedRecord(rec)}
                          className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${selectedRecord?.id === rec.id ? "bg-amber-50/50" : ""}`}
                        >
                          <td className="p-3">
                            <div className="font-bold text-slate-900 uppercase">{rec.workerName}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{rec.jobTitle} • ID {rec.id.slice(0,8)}</div>
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-slate-700">{rec.date}</div>
                            <div className="text-[9px] text-slate-400 font-mono flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                              {rec.checkInTime} {rec.checkOutTime ? `to ${rec.checkOutTime}` : "(Active)"}
                            </div>
                          </td>
                          <td className="p-3 font-black text-emerald-700">₹{rec.wageEarned || 500}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                              rec.status === "approved" 
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                : rec.status === "pending_approval"
                                ? "bg-amber-100 text-amber-900 animate-pulse"
                                : "bg-red-50 text-red-700 border border-red-200"
                            }`}>
                              {rec.status === "pending_approval" ? "PENDING REVIEW" : rec.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400 font-bold uppercase text-[10px] tracking-wider font-mono">No shift logs found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-black tracking-wider font-mono">
                    <th className="p-3">Beneficiary Worker</th>
                    <th className="p-3">Payer Employer</th>
                    <th className="p-3">Escrow Value</th>
                    <th className="p-3 font-mono">Trans ID</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayments.length > 0 ? (
                    filteredPayments.map(pay => {
                      const status = pay.status || "pending";
                      return (
                        <tr 
                          key={pay.id}
                          onClick={() => setSelectedPayment(pay)}
                          className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${selectedPayment?.id === pay.id ? "bg-amber-50/50" : ""}`}
                        >
                          <td className="p-3">
                            <div className="font-bold text-slate-900 uppercase">{pay.workerName}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{pay.jobTitle}</div>
                          </td>
                          <td className="p-3 font-semibold uppercase text-slate-600">{pay.employerName}</td>
                          <td className="p-3 font-black text-emerald-700">₹{pay.amount}</td>
                          <td className="p-3 font-mono text-slate-500">{pay.transactionId || "UNRELEASED"}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                              status === "paid" 
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                : status === "rejected"
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}>
                              {status === "pending" ? "ESCROW HELD" : status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 font-bold uppercase text-[10px] tracking-wider font-mono">No wage ledger rows found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detailed Audit Right Column */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-5 shadow-xs">
          {activeSubTab === "attendance" ? (
            selectedRecord ? (
              <div className="space-y-4">
                <div className="pb-3 border-b border-slate-200">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-mono block">Shift Log Details</span>
                  <h3 className="text-sm font-black text-slate-900 uppercase mt-1">{selectedRecord.workerName}</h3>
                  <span className="text-[10px] text-slate-500 font-mono block">Project: {selectedRecord.jobTitle}</span>
                </div>

                {/* Verification checklists */}
                <div className="space-y-3">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-mono block">Safety Verification & Site Audit</span>
                  
                  {/* Safety Gear confirmation list */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono border-b border-slate-100 pb-1.5 font-bold uppercase">
                      <span>Gear Required</span>
                      <span>Verified Status</span>
                    </div>

                    {[
                      { key: "helmet", label: "Hard Hat / Helmet", status: selectedRecord.safetyCleared },
                      { key: "boots", label: "Insulated Steel-toe Boots", status: selectedRecord.safetyCleared },
                      { key: "vest", label: "High-Visibility Safety Vest", status: selectedRecord.safetyCleared }
                    ].map(item => (
                      <div key={item.key} className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-600 font-medium">{item.label}</span>
                        {item.status ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-1 uppercase font-mono text-[9px]"><ShieldCheck className="w-3.5 h-3.5" /> CLEARED</span>
                        ) : (
                          <span className="text-amber-500 font-bold flex items-center gap-1 uppercase font-mono text-[9px]"><AlertTriangle className="w-3.5 h-3.5" /> UNCHECKED</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Location telemetry check */}
                  <div className="bg-slate-900 text-slate-100 p-3.5 rounded-lg border border-slate-950 text-xs font-mono space-y-1.5">
                    <span className="text-[9px] font-black uppercase text-amber-400 tracking-wider block">Telemetry Location Check-In</span>
                    <div className="flex justify-between text-[10px] text-slate-300">
                      <span>Coordinates:</span>
                      <span>{selectedRecord.checkInLatitude?.toFixed(4) || "12.9785"}, {selectedRecord.checkInLongitude?.toFixed(4) || "77.5902"}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-300">
                      <span>Check-In Method:</span>
                      <span className="text-emerald-400 font-bold uppercase">{selectedRecord.qrVerified ? "QR Code Matched" : "Manual Override Required"}</span>
                    </div>
                  </div>
                </div>

                {/* Audit Action Panel */}
                <div className="pt-3 border-t border-slate-200/60 space-y-2">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-mono block font-bold">Log Resolution Verdict</span>
                  
                  {selectedRecord.status === "pending_approval" ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleApproveAttendance(selectedRecord)}
                        className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider text-center cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve Shift
                      </button>
                      <button
                        onClick={() => handleRejectAttendance(selectedRecord)}
                        className="py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider text-center cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                      >
                        <X className="w-3.5 h-3.5" /> Reject Shift
                      </button>
                    </div>
                  ) : (
                    <div className={`p-3 rounded-lg text-[10px] font-bold uppercase text-center font-mono ${
                      selectedRecord.status === "approved" 
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200" 
                        : "bg-red-50 text-red-800 border border-red-200"
                    }`}>
                      Official Shift Status: {selectedRecord.status}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-16 text-slate-400">
                <Calendar className="w-10 h-10 text-slate-300 mb-2" />
                <p className="text-xs font-black text-slate-900 uppercase tracking-wider">Select a shift log.</p>
                <p className="text-[11px] text-slate-500 mt-1">Audit location matching, confirm PPE safety compliance, and approve logs.</p>
              </div>
            )
          ) : selectedPayment ? (
            <div className="space-y-4">
              <div className="pb-3 border-b border-slate-200">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-mono block">Escrow Ledger Audit</span>
                <h3 className="text-sm font-black text-slate-900 uppercase mt-1">{selectedPayment.workerName}</h3>
                <span className="text-[10px] text-slate-500 font-mono block">Employer Payer: {selectedPayment.employerName}</span>
              </div>

              {/* Payment Spec Sheet */}
              <div className="space-y-2.5 text-xs text-slate-600 bg-white p-4 rounded-lg border border-slate-200 shadow-2xs leading-relaxed">
                <div className="flex justify-between border-b border-slate-100 pb-1.5 font-bold uppercase text-[9px] font-mono">
                  <span>Wage Component</span>
                  <span>Amount Held</span>
                </div>
                <div className="flex justify-between">
                  <span>Shift Daily Wage:</span>
                  <span className="font-bold text-slate-800">₹{selectedPayment.amount}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Escrow Funds Secured:</span>
                  <span>₹{selectedPayment.amount}</span>
                </div>
                {selectedPayment.transactionId && (
                  <div className="pt-2 mt-2 border-t border-slate-100 text-[10px] font-mono text-slate-400 leading-tight">
                    <span className="block font-bold text-slate-600">TRANSACTION IDENTIFIER:</span>
                    <span className="text-indigo-600 select-all font-bold block mt-1">{selectedPayment.transactionId}</span>
                  </div>
                )}
              </div>

              {/* Payout actions */}
              <div className="pt-3 border-t border-slate-200/60 space-y-2.5">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-mono block font-bold">Escrow Funds Authority</span>
                
                {selectedPayment.status === "pending" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleReleasePayment(selectedPayment)}
                      className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest text-center cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <CreditCard className="w-3.5 h-3.5" /> Release Escrow
                    </button>
                    <button
                      onClick={() => handleRejectPayment(selectedPayment)}
                      className="py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest text-center cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" /> Hold / Reject
                    </button>
                  </div>
                ) : (
                  <div className={`p-3 rounded-lg text-[10px] font-bold uppercase text-center font-mono ${
                    selectedPayment.status === "paid" 
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200" 
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}>
                    Escrow status: {selectedPayment.status}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-16 text-slate-400">
              <Coins className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-xs font-black text-slate-900 uppercase tracking-wider">Select an escrow ledger row.</p>
              <p className="text-[11px] text-slate-500 mt-1">Audit daily wage clearing values, check employer deposits, and dispatch escrows manually.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
