import React from "react";
import { 
  UserPlus, LogIn, Search, FileText, Eye, Handshake, QrCode, Calculator, Coins, Check, ArrowRight
} from "lucide-react";
import { motion } from "motion/react";
import { UserProfile, JobApplication, AttendanceRecord, WagePayment } from "../types";

interface WorkerLifecycleFlowchartProps {
  user: UserProfile;
  applications: JobApplication[];
  attendance: AttendanceRecord[];
  wagePayments: WagePayment[];
}

export default function WorkerLifecycleFlowchart({
  user,
  applications = [],
  attendance = [],
  wagePayments = []
}: WorkerLifecycleFlowchartProps) {
  // Determine statuses dynamically
  const isRegistered = true;
  const isLoggedIn = true;
  const isSearchJobs = true;
  const isApplied = applications.length > 0;
  const isReviewed = applications.some(app => app.status !== "pending");
  const isHired = applications.some(app => app.status === "accepted");
  const isAttended = attendance.length > 0;
  const isWageCalculated = wagePayments.length > 0;
  const isPaid = wagePayments.some(p => p.status === "paid");

  // Define steps
  const steps = [
    { 
      id: 1, 
      label: "Worker Registers", 
      desc: "Profile setup on EmpoWork platform with trade, experience, and Aadhaar validation.",
      completed: isRegistered, 
      active: false,
      icon: UserPlus,
      hint: "Your digital identity has been verified."
    },
    { 
      id: 2, 
      label: "Worker Logs In", 
      desc: "Secure login session. Profile visibility is broadcasted to verified local general contractors.",
      completed: isLoggedIn, 
      active: false,
      icon: LogIn,
      hint: "Secure session active."
    },
    { 
      id: 3, 
      label: "Search Jobs", 
      desc: "Explore geo-targeted construction and carpentry job listings tailored to your specific trade.",
      completed: isSearchJobs, 
      active: !isApplied,
      icon: Search,
      hint: "Navigate to the 'Search Jobs' tab to find opportunities near you."
    },
    { 
      id: 4, 
      label: "Apply Job", 
      desc: "Submit your instant digital application to contractors with pro-rated wage expectation details.",
      completed: isApplied, 
      active: isApplied && !isReviewed,
      icon: FileText,
      hint: "Apply for a job to begin your contract lifecycle."
    },
    { 
      id: 5, 
      label: "Employer Reviews", 
      desc: "Employer reviews application, ratings, previous work history, and certificates.",
      completed: isReviewed, 
      active: isApplied && isReviewed && !isHired,
      icon: Eye,
      hint: "Employer is auditing your verified profile."
    },
    { 
      id: 6, 
      label: "Worker Hired", 
      desc: "Contractor hires you for the job. You are issued an official labor agreement with a safe wage mandate.",
      completed: isHired, 
      active: isHired && !isAttended,
      icon: Handshake,
      hint: "Congratulations! You have been contracted. Check-in on site using QR scanner."
    },
    { 
      id: 7, 
      label: "Attendance Recorded", 
      desc: "Site foreman authorizes check-in and check-out times with PPE gear security audits.",
      completed: isAttended, 
      active: isAttended && !isWageCalculated,
      icon: QrCode,
      hint: "Clock-in daily to log work hours."
    },
    { 
      id: 8, 
      label: "Wage Calculated", 
      desc: "Employer approves shift attendance. Pro-rated wages are calculated automatically based on hours.",
      completed: isWageCalculated, 
      active: isWageCalculated && !isPaid,
      icon: Calculator,
      hint: "Wages verified and queued in smart escrow. Payment is pending."
    },
    { 
      id: 9, 
      label: "Payment History Updated", 
      desc: "Employer releases wages. Instant transfer is completed to bank account, and savings goals are updated.",
      completed: isPaid, 
      active: isPaid,
      icon: Coins,
      hint: "Earnings safely credited and logged in transaction history."
    }
  ];

  // Current milestone is the first incomplete step, or the last step if all complete
  const currentStepIndex = steps.findIndex(s => !s.completed);
  const currentStep = currentStepIndex === -1 ? steps[steps.length - 1] : steps[currentStepIndex];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center">
            <Handshake className="w-5 h-5 text-indigo-600 mr-2 shrink-0" />
            Labor Contract Lifecycle & Payment Flowchart
          </h2>
          <p className="text-xs text-slate-500">Real-time status tracking from your registration to instant bank wage disbursements</p>
        </div>
        <div className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 flex items-center gap-2 self-start sm:self-auto shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-wider font-mono text-slate-700">
            Current Stage: {currentStep.label}
          </span>
        </div>
      </div>

      {/* Grid for Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-9 gap-4 md:gap-2">
        {steps.map((step, idx) => {
          const StepIcon = step.icon;
          const isCurrent = step.id === currentStep.id;
          const isDone = step.completed;
          
          return (
            <div key={step.id} className="relative flex lg:flex-col items-center lg:items-start p-3 lg:p-2 bg-slate-50 lg:bg-transparent rounded-xl border lg:border-none border-slate-100">
              {/* Connector line for large screens */}
              {idx < steps.length - 1 && (
                <div className="hidden lg:block absolute left-10 top-5 w-full h-0.5 bg-slate-200 z-0">
                  <div 
                    className="h-full bg-indigo-600 transition-all duration-300"
                    style={{ width: isDone ? "100%" : "0%" }}
                  />
                </div>
              )}

              {/* Icon Circle */}
              <div className="flex items-center justify-center shrink-0 z-10 mr-4 lg:mr-0">
                <div className={`w-10 h-10 rounded-full border flex items-center justify-center shadow-3xs transition-all duration-300 ${
                  isDone 
                    ? "bg-indigo-600 border-indigo-600 text-white" 
                    : isCurrent 
                    ? "bg-amber-50 border-amber-400 text-amber-700 animate-pulse" 
                    : "bg-white border-slate-200 text-slate-400"
                }`}>
                  {isDone ? (
                    <Check className="w-5 h-5 stroke-[3]" />
                  ) : (
                    <StepIcon className="w-4 h-4" />
                  )}
                </div>
              </div>

              {/* Text content */}
              <div className="mt-0 lg:mt-3 flex-1">
                <span className="text-[10px] font-black text-slate-400 block font-mono">STEP {step.id}</span>
                <span className={`text-[11px] font-black uppercase tracking-tight block ${
                  isDone ? "text-indigo-950 font-black" : isCurrent ? "text-amber-700 font-black" : "text-slate-500"
                }`}>
                  {step.label}
                </span>
                <span className="text-[9px] text-slate-400 font-medium block leading-snug mt-0.5 hidden lg:line-clamp-3" title={step.desc}>
                  {step.desc}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Guidance panel based on current state */}
      <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[9px] font-black uppercase tracking-widest text-indigo-700 block font-mono">NEXT ACTION REQUIRED</span>
          <p className="text-xs font-black text-slate-900 uppercase tracking-tight">
            {currentStep.hint}
          </p>
          <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
            {currentStep.desc}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-1.5 bg-white border border-indigo-100 px-3 py-1.5 rounded-lg text-xs font-black text-indigo-700 uppercase tracking-wider font-mono">
          Stage {currentStep.id} of 9
          <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
        </div>
      </div>
    </div>
  );
}
