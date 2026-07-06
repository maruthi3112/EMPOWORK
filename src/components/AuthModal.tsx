import React, { useState, useEffect } from "react";
import { 
  User, Shield, Building, X, Key, Info, Sparkles, CheckCircle, 
  ArrowLeft, ArrowRight, Eye, EyeOff, AlertCircle, Check, Mail, 
  Phone, MapPin, Briefcase, Award, ThumbsUp, HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserRole } from "../types";
import { db, doc, setDoc, collection, query, where, getDocs } from "../lib/firebase";
import Logo from "./Logo";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (profile: { 
    uid: string; 
    email: string; 
    role: UserRole; 
    name: string; 
    phone: string; 
    location: string; 
    trade?: string; 
    experience?: string; 
    bio?: string; 
    wageExpectation?: number; 
    companyName?: string; 
    businessType?: string; 
    notificationPrefEnabled?: boolean;
  }) => void;
}

export default function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [showDemoLogins, setShowDemoLogins] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).has("demo");
    } catch {
      return false;
    }
  });
  const [signUpStep, setSignUpStep] = useState(1); // Steps 1 to 4, 5 is Success State
  const [role, setRole] = useState<UserRole>("worker");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Registration specific fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  
  // Worker-specific fields
  const [trade, setTrade] = useState("Mason");
  const [experience, setExperience] = useState("2 Years");
  const [workerType, setWorkerType] = useState<'employee' | 'labour'>("labour");
  const [wageExpectation, setWageExpectation] = useState(700);
  
  // Employer-specific fields
  const [companyName, setCompanyName] = useState("");
  const [businessType, setBusinessType] = useState("Residential Construction");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation States (computed in real-time)
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isPasswordValid = password.length >= 6;
  
  // Real-time password strength computation for security enhancement
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, text: "", color: "bg-slate-700/50", textColor: "text-slate-400" };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score, text: "Weak ⚠️", color: "bg-rose-500", textColor: "text-rose-400" };
    if (score <= 3) return { score, text: "Medium 🛡️", color: "bg-amber-500", textColor: "text-amber-400" };
    return { score, text: "Strong ✨", color: "bg-emerald-500", textColor: "text-emerald-400" };
  };

  const strength = getPasswordStrength(password);

  const isNameValid = name.trim().length >= 2;
  const isPhoneValid = phone.replace(/\D/g, "").length === 10;
  const isLocationValid = location.trim().length >= 2;

  // Step validation helpers
  const isStep1Valid = isEmailValid && isPasswordValid;
  const isStep2Valid = isNameValid && isPhoneValid && isLocationValid;
  const isStep3Valid = role === "worker" 
    ? (wageExpectation >= 200 && wageExpectation <= 5000) 
    : (companyName.trim().length >= 2 && businessType.trim().length >= 2);

  // Field touch trackers for showing real-time error states
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [locationTouched, setLocationTouched] = useState(false);
  const [companyNameTouched, setCompanyNameTouched] = useState(false);
  const [businessTypeTouched, setBusinessTypeTouched] = useState(false);

  // Sanitize on phone change to only allow 10 numeric digits
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const cleanVal = rawVal.replace(/\D/g, "").slice(0, 10);
    setPhone(cleanVal);
  };

  if (!isOpen) return null;

  // Pre-configured Demo Accounts
  const handleQuickDemoLogin = (selectedRole: UserRole) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      let mockProfile: any = {
        uid: `demo-uid-${selectedRole}-${Date.now()}`,
        email: `${selectedRole}@empowork.com`,
        role: selectedRole,
        location: "Metropolitan Area",
        createdAt: new Date().toISOString(),
      };

      if (selectedRole === "worker") {
        mockProfile = {
          ...mockProfile,
          uid: "worker-demo-id-123",
          name: "Ramesh Kumar",
          phone: "9876543210",
          trade: "Mason",
          experience: "4 Years",
          bio: "Specialist in cement bricklaying, high-altitude plastering, and site wall constructions. Always punctual, focused on safety, and works hard with teams.",
          wageExpectation: 800,
          skills: ["Bricklaying", "Plastering", "Cement Mixing", "Safety Auditing"],
          notificationPrefEnabled: true
        };
      } else if (selectedRole === "employer") {
        mockProfile = {
          ...mockProfile,
          uid: "emp-demo-1", 
          name: "Sanjay Singhania",
          phone: "9812345678",
          companyName: "Metro Build Corp",
          businessType: "Commercial & Civil Infrastructure",
          location: "Industrial District Gate 2"
        };
      } else if (selectedRole === "admin") {
        mockProfile = {
          ...mockProfile,
          uid: "admin-demo-id",
          name: "Developer",
          phone: "9999999999",
          location: "Central Worker Welfare Department, Zone A"
        };
      }

      onAuthSuccess(mockProfile);
      onClose();
    }, 450);
  };

  const handleNextStep = () => {
    setError("");
    if (signUpStep === 1 && !isStep1Valid) {
      setEmailTouched(true);
      setPasswordTouched(true);
      setError("Please ensure your Email is valid and Password is at least 6 characters.");
      return;
    }
    if (signUpStep === 2 && !isStep2Valid) {
      setNameTouched(true);
      setPhoneTouched(true);
      setLocationTouched(true);
      setError("Please complete all fields correctly. Name must be 2+ chars and Phone must be 10 digits.");
      return;
    }
    if (signUpStep === 3 && !isStep3Valid) {
      if (role === "employer") {
        setCompanyNameTouched(true);
        setBusinessTypeTouched(true);
      }
      setError("Please fill in your business details.");
      return;
    }

    setSignUpStep((prev) => prev + 1);
  };

  const handlePrevStep = () => {
    setError("");
    setSignUpStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const trimmedEmail = email.toLowerCase().trim();
    const trimmedPhone = phone.trim();

    if (!trimmedEmail || !password) {
      setError("Please enter your email and password.");
      setLoading(false);
      return;
    }

    if (isLogin) {
      // HANDLE LOG IN
      try {
        const emailQuery = query(collection(db, "users"), where("email", "==", trimmedEmail));
        const querySnapshot = await getDocs(emailQuery);

        if (querySnapshot.empty) {
          setError("No account associated with this email. Click 'New User Sign Up' to register.");
          setLoading(false);
          return;
        }

        const userDoc = querySnapshot.docs[0];
        const userProfile = userDoc.data() as any;

        if (userProfile.password && userProfile.password !== password) {
          setError("Incorrect password. Please verify and try again.");
          setLoading(false);
          return;
        }

        onAuthSuccess(userProfile);
        onClose();
      } catch (err: any) {
        console.error("Error signing in user:", err);
        setError("Network error: Failed to sign in. Please check your internet connection.");
      } finally {
        setLoading(false);
      }
    } else {
      // HANDLE NEW USER REGISTRATION
      try {
        const phoneDigits = trimmedPhone.replace(/\D/g, "");

        // 1. FIRST duplicate check: Check if email already exists
        const emailQuery = query(collection(db, "users"), where("email", "==", trimmedEmail));
        const emailSnapshot = await getDocs(emailQuery);

        if (!emailSnapshot.empty) {
          setError("An account with this email address already exists. Please log in.");
          setSignUpStep(1); // Go back to credentials step
          setLoading(false);
          return;
        }

        // 2. SECOND duplicate check: Check if phone number already exists
        const phoneQuery = query(collection(db, "users"), where("phone", "==", phoneDigits));
        const phoneSnapshot = await getDocs(phoneQuery);

        if (!phoneSnapshot.empty) {
          setError("This Mobile Phone Number is already registered. Duplicates are not permitted.");
          setSignUpStep(2); // Go back to contact step
          setLoading(false);
          return;
        }

        const uid = `user-uid-${Date.now()}`;
        const defaultName = name.trim();
        
        const profile: any = {
          uid,
          email: trimmedEmail,
          password, 
          role,
          name: defaultName,
          phone: phoneDigits,
          location: location.trim() || "Downtown City",
          createdAt: new Date().toISOString(),
          notificationPrefEnabled: true, // Default enabled
          statusState: "available"
        };

        if (role === "worker") {
          profile.trade = trade;
          profile.experience = experience;
          profile.wageExpectation = Number(wageExpectation);
          profile.bio = `Dedicated and hard-working ${workerType === "employee" ? "fixed/salaried employee" : "daily wage worker"}. Ready to take up assignments.`;
          profile.skills = [trade, workerType === "employee" ? "Employee" : "General Worker"];
          profile.workerType = workerType;
        } else if (role === "employer") {
          profile.companyName = companyName.trim() || `${defaultName} Contractors`;
          profile.businessType = businessType.trim() || "General Contractor";
        }

        // Store in the Firestore database
        await setDoc(doc(db, "users", uid), profile);

        // Success transition step - Reset onboarding flag so they receive the beautiful guided dashboard tour
        localStorage.removeItem(`empowork_onboarded_${role}`);
        setSignUpStep(5);
        setLoading(false);

        // Small smooth delay then login user
        setTimeout(() => {
          onAuthSuccess(profile);
          onClose();
        }, 2200);

      } catch (err: any) {
        console.error("Error storing user details in database:", err);
        setError("Failed to complete registration due to a network error. Please try again.");
        setLoading(false);
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto"
    >
      {/* Visual background lights for glassmorphism */}
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative w-full max-w-xl bg-slate-900/80 text-slate-100 rounded-3xl shadow-2xl overflow-hidden border border-white/10 backdrop-blur-xl flex flex-col max-h-[92vh] font-sans"
      >
        
        {/* Header with Role Themes */}
        <div className={`flex justify-between items-center px-6 py-4.5 border-b border-white/5 transition-all duration-300 ${
          !isLogin && role === "worker" ? "bg-emerald-950/20" : !isLogin && role === "employer" ? "bg-indigo-950/20" : "bg-slate-900/40"
        }`}>
          <div className="flex items-center space-x-3.5">
            <Logo compact={true} iconClassName="w-10 h-10" />
            <div className="text-left">
              <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider">Access Portal</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Fair Jobs & Verified Wage Records</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Glassmorphic Progress Bar for SignUp Onboarding */}
        {!isLogin && signUpStep <= 4 && (
          <div className="w-full bg-slate-950/40 px-6 py-2 border-b border-white/5 flex flex-col gap-1.5 text-left">
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1">
                Step {signUpStep} of 4:{" "}
                <span className="text-white font-black">
                  {signUpStep === 1 && "Account & Role Setup"}
                  {signUpStep === 2 && "Personal Contact Profile"}
                  {signUpStep === 3 && "Professional Industry Specifics"}
                  {signUpStep === 4 && "Confirm & Review Profile"}
                </span>
              </span>
              <span className="font-mono text-emerald-400">{signUpStep * 25}% Done</span>
            </div>
            <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden relative">
              <motion.div 
                className={`h-full bg-gradient-to-r ${
                  role === "worker" ? "from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]" : "from-indigo-500 to-violet-400 shadow-[0_0_8px_rgba(99,102,241,0.3)]"
                }`}
                initial={{ width: "0%" }}
                animate={{ width: `${signUpStep * 25}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
          </div>
        )}

        <div className="overflow-y-auto p-6 space-y-5 flex-1">
          
          {/* Quick Demo Logins Container */}
          {isLogin && showDemoLogins && (
            <motion.div
              initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4.5 space-y-3.5 text-left"
            >
              <div className="flex items-center space-x-2.5 text-emerald-400 font-black text-sm uppercase tracking-wide">
                <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>Instant Demo Account Quick Login</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Immediately explore fully functional dashboards by clicking one of our pre-configured industrial roles:
              </p>
              <div className="grid grid-cols-3 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin("worker")}
                  disabled={loading}
                  className="flex flex-col items-center justify-center p-3 bg-white/5 border border-emerald-500/10 hover:border-emerald-500/50 hover:bg-emerald-500/10 rounded-xl text-slate-200 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                >
                  <User className="w-5 h-5 text-emerald-400 mb-1.5" />
                  <span>Ramesh (Worker)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin("employer")}
                  disabled={loading}
                  className="flex flex-col items-center justify-center p-3 bg-white/5 border border-indigo-500/10 hover:border-indigo-500/50 hover:bg-indigo-500/10 rounded-xl text-slate-200 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                >
                  <Building className="w-5 h-5 text-indigo-400 mb-1.5" />
                  <span>Metro (Employer)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin("admin")}
                  disabled={loading}
                  className="flex flex-col items-center justify-center p-3 bg-white/5 border border-amber-500/10 hover:border-amber-500/50 hover:bg-amber-500/10 rounded-xl text-slate-200 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                >
                  <Shield className="w-5 h-5 text-amber-400 mb-1.5" />
                  <span>Developer</span>
                </button>
              </div>
            </motion.div>
          )}

          {isLogin && showDemoLogins && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="relative flex items-center justify-center py-1"
            >
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5"></div>
              </div>
              <span className="relative px-4 bg-slate-900 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Or Use Credentials
              </span>
            </motion.div>
          )}

          {/* Form Content Wrapper */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Login / Sign Up Tabs Switcher */}
            {signUpStep <= 4 && (
              <div className="flex border-b border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(true);
                    setSignUpStep(1);
                  }}
                  className={`flex-1 pb-3 text-xs font-black uppercase tracking-wider text-center border-b-2 transition-all cursor-pointer ${
                    isLogin
                      ? "border-emerald-500 text-emerald-400"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Existing User Log In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(false);
                    setSignUpStep(1);
                  }}
                  className={`flex-1 pb-3 text-xs font-black uppercase tracking-wider text-center border-b-2 transition-all cursor-pointer ${
                    !isLogin
                      ? "border-emerald-500 text-emerald-400"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  New User Sign Up
                </button>
              </div>
            )}

            {/* Error Notifications Panel */}
            {error && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 font-semibold flex items-center space-x-2.5 text-left">
                <AlertCircle className="w-4.5 h-4.5 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* LOGIN STATE RENDERING */}
            {isLogin ? (
              <motion.div
                key="login-credentials"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.35, staggerChildren: 0.08 }}
                className="space-y-4 text-left"
              >
                {/* Email Address */}
                <motion.div
                  initial={{ opacity: 0, y: 10, filter: "blur(3px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.35, ease: "easeOut", delay: 0.15 }}
                  className="space-y-1.5"
                >
                  <label className="text-xs font-bold text-slate-300">Email Address</label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4.5 py-3 text-sm focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 text-white placeholder-slate-500 transition-all font-bold"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <Mail className="w-4 h-4" />
                    </span>
                  </div>
                </motion.div>

                {/* Password Input */}
                <motion.div
                  initial={{ opacity: 0, y: 10, filter: "blur(3px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.35, ease: "easeOut", delay: 0.22 }}
                  className="space-y-1.5"
                >
                  <label className="text-xs font-bold text-slate-300">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4.5 py-3 text-sm focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 text-white placeholder-slate-500 transition-all font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white hover:scale-110 active:scale-95 transition-all cursor-pointer p-1 rounded-md hover:bg-white/10"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4 text-slate-300" /> : <Eye className="w-4 h-4 text-slate-300" />}
                    </button>
                  </div>
                </motion.div>

                {/* Subtle Toggle for Demo Logins */}
                <div className="pt-2 flex justify-between items-center text-[11px] text-slate-400">
                  <span>Looking for sandbox testing?</span>
                  <button
                    type="button"
                    onClick={() => setShowDemoLogins(!showDemoLogins)}
                    className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors uppercase tracking-wider hover:underline cursor-pointer"
                  >
                    {showDemoLogins ? "Hide Demo Accounts" : "Show Demo Accounts"}
                  </button>
                </div>
              </motion.div>
            ) : (
              /* SIGNUP MULTI-STEP GLASSMORPHIC FORM */
              <div className="text-left">
                <AnimatePresence mode="wait">
                  {/* STEP 1: ACCOUNT & ROLE SETUP */}
                  {signUpStep === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      {/* Title Indicator */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest font-mono">Step 1: Credentials & Role</span>
                        <h2 className="text-lg font-black text-white uppercase tracking-tight">Select your role & credentials</h2>
                      </div>

                      {/* Role selection Buttons */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                          I want to join the platform as a:
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setRole("worker")}
                            className={`flex flex-col items-center justify-center p-4 border rounded-2xl font-black text-xs transition-all cursor-pointer ${
                              role === "worker"
                                ? "bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                                : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200"
                            }`}
                          >
                            <User className="w-7 h-7 mb-2" />
                            <span>Daily Worker</span>
                            <span className="text-[9px] font-medium text-slate-400 mt-1 uppercase">View Postings & Track Wages</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setRole("employer")}
                            className={`flex flex-col items-center justify-center p-4 border rounded-2xl font-black text-xs transition-all cursor-pointer ${
                              role === "employer"
                                ? "bg-indigo-500/10 border-indigo-500 text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.15)]"
                                : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200"
                            }`}
                          >
                            <Building className="w-7 h-7 mb-2" />
                            <span>Employer / Contractor</span>
                            <span className="text-[9px] font-medium text-slate-400 mt-1 uppercase">Post Jobs & Oversee Attendance</span>
                          </button>
                        </div>
                      </div>

                      {/* Email and password inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-slate-300">Email Address</label>
                            {email && emailTouched && (
                              <span className={`text-[9px] font-bold ${isEmailValid ? "text-emerald-400" : "text-rose-400"}`}>
                                {isEmailValid ? "✓ Valid Format" : "Invalid Format"}
                              </span>
                            )}
                          </div>
                          <div className="relative">
                            <input
                              type="email"
                              required
                              placeholder="name@example.com"
                              value={email}
                              onBlur={() => setEmailTouched(true)}
                              onChange={(e) => setEmail(e.target.value)}
                              className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 text-white placeholder-slate-500 transition-all font-semibold ${
                                emailTouched && !isEmailValid ? "border-rose-500" : "border-white/10 focus:border-emerald-500"
                              }`}
                            />
                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                              <Mail className="w-4 h-4" />
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-slate-300">Password</label>
                            {password && (
                              <span className={`text-[10px] font-black uppercase tracking-wider ${strength.textColor}`}>
                                Strength: {strength.text}
                              </span>
                            )}
                          </div>
                          <div className="relative">
                            <input
                              type={showPassword ? "text" : "password"}
                              required
                              placeholder="•••••••• (6+ characters)"
                              value={password}
                              onBlur={() => setPasswordTouched(true)}
                              onChange={(e) => setPassword(e.target.value)}
                              className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 text-white placeholder-slate-500 transition-all font-semibold ${
                                passwordTouched && !isPasswordValid ? "border-amber-500" : "border-white/10 focus:border-emerald-500"
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white hover:scale-110 active:scale-95 transition-all cursor-pointer p-1 rounded-md hover:bg-white/10"
                              title={showPassword ? "Hide password" : "Show password"}
                            >
                              {showPassword ? <EyeOff className="w-4 h-4 text-slate-300" /> : <Eye className="w-4 h-4 text-slate-300" />}
                            </button>
                          </div>
                          
                          {/* Segmented Strength Meter */}
                          {password && (
                            <div className="space-y-1 pt-1">
                              <div className="grid grid-cols-5 gap-1.5 h-1">
                                <div className={`rounded-full h-full transition-colors duration-300 ${strength.score >= 1 ? strength.color : "bg-white/5"}`} />
                                <div className={`rounded-full h-full transition-colors duration-300 ${strength.score >= 2 ? strength.color : "bg-white/5"}`} />
                                <div className={`rounded-full h-full transition-colors duration-300 ${strength.score >= 3 ? strength.color : "bg-white/5"}`} />
                                <div className={`rounded-full h-full transition-colors duration-300 ${strength.score >= 4 ? strength.color : "bg-white/5"}`} />
                                <div className={`rounded-full h-full transition-colors duration-300 ${strength.score >= 5 ? strength.color : "bg-white/5"}`} />
                              </div>
                              <p className="text-[9px] text-slate-400 leading-normal font-medium">
                                * Tip: Combine uppercase letters, numbers, and special symbols for a stronger password.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 2: PERSONAL IDENTITY & CONTACT */}
                  {signUpStep === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      {/* Title Indicator */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest font-mono">Step 2: Identity & Contact</span>
                        <h2 className="text-lg font-black text-white uppercase tracking-tight">Enter your verification details</h2>
                      </div>

                      {/* Name input */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-slate-300">Full Name</label>
                          {name && nameTouched && (
                            <span className={`text-[9px] font-bold ${isNameValid ? "text-emerald-400" : "text-rose-400"}`}>
                              {isNameValid ? "✓ Valid Name" : "Too Short"}
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            placeholder="e.g. Ramesh Kumar"
                            value={name}
                            onBlur={() => setNameTouched(true)}
                            onChange={(e) => setName(e.target.value)}
                            className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 text-white placeholder-slate-500 transition-all font-semibold ${
                              nameTouched && !isNameValid ? "border-rose-500" : "border-white/10 focus:border-emerald-500"
                            }`}
                          />
                          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                            <User className="w-4 h-4" />
                          </span>
                        </div>
                      </div>

                      {/* Contact Phone & Proximity Location */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-slate-300">Mobile Phone Number</label>
                            {phone && phoneTouched && (
                              <span className={`text-[9px] font-bold ${isPhoneValid ? "text-emerald-400" : "text-rose-400"}`}>
                                {isPhoneValid ? "✓ 10-digits valid" : "Must be 10-digits"}
                              </span>
                            )}
                          </div>
                          <div className="relative">
                            <input
                              type="tel"
                              required
                              placeholder="e.g. 9876543210"
                              value={phone}
                              onBlur={() => setPhoneTouched(true)}
                              onChange={handlePhoneChange}
                              className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 text-white placeholder-slate-500 transition-all font-semibold ${
                                phoneTouched && !isPhoneValid ? "border-rose-500" : "border-white/10 focus:border-emerald-500"
                              }`}
                            />
                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                              <Phone className="w-4 h-4" />
                            </span>
                          </div>
                          <p className="text-[9px] text-slate-400 leading-normal font-medium mt-1">
                            * Registered for instant SMS/Alert worker updates & attendance matching logs.
                          </p>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-slate-300">Work Location / City</label>
                            {location && locationTouched && (
                              <span className={`text-[9px] font-bold ${isLocationValid ? "text-emerald-400" : "text-rose-400"}`}>
                                {isLocationValid ? "✓ Location Set" : "Please specify city"}
                              </span>
                            )}
                          </div>
                          <div className="relative">
                            <input
                              type="text"
                              required
                              placeholder="e.g. Sector 62, Noida"
                              value={location}
                              onBlur={() => setLocationTouched(true)}
                              onChange={(e) => setLocation(e.target.value)}
                              className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 text-white placeholder-slate-500 transition-all font-semibold ${
                                locationTouched && !isLocationValid ? "border-rose-500" : "border-white/10 focus:border-emerald-500"
                              }`}
                            />
                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                              <MapPin className="w-4 h-4" />
                            </span>
                          </div>
                          <p className="text-[9px] text-slate-400 leading-normal font-medium mt-1">
                            * Used to find nearby sites and calculate commute distances.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 3: WORKER OR EMPLOYER SPECIFICS */}
                  {signUpStep === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      {/* Title Indicator */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest font-mono">Step 3: Industry Profile</span>
                        <h2 className="text-lg font-black text-white uppercase tracking-tight">Professional Specialties & Details</h2>
                      </div>

                      {role === "worker" ? (
                        /* WORKER SPECIFIC DETAILS FORM */
                        <div className="space-y-4 bg-white/5 border border-white/5 rounded-2xl p-4.5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-300 block">Trade Specialty</label>
                              <div className="relative">
                                <select
                                  value={trade}
                                  onChange={(e) => setTrade(e.target.value)}
                                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-hidden focus:border-emerald-500 transition-all cursor-pointer font-bold"
                                >
                                  <option value="Mason">Mason (Rajmistri / राजमिस्त्री)</option>
                                  <option value="Plumber">Plumber (Nal Saaz / नलसाज)</option>
                                  <option value="Electrician">Electrician (बिजली मिस्त्री)</option>
                                  <option value="Carpenter">Carpenter (Badhai / बढ़ई)</option>
                                  <option value="Painter">Painter (Rangsaaz / पेंटर)</option>
                                  <option value="Helper">Helper (General Work / मददगार)</option>
                                </select>
                                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                  <Briefcase className="w-4 h-4" />
                                </span>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-300 block">Years of Experience</label>
                              <div className="relative">
                                <select
                                  value={experience}
                                  onChange={(e) => setExperience(e.target.value)}
                                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-hidden focus:border-emerald-500 transition-all cursor-pointer font-bold"
                                >
                                  <option value="Fresher / New">Fresher / Apprentice (0-1 year)</option>
                                  <option value="1-2 Years">Junior Professional (1-2 Years)</option>
                                  <option value="3-5 Years">Skilled Mason (3-5 Years)</option>
                                  <option value="5+ Years">Expert Contractor Lead (5+ Years)</option>
                                </select>
                                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                  <Award className="w-4 h-4" />
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-300 block">Worker Wage Class</label>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => setWorkerType("labour")}
                                  className={`p-2.5 border rounded-xl text-center text-xs font-black transition cursor-pointer ${
                                    workerType === "labour"
                                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                                      : "bg-transparent border-white/10 text-slate-400 hover:bg-white/5"
                                  }`}
                                >
                                  Daily Labour
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setWorkerType("employee")}
                                  className={`p-2.5 border rounded-xl text-center text-xs font-black transition cursor-pointer ${
                                    workerType === "employee"
                                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                                      : "bg-transparent border-white/10 text-slate-400 hover:bg-white/5"
                                  }`}
                                >
                                  Monthly Employee
                                </button>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-slate-300">Expected Daily Wage (₹)</label>
                                <span className="text-[10px] text-emerald-400 font-bold">₹{wageExpectation}/Day</span>
                              </div>
                              <div className="space-y-2">
                                <input
                                  type="range"
                                  min="200"
                                  max="3000"
                                  step="50"
                                  value={wageExpectation}
                                  onChange={(e) => setWageExpectation(Number(e.target.value))}
                                  className="w-full accent-emerald-500 h-2 bg-slate-850 rounded-lg cursor-pointer transition-all"
                                />
                                <div className="flex justify-between text-[9px] text-slate-500 font-black font-mono">
                                  <span>₹200 (Min)</span>
                                  <span>₹1,500</span>
                                  <span>₹3,000 (Max)</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* EMPLOYER SPECIFIC DETAILS FORM */
                        <div className="space-y-4 bg-white/5 border border-white/5 rounded-2xl p-4.5">
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                              <label className="text-xs font-bold text-slate-300">Company or Business Name</label>
                              {companyName && companyNameTouched && (
                                <span className={`text-[9px] font-bold ${companyName.trim().length >= 2 ? "text-emerald-400" : "text-rose-400"}`}>
                                  {companyName.trim().length >= 2 ? "✓ Valid Company" : "Too Short"}
                                </span>
                              )}
                            </div>
                            <div className="relative">
                              <input
                                type="text"
                                required
                                placeholder="e.g. Singhania Infrastructures Pvt Ltd"
                                value={companyName}
                                onBlur={() => setCompanyNameTouched(true)}
                                onChange={(e) => setCompanyName(e.target.value)}
                                className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 text-white placeholder-slate-500 transition-all font-semibold ${
                                  companyNameTouched && companyName.trim().length < 2 ? "border-rose-500" : "border-white/10 focus:border-emerald-500"
                                }`}
                              />
                              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                                <Building className="w-4 h-4" />
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                              <label className="text-xs font-bold text-slate-300">Contractor / Business Specialty</label>
                              {businessType && businessTypeTouched && (
                                <span className={`text-[9px] font-bold ${businessType.trim().length >= 2 ? "text-emerald-400" : "text-rose-400"}`}>
                                  {businessType.trim().length >= 2 ? "✓ Specialty Set" : "Too Short"}
                                </span>
                              )}
                            </div>
                            <div className="relative">
                              <input
                                type="text"
                                required
                                placeholder="e.g. Residential Masonry / Commercial Civil Works"
                                value={businessType}
                                onBlur={() => setBusinessTypeTouched(true)}
                                onChange={(e) => setBusinessType(e.target.value)}
                                className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 text-white placeholder-slate-500 transition-all font-semibold ${
                                  businessTypeTouched && businessType.trim().length < 2 ? "border-rose-500" : "border-white/10 focus:border-emerald-500"
                                }`}
                              />
                              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                                <Briefcase className="w-4 h-4" />
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* STEP 4: SUMMARY & CONFIRM REVIEW */}
                  {signUpStep === 4 && (
                    <motion.div
                      key="step4"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      {/* Title Indicator */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest font-mono">Step 4: Summary Review</span>
                        <h2 className="text-lg font-black text-white uppercase tracking-tight">Verify profile details before joining</h2>
                      </div>

                      {/* Summary Review Bento Card Grid */}
                      <div className="grid grid-cols-2 gap-3 text-left">
                        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Portal Role</span>
                          <span className="text-xs font-black text-amber-400 uppercase flex items-center mt-1">
                            {role === "worker" ? <User className="w-4 h-4 mr-1.5" /> : <Building className="w-4 h-4 mr-1.5" />}
                            {role === "worker" ? "Daily Worker" : "Employer"}
                          </span>
                        </div>
                        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Full Name</span>
                          <span className="text-xs font-bold text-slate-100 mt-1 block truncate">{name}</span>
                        </div>
                        <div className="bg-white/5 p-3 rounded-xl border border-white/5 col-span-2">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Log In Email Credentials</span>
                          <span className="text-xs font-semibold text-slate-200 mt-1 block truncate">{email}</span>
                        </div>
                        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Mobile Contact</span>
                          <span className="text-xs font-semibold text-slate-200 mt-1 block font-mono">🇮🇳 +91 {phone}</span>
                        </div>
                        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Proximity Area</span>
                          <span className="text-xs font-semibold text-slate-200 mt-1 block truncate">{location}</span>
                        </div>
                        
                        {/* Role-specific details review */}
                        {role === "worker" ? (
                          <>
                            <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Specialty Trade</span>
                              <span className="text-xs font-bold text-emerald-400 mt-1 block">{trade}</span>
                            </div>
                            <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Daily Wage Expectation</span>
                              <span className="text-xs font-bold text-emerald-400 mt-1 block font-mono">₹{wageExpectation} / Day</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Company Name</span>
                              <span className="text-xs font-bold text-indigo-400 mt-1 block truncate">{companyName || `${name} Contractors`}</span>
                            </div>
                            <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Contractor Type</span>
                              <span className="text-xs font-bold text-indigo-400 mt-1 block truncate">{businessType || "General Construction"}</span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Safe Registration Disclaimers */}
                      <div className="p-3 bg-slate-950/40 rounded-xl border border-white/5 flex items-start space-x-2.5 text-xs text-slate-300">
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <p className="leading-relaxed text-[10px] font-medium text-slate-400">
                          By confirming, you agree to register this official profile. All wage submissions, contractor review audits, and job matches are backed up securely on Firestore with full validation logs.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 5: REGISTRATION SUCCESSFUL CELEBRATION STATE */}
                  {signUpStep === 5 && (
                    <motion.div
                      key="step5"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", damping: 15 }}
                      className="py-8 flex flex-col items-center justify-center text-center space-y-6"
                    >
                      <div className="relative">
                        {/* Glowing ring backdrops */}
                        <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl scale-150 animate-pulse" />
                        <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center relative shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: "spring" }}
                          >
                            <Check className="w-10 h-10 text-emerald-400" />
                          </motion.div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight">Profile Registered!</h2>
                        <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                          Welcome aboard, <span className="font-black text-emerald-400">{name}</span>! Your safe {role === "worker" ? "laborer" : "contractor"} profile has been created and verified.
                        </p>
                      </div>

                      <div className="bg-white/5 px-4 py-2 rounded-full border border-white/5 flex items-center space-x-2 text-[10px] font-bold text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        <span>Activating your custom workspace dashboard...</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* ACTION FOOTER BUTTONS */}
            {signUpStep <= 4 && (
              <motion.div
                key="auth-footer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: "easeOut", delay: 0.28 }}
                className="flex gap-3 pt-3.5 border-t border-white/5"
              >
                {/* Back / Cancel Button */}
                {!isLogin && signUpStep > 1 ? (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="w-1/3 py-3 px-4 bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs rounded-xl transition-all text-center cursor-pointer uppercase tracking-wider flex items-center justify-center space-x-1 border border-white/5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-1/3 py-3 px-4 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-bold text-xs rounded-xl transition-all text-center cursor-pointer uppercase tracking-wider border border-white/5"
                  >
                    Cancel
                  </button>
                )}

                {/* Submit / Next Button */}
                {isLogin ? (
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-950/20 transition-all flex items-center justify-center cursor-pointer active:scale-98"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <Key className="w-4 h-4" />
                        <span>Sign In Securely</span>
                      </span>
                    )}
                  </button>
                ) : signUpStep === 4 ? (
                  /* Final submit button for Step 4 */
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-950/20 transition-all flex items-center justify-center cursor-pointer active:scale-98"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4" />
                        <span>Create Profile & Join</span>
                      </span>
                    )}
                  </button>
                ) : (
                  /* "Next Step" button for Steps 1-3 */
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-950/20 transition-all flex items-center justify-center cursor-pointer active:scale-98"
                  >
                    <span className="flex items-center gap-1.5">
                      <span>Next Step</span>
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </button>
                )}
              </motion.div>
            )}

          </form>

        </div>
      </motion.div>
    </motion.div>
  );
}
