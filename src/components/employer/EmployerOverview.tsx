import React from "react";
import { 
  LayoutDashboard, Briefcase, FileText, UserCheck, CheckCircle2, 
  Coins, Clock, ShieldAlert, Star, TrendingUp, Users, ArrowUpRight
} from "lucide-react";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from "recharts";
import { Job, JobApplication, AttendanceRecord, WagePayment, Complaint, UserProfile } from "../../types";
import WorkerLifecycleFlowchart from "../WorkerLifecycleFlowchart";

interface EmployerOverviewProps {
  user?: UserProfile;
  jobs: Job[];
  applications: JobApplication[];
  attendance: AttendanceRecord[];
  payments: WagePayment[];
  complaints: Complaint[];
  companyRating: number;
}

export default function EmployerOverview({
  user,
  jobs = [],
  applications = [],
  attendance = [],
  payments = [],
  complaints = [],
  companyRating = 4.8
}: EmployerOverviewProps) {

  // Compute metrics
  const activeJobs = jobs.filter(j => j.status === "open" || j.status === "active").length;
  const totalApps = applications.length;
  const hiredWorkers = applications.filter(a => a.status === "accepted").length;
  const completedJobs = jobs.filter(j => j.status === "completed").length;
  const pendingPayments = payments.filter(p => p.status === "pending").length;
  const todayStr = new Date().toISOString().split("T")[0];
  const todayAttendance = attendance.filter(a => a.date === todayStr).length;
  const openComplaints = complaints.filter(c => c.status === "open" || c.status === "investigating").length;

  // Recharts Seed Data
  const payrollTrendData = [
    { name: "Mon", amount: 4800 },
    { name: "Tue", amount: 5600 },
    { name: "Wed", amount: 7200 },
    { name: "Thu", amount: 6400 },
    { name: "Fri", amount: 8500 },
    { name: "Sat", amount: 9200 },
    { name: "Sun", amount: 4100 },
  ];

  // Applications by trade breakdown
  const tradesMap: Record<string, number> = {};
  applications.forEach(a => {
    const trade = a.workerTrade || "General Worker";
    tradesMap[trade] = (tradesMap[trade] || 0) + 1;
  });
  if (Object.keys(tradesMap).length === 0) {
    tradesMap["Mason"] = 5;
    tradesMap["Carpenter"] = 3;
    tradesMap["Plumber"] = 4;
    tradesMap["Electrician"] = 2;
  }
  const appPieData = Object.entries(tradesMap).map(([name, value]) => ({ name, value }));

  // Shift Completion Data
  const shiftsBarData = [
    { name: "Week 1", completed: 12, target: 15 },
    { name: "Week 2", completed: 18, target: 20 },
    { name: "Week 3", completed: 22, target: 25 },
    { name: "Week 4", completed: 30, target: 30 },
  ];

  const PIE_COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#64748b"];

  const kpis = [
    { id: "kpi-1", title: "Active Job Posts", value: activeJobs, desc: "Recruiting now", icon: Briefcase, color: "text-amber-600 bg-amber-50" },
    { id: "kpi-2", title: "Total Applications", value: totalApps, desc: "Across all slots", icon: FileText, color: "text-blue-600 bg-blue-50" },
    { id: "kpi-3", title: "Workers Hired", value: hiredWorkers, desc: "On active shifts", icon: UserCheck, color: "text-emerald-600 bg-emerald-50" },
    { id: "kpi-4", title: "Jobs Completed", value: completedJobs, desc: "Archived assignments", icon: CheckCircle2, color: "text-indigo-600 bg-indigo-50" },
    { id: "kpi-5", title: "Pending Payments", value: pendingPayments, desc: "Awaiting approval", icon: Coins, color: "text-red-600 bg-red-50" },
    { id: "kpi-6", title: "Today's Attendance", value: todayAttendance, desc: "Checked-in workers", icon: Clock, color: "text-teal-600 bg-teal-50" },
    { id: "kpi-7", title: "Open Disputes", value: openComplaints, desc: "Needs mediation", icon: ShieldAlert, color: "text-orange-600 bg-orange-50" },
    { id: "kpi-8", title: "Company Rating", value: companyRating.toFixed(1), desc: "Average stars", icon: Star, color: "text-yellow-600 bg-yellow-50" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Top Header Greetings */}
      <div>
        <h2 className="text-xl font-black text-slate-950 uppercase tracking-tight">Overview Dashboard</h2>
        <p className="text-xs text-slate-500">Real-time construction operations, site safety logs, and payment summary.</p>
      </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div 
              key={kpi.id} 
              id={kpi.id}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-start justify-between hover:shadow-md hover:border-slate-300/80 transition-all duration-200"
            >
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{kpi.title}</span>
                <div className="flex items-baseline space-x-1">
                  <span className="text-2xl font-black text-slate-900 leading-none">{kpi.value}</span>
                </div>
                <span className="text-[10px] text-slate-500 font-semibold block">{kpi.desc}</span>
              </div>
              <div className={`p-3 rounded-xl ${kpi.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* 9-Step Contract and Payment Lifecycle Flowchart */}
      <div className="mt-4">
        <WorkerLifecycleFlowchart
          user={user || { uid: "employer", name: "Contractor" } as any}
          applications={applications}
          attendance={attendance}
          wagePayments={payments}
        />
      </div>

      {/* Recharts Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* area chart for wages trend */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-xs font-black text-slate-950 uppercase tracking-wider">Wage Expenses Trend (₹)</h3>
              <p className="text-[10px] text-slate-400">Daily labor payroll disbursement logs</p>
            </div>
            <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <TrendingUp className="w-3 h-3" />
              <span>+14.2%</span>
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={payrollTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} fontStyle="bold" />
                <YAxis stroke="#94a3b8" fontSize={10} fontStyle="bold" />
                <Tooltip contentStyle={{ fontSize: 11, fontWeight: "bold", borderRadius: 8, borderColor: "#e2e8f0" }} />
                <Area type="monotone" dataKey="amount" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* pie chart for applications trade breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="space-y-0.5">
            <h3 className="text-xs font-black text-slate-950 uppercase tracking-wider">Candidate Trade Shares</h3>
            <p className="text-[10px] text-slate-400">Applications count split by trades</p>
          </div>
          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={appPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {appPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 10, borderRadius: 6 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-600">
            {appPieData.map((item, index) => (
              <div key={item.name} className="flex items-center space-x-1.5 truncate">
                <span className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                <span className="truncate">{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* weekly shift completion bar chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs lg:col-span-3 space-y-4">
          <div className="space-y-0.5">
            <h3 className="text-xs font-black text-slate-950 uppercase tracking-wider">Labor Shifts Retention Rates</h3>
            <p className="text-[10px] text-slate-400">Shift completion ratios compared to targets</p>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={shiftsBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} fontStyle="bold" />
                <YAxis stroke="#94a3b8" fontSize={10} fontStyle="bold" />
                <Tooltip contentStyle={{ fontSize: 10 }} />
                <Legend wrapperStyle={{ fontSize: 10, fontWeight: "bold" }} />
                <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} name="Shifts Completed" />
                <Bar dataKey="target" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="Projected Targets" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Latest Activity Timeline Feed */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
        <div className="space-y-1">
          <h3 className="text-xs font-black text-slate-950 uppercase tracking-wider">Recent Project Site Logs</h3>
          <p className="text-[11px] text-slate-500">Live operational updates and audit stream across checking gates.</p>
        </div>

        <div className="relative border-l border-slate-100 pl-4 space-y-6">
          <div className="relative">
            <span className="absolute -left-[21px] top-1.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
            <div className="space-y-0.5 text-xs">
              <p className="font-bold text-slate-900">Ramesh Kumar (Mason) Checked-in at Site Alpha</p>
              <p className="text-[10px] text-slate-500">Verified via Site Attendance QR | Geolocation Checked (Accurate)</p>
              <span className="text-[9px] font-mono text-slate-400 font-bold uppercase">10 Minutes Ago</span>
            </div>
          </div>
          <div className="relative">
            <span className="absolute -left-[21px] top-1.5 w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white" />
            <div className="space-y-0.5 text-xs">
              <p className="font-bold text-slate-900">Amit Patel submitted application for General labor contract</p>
              <p className="text-[10px] text-slate-500">Awaiting recruiter interview scheduling</p>
              <span className="text-[9px] font-mono text-slate-400 font-bold uppercase">1 Hour Ago</span>
            </div>
          </div>
          <div className="relative">
            <span className="absolute -left-[21px] top-1.5 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white" />
            <div className="space-y-0.5 text-xs">
              <p className="font-bold text-slate-900">Wages disbursement of ₹1,200 approved</p>
              <p className="text-[10px] text-slate-500">Transaction ID: TXN-501A9 secured. Payslip generated.</p>
              <span className="text-[9px] font-mono text-slate-400 font-bold uppercase">Today, 9:30 AM</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
