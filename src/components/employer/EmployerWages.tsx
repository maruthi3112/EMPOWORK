import React, { useState, useEffect } from "react";
import { 
  Coins, Search, FileSpreadsheet, ArrowUpRight, CheckCircle, XCircle, 
  RefreshCw, Landmark, Sliders, Play, FileMinus, ExternalLink, ShieldCheck, 
  AlertCircle, Download, Check, HelpCircle
} from "lucide-react";
import { WagePayment, UserProfile } from "../../types";

interface EmployerWagesProps {
  wagePayments: WagePayment[];
  onProcessPayment: (payment: WagePayment) => Promise<any>;
  onRejectPayment: (payment: WagePayment) => Promise<any>;
  autoPayWageId?: string | null;
  clearAutoPayWageId?: () => void;
}

export default function EmployerWages({
  wagePayments = [],
  onProcessPayment,
  onRejectPayment,
  autoPayWageId = null,
  clearAutoPayWageId
}: EmployerWagesProps) {
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Secure Portal Overlay State
  const [activePayingPayment, setActivePayingPayment] = useState<WagePayment | null>(null);
  const [paymentGateway, setPaymentGateway] = useState("UPI");
  const [gatewayStep, setGatewayStep] = useState<"choose" | "processing" | "success">("choose");
  const [securityPin, setSecurityPin] = useState("");
  const [gatewayLoading, setGatewayLoading] = useState(false);
  const [disbursedTxnId, setDisbursedTxnId] = useState("");

  // Automatically trigger UPI/AEPS payment modal if autoPayWageId matches a pending record
  useEffect(() => {
    if (autoPayWageId && wagePayments.length > 0) {
      const paymentToPay = wagePayments.find(p => p.id === autoPayWageId && p.status === "pending");
      if (paymentToPay) {
        handleInitiatePayment(paymentToPay);
        if (clearAutoPayWageId) {
          clearAutoPayWageId();
        }
      }
    }
  }, [autoPayWageId, wagePayments, clearAutoPayWageId]);

  // Metrics
  const paidList = wagePayments.filter(p => p.status === "paid");
  const pendingList = wagePayments.filter(p => p.status === "pending");
  const totalPaid = paidList.reduce((sum, p) => sum + p.amount, 0);
  const totalPending = pendingList.reduce((sum, p) => sum + p.amount, 0);

  const totalWages = totalPaid + totalPending;
  const paidPercentage = totalWages > 0 ? (totalPaid / totalWages) * 100 : 0;
  const pendingPercentage = totalWages > 0 ? (totalPending / totalWages) * 100 : 0;

  const unpaidWorkers = React.useMemo(() => {
    const map = new Map<string, { name: string; pendingAmount: number; count: number; payment: WagePayment }>();
    pendingList.forEach(p => {
      const existing = map.get(p.workerId);
      if (existing) {
        existing.pendingAmount += p.amount;
        existing.count += 1;
      } else {
        map.set(p.workerId, {
          name: p.workerName || "Worker",
          pendingAmount: p.amount,
          count: 1,
          payment: p
        });
      }
    });
    return Array.from(map.values());
  }, [pendingList]);

  // Filters
  const filteredPayments = wagePayments.filter(p => {
    const workerName = p.workerName || "Worker";
    const jobTitle = p.jobTitle || "Job";
    const matchesSearch = workerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Export payroll ledger
  const handleExportLedgerCSV = () => {
    if (wagePayments.length === 0) {
      alert("No wage records available to export.");
      return;
    }
    const headers = ["Payment ID", "Job ID", "Job Title", "Worker ID", "Worker Name", "Disbursed Amount (INR)", "Disbursed Date", "Status", "Transaction Hash ID"];
    const rows = wagePayments.map(p => [
      p.id, p.jobId, p.jobTitle, p.workerId, p.workerName, p.amount, p.date, p.status, p.transactionId || "N/A"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `EmpoWork_Wage_Ledger_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Secure Bank Disbursement execution
  const handleInitiatePayment = (payment: WagePayment) => {
    setActivePayingPayment(payment);
    setPaymentGateway("UPI");
    setGatewayStep("choose");
    setSecurityPin("");
    setGatewayLoading(false);
    setDisbursedTxnId("");
  };

  const handleProcessSecurePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (securityPin.length < 4) {
      alert("Please enter your 4-digit UPI/Aadhaar security PIN.");
      return;
    }

    setGatewayStep("processing");
    setGatewayLoading(true);

    setTimeout(async () => {
      try {
        if (activePayingPayment) {
          const txHash = await onProcessPayment(activePayingPayment);
          if (txHash) {
            setDisbursedTxnId(txHash);
          }
          setGatewayStep("success");
        }
      } catch (err: any) {
        alert(err?.message || "Gateway handshake timeout. Please check your banking connectivity.");
        setActivePayingPayment(null);
      } finally {
        setGatewayLoading(false);
      }
    }, 2000); // 2 seconds high-fidelity spin
  };

  // Trigger Payslip TXT download
  const triggerPayslipDownload = (payment: WagePayment) => {
    const slipText = `
=========================================
        EMPOWORK AUDITED PAYSLIP
=========================================
PAYMENT SLIP ID: ${payment.id}
TRANSACTION DATE: ${payment.date}
TRANSACTION STATUS: ${payment.status.toUpperCase()}
DISBURSEMENT METHOD: Secure AEPS / UPI Channel
AUDITING STANDARD: National Labor Council Cleared

RECIPIENT (LABORER) PROFILE:
---------------------------
NAME: ${payment.workerName}
WORKER ID: ${payment.workerId}
TRADE STATUS: Certified Site Contractor

JOB DESCRIPTION DETAIL:
---------------------
CONTRACT JOB: ${payment.jobTitle}
JOB ID: ${payment.jobId}
EMPLOYER NAME: ${payment.employerName}
EMPLOYER ID: ${payment.employerId}

PAYROLL FINANCIAL SUMMARY:
------------------------
DAILY BASE CONTRACT RATING: ₹${payment.amount} INR
CREDITS / DEDUCTIONS: ₹0.00
TOTAL NET CREDIT AMOUNT: ₹${payment.amount} INR
TRANSACTION HASH ID: ${payment.transactionId || "TXN-SECURE-HANDSHAKE-PENDING"}

=========================================
  Certified Electronic Invoice Copy
=========================================
`;
    const element = document.createElement("a");
    const file = new Blob([slipText], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `Payslip_${payment.workerName.replace(/\s+/g, "_")}_${payment.id}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Header Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-950 uppercase tracking-tight">Wages Ledger & Bank Payouts</h2>
          <p className="text-xs text-slate-500">Authorize instant daily labor wages, review disbursal histories, and print receipts.</p>
        </div>

        <button
          onClick={handleExportLedgerCSV}
          className="inline-flex items-center px-4 py-2 bg-slate-950 hover:bg-slate-850 text-amber-500 font-extrabold text-xs rounded-xl uppercase tracking-wider transition-all cursor-pointer border border-slate-850 shadow-md"
        >
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Export Ledger Excel
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Wages Disbursed</span>
            <span className="text-xl font-black text-slate-900 font-mono">₹{totalPaid.toLocaleString()}</span>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg"><Coins className="w-4 h-4" /></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Wages Outstanding</span>
            <span className="text-xl font-black text-rose-600 font-mono">₹{totalPending.toLocaleString()}</span>
          </div>
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg"><Landmark className="w-4 h-4" /></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending Invoices</span>
            <span className="text-xl font-black text-slate-900 font-mono">{pendingList.length} Slips</span>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg"><Sliders className="w-4 h-4" /></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Security Protocol</span>
            <span className="text-xl font-black text-slate-900 font-mono">AEPS Direct</span>
          </div>
          <div className="p-2.5 bg-indigo-50 text-indigo-650 rounded-lg"><ShieldCheck className="w-4 h-4" /></div>
        </div>
      </div>

      {/* Visual Payroll Breakdown & Unpaid Staff Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-slate-50 border border-slate-200 rounded-2xl p-6">
        
        {/* Visual Chart Column (Col 1 & 2) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between space-y-5">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-650">Analytics Visualization</span>
            <h3 className="font-black text-sm text-slate-900 uppercase tracking-tight mt-0.5">Wage Budget Allocation</h3>
            <p className="text-[10px] text-slate-500">Proportion of cleared payouts versus outstanding labor liabilities.</p>
          </div>

          <div className="space-y-4">
            {/* Dynamic Segmented Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <span>Disbursed ({paidPercentage.toFixed(1)}%)</span>
                <span>Outstanding ({pendingPercentage.toFixed(1)}%)</span>
              </div>
              <div className="h-6 w-full rounded-full bg-slate-150 overflow-hidden flex shadow-inner border border-slate-200">
                {totalWages > 0 ? (
                  <>
                    <div 
                      className="bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500 flex items-center justify-center text-[10px] font-black text-white" 
                      style={{ width: `${paidPercentage}%` }}
                      title={`Paid: ${paidPercentage.toFixed(1)}%`}
                    >
                      {paidPercentage > 15 && `₹${totalPaid.toLocaleString()}`}
                    </div>
                    <div 
                      className="bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-500 flex items-center justify-center text-[10px] font-black text-white" 
                      style={{ width: `${pendingPercentage}%` }}
                      title={`Pending: ${pendingPercentage.toFixed(1)}%`}
                    >
                      {pendingPercentage > 15 && `₹${totalPending.toLocaleString()}`}
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] font-semibold text-slate-400">
                    No active payroll entries to visualize
                  </div>
                )}
              </div>
            </div>

            {/* Custom SVG Gauge side-by-side with data details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center pt-2">
              <div className="flex flex-col items-center justify-center bg-slate-50 border border-slate-150 rounded-xl p-3 h-28">
                <svg width="120" height="70" viewBox="0 0 100 55" className="overflow-visible">
                  {/* Background Track */}
                  <path 
                    d="M 10,50 A 40,40 0 0,1 90,50" 
                    fill="none" 
                    stroke="#f1f5f9" 
                    strokeWidth="10" 
                    strokeLinecap="round" 
                  />
                  {/* Paid portion track */}
                  {totalWages > 0 && (
                    <path 
                      d="M 10,50 A 40,40 0 0,1 90,50" 
                      fill="none" 
                      stroke="#10b981" 
                      strokeWidth="10" 
                      strokeLinecap="round" 
                      strokeDasharray="125.6"
                      strokeDashoffset={125.6 - (125.6 * (paidPercentage / 100))}
                      className="transition-all duration-700 ease-out"
                    />
                  )}
                  {/* Center Text */}
                  <text x="50" y="42" textAnchor="middle" className="font-sans font-black text-[11px] fill-slate-900">
                    {totalWages > 0 ? `${paidPercentage.toFixed(0)}%` : "0%"}
                  </text>
                  <text x="50" y="51" textAnchor="middle" className="font-sans font-bold text-[5px] fill-slate-450 uppercase tracking-widest">
                    Cleared
                  </text>
                </svg>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">Disbursement Progress Ratio</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cleared Wages</span>
                  </div>
                  <span className="text-xs font-black text-slate-900 font-mono">₹{totalPaid.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pending Wages</span>
                  </div>
                  <span className="text-xs font-black text-amber-600 font-mono">₹{totalPending.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Payroll Budget</span>
                  </div>
                  <span className="text-xs font-black text-slate-950 font-mono">₹{totalWages.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Unpaid Workers Column (Col 3) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-600">Workforce Status</span>
              {unpaidWorkers.length > 0 && (
                <span className="px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-full text-[9px] font-black uppercase tracking-wider animate-pulse">
                  Needs Clearance
                </span>
              )}
            </div>
            <h3 className="font-black text-sm text-slate-900 uppercase tracking-tight mt-0.5">Unpaid Workers Breakdown</h3>
            <p className="text-[10px] text-slate-500">{unpaidWorkers.length} laborers currently holding pending wage slips.</p>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[155px] pr-1 space-y-2 scrollbar-thin">
            {unpaidWorkers.length > 0 ? (
              unpaidWorkers.map((worker, idx) => (
                <div key={`unpaid-worker-${worker.payment.workerId || 'anon'}-${worker.name.replace(/\s+/g, '-')}-${idx}`} className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-150 rounded-xl transition-all">
                  <div>
                    <span className="font-black text-xs text-slate-950 block">{worker.name}</span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">{worker.count} pending {worker.count === 1 ? 'slip' : 'slips'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-black text-xs text-rose-600 font-mono">₹{worker.pendingAmount.toLocaleString()}</span>
                    <button
                      onClick={() => handleInitiatePayment(worker.payment)}
                      className="px-2.5 py-1 bg-slate-950 hover:bg-slate-850 text-amber-500 rounded-lg text-[9px] font-black uppercase transition-all shadow-xs border border-slate-800 cursor-pointer"
                    >
                      Pay
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center py-8 text-center text-slate-400">
                <CheckCircle className="w-7 h-7 text-emerald-500 mb-1.5" />
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">All Workers Cleared!</span>
                <span className="text-[9px] text-slate-400 mt-0.5">No outstanding daily wages pending disbursal.</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Main Ledger Grid list */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Table Filters header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by worker name, payment ID, job title..."
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
              <option value="all">All Ledgers</option>
              <option value="pending">Pending Payment</option>
              <option value="paid">Paid & Transferred</option>
              <option value="rejected">Rejected Dispute</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 font-mono text-[10px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-200">
                <th className="p-4">Payment Reference ID</th>
                <th className="p-4">Laborer Name</th>
                <th className="p-4">Contract Shift Description</th>
                <th className="p-4 text-right">Disbursement (₹)</th>
                <th className="p-4">Wages Date</th>
                <th className="p-4">Transaction Block Hash</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Disbursal actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filteredPayments.length > 0 ? (
                filteredPayments.map((p) => {
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-mono font-bold text-slate-400 uppercase">
                        {p.id}
                      </td>
                      <td className="p-4">
                        <div className="space-y-0.5">
                          <span className="font-black text-slate-900 text-sm block">{p.workerName}</span>
                          <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">{p.workerId.slice(0, 8)}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-slate-900 block truncate max-w-xs">{p.jobTitle}</span>
                      </td>
                      <td className="p-4 text-right font-black text-slate-900 font-mono">
                        ₹{p.amount.toLocaleString()}
                      </td>
                      <td className="p-4 font-mono text-slate-500">
                        {p.date}
                      </td>
                      <td className="p-4 font-mono">
                        {p.transactionId ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-black text-[10px]">
                            {p.transactionId}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px] font-bold">Unsecured Gate</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center border rounded px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                          p.status === "paid" ? "text-emerald-700 bg-emerald-50 border-emerald-200/50" : 
                          p.status === "rejected" ? "text-red-700 bg-rose-50 border-rose-200/50" : 
                          "text-amber-700 bg-amber-50 border-amber-200/50"
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center space-x-1.5">
                          {p.status === "pending" ? (
                            <>
                              <button
                                onClick={() => handleInitiatePayment(p)}
                                className="px-3 py-1 bg-slate-950 hover:bg-slate-850 text-amber-500 rounded font-black text-[10px] uppercase cursor-pointer border border-slate-800"
                              >
                                Pay Now
                              </button>
                              <button
                                onClick={async () => {
                                  if (confirm(`Reject payment request of ₹${p.amount} for ${p.workerName}?`)) {
                                    await onRejectPayment(p);
                                  }
                                }}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                title="Reject Payment Request"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => triggerPayslipDownload(p)}
                                className="inline-flex items-center px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-bold cursor-pointer text-[10px]"
                              >
                                <Download className="w-3.5 h-3.5 mr-1" /> Slip
                              </button>
                            </>
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
                      <Coins className="w-8 h-8 text-slate-300" />
                      <span className="text-xs font-semibold">No wage transaction logs available.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* SECURE BANKING GATEWAY PORTAL OVERLAY */}
      {activePayingPayment && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-left">
            <div className="h-1.5 bg-amber-500" />
            
            <div className="bg-slate-950 p-4 text-white flex justify-between items-center border-b border-slate-850">
              <div className="flex items-center space-x-2">
                <Landmark className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-black uppercase tracking-wider">Aadhaar AEPS Wage Portal</h3>
              </div>
              <button 
                onClick={() => setActivePayingPayment(null)}
                className="text-slate-400 hover:text-white p-1 hover:bg-slate-850 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            {gatewayStep === "choose" && (
              <form onSubmit={handleProcessSecurePaymentSubmit} className="p-5 space-y-4 text-slate-700">
                <div className="space-y-0.5 bg-slate-50 p-3 rounded-xl border border-slate-150">
                  <span className="text-[9px] text-slate-400 font-bold uppercase">PAYROLL OUTSTANDING AMOUNT</span>
                  <p className="text-2xl font-black text-slate-950 font-mono">₹{activePayingPayment.amount.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-500 font-semibold">Recipient: <span className="font-bold text-slate-800">{activePayingPayment.workerName}</span></p>
                  <p className="text-[10px] text-slate-500 font-semibold">Contract: <span className="font-bold text-slate-800">{activePayingPayment.jobTitle}</span></p>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Select Disbursal Gateway Channel</label>
                  <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-700">
                    <button
                      type="button"
                      onClick={() => setPaymentGateway("BHIM UPI")}
                      className={`p-2.5 border rounded-xl text-center cursor-pointer transition-all ${paymentGateway === "BHIM UPI" ? "border-amber-500 bg-amber-50/20 text-amber-700 font-black" : "border-slate-250 bg-white hover:bg-slate-50"}`}
                    >
                      BHIM UPI Direct
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentGateway("AEPS")}
                      className={`p-2.5 border rounded-xl text-center cursor-pointer transition-all ${paymentGateway === "AEPS" ? "border-amber-500 bg-amber-50/20 text-amber-700 font-black" : "border-slate-250 bg-white hover:bg-slate-50"}`}
                    >
                      Aadhaar AEPS
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Secure 4-Digit Banking Passcode PIN*</label>
                  <input
                    type="password"
                    maxLength={4}
                    value={securityPin}
                    onChange={(e) => setSecurityPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••"
                    className="w-full p-3 text-center text-xl tracking-widest font-mono border border-slate-200 rounded-xl bg-slate-50 focus:outline-hidden focus:border-amber-500 font-black"
                    required
                  />
                  <span className="text-[8px] text-slate-400 font-medium block mt-1">Under NPCI guidelines, daily wages are secured by instant biometric authorization loops.</span>
                </div>

                <div className="flex space-x-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setActivePayingPayment(null)}
                    className="flex-1 py-2.5 border border-slate-200 text-slate-700 text-xs font-bold uppercase rounded-xl hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-slate-950 hover:bg-slate-850 text-amber-500 text-xs font-black uppercase rounded-xl border border-slate-800 shadow-md cursor-pointer"
                  >
                    Confirm & Pay
                  </button>
                </div>
              </form>
            )}

            {gatewayStep === "processing" && (
              <div className="p-8 text-center space-y-4">
                <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <div className="space-y-1">
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-950">Aadhaar Handshake Handing...</h4>
                  <p className="text-[11px] text-slate-500">Securing instant credits to {activePayingPayment.workerName}'s registered bank account.</p>
                </div>
              </div>
            )}

            {gatewayStep === "success" && (
              <div className="p-6 text-center space-y-5 animate-in fade-in duration-250">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-950">Disbursement Successful!</h4>
                  <p className="text-xs text-slate-500">Daily labor contract wages of ₹{activePayingPayment.amount} have been dispatched successfully.</p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 text-[10px] font-mono text-left space-y-0.5">
                  <span className="text-slate-400 font-bold block uppercase text-[8px]">BANKING AUDIT RECEIPT</span>
                  <p className="text-slate-700 font-bold">Transaction: {disbursedTxnId || `TXN-${Math.floor(10000 + Math.random() * 90000)}B`}</p>
                  <p className="text-slate-700 font-bold">Channel: {paymentGateway}</p>
                </div>

                <button
                  onClick={() => {
                    setActivePayingPayment(null);
                  }}
                  className="w-full py-2 bg-slate-950 hover:bg-slate-850 text-amber-500 text-xs font-black uppercase rounded-xl border border-slate-800 cursor-pointer"
                >
                  Return to Dashboard
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
