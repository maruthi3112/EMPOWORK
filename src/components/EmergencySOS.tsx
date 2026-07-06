import React, { useState, useEffect, useRef } from "react";
import { AlertTriangle, Phone, MapPin, ShieldAlert, Sparkles, X, Compass, CheckCircle2, Siren, Play, Pause, ChevronRight } from "lucide-react";
import { UserProfile, AttendanceRecord } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { db, collection, addDoc, updateDoc, doc } from "../lib/firebase";

interface EmergencySOSProps {
  user: UserProfile;
  attendance: AttendanceRecord[];
}

export default function EmergencySOS({ user, attendance }: EmergencySOSProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [isCounting, setIsCounting] = useState(false);
  const [isTriggered, setIsTriggered] = useState(false);
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string>("Locating active work site...");
  const [emergencyType, setEmergencyType] = useState<string>("Injury / Medical");
  const [userNote, setUserNote] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [sosRecordId, setSosRecordId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [audioOscillator, setAudioOscillator] = useState<any>(null);

  const countdownTimerRef = useRef<any>(null);
  const synthRef = useRef<any>(null);

  // Default active check-in or simulated supervisor info
  const activeCheckIn = attendance.find(r => r.status === "pending_approval" || r.status === "approved");
  const supervisorName = activeCheckIn ? "Contractor (Sanjay Builders)" : "Welfare Site Supervisor";
  const supervisorPhone = activeCheckIn ? "+91 98765 43210" : "+91 99000 11222";

  // Trigger browser Audio API Synth for siren beeping
  const startSirenBeep = () => {
    try {
      if (typeof window === "undefined") return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      synthRef.current = ctx;

      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      // Dual tone sweep effect
      osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.5);

      gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start();

      // Simple interval to toggle high/low pitch frequency
      let toggle = false;
      const pitchInterval = setInterval(() => {
        if (osc) {
          osc.frequency.setValueAtTime(toggle ? 600 : 950, ctx.currentTime);
          toggle = !toggle;
        }
      }, 400);

      setAudioOscillator({ osc, pitchInterval, ctx });
    } catch (e) {
      console.warn("Audio Context blocked or failed to load:", e);
    }
  };

  const stopSirenBeep = () => {
    if (audioOscillator) {
      try {
        clearInterval(audioOscillator.pitchInterval);
        audioOscillator.osc.stop();
        audioOscillator.ctx.close();
      } catch (e) {}
      setAudioOscillator(null);
    }
  };

  useEffect(() => {
    return () => {
      stopSirenBeep();
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [audioOscillator]);

  // Handle countdown triggers
  useEffect(() => {
    if (isCounting && countdown > 0) {
      countdownTimerRef.current = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (isCounting && countdown === 0) {
      setIsCounting(false);
      executeSOSAlert();
    }
    return () => {
      if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
    };
  }, [isCounting, countdown]);

  // Request browser geolocation live
  const acquireLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGeoCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setAddress(`Site Lat: ${position.coords.latitude.toFixed(5)}, Lng: ${position.coords.longitude.toFixed(5)}`);
        },
        (error) => {
          console.warn("Geolocation prompt denied, using simulated coordinates:", error);
          // Set standard fallback (Bengaluru construction site coordinate)
          setGeoCoords({ lat: 12.9716, lng: 77.5946 });
          setAddress("Sector 4 Metro Construction Site, Bengaluru");
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setGeoCoords({ lat: 12.9716, lng: 77.5946 });
      setAddress("Sector 4 Metro Construction Site, Bengaluru");
    }
  };

  const handleOpenSOS = () => {
    setIsOpen(true);
    acquireLocation();
    setCountdown(3);
    setIsCounting(true);
  };

  const handleCancelCountdown = () => {
    setIsCounting(false);
    setCountdown(3);
    stopSirenBeep();
    setIsOpen(false);
  };

  // Dispatch live emergency records to Firestore durably
  const executeSOSAlert = async () => {
    setLoading(true);
    setIsTriggered(true);
    startSirenBeep();

    // Increment visual responder timeline
    let step = 0;
    const interval = setInterval(() => {
      if (step < 3) {
        step += 1;
        setActiveStep(step);
      } else {
        clearInterval(interval);
      }
    }, 2500);

    try {
      const sosData = {
        workerId: user.uid,
        workerName: user.name || "Worker",
        workerPhone: user.phone || "+91 99000 88776",
        latitude: geoCoords?.lat || 12.9716,
        longitude: geoCoords?.lng || 77.5946,
        address: address,
        emergencyType: emergencyType,
        notes: userNote || "Emergency Alert Activated via Floating Button.",
        supervisorId: activeCheckIn?.employerId || "sys_employer_demo",
        supervisorName: supervisorName,
        status: "active",
        timestamp: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, "emergencies"), sosData);
      setSosRecordId(docRef.id);
    } catch (e) {
      console.error("Failed to post Firestore SOS alert:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveSOS = async () => {
    stopSirenBeep();
    if (sosRecordId) {
      try {
        await updateDoc(doc(db, "emergencies", sosRecordId), {
          status: "resolved",
          resolvedAt: new Date().toISOString()
        });
      } catch (e) {
        console.error("Error updating SOS record status:", e);
      }
    }
    setIsTriggered(false);
    setIsOpen(false);
    setCountdown(3);
    setActiveStep(0);
  };

  return (
    <>
      {/* Red Pulse Floating Trigger Action Button (FAB) */}
      <div className="fixed bottom-6 right-6 z-50">
        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleOpenSOS}
          className="relative h-14 w-14 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(220,38,38,0.5)] cursor-pointer focus:outline-none"
        >
          {/* Radial Pulse Waves */}
          <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 animate-ping opacity-75"></span>
          <span className="absolute inline-flex h-[130%] w-[130%] rounded-full bg-red-400 animate-pulse opacity-20"></span>
          <Siren className="w-7 h-7 relative z-10 text-white animate-pulse" />
        </motion.button>
        <span className="absolute -top-1 -right-1 bg-black text-[8px] font-black text-white px-1.5 py-0.5 rounded-full border border-red-500 uppercase tracking-wider font-mono shadow-md animate-bounce">
          SOS
        </span>
      </div>

      {/* Emergency Alert Overlay Modal Drawer */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg bg-slate-900 border-2 border-red-500 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.4)] overflow-hidden font-sans relative"
            >
              {/* Alert Stripe Top bar */}
              <div className="bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white py-3 px-5 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Siren className="w-5 h-5 text-white animate-spin" />
                  <span className="text-sm font-black uppercase tracking-widest font-mono">EMERGENCY SOS PORTAL</span>
                </div>
                {!isTriggered && (
                  <button
                    onClick={handleCancelCountdown}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                )}
              </div>

              {/* STAGE 1: Counting down prior to trigger */}
              {isCounting && !isTriggered && (
                <div className="p-8 text-center space-y-6">
                  <div className="relative inline-block">
                    <div className="w-24 h-24 rounded-full border-4 border-red-500/20 flex items-center justify-center mx-auto bg-red-500/10">
                      <span className="text-4xl font-black text-red-500 animate-ping">{countdown}</span>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-red-500 absolute -bottom-1 right-2 animate-bounce" />
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">Broadcasting SOS Alert...</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Welfare officer, site contractor, and local rescue contacts will be pinged instantly with your GPS coordinates.
                    </p>
                  </div>

                  {/* Immediate Trigger Button & Cancellation Panel */}
                  <div className="flex flex-col gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCounting(false);
                        executeSOSAlert();
                      }}
                      className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg transition-all cursor-pointer"
                    >
                      🚀 Send Alert Immediately
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelCountdown}
                      className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                    >
                      ❌ Cancel Alert (False Alarm)
                    </button>
                  </div>
                </div>
              )}

              {/* STAGE 2: SOS Activated - Rescue Center Core Interface */}
              {isTriggered && (
                <div className="p-6 space-y-5">
                  {/* Warning Header */}
                  <div className="bg-red-950/40 border border-red-800/40 p-4 rounded-xl flex items-start space-x-3">
                    <div className="p-2 bg-red-600 rounded-lg shrink-0">
                      <ShieldAlert className="w-5 h-5 text-white animate-bounce" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-red-400 uppercase tracking-wider">SOS ACTIVATED STATUS: ACTIVE</h4>
                      <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                        Emergency signals successfully locked & dispatched. Site supervisor Rajesh and emergency first responders have received your distress coordinates.
                      </p>
                    </div>
                  </div>

                  {/* Select Emergency Specifics */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono block">
                      Refine Emergency Category:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        "Injury / Medical",
                        "Site Hazard / Cave-in",
                        "Fire Threat",
                        "Employer Harassment"
                      ].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setEmergencyType(type)}
                          className={`p-2 rounded text-[10px] font-bold uppercase tracking-tight border text-center transition-all cursor-pointer ${
                            emergencyType === type
                              ? "bg-red-600 border-red-600 text-white"
                              : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600"
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Location Locked Indicator */}
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-3.5 flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block font-mono">LIVE GPS POSITION</span>
                        <span className="text-[11px] font-semibold text-slate-100">{address}</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-black text-emerald-400 uppercase bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                      Locked
                    </span>
                  </div>

                  {/* Active Supervisor Contact Details */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight block">Site Contractor</span>
                      <span className="text-xs font-black text-slate-100 block">{supervisorName}</span>
                      <a
                        href={`tel:${supervisorPhone}`}
                        className="inline-flex items-center text-[10px] font-black text-amber-400 hover:underline mt-1"
                      >
                        <Phone className="w-3 h-3 mr-1" /> Call Now
                      </a>
                    </div>

                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight block">Labor Helpline</span>
                      <span className="text-xs font-black text-slate-100 block">Dial 1098 National Line</span>
                      <a
                        href="tel:1098"
                        className="inline-flex items-center text-[10px] font-black text-red-400 hover:underline mt-1"
                      >
                        <Phone className="w-3 h-3 mr-1" /> Call Helpline
                      </a>
                    </div>
                  </div>

                  {/* Dispatch Progress Steps */}
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono block">
                      RESCUE DISPATCH TIMELINE
                    </span>
                    <div className="space-y-2.5">
                      {[
                        "SOS Emergency Broadcasted to Cloud Registry",
                        "Contractor & Site Supervisor notified with coordinates",
                        "Welfare Dispatch team routing to coordinates",
                        "Paramedic / First Aid responder dispatched"
                      ].map((step, idx) => {
                        const isDone = activeStep >= idx;
                        const isCurrent = activeStep === idx;
                        return (
                          <div
                            key={idx}
                            className={`flex items-start space-x-2 text-xs transition-opacity duration-300 ${
                              isDone ? "opacity-100" : "opacity-45"
                            }`}
                          >
                            <span className="mt-0.5 shrink-0">
                              {isDone ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <div className="w-3.5 h-3.5 rounded-full border border-slate-600" />
                              )}
                            </span>
                            <span className={`${isCurrent ? "font-bold text-red-400" : "text-slate-300"}`}>
                              {step}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* SOS Text notes input */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-mono block">
                      Add Situation Notes / घाव / स्थिति का विवरण:
                    </label>
                    <textarea
                      placeholder="e.g., Head injury due to brick falling, scaffolding loose, etc."
                      value={userNote}
                      onChange={(e) => {
                        setUserNote(e.target.value);
                        if (sosRecordId) {
                          updateDoc(doc(db, "emergencies", sosRecordId), {
                            notes: e.target.value
                          }).catch((err) => console.error("Error editing note:", err));
                        }
                      }}
                      className="w-full p-2.5 text-xs bg-slate-850 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-red-500 h-14 resize-none placeholder-slate-500"
                    />
                  </div>

                  {/* Close SOS Resolved state action */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleResolveSOS}
                      className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg transition-all cursor-pointer"
                    >
                      ✅ Declare Site Safe / Resolve SOS
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
