import React, { useState } from "react";
import { HelpCircle, ChevronDown, User, Building, Info, Star, Shield, Landmark } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  icon?: React.ReactNode;
}

export default function HelpFAQ() {
  const [activeTab, setActiveTab] = useState<"worker" | "builder">("worker");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const workerFAQs: FAQItem[] = [
    {
      id: "w1",
      question: "How do I register my trade skills on EmpoWork?",
      answer: "Click 'Enter Portal Hub' on the homepage, log in or register, and choose the 'Worker' role. You can input your specific trade (e.g., Mason, Carpenter, Electrician, Painter, or Helper), years of experience, and daily wage expectations. You can also use our integrated AI Profile Builder to write a professional bio that highlights your strengths to prospective builders.",
      icon: <User className="w-4 h-4 text-emerald-400" />
    },
    {
      id: "w2",
      question: "How do I log my daily attendance and start a shift?",
      answer: "Once an employer accepts your job application, the job will appear in your Active/Approved list on your Worker Dashboard. On-site, simply click 'Check-In' to log your daily attendance with a single click. This creates a secure, real-time log that shows your employer and welfare auditors that you are on the site.",
      icon: <Info className="w-4 h-4 text-emerald-400" />
    },
    {
      id: "w3",
      question: "How do I receive my daily wages?",
      answer: "Wages are released digitally by employers right after your shift ends. You can view all settled amounts, download transaction receipts, and monitor your total earnings inside the Worker Dashboard. You can also use the integrated 'Savings Goal Tracker' to set aside portion of your daily earnings for personal milestones.",
      icon: <Landmark className="w-4 h-4 text-emerald-400" />
    },
    {
      id: "w4",
      question: "What is the star rating system on my profile?",
      answer: "Upon completing a job assignment, the builder contractor can leave an official rating (from 1 to 5 stars) and a commendation review. Your average rating is displayed publicly on your digital profile card. Higher ratings increase your credibility and make it much easier to secure higher-paying jobs on the site.",
      icon: <Star className="w-4 h-4 text-emerald-400" />
    },
    {
      id: "w5",
      question: "What should I do if my builder refuses to pay or releases the wrong wage?",
      answer: "Transparency is our highest priority. If you encounter any unfair practices, navigate to the 'Complaints' tab in your Worker Dashboard and file a formal grievance. A Welfare Admin (Govt/NGO Officer) will review the digital attendance records, chat logs, and utilize Gemini AI recommendations to mediate and resolve the dispute.",
      icon: <Shield className="w-4 h-4 text-emerald-400" />
    }
  ];

  const builderFAQs: FAQItem[] = [
    {
      id: "b1",
      question: "How do I post a construction or site job opening?",
      answer: "Register or log in as an 'Employer/Contractor'. On your Employer Dashboard, click 'Post New Job'. You can input details like project location, construction specialty needed, number of daily workers required, and the daily transparent wage rate (in ₹ per shift). Once posted, verified local workers can apply immediately.",
      icon: <Building className="w-4 h-4 text-indigo-400" />
    },
    {
      id: "b2",
      question: "How does worker check-in and attendance auditing work?",
      answer: "Workers log their check-ins from their own mobile phones once they arrive at the site. Your dashboard's 'Active Shifts' section provides a real-time digital roll call of who is on-site. This eliminates manual register logging and prevents timesheet fraud.",
      icon: <Info className="w-4 h-4 text-indigo-400" />
    },
    {
      id: "b3",
      question: "How do I release daily wage payments?",
      answer: "After verifying a worker's shift attendance, you can release their daily wage with a single click. This creates a secure, tamper-proof smart transaction. Welfare officers track these releases to ensure legal minimum wage compliance and timely payouts.",
      icon: <Landmark className="w-4 h-4 text-indigo-400" />
    },
    {
      id: "b4",
      question: "Why should I rate my workers after completing the job assignment?",
      answer: "Leaving a Star Rating and short feedback helps build a robust digital resume for local laborers. It highlights punctual and skilled workers, creating a trustworthy talent pool for your future construction projects. It also motivates workers to deliver high-quality craftsmanship.",
      icon: <Star className="w-4 h-4 text-indigo-400" />
    },
    {
      id: "b5",
      question: "Are there tools to resolve site disputes or worker complaints?",
      answer: "Yes. If a complaint is lodged, it is forwarded to the Welfare Admin Portal. Welfare officers can inspect the transparent digital trail (attendance timestamps, job contracts, wage history) and leverage Gemini-guided neutral mediation to settle disputes quickly and legally.",
      icon: <Shield className="w-4 h-4 text-indigo-400" />
    }
  ];

  const faqs = activeTab === "worker" ? workerFAQs : builderFAQs;

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 md:p-8 backdrop-blur-md max-w-5xl mx-auto shadow-xl space-y-6">
      
      {/* FAQ Header */}
      <div className="flex flex-col items-center text-center space-y-2">
        <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-400 border border-amber-500/20 mb-1">
          <HelpCircle className="w-5 h-5" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
          Help & Frequently Asked Questions
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-lg">
          Need assistance? Explore clear guides for daily-wage workers and construction builders using the platform.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center">
        <div className="inline-flex bg-slate-950 p-1 rounded-xl border border-slate-800/80">
          <button
            onClick={() => {
              setActiveTab("worker");
              setExpandedId(null);
            }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "worker"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>For Local Workers</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("builder");
              setExpandedId(null);
            }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "builder"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>For Builder Employers</span>
          </button>
        </div>
      </div>

      {/* FAQs List */}
      <div className="space-y-3 max-w-3xl mx-auto pt-2">
        {faqs.map((faq) => {
          const isExpanded = expandedId === faq.id;
          return (
            <div
              key={faq.id}
              className={`border rounded-xl transition-all duration-200 overflow-hidden ${
                isExpanded
                  ? activeTab === "worker"
                    ? "bg-slate-900/80 border-emerald-500/40 shadow-xs"
                    : "bg-slate-900/80 border-indigo-500/40 shadow-xs"
                  : "bg-slate-900/30 border-slate-800/80 hover:border-slate-700"
              }`}
            >
              <button
                onClick={() => toggleExpand(faq.id)}
                className="w-full flex items-center justify-between p-4 text-left font-bold text-sm text-white focus:outline-hidden cursor-pointer"
              >
                <div className="flex items-center space-x-3 pr-4">
                  <div className={`p-1.5 rounded-lg ${
                    activeTab === "worker" ? "bg-emerald-500/10" : "bg-indigo-500/10"
                  } shrink-0`}>
                    {faq.icon}
                  </div>
                  <span className="text-xs sm:text-sm font-black tracking-tight uppercase text-slate-100">
                    {faq.question}
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                  >
                    <div className="px-4 pb-4 pt-1 border-t border-slate-800/50 text-xs sm:text-[13px] text-slate-300 leading-relaxed pl-12 font-medium">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Mini Support banner */}
      <div className="text-center pt-4 max-w-xl mx-auto">
        <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/60 flex items-center justify-center space-x-3">
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shrink-0" />
          <p className="text-[10px] sm:text-xs text-slate-400 font-mono uppercase tracking-wider">
            EmpoWork Help Desk Online: Support is available in English, Hindi, and Kannada
          </p>
        </div>
      </div>
    </div>
  );
}
