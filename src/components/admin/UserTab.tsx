import React, { useState } from "react";
import { 
  Users, Shield, Check, Ban, Trash2, Key, Search, UserCheck, ShieldCheck, Mail, Phone, MapPin, RefreshCw
} from "lucide-react";
import { UserProfile } from "../../types";
import { db, doc, updateDoc, deleteDoc } from "../../lib/firebase";

interface UserTabProps {
  workers: UserProfile[];
  employers: UserProfile[];
  admins?: UserProfile[];
  onRefresh: () => void;
  logAction: (action: string, category: string, details: string) => Promise<void>;
}

export default function UserTab({ workers, employers, admins, onRefresh, logAction }: UserTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "worker" | "employer" | "admin">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "deactivated" | "suspended">("all");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  
  // Custom dialog and notification states to bypass iframe browser restrictions
  const [alertMessage, setAlertMessage] = useState<{ title: string; message: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  
  // Combine all users for listing
  const allUsers: UserProfile[] = [
    ...workers,
    ...employers,
    ...(admins || [])
  ];

  // Filter users
  const filteredUsers = allUsers.filter(user => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      user.name?.toLowerCase().includes(q) ||
      user.email?.toLowerCase().includes(q) ||
      user.phone?.includes(q);
    
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    
    // Check custom fields or default to active
    const userStatus = (user as any).status || "active";
    const matchesStatus = statusFilter === "all" || userStatus === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleUpdateStatus = async (user: UserProfile, newStatus: "active" | "deactivated" | "suspended") => {
    try {
      await updateDoc(doc(db, "users", user.uid), {
        status: newStatus
      });
      await logAction(
        `Updated User Status: ${user.name}`,
        "User Management",
        `Changed account status for ${user.email} (${user.role}) to "${newStatus}"`
      );
      onRefresh();
      if (selectedUser?.uid === user.uid) {
        setSelectedUser({ ...user, status: newStatus } as any);
      }
    } catch (error) {
      console.error("Error updating user status:", error);
    }
  };

  const handleUpdateRole = async (user: UserProfile, newRole: "worker" | "employer" | "admin") => {
    try {
      await updateDoc(doc(db, "users", user.uid), {
        role: newRole
      });
      await logAction(
        `Updated User Role: ${user.name}`,
        "User Management",
        `Changed role for ${user.email} from ${user.role} to ${newRole}`
      );
      onRefresh();
      if (selectedUser?.uid === user.uid) {
        setSelectedUser({ ...user, role: newRole } as any);
      }
    } catch (error) {
      console.error("Error updating user role:", error);
    }
  };

  const handleResetPassword = async (user: UserProfile) => {
    // Simulated JWT secure password reset trigger
    const mockResetLink = `https://empowork.com/reset-password?token=sec_jwt_${Math.random().toString(36).substr(2, 16)}`;
    await logAction(
      `Triggered Secure Password Reset: ${user.name}`,
      "Security / Auth",
      `Admin initiated password reset for ${user.email}. Secured reset token dispatched.`
    );
    setAlertMessage({
      title: "🔐 SECURE PASSWORD RESET TRIGGERED",
      message: `Reset link generated for ${user.name} (${user.email}):\n\n${mockResetLink}\n\nThis action has been logged in the secure admin audit log.`
    });
  };

  const handlePermanentDelete = async (user: UserProfile) => {
    setConfirmAction({
      title: "⚠️ PERMANENT REMOVAL WARNING",
      message: `Are you absolutely sure you want to permanently delete user ${user.name} (${user.email})? This operation will remove all associated credentials and profiles from the database and cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "users", user.uid));
          await logAction(
            `Permanently Removed User: ${user.name}`,
            "User Management",
            `Completely purged user record for ${user.email} from the database.`
          );
          setSelectedUser(null);
          onRefresh();
        } catch (error) {
          console.error("Error deleting user:", error);
        }
      }
    });
  };

  const handleTogglePermission = async (user: UserProfile, permission: string, currentValue: boolean) => {
    try {
      const permissions = (user as any).permissions || {};
      const updatedPermissions = { ...permissions, [permission]: !currentValue };
      
      await updateDoc(doc(db, "users", user.uid), {
        permissions: updatedPermissions
      });
      await logAction(
        `Modified Permissions: ${user.name}`,
        "Roles & Permissions",
        `Toggled permission "${permission}" to ${!currentValue} for ${user.email}`
      );
      onRefresh();
      if (selectedUser?.uid === user.uid) {
        setSelectedUser({ ...user, permissions: updatedPermissions } as any);
      }
    } catch (error) {
      console.error("Error toggling permission:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4 gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center">
            <Users className="w-5 h-5 mr-2 text-slate-900" /> User Directory & Account Authority
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Audit registered profiles, change global roles, manage administrative access tiers, and suspend malicious users.</p>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 font-mono text-[10px] font-black uppercase tracking-wider rounded-lg border border-slate-200 cursor-pointer transition-all self-start sm:self-center shrink-0"
          title="Pull latest updates from Firebase instantly"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Registry
        </button>
      </div>

      {/* Control Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 bg-white"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={roleFilter}
            onChange={(e: any) => setRoleFilter(e.target.value)}
            className="p-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 bg-white font-bold uppercase tracking-wider font-mono"
          >
            <option value="all">All Roles</option>
            <option value="worker">Workers</option>
            <option value="employer">Employers</option>
            <option value="admin">Admins</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="p-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 bg-white font-bold uppercase tracking-wider font-mono"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="deactivated">Deactivated</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Split Directory Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User List Table */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-black tracking-wider font-mono">
                  <th className="p-3">User Details</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map(user => {
                    const status = (user as any).status || "active";
                    return (
                      <tr 
                        key={user.uid} 
                        onClick={() => setSelectedUser(user)}
                        className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${selectedUser?.uid === user.uid ? "bg-amber-50/50" : ""}`}
                      >
                        <td className="p-3">
                          <div className="font-bold text-slate-900 uppercase">{user.name || "Unnamed User"}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{user.email}</div>
                        </td>
                        <td className="p-3 font-mono">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                            user.role === "admin" 
                              ? "bg-slate-900 text-amber-500" 
                              : user.role === "employer" 
                              ? "bg-indigo-100 text-indigo-800" 
                              : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                            status === "active" 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                              : status === "suspended" 
                              ? "bg-red-50 text-red-700 border border-red-200" 
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}>
                            {status}
                          </span>
                        </td>
                        <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1.5">
                            {status === "active" ? (
                              <button
                                onClick={() => handleUpdateStatus(user, "suspended")}
                                className="p-1 hover:bg-red-50 text-red-600 rounded-md border border-transparent hover:border-red-200 cursor-pointer"
                                title="Suspend Account"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateStatus(user, "active")}
                                className="p-1 hover:bg-emerald-50 text-emerald-600 rounded-md border border-transparent hover:border-emerald-200 cursor-pointer"
                                title="Activate Account"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleResetPassword(user)}
                              className="p-1 hover:bg-slate-100 text-slate-600 rounded-md border border-transparent hover:border-slate-200 cursor-pointer"
                              title="Reset Password"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handlePermanentDelete(user)}
                              className="p-1 hover:bg-red-100 text-red-600 rounded-md border border-transparent hover:border-red-200 cursor-pointer"
                              title="Delete Permanently"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400 font-bold uppercase text-[10px] tracking-wider font-mono">
                      No matching user records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Detail authority Panel */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-5 shadow-xs">
          {selectedUser ? (
            <div className="space-y-4">
              <div className="pb-3 border-b border-slate-200">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-mono block">Selected Account</span>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mt-1">{selectedUser.name}</h3>
                <span className="text-[10px] text-slate-500 font-mono block">{selectedUser.email}</span>
              </div>

              {/* Profile details list */}
              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex items-center">
                  <Phone className="w-3.5 h-3.5 mr-2 text-slate-400 shrink-0" />
                  <span className="font-mono">{selectedUser.phone || "No phone listed"}</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="w-3.5 h-3.5 mr-2 text-slate-400 shrink-0" />
                  <span>{selectedUser.location || "No location listed"}</span>
                </div>
                <div className="flex items-center">
                  <UserCheck className="w-3.5 h-3.5 mr-2 text-slate-400 shrink-0" />
                  <span className="capitalize font-bold text-slate-800">Role: {selectedUser.role}</span>
                </div>
              </div>

              {/* Action Buttons for Roles */}
              <div className="pt-3 border-t border-slate-200/60 space-y-2">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-mono block">Assign Platform Role</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["worker", "employer", "admin"] as const).map(r => (
                    <button
                      key={r}
                      onClick={() => handleUpdateRole(selectedUser, r)}
                      className={`py-1.5 px-2 rounded-lg text-[9px] font-black uppercase tracking-wider cursor-pointer border transition-all text-center ${
                        selectedUser.role === r 
                          ? "bg-slate-900 border-slate-900 text-amber-500 shadow-xs" 
                          : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced Permission toggles (RBAC) */}
              <div className="pt-3 border-t border-slate-200/60 space-y-2.5">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-mono block">Role-Based Access Control (RBAC)</span>
                
                <div className="space-y-1.5">
                  {[
                    { key: "canModerate", label: "Moderate Content & Job Listings" },
                    { key: "canPayout", label: "Release Payments & Escrows" },
                    { key: "canWrite", label: "Edit Site Details" },
                    { key: "canAudit", label: "View System Security Audit Logs" }
                  ].map(perm => {
                    const permissions = (selectedUser as any).permissions || {};
                    const hasPerm = !!permissions[perm.key];
                    return (
                      <label 
                        key={perm.key} 
                        className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 cursor-pointer transition-colors"
                      >
                        <span className="text-[10px] text-slate-700 font-bold uppercase tracking-tight">{perm.label}</span>
                        <input
                          type="checkbox"
                          checked={hasPerm}
                          onChange={() => handleTogglePermission(selectedUser, perm.key, hasPerm)}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer w-4 h-4"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Status Action Buttons */}
              <div className="pt-3 border-t border-slate-200/60 space-y-2">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-mono block">Global Account Authority</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateStatus(selectedUser, "active")}
                    className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer text-center"
                  >
                    Activate Account
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedUser, "deactivated")}
                    className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer text-center"
                  >
                    Deactivate
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedUser, "suspended")}
                    className="flex-1 py-1.5 px-2 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer text-center"
                  >
                    Suspend
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-16 text-slate-400">
              <ShieldCheck className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-xs font-black text-slate-900 uppercase tracking-wider">Select a user profile.</p>
              <p className="text-[11px] text-slate-500 mt-1">Audit permissions, adjust roles, verify identities, and manage account state.</p>
            </div>
          )}
        </div>
      </div>

      {/* Premium custom alert modal overlay */}
      {alertMessage && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl shrink-0">
                <Shield className="w-5 h-5 animate-pulse" />
              </div>
              <div className="space-y-1 w-full">
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider font-mono">{alertMessage.title}</h3>
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg font-mono text-[10px] text-slate-600 select-all break-all whitespace-pre-line leading-relaxed">
                  {alertMessage.message}
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setAlertMessage(null)}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-900 text-amber-500 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium custom delete confirmation overlay */}
      {confirmAction && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-red-50 text-red-600 rounded-xl shrink-0">
                <Trash2 className="w-5 h-5 animate-bounce" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider font-mono">{confirmAction.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{confirmAction.message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button 
                onClick={() => setConfirmAction(null)}
                className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  confirmAction.onConfirm();
                  setConfirmAction(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
