import React, { useState } from "react";
import { 
  Building, Settings, Save, AlertCircle, ShieldCheck, Mail, Phone, 
  MapPin, Bell, Landmark, Lock, Info, CheckSquare, RefreshCw
} from "lucide-react";
import { UserProfile } from "../../types";

interface EmployerSettingsProps {
  user: UserProfile;
  subView: "profile" | "settings";
  onUpdateProfile: (updatedFields: Partial<UserProfile>) => Promise<any>;
}

export default function EmployerSettings({
  user,
  subView = "profile",
  onUpdateProfile
}: EmployerSettingsProps) {
  
  const [formLoading, setFormLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Profile Form States
  const [companyName, setCompanyName] = useState(user.companyName || user.name);
  const [contactPerson, setContactPerson] = useState(user.name || "");
  const [businessType, setBusinessType] = useState(user.businessType || "Contractor");
  const [phone, setPhone] = useState(user.phone || "");
  const [email, setEmail] = useState(user.email || "");
  const [location, setLocation] = useState(user.location || "Bengaluru, India");
  const [bio, setBio] = useState(user.bio || "Active enterprise recruiter on the EmpoWork network.");
  const [logoUrl, setLogoUrl] = useState(user.avatarUrl || "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=150");

  // Settings form states
  const [autoDisburse, setAutoDisburse] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [emailDigest, setEmailDigest] = useState(false);
  const [securityPin, setSecurityPin] = useState("1234");

  const handleSaveProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setSuccessMsg(null);

    try {
      const payload: Partial<UserProfile> = {
        name: contactPerson.trim(),
        companyName: companyName.trim(),
        businessType: businessType,
        phone: phone.trim(),
        email: email.trim(),
        location: location.trim(),
        bio: bio.trim(),
        avatarUrl: logoUrl
      };

      await onUpdateProfile(payload);
      setSuccessMsg("🎉 Success! Company profile records have been updated in Firestore database.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(`Profile saving failed: ${err.message}`);
    } finally {
      setFormLoading(false);
    }
  };

  const handleSaveSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setTimeout(() => {
      setFormLoading(false);
      setSuccessMsg("🎉 System settings and payroll preferences locked successfully.");
      setTimeout(() => setSuccessMsg(null), 3000);
    }, 1000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-3xl">
      
      {/* Top Header */}
      <div>
        <h2 className="text-xl font-black text-slate-950 uppercase tracking-tight">
          {subView === "profile" ? "Company Profile Settings" : "System preferences & security"}
        </h2>
        <p className="text-xs text-slate-500">
          {subView === "profile" ? "Manage public corporate handles, site locations, and certified trade tags." : "Configure NPCI Aadhaar bank routes, automatic payroll disbursements, and push alerts."}
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-xl text-xs text-emerald-700 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
          <span className="font-bold">{successMsg}</span>
        </div>
      )}

      {subView === "profile" ? (
        /* Corporate Profile Form Panel */
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          
          <form onSubmit={handleSaveProfileSubmit} className="space-y-5 text-slate-700">
            
            {/* Logo select preview */}
            <div className="flex items-center space-x-4 pb-4 border-b border-slate-100">
              <img
                src={logoUrl}
                alt="Logo Preview"
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-200 bg-slate-50"
              />
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Corporate Brand Identity</span>
                <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                  {[
                    { name: "General Site Logo", url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=150" },
                    { name: "Urban Tech Icon", url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=150" }
                  ].map(logo => (
                    <button
                      key={logo.name}
                      type="button"
                      onClick={() => setLogoUrl(logo.url)}
                      className={`p-1 px-2.5 border rounded-lg cursor-pointer ${logoUrl === logo.url ? "border-amber-500 text-amber-700 bg-amber-50/15" : "border-slate-200 hover:bg-slate-50"}`}
                    >
                      {logo.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Company Registered Name*</label>
                <div className="relative">
                  <Building className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full p-2.5 pl-9 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-900 font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Contact Officer Name*</label>
                <div className="relative">
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full p-2.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-900 font-bold"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Contact Phone*</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2.5 pl-9 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-900 font-bold"
                    required
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Contact Corporate Email*</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2.5 pl-9 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-900 font-bold"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Headquarter Street Address*</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full p-2.5 pl-9 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-900 font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Business Sector Tag</label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-900 font-bold"
                >
                  <option value="Contractor">General Contractor</option>
                  <option value="Developer">Urban Developer</option>
                  <option value="Proprietor">Sub-Contractor Proprietor</option>
                  <option value="Government">Civic Body Supervisor</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Corporate Profile Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full p-3 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-900 h-24 resize-none font-semibold focus:outline-hidden"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={formLoading}
                className="py-2.5 px-6 bg-slate-950 hover:bg-slate-850 text-amber-500 font-black text-xs uppercase rounded-xl border border-slate-800 shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                {formLoading ? "Saving Profile..." : "Save Corporate Profile"}
              </button>
            </div>

          </form>

        </div>
      ) : (
        /* System Settings Preferences Panel */
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          
          <form onSubmit={handleSaveSettingsSubmit} className="space-y-5 text-slate-700">
            
            {/* Payroll section */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                <Landmark className="w-4 h-4 text-slate-400" /> Automated Payroll Preferences
              </span>
              <p className="text-[11px] text-slate-500">NPCI loops support instant, real-time wage direct transfers. State your default routing preference below.</p>
              
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoDisburse}
                    onChange={(e) => setAutoDisburse(e.target.checked)}
                    className="rounded text-amber-500 mt-0.5"
                  />
                  <div>
                    <span className="text-xs font-black text-slate-900 block leading-tight">Authorize Auto-Disburse On-Checkout</span>
                    <span className="text-[10px] text-slate-500 font-semibold">When checked, the system instantly triggers the UPI banking portal as soon as a laborer checks-out of verified shift, skipping manual approvals.</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Notifications section */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-slate-400" /> Recruiter Mobile Alerts
              </span>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-bold text-slate-700">
                <label className="flex items-center space-x-2 p-3 bg-slate-50 border border-slate-150 rounded-xl cursor-pointer">
                  <input type="checkbox" checked={smsAlerts} onChange={(e) => setSmsAlerts(e.target.checked)} className="rounded text-amber-500" />
                  <span>SMS Mobile Job Application Alerts</span>
                </label>
                <label className="flex items-center space-x-2 p-3 bg-slate-50 border border-slate-150 rounded-xl cursor-pointer">
                  <input type="checkbox" checked={emailDigest} onChange={(e) => setEmailDigest(e.target.checked)} className="rounded text-amber-500" />
                  <span>Receive Daily Shift Attendance Digests</span>
                </label>
              </div>
            </div>

            {/* Security Passcode Pin */}
            <div className="space-y-3 pt-3 border-t border-slate-100 max-w-sm">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-slate-400" /> Recruiter Passcode PIN
              </span>
              <p className="text-[10px] text-slate-500">The 4-digit UPI passcode required to disburse manual daily wages.</p>
              
              <input
                type="password"
                maxLength={4}
                value={securityPin}
                onChange={(e) => setSecurityPin(e.target.value.replace(/\D/g, ""))}
                className="p-2.5 text-center text-lg tracking-widest font-mono border border-slate-200 rounded-xl bg-slate-50 text-slate-950 font-black focus:outline-hidden"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={formLoading}
                className="py-2.5 px-6 bg-slate-950 hover:bg-slate-850 text-amber-500 font-black text-xs uppercase rounded-xl border border-slate-800 shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                {formLoading ? "Saving Preferences..." : "Lock System Preferences"}
              </button>
            </div>

          </form>

        </div>
      )}

    </div>
  );
}
