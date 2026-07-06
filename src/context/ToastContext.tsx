import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, CheckCircle, AlertTriangle, Briefcase, Coins, ShieldAlert, Info } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning" | "wage" | "job" | "dispute";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  title?: string;
  duration?: number; // defaults to 5000ms
}

interface ToastContextType {
  showToast: (message: string, type: ToastType, title?: string, duration?: number) => void;
  toasts: Toast[];
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType, title?: string, duration = 5000) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = { id, message, type, title, duration };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast, toasts, removeToast }}>
      {children}
      
      {/* Global Toast Container Overlay */}
      <div className="fixed bottom-6 left-6 z-[9999] flex flex-col gap-3.5 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => {
            // Pick Style & Icon based on ToastType
            let icon = <Info className="w-5 h-5 text-sky-400" />;
            let borderColor = "border-slate-800";
            let iconBg = "bg-slate-900/80";
            let glowColor = "shadow-black/50";

            switch (toast.type) {
              case "success":
                icon = <CheckCircle className="w-5 h-5 text-emerald-400" />;
                borderColor = "border-emerald-500/50";
                iconBg = "bg-emerald-950/40";
                glowColor = "shadow-emerald-950/20";
                break;
              case "error":
                icon = <AlertTriangle className="w-5 h-5 text-rose-400" />;
                borderColor = "border-rose-500/50";
                iconBg = "bg-rose-950/40";
                glowColor = "shadow-rose-950/20";
                break;
              case "warning":
                icon = <AlertTriangle className="w-5 h-5 text-amber-400" />;
                borderColor = "border-amber-500/50";
                iconBg = "bg-amber-950/40";
                glowColor = "shadow-amber-950/20";
                break;
              case "wage":
                icon = <Coins className="w-5 h-5 text-emerald-400 animate-pulse" />;
                borderColor = "border-emerald-500";
                iconBg = "bg-emerald-950/60";
                glowColor = "shadow-[0_0_20px_rgba(16,185,129,0.25)]";
                break;
              case "job":
                icon = <Briefcase className="w-5 h-5 text-amber-400" />;
                borderColor = "border-amber-500";
                iconBg = "bg-amber-950/60";
                glowColor = "shadow-[0_0_20px_rgba(245,158,11,0.25)]";
                break;
              case "dispute":
                icon = <ShieldAlert className="w-5 h-5 text-red-500 animate-bounce" />;
                borderColor = "border-red-500";
                iconBg = "bg-red-950/60";
                glowColor = "shadow-[0_0_25px_rgba(239,68,68,0.3)]";
                break;
            }

            const defaultTitle = 
              toast.type === "wage" ? "💰 Wage Payment Logged" :
              toast.type === "job" ? "👷 Job Application Registered" :
              toast.type === "dispute" ? "⚖️ Dispute Filed Successfully" :
              toast.type === "success" ? "Success" : "Notification";

            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, x: -50, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -50, scale: 0.9, transition: { duration: 0.15 } }}
                layout
                className={`w-full bg-slate-950 text-slate-100 rounded-2xl shadow-2xl border-2 ${borderColor} ${glowColor} p-4 pointer-events-auto flex items-start space-x-3.5 relative overflow-hidden backdrop-blur-md`}
              >
                {/* Decorative background pulse for specific industrial modules */}
                {(toast.type === "wage" || toast.type === "job" || toast.type === "dispute") && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-900/10 to-transparent pointer-events-none opacity-40 animate-pulse" />
                )}

                {/* Left Colored Icon Container */}
                <div className={`p-2.5 rounded-xl shrink-0 ${iconBg} border border-slate-800/40`}>
                  {icon}
                </div>

                {/* Content */}
                <div className="flex-grow space-y-1 pr-6">
                  <h4 className="text-xs font-black uppercase tracking-wider font-mono text-slate-200">
                    {toast.title || defaultTitle}
                  </h4>
                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    {toast.message}
                  </p>
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className="absolute top-2.5 right-2.5 p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
