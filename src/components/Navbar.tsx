import React, { useState } from "react";
import { Briefcase, LogOut, LogIn, User, Shield, Building, Sparkles, Wifi, WifiOff, Globe, Check, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile } from "../types";
import Logo from "./Logo";
import { useLanguage, LanguageCode } from "../context/LanguageContext";

interface NavbarProps {
  user: UserProfile | null;
  onLogout: () => void;
  onOpenAuth: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOnline: boolean;
  isSimulatedOffline: boolean;
  onToggleOfflineSimulation: () => void;
}

export default function Navbar({ 
  user, 
  onLogout, 
  onOpenAuth, 
  activeTab, 
  setActiveTab,
  isOnline,
  isSimulatedOffline,
  onToggleOfflineSimulation
}: NavbarProps) {
  const { language, setLanguage, t } = useLanguage();
  const [showStatusPopover, setShowStatusPopover] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const isEffectiveOnline = isOnline && !isSimulatedOffline;

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-xs h-14 flex items-center">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex justify-between items-center">
          
          {/* Logo & Platform Name */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => {
            if (user) {
              if (user.role === "worker") setActiveTab("jobs");
              else if (user.role === "employer") setActiveTab("employer-jobs");
              else if (user.role === "admin") setActiveTab("admin-dashboard");
            } else {
              setActiveTab("dashboard");
            }
          }}>
            <Logo compact={true} />
            <div className="flex items-center">
              
              {/* Dynamic Connection Indicator */}
              <div className="relative ml-3 flex items-center" style={{ perspective: 1000 }}>
                <motion.button
                  whileHover={{ 
                    scale: 1.08, 
                    y: -2,
                    rotateX: 8,
                    rotateY: -8,
                    boxShadow: isEffectiveOnline 
                      ? "0 12px 20px -5px rgba(16, 185, 129, 0.3), 0 4px 6px -2px rgba(16, 185, 129, 0.15)"
                      : "0 12px 20px -5px rgba(244, 63, 94, 0.3), 0 4px 6px -2px rgba(244, 63, 94, 0.15)"
                  }}
                  whileTap={{ scale: 0.95, y: 0, rotateX: 0, rotateY: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowStatusPopover(!showStatusPopover);
                  }}
                  className={`relative inline-flex items-center px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border shadow-md cursor-pointer overflow-hidden ${
                    isEffectiveOnline
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                      : "bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100"
                  }`}
                  style={{ transformStyle: "preserve-3d" }}
                  title="Click to toggle simulated offline/online mode"
                >
                  {/* Subtle 3D glossy light gradient across the badge */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent opacity-80 pointer-events-none" />

                  {/* Pulsing 3D light indicator with outer ripple */}
                  <span className="relative flex h-2.5 w-2.5 mr-2 shrink-0">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      isEffectiveOnline ? "bg-emerald-400" : "bg-rose-400"
                    }`}></span>
                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 shadow-sm ${
                      isEffectiveOnline 
                        ? "bg-gradient-to-tr from-emerald-600 to-emerald-400" 
                        : "bg-gradient-to-tr from-rose-600 to-rose-400"
                    }`}></span>
                  </span>

                  {isEffectiveOnline ? (
                    <>
                      <motion.span
                        animate={{ 
                          scale: [1, 1.15, 1],
                          rotate: [0, 5, -5, 0]
                        }}
                        transition={{ 
                          repeat: Infinity, 
                          duration: 3,
                          ease: "easeInOut"
                        }}
                        className="inline-flex items-center"
                      >
                        <Wifi className="w-3.5 h-3.5 mr-1.5 shrink-0 text-emerald-600" />
                      </motion.span>
                      <span className="font-extrabold tracking-widest">{t("online")}</span>
                    </>
                  ) : (
                    <>
                      <motion.span
                        animate={{ 
                          scale: [1, 0.85, 1],
                          y: [0, -1, 0]
                        }}
                        transition={{ 
                          repeat: Infinity, 
                          duration: 2.5,
                          ease: "easeInOut"
                        }}
                        className="inline-flex items-center"
                      >
                        <WifiOff className="w-3.5 h-3.5 mr-1.5 shrink-0 text-rose-600" />
                      </motion.span>
                      <span className="font-extrabold tracking-widest">{t("offline")}</span>
                    </>
                  )}
                </motion.button>

                <AnimatePresence>
                  {showStatusPopover && (
                    <motion.div
                      initial={{ opacity: 0, y: 15, scale: 0.93, rotateX: -12 }}
                      animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
                      exit={{ opacity: 0, y: 10, scale: 0.93, rotateX: -8 }}
                      transition={{ type: "spring", stiffness: 380, damping: 18 }}
                      className="absolute left-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-2xl p-4.5 z-[9999] text-left normal-case tracking-normal text-slate-800 origin-top-left preserve-3d"
                      style={{ transformStyle: "preserve-3d", perspective: 1000 }}
                    >
                      {/* Interactive shine layer on popover */}
                      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/20 rounded-full filter blur-xl pointer-events-none" />

                      <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
                        <h4 className="font-extrabold text-xs text-slate-950 uppercase tracking-widest flex items-center gap-1.5">
                          <span className={`h-1.5 w-1.5 rounded-full ${isEffectiveOnline ? "bg-emerald-500" : "bg-rose-500"}`} />
                          Network & Sync Portal
                        </h4>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowStatusPopover(false);
                          }}
                          className="text-slate-400 hover:text-slate-700 text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full hover:bg-slate-50 transition-colors"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-start space-x-3">
                          {isEffectiveOnline ? (
                            <motion.div 
                              animate={{ scale: [1, 1.1, 1] }}
                              transition={{ repeat: Infinity, duration: 4 }}
                              className="p-2 rounded-xl bg-emerald-50 shrink-0 border border-emerald-100 shadow-xs"
                            >
                              <Wifi className="w-5 h-5 text-emerald-600" />
                            </motion.div>
                          ) : (
                            <motion.div 
                              animate={{ y: [-1, 1, -1] }}
                              transition={{ repeat: Infinity, duration: 3 }}
                              className="p-2 rounded-xl bg-rose-50 shrink-0 border border-rose-100 shadow-xs"
                            >
                              <WifiOff className="w-5 h-5 text-rose-600" />
                            </motion.div>
                          )}
                          <div>
                            <p className="text-xs font-black text-slate-900 leading-tight">
                              {isEffectiveOnline ? t("connectedLiveSync") : t("localStorageMode")}
                            </p>
                            <p className="text-[10px] text-slate-500 leading-relaxed mt-1">
                              {isEffectiveOnline ? t("excellentCoverage") : t("noReceptionDetected")}
                            </p>
                          </div>
                        </div>

                        {/* Interactive Manual Simulation Switch */}
                        <div className="pt-2.5 border-t border-slate-100">
                          <p className="text-[9px] text-slate-400 font-extrabold mb-2 uppercase tracking-widest">
                            {t("connectionControl")}
                          </p>
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleOfflineSimulation();
                              setShowStatusPopover(false);
                            }}
                            className={`w-full py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border shadow-xs cursor-pointer ${
                              isSimulatedOffline
                                ? "bg-slate-950 text-emerald-400 border-slate-800 hover:bg-slate-900 shadow-md shadow-emerald-500/5"
                                : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                            }`}
                          >
                            {isSimulatedOffline ? (
                              <>
                                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                                {t("reconnectToCloud")}
                              </>
                            ) : (
                              <>
                                <WifiOff className="w-3.5 h-3.5 text-slate-500" />
                                {t("simulateNoSignal")}
                              </>
                            )}
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>
          </div>

          {/* User Account Controls */}
          <div className="flex items-center space-x-3">
            {/* Global i18n Language Support Selector */}
            <div className="relative">
              <motion.button
                id="tour-language"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowLangDropdown(!showLangDropdown)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-black uppercase tracking-tight text-slate-700 hover:bg-slate-100 transition-all cursor-pointer shadow-xs"
                title="Change Language / भाषा बदलें / ಭಾಷೆಯನ್ನು ಬದಲಾಯಿಸಿ / భాషను మార్చండి"
              >
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                <span>{language === "en" ? "EN" : language === "hi" ? "HI" : language === "kn" ? "KN" : "TE"}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </motion.button>

              <AnimatePresence>
                {showLangDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowLangDropdown(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      className="absolute right-0 mt-1 w-32 bg-white border border-slate-200 rounded shadow-xl py-1 z-50 overflow-hidden origin-top-right font-sans"
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
                              setShowLangDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                              isSelected 
                                ? "bg-amber-500 text-slate-950 font-black" 
                                : "text-slate-700 hover:bg-slate-100"
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

            {user ? (
              <div className="flex items-center space-x-3">
                {/* User Info Capsule */}
                <div className="flex items-center space-x-2 bg-slate-50 p-1 pr-3 rounded border border-slate-200">
                  <div className="flex items-center justify-center w-7 h-7 rounded bg-amber-500 text-slate-950 font-bold text-xs uppercase">
                    {user.name.slice(0, 2)}
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-xs font-bold text-slate-900 leading-none">{user.name}</p>
                    <p className="text-[9px] font-bold text-amber-600 uppercase tracking-wider mt-0.5">
                      {user.role === "worker" ? user.trade || "Worker" : user.role}
                    </p>
                  </div>
                </div>

                {/* Logout Button */}
                <button
                  onClick={onLogout}
                  className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="inline-flex items-center px-4 py-1.5 text-xs font-bold uppercase text-slate-950 bg-amber-500 hover:bg-amber-400 rounded transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 mr-2" />
                {t("loginRegister")}
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
