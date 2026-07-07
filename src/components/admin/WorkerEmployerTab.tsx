import React, { useState } from "react";
import { 
  Users, Check, X, Shield, Star, Award, Search, UserCheck, ShieldAlert, 
  MapPin, Phone, Briefcase, FileText, Calendar, Plus, Info, RefreshCw
} from "lucide-react";
import { UserProfile } from "../../types";
import { db, doc, updateDoc } from "../../lib/firebase";

interface WorkerEmployerTabProps {
  workers: UserProfile[];
  employers: UserProfile[];
  onRefresh: () => void;
  logAction: (action: string, category: string, details: string) => Promise<void>;
}

export default function WorkerEmployerTab({ workers, employers, onRefresh, logAction }: WorkerEmployerTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<"workers" | "employers">("workers");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [newBadge, setNewBadge] = useState("");

  const filteredWorkers = workers.filter(w => {
    const q = searchQuery.toLowerCase().trim();
    return !q ||
      w.name?.toLowerCase().includes(q) || 
      w.trade?.toLowerCase().includes(q) ||
      w.location?.toLowerCase().includes(q);
  });

  const filteredEmployers = employers.filter(e => {
    const q = searchQuery.toLowerCase().trim();
    return !q ||
      e.name?.toLowerCase().includes(q) || 
      e.companyName?.toLowerCase().includes(q) ||
      e.location?.toLowerCase().includes(q);
  });

  const handleVerifyIdentity = async (user: UserProfile, isVerified: boolean) => {
    try {
      await updateDoc(doc(db, "users", user.uid), {
        identityVerified: isVerified
      });
      await logAction(
        `${isVerified ? "Verified" : "Revoked"} Identity: ${user.name}`,
        "Worker & Employer",
        `Admin evaluated credentials and set identity verification to ${isVerified} for ${user.email}`
      );
      onRefresh();
      if (selectedProfile?.uid === user.uid) {
        setSelectedProfile({ ...user, identityVerified: isVerified } as any);
      }
    } catch (error) {
      console.error("Error verifying identity:", error);
    }
  };

  const handleVerifyBusiness = async (user: UserProfile, isVerified: boolean) => {
    try {
      await updateDoc(doc(db, "users", user.uid), {
        businessVerified: isVerified
      });
      await logAction(
        `${isVerified ? "Approved" : "Rejected"} Business Filings: ${user.name}`,
        "Worker & Employer",
        `Admin updated corporate registration verification to ${isVerified} for company ${user.companyName || user.name}`
      );
      onRefresh();
      if (selectedProfile?.uid === user.uid) {
        setSelectedProfile({ ...user, businessVerified: isVerified } as any);
      }
    } catch (error) {
      console.error("Error verifying business:", error);
    }
  };

  const handleAddSkillBadge = async (user: UserProfile) => {
    if (!newBadge.trim()) return;
    try {
      const skillsList = user.skills || [];
      if (skillsList.includes(newBadge.trim())) {
        alert("This skill badge is already verified for this worker.");
        return;
      }
      const updatedSkills = [...skillsList, newBadge.trim()];
      await updateDoc(doc(db, "users", user.uid), {
        skills: updatedSkills
      });
      await logAction(
        `Added Verified Skill Badge: ${user.name}`,
        "Worker & Employer",
        `Assigned verified badge "${newBadge.trim()}" to worker ${user.email}`
      );
      setNewBadge("");
      onRefresh();
      if (selectedProfile?.uid === user.uid) {
        setSelectedProfile({ ...user, skills: updatedSkills } as any);
      }
    } catch (error) {
      console.error("Error adding skill badge:", error);
    }
  };

  const handleRemoveSkillBadge = async (user: UserProfile, badge: string) => {
    try {
      const updatedSkills = (user.skills || []).filter(s => s !== badge);
      await updateDoc(doc(db, "users", user.uid), {
        skills: updatedSkills
      });
      await logAction(
        `Removed Skill Badge: ${user.name}`,
        "Worker & Employer",
        `Removed badge "${badge}" from worker ${user.email}`
      );
      onRefresh();
      if (selectedProfile?.uid === user.uid) {
        setSelectedProfile({ ...user, skills: updatedSkills } as any);
      }
    } catch (error) {
      console.error("Error removing skill badge:", error);
    }
  };

  const handleAdjustSafetyRating = async (user: UserProfile, newRating: number) => {
    try {
      await updateDoc(doc(db, "users", user.uid), {
        safetyRating: newRating
      });
      await logAction(
        `Adjusted Safety Compliance Rate: ${user.name}`,
        "Worker & Employer",
        `Updated official platform safety rate to ${newRating}/5 stars for employer ${user.companyName || user.name}`
      );
      onRefresh();
      if (selectedProfile?.uid === user.uid) {
        setSelectedProfile({ ...user, safetyRating: newRating } as any);
      }
    } catch (error) {
      console.error("Error updating safety rating:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab bar header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4 gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center">
            <Shield className="w-5 h-5 mr-2 text-slate-900" /> Registrant Credentials & Verification Portal
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Evaluate national identity files, approve corporate registrations, award trade credentials, and audit safety scores.</p>
        </div>

        {/* Sub-tab Selectors & Refresh Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
          <button
            onClick={onRefresh}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 font-mono text-[10px] font-black uppercase tracking-wider rounded-lg border border-slate-200 cursor-pointer transition-all shrink-0"
            title="Pull latest updates from Firebase instantly"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Portal
          </button>

          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-black uppercase tracking-wider font-mono shrink-0">
            <button
              onClick={() => { setActiveSubTab("workers"); setSelectedProfile(null); }}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${activeSubTab === "workers" ? "bg-slate-900 text-amber-500" : "text-slate-500 hover:text-slate-950"}`}
            >
              Worker Verification ({workers.length})
            </button>
            <button
              onClick={() => { setActiveSubTab("employers"); setSelectedProfile(null); }}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${activeSubTab === "employers" ? "bg-slate-900 text-amber-500" : "text-slate-500 hover:text-slate-950"}`}
            >
              Employer Verification ({employers.length})
            </button>
          </div>
        </div>
      </div>

      {/* Search Console */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder={`Search ${activeSubTab === "workers" ? "workers by name, trade, location..." : "employers by name, company, city..."}`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 bg-white"
        />
      </div>

      {/* Grid workspace split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Registry Selection Panel */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            {activeSubTab === "workers" ? (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-black tracking-wider font-mono">
                    <th className="p-3">Worker Name</th>
                    <th className="p-3">Trade Specialty</th>
                    <th className="p-3">ID Verification</th>
                    <th className="p-3">Verified Badges</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredWorkers.length > 0 ? (
                    filteredWorkers.map((w, idx) => {
                      const isVerified = !!(w as any).identityVerified;
                      return (
                        <tr 
                          key={`${w.uid || idx}-${idx}`}
                          onClick={() => setSelectedProfile(w)}
                          className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${selectedProfile?.uid === w.uid ? "bg-amber-50/50" : ""}`}
                        >
                          <td className="p-3">
                            <div className="font-bold text-slate-900 uppercase">{w.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{w.email}</div>
                          </td>
                          <td className="p-3 font-medium capitalize">{w.trade || "General Laborer"}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                              isVerified 
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                : "bg-red-50 text-red-700 border border-red-200"
                            }`}>
                              {isVerified ? "VERIFIED" : "PENDING AUDIT"}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1">
                              {w.skills && w.skills.length > 0 ? (
                                w.skills.slice(0, 2).map((skill, i) => (
                                  <span key={i} className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded text-[9px] font-bold uppercase tracking-tight">{skill}</span>
                                ))
                              ) : (
                                <span className="text-slate-400 text-[10px]">None</span>
                              )}
                              {w.skills && w.skills.length > 2 && <span className="text-[9px] font-black text-slate-400">+{w.skills.length - 2}</span>}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400 font-bold uppercase text-[10px] tracking-wider font-mono">No workers registered.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-black tracking-wider font-mono">
                    <th className="p-3">Company Details</th>
                    <th className="p-3">Contractor Type</th>
                    <th className="p-3">Corporate ID Status</th>
                    <th className="p-3">Safety Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployers.length > 0 ? (
                    filteredEmployers.map((e, idx) => {
                      const isVerified = !!(e as any).businessVerified;
                      const safetyRating = (e as any).safetyRating || 5;
                      return (
                        <tr 
                          key={`${e.uid || idx}-${idx}`}
                          onClick={() => setSelectedProfile(e)}
                          className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${selectedProfile?.uid === e.uid ? "bg-amber-50/50" : ""}`}
                        >
                          <td className="p-3">
                            <div className="font-bold text-slate-900 uppercase">{e.companyName || `${e.name} Contractors`}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{e.name} • {e.email}</div>
                          </td>
                          <td className="p-3 capitalize text-slate-500 font-medium">{e.businessType || "General Contractor"}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                              isVerified 
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                : "bg-red-50 text-red-700 border border-red-200"
                            }`}>
                              {isVerified ? "APPROVED" : "PENDING AUDIT"}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center text-amber-500 font-bold">
                              <Star className="w-3.5 h-3.5 fill-amber-500 mr-1" />
                              {safetyRating}.0/5
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400 font-bold uppercase text-[10px] tracking-wider font-mono">No employers registered.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Verification and Audit Details Right panel */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-5 shadow-xs">
          {selectedProfile ? (
            <div className="space-y-4">
              <div className="pb-3 border-b border-slate-200">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-mono block">Auditing Profile</span>
                <h3 className="text-sm font-black text-slate-900 uppercase mt-1">
                  {activeSubTab === "workers" ? selectedProfile.name : (selectedProfile.companyName || `${selectedProfile.name} Contractors`)}
                </h3>
                <span className="text-[10px] text-slate-500 font-mono block">{selectedProfile.email}</span>
              </div>

              {/* Identity Document Review Mock Panel */}
              <div className="bg-slate-900 border border-slate-950 p-4 rounded-lg text-slate-100 space-y-2">
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-800">
                  <span className="text-[9px] font-black uppercase text-amber-400 tracking-wider font-mono flex items-center">
                    <FileText className="w-3.5 h-3.5 mr-1 text-amber-400" /> National ID Verification
                  </span>
                  <span className="text-[8px] font-mono uppercase bg-slate-800 px-2 py-0.5 rounded text-slate-400">
                    Aadhar / PAN Matcher
                  </span>
                </div>

                <div className="space-y-1 text-[10px] font-mono text-slate-300 leading-relaxed">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Holder Name:</span>
                    <span className="text-white uppercase">{selectedProfile.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Document No:</span>
                    <span>XXXX-XXXX-{selectedProfile.phone ? selectedProfile.phone.slice(-4) : "8812"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Photo Similarity:</span>
                    <span className="text-emerald-400 font-bold">98.4% Match</span>
                  </div>
                </div>

                {/* Approve/Reject ID action buttons */}
                <div className="flex gap-2 pt-2">
                  {activeSubTab === "workers" ? (
                    <>
                      <button
                        onClick={() => handleVerifyIdentity(selectedProfile, true)}
                        className={`flex-1 py-1 px-2 rounded font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          (selectedProfile as any).identityVerified 
                            ? "bg-emerald-600 text-white" 
                            : "bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700"
                        }`}
                      >
                        <Check className="w-3 h-3" /> Approve ID
                      </button>
                      <button
                        onClick={() => handleVerifyIdentity(selectedProfile, false)}
                        className="py-1 px-2.5 rounded bg-slate-800 hover:bg-slate-700 text-red-400 border border-slate-700 font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1"
                      >
                        <X className="w-3 h-3" /> Reject
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleVerifyBusiness(selectedProfile, true)}
                        className={`flex-1 py-1 px-2 rounded font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          (selectedProfile as any).businessVerified 
                            ? "bg-emerald-600 text-white" 
                            : "bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700"
                        }`}
                      >
                        <Check className="w-3 h-3" /> Approve Filing
                      </button>
                      <button
                        onClick={() => handleVerifyBusiness(selectedProfile, false)}
                        className="py-1 px-2.5 rounded bg-slate-800 hover:bg-slate-700 text-red-400 border border-slate-700 font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1"
                      >
                        <X className="w-3 h-3" /> Reject
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Worker Specific Badging */}
              {activeSubTab === "workers" && (
                <div className="space-y-3 pt-3 border-t border-slate-200/60">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-mono block">Award Verified Trade Badges</span>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Verified Mason, Certified Electrician"
                      value={newBadge}
                      onChange={(e) => setNewBadge(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                    />
                    <button
                      onClick={() => handleAddSkillBadge(selectedProfile)}
                      className="px-3 py-1.5 bg-slate-900 text-amber-500 rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Active Skill List */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block font-mono">Current Badges ({selectedProfile.skills?.length || 0})</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedProfile.skills && selectedProfile.skills.length > 0 ? (
                        selectedProfile.skills.map((skill, i) => (
                          <span 
                            key={i} 
                            onClick={() => handleRemoveSkillBadge(selectedProfile, skill)}
                            className="px-2 py-1 bg-slate-100 border border-slate-200 text-slate-800 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 hover:bg-red-50 hover:text-red-600 hover:border-red-200 cursor-pointer transition-colors"
                            title="Click to remove badge"
                          >
                            <Award className="w-3 h-3 shrink-0" />
                            {skill}
                            <X className="w-2.5 h-2.5 shrink-0 opacity-60" />
                          </span>
                        ))
                      ) : (
                        <div className="text-[10px] text-slate-400 italic">No verified trade badges yet. Write one above to issue.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Employer Specific Safety Slider */}
              {activeSubTab === "employers" && (
                <div className="space-y-3 pt-3 border-t border-slate-200/60">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-mono block">Safety Compliance Star Rating</span>
                    <span className="text-xs font-mono font-black text-amber-600 uppercase">{(selectedProfile as any).safetyRating || 5}.0 Stars</span>
                  </div>
                  
                  <div className="space-y-1.5">
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="1"
                      value={(selectedProfile as any).safetyRating || 5}
                      onChange={(e) => handleAdjustSafetyRating(selectedProfile, parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                    />
                    <div className="flex justify-between text-[8px] font-mono text-slate-400 font-bold">
                      <span>LEVEL 1 (CRITICAL RISKS)</span>
                      <span>LEVEL 5 (ZERO-ACCIDENT SITE)</span>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-[10px] text-amber-900 flex items-start gap-1.5 leading-relaxed font-medium">
                    <Info className="w-3.5 h-3.5 shrink-0 text-amber-600 mt-0.5" />
                    <span>Updating this rating directly impacts the employer's visible safety score, affecting their priority search standing and worker registration rates.</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-16 text-slate-400">
              <Users className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-xs font-black text-slate-900 uppercase tracking-wider">Select a profile from the directory.</p>
              <p className="text-[11px] text-slate-500 mt-1">Audit verification documents, approve platform filings, and configure verified tags.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
