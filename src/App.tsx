/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Briefcase, Shield, User, Building, ArrowRight, CheckCircle, 
  Sparkles, Globe, ShieldAlert, Award, MessageCircle, HelpCircle, HardHat,
  Calendar, BookOpen, Copy, LayoutDashboard, FileText, Coins, Wrench, Bell, Settings, LogOut,
  Users, ShieldCheck, Brain, Database, ChevronDown, Check, Search, X, Clock, MessageSquare, Sliders
} from "lucide-react";
import Navbar from "./components/Navbar";
import AuthModal from "./components/AuthModal";
import WorkerDashboard from "./components/WorkerDashboard";
import EmployerDashboard from "./components/EmployerDashboard";
import AdminDashboard from "./components/AdminDashboard";
import ThreeDBackground from "./components/ThreeDBackground";
import IndustrialHubTools from "./components/IndustrialHubTools";
import Logo from "./components/Logo";
import HelpFAQ from "./components/HelpFAQ";
import { UserProfile, UserRole } from "./types";
import { seedInitialDatabase } from "./lib/firebase";
import { useLanguage, LanguageCode } from "./context/LanguageContext";
import OnboardingTour, { ReplayTourButton } from "./components/OnboardingTour";
import { AdminDataProvider } from "./context/AdminDataContext";

export default function App() {
  const { language, setLanguage, t } = useLanguage();
  const [showSidebarLangDropdown, setShowSidebarLangDropdown] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [copied, setCopied] = useState(false);
  const [menuSearchQuery, setMenuSearchQuery] = useState("");
  const mainRef = useRef<HTMLElement>(null);

  const filterMenuItem = (label: string, desc: string = "") => {
    if (!menuSearchQuery.trim()) return true;
    const query = menuSearchQuery.toLowerCase().trim();
    return label.toLowerCase().includes(query) || desc.toLowerCase().includes(query);
  };

  const visibleWorkerItemsCount = user?.role === "worker" ? [
    { label: t("dashboard"), desc: t("dashboardDesc") },
    { label: t("myProfile"), desc: t("myProfileDesc") },
    { label: t("findJobs"), desc: t("findJobsDesc") },
    { label: t("myApplications"), desc: t("myApplicationsDesc") },
    { label: t("attendance"), desc: t("attendanceDesc") },
    { label: t("myEarnings"), desc: t("myEarningsDesc") },
    { label: t("skillDevelopment"), desc: t("skillDevelopmentDesc") },
    { label: t("myTools"), desc: t("myToolsDesc") },
    { label: t("notifications"), desc: t("notificationsDesc") },
    { label: t("complaintsSupport"), desc: t("complaintsSupportDesc") },
    { label: t("settings"), desc: t("settingsDesc") },
    { label: t("logout"), desc: t("logoutDesc") }
  ].filter(item => filterMenuItem(item.label, item.desc)).length : 0;

  const visibleAdminItemsCount = user?.role === "admin" ? [
    { label: t("platformOverview"), desc: t("platformOverviewDesc") },
    { label: "User Management", desc: "View & edit registries" },
    { label: "Registrants & ID", desc: "Verify background credentials" },
    { label: "Jobs & Applications", desc: "Moderate daily-wage vacancies" },
    { label: "Attendance & Payroll", desc: "Track shifts & release funds" },
    { label: "AI Disputes Mediation", desc: t("platformDisputesDesc") },
    { label: "Deduplication & Settings", desc: "Audit duplicate entries" },
    { label: "Logs & Broadcasts", desc: "View security audit logs" }
  ].filter(item => filterMenuItem(item.label, item.desc)).length : 0;

  const visibleEmployerItemsCount = user?.role === "employer" ? [
    { label: t("dashboard"), desc: t("dashboardDesc") },
    { label: "Company Profile", desc: "Edit company details" },
    { label: t("manageJobs"), desc: t("manageJobsDesc") },
    { label: "Recruitment & Hiring", desc: t("reviewApplicationsDesc") },
    { label: "Attendance Management", desc: "Track site attendance" },
    { label: "Wage & Payments", desc: "Disburse wages" },
    { label: "Messages", desc: "Chat with site workers" },
    { label: "Activity & Reports", desc: "View site activity logs" },
    { label: t("complaintsSupport"), desc: t("complaintsSupportDesc") },
    { label: t("settings"), desc: t("settingsDesc") }
  ].filter(item => filterMenuItem(item.label, item.desc)).length : 0;

  const workerMenuItems = [
    {
      id: "tour-worker-dashboard",
      tab: "worker-dashboard",
      label: t("dashboard"),
      desc: t("dashboardDesc"),
      icon: LayoutDashboard
    },
    {
      id: "tour-worker-profile",
      tab: "worker-profile",
      label: t("myProfile"),
      desc: t("myProfileDesc"),
      icon: User
    },
    {
      id: "tour-find-jobs",
      tab: "jobs",
      label: t("findJobs"),
      desc: t("findJobsDesc"),
      icon: Briefcase
    },
    {
      id: "tour-worker-applications",
      tab: "worker-applications",
      label: t("myApplications"),
      desc: t("myApplicationsDesc"),
      icon: FileText
    },
    {
      id: "tour-check-in",
      tab: "attendance",
      label: t("attendance"),
      desc: t("attendanceDesc"),
      icon: Calendar
    },
    {
      id: "tour-worker-earnings",
      tab: "worker-earnings",
      label: t("myEarnings"),
      desc: t("myEarningsDesc"),
      icon: Coins
    },
    {
      id: "tour-skills",
      tab: "skills",
      label: t("skillDevelopment"),
      desc: t("skillDevelopmentDesc"),
      icon: BookOpen
    },
    {
      id: "tour-worker-tools",
      tab: "worker-tools",
      label: t("myTools"),
      desc: t("myToolsDesc"),
      icon: Wrench
    },
    {
      id: "tour-worker-notifications",
      tab: "worker-notifications",
      label: t("notifications"),
      desc: t("notificationsDesc"),
      icon: Bell
    },
    {
      id: "tour-complaints",
      tab: "complaints",
      label: t("complaintsSupport"),
      desc: t("complaintsSupportDesc"),
      icon: ShieldAlert
    },
    {
      id: "tour-worker-settings",
      tab: "worker-settings",
      label: t("settings"),
      desc: t("settingsDesc"),
      icon: Settings
    }
  ];

  const employerMenuItems = [
    {
      id: "tour-employer-dashboard",
      tab: "employer-dashboard",
      label: t("dashboard"),
      desc: t("dashboardDesc"),
      icon: LayoutDashboard
    },
    {
      id: "tour-company-profile",
      tab: "company-profile",
      label: language === "hi" ? "कंपनी प्रोफ़ाइल" : language === "kn" ? "ಕಂಪನಿ ಪ್ರೊಫೈಲ್" : language === "te" ? "కంపెనీ ప్రొఫైల్" : "Company Profile",
      desc: language === "hi" ? "कंपनी क्रेडेंशियल्स संपादित करें" : "Edit company details",
      icon: Building
    },
    {
      id: "tour-employer-jobs",
      tab: "employer-jobs",
      label: t("manageJobs"),
      desc: t("manageJobsDesc"),
      icon: Briefcase
    },
    {
      id: "tour-employer-workers",
      tab: "employer-workers",
      label: language === "hi" ? "भर्ती और काम पर रखना" : language === "kn" ? "ನೇಮಕಾತಿ ಮತ್ತು ಬಾಡಿಗೆ" : language === "te" ? "రిక్రూట్‌మెంట్ & హైరింగ్" : "Recruitment & Hiring",
      desc: t("reviewApplicationsDesc"),
      icon: Users
    },
    {
      id: "tour-employer-attendance",
      tab: "employer-attendance",
      label: language === "hi" ? "उपस्थिति प्रबंधन" : language === "kn" ? "ಹಾಜರಾತಿ ನಿರ್ವಹಣೆ" : language === "te" ? "హాజరు నిర్వహణ" : "Attendance Management",
      desc: language === "hi" ? "कार्य स्थल उपस्थिति ट्रैक करें" : "Track site attendance",
      icon: Clock
    },
    {
      id: "tour-employer-wages",
      tab: "employer-wages",
      label: language === "hi" ? "मजदूरी और भुगतान" : language === "kn" ? "ವೇತನ ಮತ್ತು ಪಾವತಿಗಳು" : language === "te" ? "వేతనాలు మరియు చెల్లింపులు" : "Wage & Payments",
      desc: language === "hi" ? "मजदूरी जारी करें" : "Disburse wages",
      icon: Coins
    },
    {
      id: "tour-employer-messages",
      tab: "employer-messages",
      label: language === "hi" ? "संदेश" : language === "kn" ? "ಸಂದೇಶಗಳು" : language === "te" ? "సందేశాలు" : "Messages",
      desc: language === "hi" ? "श्रमिकों के साथ चैट करें" : "Chat with site workers",
      icon: MessageSquare
    },
    {
      id: "tour-employer-reports",
      tab: "employer-reports",
      label: language === "hi" ? "गतिविधि और रिपोर्ट" : language === "kn" ? "ಚಟುವಟಿಕೆ ಮತ್ತು वರದಿಗಳು" : language === "te" ? "కార్యకలాపాలు & నివేదికలు" : "Activity & Reports",
      desc: language === "hi" ? "साइट गतिविधि देखें" : "View site activity logs",
      icon: Sliders
    },
    {
      id: "tour-employer-disputes",
      tab: "employer-disputes",
      label: t("complaintsSupport"),
      desc: t("complaintsSupportDesc"),
      icon: ShieldAlert
    },
    {
      id: "tour-employer-settings",
      tab: "employer-settings",
      label: t("settings"),
      desc: t("settingsDesc"),
      icon: Settings
    }
  ];

  // Connection status & offline simulation states
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(() => {
    return localStorage.getItem("empowork_offline_simulated") === "true";
  });

  // Smooth scroll content area to top when activeTab changes
  useEffect(() => {
    if (mainRef.current && activeTab !== "jobs") {
      mainRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [activeTab]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleToggleOfflineSimulation = () => {
    const newVal = !isSimulatedOffline;
    setIsSimulatedOffline(newVal);
    localStorage.setItem("empowork_offline_simulated", String(newVal));
  };

  // Run database seeding on first mount
  useEffect(() => {
    seedInitialDatabase();
  }, []);

  const handleAuthSuccess = (profile: UserProfile) => {
    setUser(profile);
    // Route to default tab depending on role
    if (profile.role === "worker") {
      setActiveTab("worker-dashboard");
    } else if (profile.role === "employer") {
      setActiveTab("employer-jobs");
    } else if (profile.role === "admin") {
      setActiveTab("admin-dashboard");
    }
  };

  const handleLogout = () => {
    setUser(null);
    setActiveTab("dashboard");
  };

  const handleUpdateProfile = (updatedFields: Partial<UserProfile>) => {
    if (user) {
      setUser(prev => prev ? { ...prev, ...updatedFields } : null);
    }
  };

  return (
    <div className={`min-h-screen ${user ? "bg-slate-50/50" : "bg-transparent"} text-gray-800 flex flex-col font-sans relative`}>
      {!user && <ThreeDBackground />}
      
      {/* Navigation Bar */}
      <Navbar
        user={user}
        onLogout={handleLogout}
        onOpenAuth={() => setIsAuthOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOnline={isOnline}
        isSimulatedOffline={isSimulatedOffline}
        onToggleOfflineSimulation={handleToggleOfflineSimulation}
      />

      {/* Main Container */}
      <div className="flex-grow flex flex-col">
        {user ? (
          /* High-Contrast Split Sidebar & Content Layout */
          <div className="flex-grow flex flex-col md:flex-row min-h-[calc(100vh-3.5rem)]">
            
            {/* Left Sidebar (Desktop View) / Sub-Header Navigation (Mobile View) */}
            <aside className="w-full md:w-64 bg-slate-950 text-slate-200 border-b md:border-b-0 md:border-r border-slate-800/80 flex flex-col shrink-0 z-20">
              
              {/* Sidebar Branding / Header with Quick-Access Language Dropdown */}
              <div className="hidden md:flex items-center justify-between px-5 py-4.5 border-b border-slate-900 bg-slate-950/80 relative">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="font-mono text-[10px] font-black text-amber-400 tracking-widest uppercase">
                    {user.role === "worker" ? t("workerDashboard") : user.role === "employer" ? t("employerDashboard") : t("adminDashboard")}
                  </span>
                </div>

                {/* Sidebar Language Dropdown */}
                <div className="relative">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowSidebarLangDropdown(!showSidebarLangDropdown)}
                    className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-[10px] font-black uppercase tracking-wider text-slate-300 hover:text-white hover:bg-slate-850 transition-all cursor-pointer shadow-xs"
                    title="Change Language / भाषा बदलें / ಭಾಷೆಯನ್ನು ಬದಲಾಯಿಸಿ / భాషను మార్చండి"
                  >
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    <span>{language === "en" ? "EN" : language === "hi" ? "HI" : language === "kn" ? "KN" : "TE"}</span>
                    <ChevronDown className="w-3 h-3 text-slate-500" />
                  </motion.button>

                  <AnimatePresence>
                    {showSidebarLangDropdown && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowSidebarLangDropdown(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.95 }}
                          className="absolute right-0 mt-1.5 w-32 bg-slate-900 border border-slate-800 rounded shadow-2xl py-1 z-50 overflow-hidden origin-top-right font-sans text-slate-200"
                        >
                          {[
                            { code: "en", label: "English", native: "English" },
                            { code: "hi", label: "Hindi", native: "हिन्दी" },
                            { code: "kn", label: "Kannada", native: "ಕನ್ನಡ" },
                            { code: "te", label: "Telugu", native: "తెలుగు" }
                          ].map((lang) => {
                            const isSelected = language === lang.code;
                            return (
                              <button
                                key={lang.code}
                                type="button"
                                onClick={() => {
                                  setLanguage(lang.code as LanguageCode);
                                  setShowSidebarLangDropdown(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                                  isSelected 
                                    ? "bg-amber-500 text-slate-950 font-black" 
                                    : "text-slate-300 hover:bg-slate-850 hover:text-white"
                                }`}
                              >
                                <span>{lang.native}</span>
                                {isSelected && <Check className="w-3 h-3 text-slate-950" />}
                              </button>
                            );
                          })}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Sidebar Navigation Search Module */}
              {(user.role === "worker" || user.role === "admin" || user.role === "employer") && (
                <div className="px-2.5 md:px-4 pt-3 pb-1.5 border-b border-slate-900 bg-slate-950/40 shrink-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                    <input
                      type="text"
                      value={menuSearchQuery}
                      onChange={(e) => setMenuSearchQuery(e.target.value)}
                      placeholder={
                        user.role === "worker" 
                          ? (language === "en" ? "Search features..." : language === "hi" ? "सुविधाएं खोजें..." : language === "kn" ? "ವೈಶಿಷ್ಟ್ಯಗಳನ್ನು ಹುಡುಕಿ..." : "ఫీచర్లను వెతకండి...")
                          : user.role === "employer"
                            ? "Search modules..."
                            : "Search admin panels..."
                      }
                      className="w-full text-xs p-2 pl-9 pr-8 bg-slate-900 border border-slate-800/80 rounded-xl focus:outline-none text-slate-200 focus:border-amber-500 font-semibold placeholder-slate-500 transition-all"
                    />
                    {menuSearchQuery && (
                      <button
                        onClick={() => setMenuSearchQuery("")}
                        className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                        title="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Navigation Menu Links - Arranged Order-Wise */}
              <nav className="flex md:flex-col p-2.5 md:p-4 gap-1.5 md:gap-2 overflow-x-auto md:overflow-x-visible md:overflow-y-auto whitespace-nowrap md:whitespace-normal scrollbar-none">
                
                {/* --- WORKER MODULES (ORDER-WISE) --- */}
                {user.role === "worker" && (
                  <>
                    {workerMenuItems
                      .filter(item => filterMenuItem(item.label, item.desc))
                      .map(item => {
                        const IconComponent = item.icon;
                        const isTabActive = activeTab === item.tab;
                        return (
                          <motion.button
                            key={item.id}
                            id={item.id}
                            onClick={() => setActiveTab(item.tab)}
                            whileHover={{ 
                              scale: 1.03, 
                              x: 4, 
                              boxShadow: "0 0 15px rgba(245, 158, 11, 0.25)"
                            }}
                            whileTap={{ scale: 0.98 }}
                            transition={{ type: "spring", stiffness: 400, damping: 15 }}
                            className={`flex items-center space-x-2.5 md:space-x-3 px-4 py-2 rounded-xl text-[11px] md:text-xs font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 md:w-full text-left ${
                              isTabActive
                                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10 font-black"
                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                            }`}
                          >
                            <IconComponent className="w-4 h-4 shrink-0" />
                            <div className="flex flex-col items-start leading-tight">
                              <span>{item.label}</span>
                              <span className={`hidden md:inline text-[9px] font-normal tracking-tight normal-case mt-0.5 ${
                                isTabActive ? "text-slate-900/70" : "text-slate-500"
                              }`}>
                                {item.desc}
                              </span>
                            </div>
                          </motion.button>
                        );
                      })}

                    {filterMenuItem(t("logout"), t("logoutDesc")) && (
                      <motion.button
                        id="tour-logout"
                        onClick={handleLogout}
                        whileHover={{ 
                          scale: 1.03, 
                          x: 4, 
                          boxShadow: "0 0 15px rgba(239, 68, 68, 0.25)"
                        }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        className="flex items-center space-x-2.5 md:space-x-3 px-4 py-2 rounded-xl text-[11px] md:text-xs font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 md:w-full text-left text-red-500 hover:text-red-400 hover:bg-red-950/20"
                      >
                        <LogOut className="w-4 h-4 shrink-0" />
                        <div className="flex flex-col items-start leading-tight">
                          <span>{t("logout")}</span>
                          <span className="hidden md:inline text-[9px] font-normal tracking-tight normal-case mt-0.5 text-red-500/50">
                            {t("logoutDesc")}
                          </span>
                        </div>
                      </motion.button>
                    )}

                    {visibleWorkerItemsCount === 0 && (
                      <div className="text-center py-6 px-4 text-slate-500 animate-fade-in w-full md:w-auto">
                        <Search className="w-5 h-5 mx-auto text-slate-600 mb-1.5" />
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">No features found</p>
                        <p className="text-[9px] text-slate-500 mt-0.5 normal-case whitespace-normal">Try searching another keyword.</p>
                      </div>
                    )}
                  </>
                )}

                {/* --- EMPLOYER MODULES (ORDER-WISE) --- */}
                {user.role === "employer" && (
                  <>
                    {employerMenuItems
                      .filter(item => filterMenuItem(item.label, item.desc))
                      .map(item => {
                        const IconComponent = item.icon;
                        const isTabActive = activeTab === item.tab || 
                          (item.tab === "employer-jobs" && (activeTab === "manage-jobs" || activeTab === "post-job" || activeTab === "employer-jobs")) ||
                          (item.tab === "employer-workers" && (activeTab === "applications" || activeTab === "hire-workers" || activeTab === "directory" || activeTab === "employer-workers")) ||
                          (item.tab === "employer-disputes" && (activeTab === "complaints" || activeTab === "employer-disputes")) ||
                          (item.tab === "employer-reports" && (activeTab === "notifications" || activeTab === "reports" || activeTab === "employer-reports")) ||
                          (item.tab === "employer-settings" && (activeTab === "settings" || activeTab === "employer-settings")) ||
                          (item.tab === "employer-dashboard" && (activeTab === "dashboard" || activeTab === "employer-dashboard")) ||
                          (item.tab === "company-profile" && (activeTab === "company-profile")) ||
                          (item.tab === "employer-attendance" && (activeTab === "attendance" || activeTab === "employer-attendance")) ||
                          (item.tab === "employer-wages" && (activeTab === "wages" || activeTab === "employer-wages")) ||
                          (item.tab === "employer-messages" && (activeTab === "messages" || activeTab === "employer-messages"));

                        return (
                          <motion.button
                            key={item.id}
                            id={item.id}
                            onClick={() => setActiveTab(item.tab)}
                            whileHover={{ 
                              scale: 1.03, 
                              x: 4, 
                              boxShadow: "0 0 15px rgba(245, 158, 11, 0.25)"
                            }}
                            whileTap={{ scale: 0.98 }}
                            transition={{ type: "spring", stiffness: 400, damping: 15 }}
                            className={`flex items-center space-x-2.5 md:space-x-3 px-4 py-2.5 md:py-3 rounded-xl text-[11px] md:text-xs font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 md:w-full text-left ${
                              isTabActive
                                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10 font-black"
                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                            }`}
                          >
                            <IconComponent className="w-4 h-4 shrink-0" />
                            <div className="flex flex-col items-start leading-tight">
                              <span>{item.label}</span>
                              <span className={`hidden md:inline text-[9px] font-normal tracking-tight normal-case mt-0.5 ${
                                isTabActive ? "text-slate-900/70" : "text-slate-500"
                              }`}>
                                {item.desc}
                              </span>
                            </div>
                          </motion.button>
                        );
                      })}

                    {filterMenuItem(t("logout"), t("logoutDesc")) && (
                      <motion.button
                        id="tour-logout"
                        onClick={handleLogout}
                        whileHover={{ 
                          scale: 1.03, 
                          x: 4, 
                          boxShadow: "0 0 15px rgba(239, 68, 68, 0.25)"
                        }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        className="flex items-center space-x-2.5 md:space-x-3 px-4 py-2.5 md:py-3 rounded-xl text-[11px] md:text-xs font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 md:w-full text-left text-red-500 hover:text-red-400 hover:bg-red-950/20"
                      >
                        <LogOut className="w-4 h-4 shrink-0" />
                        <div className="flex flex-col items-start leading-tight">
                          <span>{t("logout")}</span>
                          <span className="hidden md:inline text-[9px] font-normal tracking-tight normal-case mt-0.5 text-red-500/50">
                            {t("logoutDesc")}
                          </span>
                        </div>
                      </motion.button>
                    )}

                    {visibleEmployerItemsCount === 0 && (
                      <div className="text-center py-6 px-4 text-slate-500 animate-fade-in w-full md:w-auto">
                        <Search className="w-5 h-5 mx-auto text-slate-600 mb-1.5" />
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">No features found</p>
                        <p className="text-[9px] text-slate-500 mt-0.5 normal-case whitespace-normal">Try searching another keyword.</p>
                      </div>
                    )}
                  </>
                )}

                {/* --- ADMIN MODULES (ORDER-WISE) --- */}
                {user.role === "admin" && (
                  <>
                    {/* Module 1: Platform Dashboard */}
                    {filterMenuItem(t("platformOverview"), t("platformOverviewDesc")) && (
                      <motion.button
                        id="tour-admin-dashboard"
                        onClick={() => setActiveTab("admin-dashboard")}
                        whileHover={{ 
                          scale: 1.03, 
                          x: 4, 
                          boxShadow: "0 0 15px rgba(245, 158, 11, 0.25)"
                        }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        className={`flex items-center space-x-2.5 md:space-x-3 px-4 py-2 md:py-2.5 rounded-xl text-[11px] md:text-xs font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 md:w-full text-left ${
                          activeTab === "admin-dashboard" || activeTab === "dashboard"
                            ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10 font-black"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                        }`}
                      >
                        <LayoutDashboard className="w-4 h-4 shrink-0" />
                        <div className="flex flex-col items-start leading-tight">
                          <span>{t("platformOverview")}</span>
                          <span className={`hidden md:inline text-[9px] font-normal tracking-tight normal-case mt-0.5 ${
                            activeTab === "admin-dashboard" || activeTab === "dashboard" ? "text-slate-900/70" : "text-slate-500"
                          }`}>
                            {t("platformOverviewDesc")}
                          </span>
                        </div>
                      </motion.button>
                    )}

                    {/* Module 2: User Management */}
                    {filterMenuItem("User Management", "View & edit registries") && (
                      <motion.button
                        id="tour-admin-users"
                        onClick={() => setActiveTab("admin-users")}
                        whileHover={{ 
                          scale: 1.03, 
                          x: 4, 
                          boxShadow: "0 0 15px rgba(245, 158, 11, 0.25)"
                        }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        className={`flex items-center space-x-2.5 md:space-x-3 px-4 py-2 md:py-2.5 rounded-xl text-[11px] md:text-xs font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 md:w-full text-left ${
                          activeTab === "admin-users"
                            ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10 font-black"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                        }`}
                      >
                        <Users className="w-4 h-4 shrink-0" />
                        <div className="flex flex-col items-start leading-tight">
                          <span>User Management</span>
                          <span className={`hidden md:inline text-[9px] font-normal tracking-tight normal-case mt-0.5 ${
                            activeTab === "admin-users" ? "text-slate-900/70" : "text-slate-500"
                          }`}>
                            View & edit registries
                          </span>
                        </div>
                      </motion.button>
                    )}

                    {/* Module 3: Registrants & ID */}
                    {filterMenuItem("Registrants & ID", "Verify background credentials") && (
                      <motion.button
                        id="tour-admin-credentials"
                        onClick={() => setActiveTab("admin-credentials")}
                        whileHover={{ 
                          scale: 1.03, 
                          x: 4, 
                          boxShadow: "0 0 15px rgba(245, 158, 11, 0.25)"
                        }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        className={`flex items-center space-x-2.5 md:space-x-3 px-4 py-2 md:py-2.5 rounded-xl text-[11px] md:text-xs font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 md:w-full text-left ${
                          activeTab === "admin-credentials"
                            ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10 font-black"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                        }`}
                      >
                        <ShieldCheck className="w-4 h-4 shrink-0" />
                        <div className="flex flex-col items-start leading-tight">
                          <span>Registrants & ID</span>
                          <span className={`hidden md:inline text-[9px] font-normal tracking-tight normal-case mt-0.5 ${
                            activeTab === "admin-credentials" ? "text-slate-900/70" : "text-slate-500"
                          }`}>
                            Verify background credentials
                          </span>
                        </div>
                      </motion.button>
                    )}

                    {/* Module 4: Jobs & Applications */}
                    {filterMenuItem("Jobs & Applications", "Moderate daily-wage vacancies") && (
                      <motion.button
                        id="tour-admin-jobs"
                        onClick={() => setActiveTab("admin-jobs")}
                        whileHover={{ 
                          scale: 1.03, 
                          x: 4, 
                          boxShadow: "0 0 15px rgba(245, 158, 11, 0.25)"
                        }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        className={`flex items-center space-x-2.5 md:space-x-3 px-4 py-2 md:py-2.5 rounded-xl text-[11px] md:text-xs font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 md:w-full text-left ${
                          activeTab === "admin-jobs"
                            ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10 font-black"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                        }`}
                      >
                        <Briefcase className="w-4 h-4 shrink-0" />
                        <div className="flex flex-col items-start leading-tight">
                          <span>Jobs & Applications</span>
                          <span className={`hidden md:inline text-[9px] font-normal tracking-tight normal-case mt-0.5 ${
                            activeTab === "admin-jobs" ? "text-slate-900/70" : "text-slate-500"
                          }`}>
                            Moderate daily-wage vacancies
                          </span>
                        </div>
                      </motion.button>
                    )}

                    {/* Module 5: Attendance & Payroll */}
                    {filterMenuItem("Attendance & Payroll", "Track shifts & release funds") && (
                      <motion.button
                        id="tour-admin-payroll"
                        onClick={() => setActiveTab("admin-payroll")}
                        whileHover={{ 
                          scale: 1.03, 
                          x: 4, 
                          boxShadow: "0 0 15px rgba(245, 158, 11, 0.25)"
                        }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        className={`flex items-center space-x-2.5 md:space-x-3 px-4 py-2 md:py-2.5 rounded-xl text-[11px] md:text-xs font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 md:w-full text-left ${
                          activeTab === "admin-payroll"
                            ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10 font-black"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                        }`}
                      >
                        <Coins className="w-4 h-4 shrink-0" />
                        <div className="flex flex-col items-start leading-tight">
                          <span>Attendance & Payroll</span>
                          <span className={`hidden md:inline text-[9px] font-normal tracking-tight normal-case mt-0.5 ${
                            activeTab === "admin-payroll" ? "text-slate-900/70" : "text-slate-500"
                          }`}>
                            Track shifts & release funds
                          </span>
                        </div>
                      </motion.button>
                    )}

                    {/* Module 6: AI Disputes Mediation */}
                    {filterMenuItem("AI Disputes Mediation", t("platformDisputesDesc")) && (
                      <motion.button
                        id="tour-admin-disputes"
                        onClick={() => setActiveTab("admin-disputes")}
                        whileHover={{ 
                          scale: 1.03, 
                          x: 4, 
                          boxShadow: "0 0 15px rgba(245, 158, 11, 0.25)"
                        }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        className={`flex items-center space-x-2.5 md:space-x-3 px-4 py-2 md:py-2.5 rounded-xl text-[11px] md:text-xs font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 md:w-full text-left ${
                          activeTab === "admin-disputes" || activeTab === "admin-complaints"
                            ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10 font-black"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                        }`}
                      >
                        <Brain className="w-4 h-4 shrink-0" />
                        <div className="flex flex-col items-start leading-tight">
                          <span>AI Disputes Mediation</span>
                          <span className={`hidden md:inline text-[9px] font-normal tracking-tight normal-case mt-0.5 ${
                            activeTab === "admin-disputes" || activeTab === "admin-complaints" ? "text-slate-900/70" : "text-slate-500"
                          }`}>
                            {t("platformDisputesDesc")}
                          </span>
                        </div>
                      </motion.button>
                    )}

                    {/* Module 7: Deduplication & Settings */}
                    {filterMenuItem("Deduplication & Settings", "Audit duplicate entries") && (
                      <motion.button
                        id="tour-admin-integrity"
                        onClick={() => setActiveTab("admin-integrity")}
                        whileHover={{ 
                          scale: 1.03, 
                          x: 4, 
                          boxShadow: "0 0 15px rgba(245, 158, 11, 0.25)"
                        }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        className={`flex items-center space-x-2.5 md:space-x-3 px-4 py-2 md:py-2.5 rounded-xl text-[11px] md:text-xs font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 md:w-full text-left ${
                          activeTab === "admin-integrity"
                            ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10 font-black"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                        }`}
                      >
                        <Database className="w-4 h-4 shrink-0" />
                        <div className="flex flex-col items-start leading-tight w-full">
                          <span className="flex items-center justify-between w-full">
                            <span>Deduplication & Settings</span>
                            <span className="group/tooltip relative inline-block cursor-help ml-1.5 shrink-0">
                              <HelpCircle className={`w-3.5 h-3.5 transition-colors ${
                                activeTab === "admin-integrity" ? "text-slate-900/70 hover:text-slate-900" : "text-slate-400 hover:text-slate-200"
                              }`} />
                              <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none w-56 bg-slate-950 text-slate-200 text-[10px] font-normal tracking-normal normal-case p-2.5 rounded-lg shadow-xl border border-slate-800 z-50">
                                <span className="font-bold text-amber-400 uppercase tracking-wider mb-1 block font-mono text-[9px]">Deduplication Integrity</span>
                                <span className="text-slate-300 leading-normal font-sans block">Scans system listings to clean duplicate accounts, double applications, and spam listings, safeguarding database efficiency.</span>
                                <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-950" />
                              </span>
                            </span>
                          </span>
                          <span className={`hidden md:inline text-[9px] font-normal tracking-tight normal-case mt-0.5 ${
                            activeTab === "admin-integrity" ? "text-slate-900/70" : "text-slate-500"
                          }`}>
                            Audit duplicate entries
                          </span>
                        </div>
                      </motion.button>
                    )}

                    {/* Module 8: Logs & Broadcasts */}
                    {filterMenuItem("Logs & Broadcasts", "View security audit logs") && (
                      <motion.button
                        id="tour-admin-logs"
                        onClick={() => setActiveTab("admin-logs")}
                        whileHover={{ 
                          scale: 1.03, 
                          x: 4, 
                          boxShadow: "0 0 15px rgba(245, 158, 11, 0.25)"
                        }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        className={`flex items-center space-x-2.5 md:space-x-3 px-4 py-2 md:py-2.5 rounded-xl text-[11px] md:text-xs font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 md:w-full text-left ${
                          activeTab === "admin-logs"
                            ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10 font-black"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                        }`}
                      >
                        <FileText className="w-4 h-4 shrink-0" />
                        <div className="flex flex-col items-start leading-tight w-full">
                          <span className="flex items-center justify-between w-full">
                            <span>Logs & Broadcasts</span>
                            <span className="group/tooltip relative inline-block cursor-help ml-1.5 shrink-0">
                              <HelpCircle className={`w-3.5 h-3.5 transition-colors ${
                                activeTab === "admin-logs" ? "text-slate-900/70 hover:text-slate-900" : "text-slate-400 hover:text-slate-200"
                              }`} />
                              <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none w-56 bg-slate-950 text-slate-200 text-[10px] font-normal tracking-normal normal-case p-2.5 rounded-lg shadow-xl border border-slate-800 z-50">
                                <span className="font-bold text-amber-400 uppercase tracking-wider mb-1 block font-mono text-[9px]">Security Audit Logs</span>
                                <span className="text-slate-300 leading-normal font-sans block">Tracks administrative database events, logins, and verifications, paired with immediate push broadcasts.</span>
                                <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-950" />
                              </span>
                            </span>
                          </span>
                          <span className={`hidden md:inline text-[9px] font-normal tracking-tight normal-case mt-0.5 ${
                            activeTab === "admin-logs" ? "text-slate-900/70" : "text-slate-500"
                          }`}>
                            View security audit logs
                          </span>
                        </div>
                      </motion.button>
                    )}

                    {visibleAdminItemsCount === 0 && (
                      <div className="text-center py-6 px-4 text-slate-500 animate-fade-in w-full md:w-auto">
                        <Search className="w-5 h-5 mx-auto text-slate-600 mb-1.5" />
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">No panels found</p>
                        <p className="text-[9px] text-slate-500 mt-0.5 normal-case whitespace-normal">Try searching another keyword.</p>
                      </div>
                    )}
                  </>
                )}
              </nav>

              {/* Sidebar Footer Info Panel */}
              <div className="hidden md:block p-5 border-t border-slate-900 mt-auto font-mono text-[9px] tracking-widest text-slate-600 space-y-2.5 uppercase bg-slate-950/40">
                <div className="flex items-center space-x-1.5 text-emerald-500/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>SECURE GATEWAY</span>
                </div>
                <div className="flex items-center justify-between gap-1 bg-slate-900/40 p-1.5 rounded border border-slate-900/60 mt-1">
                  <span className="truncate select-all text-[8px] text-slate-400" title={user.uid}>
                    ID: {user.uid}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(user.uid);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="p-1 text-slate-500 hover:text-amber-400 hover:bg-slate-900 rounded transition-all cursor-pointer shrink-0"
                    title="Copy full ID to clipboard"
                  >
                    {copied ? (
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
                <div>EMPOWORK CLOUD v1.4</div>
                <div className="pt-1.5 border-t border-slate-900/40">
                  <ReplayTourButton role={user.role} />
                </div>
              </div>
            </aside>

            {/* Content Area Dashboard Views */}
            <main ref={mainRef} className="flex-grow min-w-0 relative overflow-y-auto">
              {/* Onboarding Overlay Tooltips (will automatically show on first login) */}
              <OnboardingTour role={user.role} />
              {user.role === "worker" && (
                <WorkerDashboard
                  user={user}
                  onUpdateProfile={handleUpdateProfile}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  isOffline={!isOnline || isSimulatedOffline}
                />
              )}
              
              {user.role === "employer" && (
                <EmployerDashboard
                  user={user}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  isOffline={!isOnline || isSimulatedOffline}
                  isSimulatedOffline={isSimulatedOffline}
                  onToggleOfflineSimulation={handleToggleOfflineSimulation}
                  onLogout={handleLogout}
                />
              )}

              {user.role === "admin" && (
                <AdminDataProvider>
                  <AdminDashboard
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                  />
                </AdminDataProvider>
              )}
            </main>
          </div>
        ) : (
          /* Public Informational Landing Page with Ambient 3D Particle Constellation Background */
          <div className="relative w-full overflow-hidden bg-transparent text-slate-900 min-h-[95vh]">
            
            {/* Content Overlay */}
            <div className="relative z-10 w-full py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-20">
              
              {/* Hero Section */}
              <section className="text-center space-y-6 max-w-3xl mx-auto py-8">
                <div className="flex justify-center mb-4">
                  <Logo layout="vertical" darkBackground={false} iconClassName="w-28 h-28 sm:w-32 sm:h-32" />
                </div>

                <div className="inline-flex items-center space-x-2 bg-violet-500/10 border border-violet-500/20 text-violet-700 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                  <span>{t("empoweringDailyWorkers")}</span>
                </div>
                
                <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-none">
                  {t("heroTitle").split("Fair Employment")[0]}
                  <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                    {t("heroTitle").includes("निष्पक्ष रोजगार") ? "निष्पक्ष रोजगार" : t("heroTitle").includes("ನ್ಯಾಯಯುತ ಉದ್ಯೋಗ") ? "ನ್ಯಾಯಯುತ ಉದ್ಯೋಗ" : "Fair Employment"}
                  </span>
                  {t("heroTitle").split("Fair Employment")[1] || t("heroTitle").split("निष्पक्ष रोजगार")[1] || t("heroTitle").split("ನ್ಯಾಯಯುತ ಉದ್ಯೋಗ")[1] || ""}
                </h1>
                
                <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
                  {t("heroSubtitle")}
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                  <button
                    onClick={() => setIsAuthOpen(true)}
                    className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    {t("getStartedButton")}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                  <a
                    href="#how-it-works"
                    className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all cursor-pointer shadow-sm"
                  >
                    {t("howItWorks")}
                  </a>
                </div>
              </section>

              {/* Industrial Stats Ticker */}
              <section className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white/60 p-6 rounded-2xl border border-slate-200/80 backdrop-blur-md max-w-5xl mx-auto text-center shadow-lg">
                <div>
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 block font-display">3,400+</span>
                  <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider mt-1 block font-mono">Workers Joined</span>
                </div>
                <div>
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 block font-display">120+</span>
                  <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider mt-1 block font-mono">Builders Registered</span>
                </div>
                <div>
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 block font-display">₹28.4 Lakhs+</span>
                  <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider mt-1 block font-mono">Daily Wages Paid</span>
                </div>
                <div>
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 block font-display">99.8%</span>
                  <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider mt-1 block font-mono">Settlement Rate</span>
                </div>
              </section>

              {/* Industrial Interactive Toolbox Workspace */}
              <section className="max-w-5xl mx-auto">
                <IndustrialHubTools />
              </section>

              {/* Core Modules Description Cards (Bento style) */}
              <section id="how-it-works" className="space-y-8 max-w-5xl mx-auto">
                <div className="text-center max-w-2xl mx-auto space-y-2">
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Our Smart Modules</h2>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium">Connecting three critical stakeholders into one transparent employment network</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  
                  {/* Worker pillar */}
                  <div className="bg-white/60 border border-slate-200/80 p-6 rounded-2xl backdrop-blur-md space-y-4 hover:border-emerald-500/40 transition-all shadow-xs">
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600">
                      <User className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-lg text-slate-900">Worker Module</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Designed for easy offline-ready interactions. Workers can register daily trades, search and apply for local builders with 1-click, check-in to log attendance, and learn new skills with our AI Coach.
                    </p>
                    <ul className="text-xs text-slate-600 space-y-2 pt-2">
                      <li className="flex items-center"><CheckCircle className="w-4 h-4 text-emerald-500 mr-2" /> AI Profile/Bio Generator</li>
                      <li className="flex items-center"><CheckCircle className="w-4 h-4 text-emerald-500 mr-2" /> Attendance and wage tracker</li>
                      <li className="flex items-center"><CheckCircle className="w-4 h-4 text-emerald-500 mr-2" /> Multi-language technical learning</li>
                    </ul>
                  </div>

                  {/* Employer pillar */}
                  <div className="bg-white/60 border border-slate-200/80 p-6 rounded-2xl backdrop-blur-md space-y-4 hover:border-indigo-500/40 transition-all shadow-xs">
                    <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-600">
                      <Building className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-lg text-slate-900">Employer Module</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Helping builders and residential contractors source verified workers. Easily post site jobs with transparent daily rates, review applications with AI highlights, and disburse digital wages instantly.
                    </p>
                    <ul className="text-xs text-slate-600 space-y-2 pt-2">
                      <li className="flex items-center"><CheckCircle className="w-4 h-4 text-indigo-500 mr-2" /> Rapid construction job posting</li>
                      <li className="flex items-center"><CheckCircle className="w-4 h-4 text-indigo-500 mr-2" /> Real-time active shift monitoring</li>
                      <li className="flex items-center"><CheckCircle className="w-4 h-4 text-indigo-500 mr-2" /> Daily wages release & receipt logs</li>
                    </ul>
                  </div>

                  {/* Admin/Welfare pillar */}
                  <div className="bg-white/60 border border-slate-200/80 p-6 rounded-2xl backdrop-blur-md space-y-4 hover:border-amber-500/40 transition-all shadow-xs">
                    <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-600">
                      <Shield className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-lg text-slate-900">Admin/Welfare Module</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      A centralized dashboard for welfare officers to audit payments, monitor job completion, resolve disputes, and maintain platform security. Powered by unbiased Gemini dispute recommendations.
                    </p>
                    <ul className="text-xs text-slate-600 space-y-2 pt-2">
                      <li className="flex items-center"><CheckCircle className="w-4 h-4 text-amber-500 mr-2" /> Financial transaction auditing</li>
                      <li className="flex items-center"><CheckCircle className="w-4 h-4 text-amber-500 mr-2" /> AI Dispute advice analyzer</li>
                      <li className="flex items-center"><CheckCircle className="w-4 h-4 text-amber-500 mr-2" /> Central worker registries</li>
                    </ul>
                  </div>

                </div>
              </section>

              {/* Help & FAQ Section */}
              <section className="max-w-5xl mx-auto">
                <HelpFAQ />
              </section>

            </div>
          </div>
        ) }
      </div>

      {/* Footer */}
      <footer className="bg-white/80 border-t border-slate-200 py-6 text-center text-xs text-slate-500 backdrop-blur-xs">
        <p>© {new Date().getFullYear()} EmpoWork – Smart Platform for Daily Wage Empowerment. Powered by Gemini AI.</p>
      </footer>

      {/* Authentication & Demo Account Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

    </div>
  );
}
