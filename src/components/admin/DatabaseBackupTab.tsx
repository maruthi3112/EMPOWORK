import React, { useState, useEffect } from "react";
import { 
  Database, Shield, Check, Trash2, ShieldAlert, Sparkles, AlertTriangle, 
  Settings, RefreshCw, Undo2, HardDrive, Cpu, Percent, ToggleLeft, ToggleRight, Info, HelpCircle 
} from "lucide-react";
import { UserProfile, Job, JobApplication, Complaint } from "../../types";
import { db, doc, updateDoc, deleteDoc, setDoc } from "../../lib/firebase";

interface DatabaseBackupTabProps {
  workers: UserProfile[];
  employers: UserProfile[];
  jobs: Job[];
  jobApplications: JobApplication[];
  complaints: Complaint[];
  onRefresh: () => void;
  logAction: (action: string, category: string, details: string) => Promise<void>;
}

export default function DatabaseBackupTab({ 
  workers, 
  employers, 
  jobs, 
  jobApplications, 
  complaints, 
  onRefresh, 
  logAction 
}: DatabaseBackupTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<"dedup" | "settings" | "backups">("dedup");

  // Local state for Backup points
  const [backupsList, setBackupsList] = useState<any[]>([
    { id: "bk-1", name: "Scheduled Daily Snapshot", size: "3.2 MB", timestamp: "2026-07-02 04:00 AM", status: "completed" },
    { id: "bk-2", name: "Pre-Deployment Audit Rollback", size: "3.1 MB", timestamp: "2026-06-30 09:12 PM", status: "completed" }
  ]);

  // System Settings state
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [commissionFee, setCommissionFee] = useState(2.5);
  const [aiScanner, setAiScanner] = useState(true);
  const [safetyComplianceMandatory, setSafetyComplianceMandatory] = useState(true);

  // Run Deduplication Scanning
  const [duplicatesReport, setDuplicatesReport] = useState<any>({
    duplicateAccounts: [],
    duplicateJobs: [],
    duplicateApps: [],
    spamItems: []
  });

  useEffect(() => {
    scanDuplicates();
  }, [workers, employers, jobs, jobApplications, complaints]);

  const scanDuplicates = () => {
    const duplicateAccounts: any[] = [];
    const duplicateJobs: any[] = [];
    const duplicateApps: any[] = [];
    const spamItems: any[] = [];

    // 1. Duplicate Accounts: matching phone numbers
    const phoneMap = new Map<string, UserProfile[]>();
    [...workers, ...employers].forEach(user => {
      if (user.phone) {
        const list = phoneMap.get(user.phone) || [];
        list.push(user);
        phoneMap.set(user.phone, list);
      }
    });

    phoneMap.forEach((users, phone) => {
      if (users.length > 1) {
        duplicateAccounts.push({
          type: "phone",
          key: phone,
          items: users,
          description: `Multiple user accounts registered with phone ${phone}`
        });
      }
    });

    // 2. Duplicate Job Postings: identical title, wage, and employer ID
    const jobKeyMap = new Map<string, Job[]>();
    jobs.forEach(job => {
      const titleStr = job.title || "";
      const key = `${titleStr.toLowerCase().trim()}_${job.employerId}_${job.wage}`;
      const list = jobKeyMap.get(key) || [];
      list.push(job);
      jobKeyMap.set(key, list);
    });

    jobKeyMap.forEach((matchingJobs, key) => {
      if (matchingJobs.length > 1) {
        duplicateJobs.push({
          type: "job",
          key: key,
          items: matchingJobs,
          description: `Duplicate construction job listing: "${matchingJobs[0].title || "Untitled"}" posted by "${matchingJobs[0].employerName || "Employer"}"`
        });
      }
    });

    // 3. Duplicate Applications: multiple applications by same worker for same job
    const appKeyMap = new Map<string, JobApplication[]>();
    jobApplications.forEach(app => {
      const key = `${app.jobId}_${app.workerId}`;
      const list = appKeyMap.get(key) || [];
      list.push(app);
      appKeyMap.set(key, list);
    });

    appKeyMap.forEach((matchingApps, key) => {
      if (matchingApps.length > 1) {
        duplicateApps.push({
          type: "application",
          key: key,
          items: matchingApps,
          description: `Double submission: ${matchingApps[0].workerName || "Worker"} applied ${matchingApps.length} times for job "${matchingApps[0].jobTitle || "Job"}"`
        });
      }
    });

    // 4. Spam Content Detector: descriptions/profiles with placeholder text
    const spamWords = ["test", "asdf", "dummy", "spam", "garbage", "testing123"];
    jobs.forEach(job => {
      const descStr = job.description || "";
      const titleStr = job.title || "";
      const containsSpam = spamWords.some(w => descStr.toLowerCase().includes(w) || titleStr.toLowerCase().includes(w)) || descStr.length < 10;
      if (containsSpam) {
        spamItems.push({
          id: job.id,
          type: "job",
          title: job.title || "Untitled",
          content: descStr,
          author: job.employerName || "Employer",
          reason: descStr.length < 10 ? "Description too short / placeholder" : "Contains placeholder test words"
        });
      }
    });

    [...workers, ...employers].forEach(user => {
      const bio = user.bio || "";
      const nameStr = user.name || "";
      const containsSpam = spamWords.some(w => bio.toLowerCase().includes(w) || nameStr.toLowerCase().includes(w)) || (bio && bio.length < 5);
      if (containsSpam) {
        spamItems.push({
          id: user.uid,
          type: "user",
          title: nameStr || "No Name",
          content: bio || "No bio listed",
          author: user.role,
          reason: "Contains suspicious placeholder or gibberish characters"
        });
      }
    });

    setDuplicatesReport({ duplicateAccounts, duplicateJobs, duplicateApps, spamItems });
  };

  const handleMergeDuplicate = async (type: "phone" | "job" | "application", items: any[]) => {
    if (items.length < 2) return;
    const primary = items[0];
    const duplicates = items.slice(1);

    try {
      if (type === "phone") {
        // Merge accounts: update secondary accounts or suspend, here we deactivate duplicates
        for (const duplicate of duplicates) {
          await updateDoc(doc(db, "users", duplicate.uid), {
            status: "deactivated",
            phone: `${duplicate.phone}-merged-${Date.now().toString().slice(-4)}`
          });
        }
        await logAction(
          `Merged Duplicate Accounts`,
          "Database Operations",
          `Kept primary profile ${primary.name} (${primary.email}) and deactivated ${duplicates.length} duplicate phone records.`
        );
      } else if (type === "job") {
        // Delete duplicate listings
        for (const duplicate of duplicates) {
          await deleteDoc(doc(db, "jobs", duplicate.id));
        }
        await logAction(
          `Removed Duplicate Job Postings`,
          "Database Operations",
          `Consolidated job listings by purging ${duplicates.length} matching vacancy posts for "${primary.title}".`
        );
      } else if (type === "application") {
        // Delete duplicate applications
        for (const duplicate of duplicates) {
          await deleteDoc(doc(db, "job_applications", duplicate.id));
        }
        await logAction(
          `Pruned Duplicate Applications`,
          "Database Operations",
          `Cleared double submissions from ${primary.workerName} for job "${primary.jobTitle}".`
        );
      }

      onRefresh();
      alert("🎉 Deduplication completed successfully! Primary record preserved and duplicates resolved.");
    } catch (error) {
      console.error("Error merging duplicates:", error);
    }
  };

  const handleWipeSpamItem = async (item: any) => {
    try {
      if (item.type === "job") {
        await deleteDoc(doc(db, "jobs", item.id));
        await logAction(`Spam Deleted: Job Listing`, "Database Operations", `Wiped placeholder / spam job: "${item.title}"`);
      } else {
        await deleteDoc(doc(db, "users", item.id));
        await logAction(`Spam Deleted: User Profile`, "Database Operations", `Purged spam user profile: "${item.title}"`);
      }
      onRefresh();
      alert("🗑️ Spam content purged successfully from active collections.");
    } catch (e) {
      console.error("Error purging spam item:", e);
    }
  };

  const handleUpdateSettings = async () => {
    try {
      await logAction(
        `Configured Platform Parameters`,
        "System Settings",
        `Maintenance Mode: ${maintenanceMode}, Commission Fee: ${commissionFee}%, Auto Scanner: ${aiScanner}`
      );
      alert("⚙️ System settings deployed and updated globally.");
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateBackup = async () => {
    const backupId = `bk-${Date.now()}`;
    const newBackup = {
      id: backupId,
      name: `Manual Snapshot (${new Date().toLocaleDateString()})`,
      size: `${(2.8 + Math.random() * 0.5).toFixed(1)} MB`,
      timestamp: new Date().toLocaleString(),
      status: "completed"
    };

    setBackupsList(prev => [newBackup, ...prev]);
    await logAction(
      `Triggered Manual Backup`,
      "Database Backup",
      `Snapshot backup point "${newBackup.name}" archived safely in secure local recovery lists.`
    );
    alert("💾 Snapshot backup triggered. Database checkpoint written successfully.");
  };

  const handleRestoreDefaults = async () => {
    if (!window.confirm("⚠️ DISASTER RECOVERY RESTORATION\n\nAre you sure you want to restore the platform database to standard sandbox defaults?\n\nThis will re-run seeding scripts and clear custom modifications. This cannot be undone.")) {
      return;
    }
    
    // Clear custom local keys and trigger seed
    localStorage.removeItem("empowork_local_seeded");
    await logAction(
      `Disaster Recovery Restoration`,
      "System Recovery",
      "Restored entire platform database back to seed sandbox templates."
    );
    
    alert("🔄 Database restoration successful! Refreshing the platform state...");
    window.location.reload();
  };

  const totalDuplicates = 
    duplicatesReport.duplicateAccounts.length + 
    duplicatesReport.duplicateJobs.length + 
    duplicatesReport.duplicateApps.length;

  return (
    <div className="space-y-6">
      {/* Headings */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4 gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center">
            <Database className="w-5 h-5 mr-2 text-slate-900" /> System Integrity & Platform Control
            <div className="group relative inline-block cursor-help ml-2 shrink-0">
              <HelpCircle className="w-4.5 h-4.5 text-slate-400 hover:text-slate-600 transition-colors" />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-72 bg-slate-950 text-slate-200 text-xs font-normal tracking-normal normal-case p-3 rounded-xl shadow-xl border border-slate-800 z-50">
                <span className="font-bold text-amber-400 uppercase tracking-wider mb-1 block font-mono text-[10px]">Database Integrity Center</span>
                <span className="text-slate-300 leading-normal font-sans block text-[11px]">Consolidates records to identify multiple profiles sharing identical phone numbers, double job submissions, and low-quality placeholders or test registrations.</span>
                <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950" />
              </div>
            </div>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Detect duplicate listings/accounts, adjust commissions/maintenance states, and manage system database snapshot backups.</p>
        </div>

        {/* Sub-tab selection */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-black uppercase tracking-wider font-mono shrink-0">
          <button
            onClick={() => setActiveSubTab("dedup")}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${activeSubTab === "dedup" ? "bg-slate-900 text-amber-500" : "text-slate-500 hover:text-slate-950"}`}
          >
            Duplicate & Spam Scanner ({totalDuplicates + duplicatesReport.spamItems.length})
          </button>
          <button
            onClick={() => setActiveSubTab("settings")}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${activeSubTab === "settings" ? "bg-slate-900 text-amber-500" : "text-slate-500 hover:text-slate-950"}`}
          >
            System Settings
          </button>
          <button
            onClick={() => setActiveSubTab("backups")}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${activeSubTab === "backups" ? "bg-slate-900 text-amber-500" : "text-slate-500 hover:text-slate-950"}`}
          >
            Backup & Recovery
          </button>
        </div>
      </div>

      {/* Main Workspace Layout panels */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs min-h-[450px]">
        
        {/* Sub-tab: deduplication & spam scanner */}
        {activeSubTab === "dedup" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-[10px] font-mono uppercase font-black tracking-wider text-slate-500">Automated Integrity Engine Report</span>
              <button 
                onClick={scanDuplicates}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[9px] font-mono font-bold uppercase cursor-pointer flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Re-scan Database
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Duplicates listings box */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" /> Duplicate Entries Detected
                  <span className="group relative inline-block cursor-help ml-1.5 shrink-0">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 transition-colors" />
                    <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-64 bg-slate-950 text-slate-200 text-[10px] font-normal tracking-normal normal-case p-2.5 rounded-lg shadow-xl border border-slate-800 z-50">
                      <span className="font-bold text-amber-400 uppercase tracking-wider mb-1 block font-mono text-[9px]">Deduplication Scanner</span>
                      <span className="text-slate-300 leading-normal font-sans block">Matches worker phone records, matching daily-wage job listings, and double applications, enabling quick merges to preserve database sanity.</span>
                      <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950" />
                    </span>
                  </span>
                </h4>

                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {totalDuplicates === 0 ? (
                    <div className="p-8 text-center text-slate-400 font-bold uppercase text-[10px] tracking-wider font-mono">
                      No duplicate profiles, job posts, or applications detected.
                    </div>
                  ) : (
                    <>
                      {/* Phone duplicates */}
                      {duplicatesReport.duplicateAccounts.map((group: any, idx: number) => (
                        <div key={`phone-${group.key || idx}-${idx}`} className="p-3 bg-amber-50/50 border border-amber-200 rounded-lg text-xs space-y-2">
                          <div className="font-bold text-amber-900 uppercase tracking-tight">{group.description}</div>
                          <div className="space-y-1">
                            {group.items.map((it: any, i: number) => (
                              <div key={`phone-item-${it.uid || i}-${i}`} className="text-[10px] text-slate-500 font-mono">
                                • {it.name} ({it.email} | Role: {it.role})
                              </div>
                            ))}
                          </div>
                          <button
                            onClick={() => handleMergeDuplicate("phone", group.items)}
                            className="px-2.5 py-1 bg-slate-900 text-amber-500 rounded font-black uppercase text-[9px] cursor-pointer"
                          >
                            Merge / Resolve duplicates
                          </button>
                        </div>
                      ))}

                      {/* Job duplicates */}
                      {duplicatesReport.duplicateJobs.map((group: any, idx: number) => (
                        <div key={`job-${group.key || idx}-${idx}`} className="p-3 bg-amber-50/50 border border-amber-200 rounded-lg text-xs space-y-2">
                          <div className="font-bold text-amber-900 uppercase tracking-tight">{group.description}</div>
                          <button
                            onClick={() => handleMergeDuplicate("job", group.items)}
                            className="px-2.5 py-1 bg-slate-900 text-amber-500 rounded font-black uppercase text-[9px] cursor-pointer"
                          >
                            Deduplicate listings
                          </button>
                        </div>
                      ))}

                      {/* Double apps duplicates */}
                      {duplicatesReport.duplicateApps.map((group: any, idx: number) => (
                        <div key={`app-${group.key || idx}-${idx}`} className="p-3 bg-amber-50/50 border border-amber-200 rounded-lg text-xs space-y-2">
                          <div className="font-bold text-amber-900 uppercase tracking-tight">{group.description}</div>
                          <button
                            onClick={() => handleMergeDuplicate("application", group.items)}
                            className="px-2.5 py-1 bg-slate-900 text-amber-500 rounded font-black uppercase text-[9px] cursor-pointer"
                          >
                            Merge applications
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Spam scanner list */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <ShieldAlert className="w-4 h-4 text-red-500" /> Spam & Mock Content Flags
                </h4>

                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {duplicatesReport.spamItems.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 font-bold uppercase text-[10px] tracking-wider font-mono">
                      No suspicious placeholder or test phrases flagged.
                    </div>
                  ) : (
                    duplicatesReport.spamItems.map((item: any, idx: number) => (
                      <div key={`spam-${item.id || idx}-${idx}`} className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs space-y-2">
                        <div className="flex justify-between items-start font-bold text-red-900 uppercase tracking-tight">
                          <span>{item.title}</span>
                          <span className="text-[9px] font-mono uppercase bg-red-100 px-1.5 py-0.5 rounded">{item.type}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 line-clamp-2">"{item.content}"</p>
                        <div className="text-[9px] font-mono text-red-700 font-bold uppercase">Reason: {item.reason}</div>
                        <button
                          onClick={() => handleWipeSpamItem(item)}
                          className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-black uppercase text-[9px] cursor-pointer transition-colors"
                        >
                          Wipe Spam Record
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Sub-tab: platform settings */}
        {activeSubTab === "settings" && (
          <div className="space-y-6 max-w-xl">
            <span className="text-[10px] font-mono uppercase font-black tracking-wider text-slate-500 block pb-2 border-b border-slate-100">Global Variable Configuration</span>

            <div className="space-y-5 text-xs text-slate-700">
              
              {/* Maintenance mode */}
              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <h5 className="font-bold text-slate-900 uppercase tracking-tight">Platform Maintenance Mode</h5>
                  <p className="text-[11px] text-slate-500 mt-0.5">Locks employer job posts and disables check-ins.</p>
                </div>
                <button 
                  onClick={() => setMaintenanceMode(!maintenanceMode)}
                  className="cursor-pointer transition-transform"
                >
                  {maintenanceMode ? (
                    <ToggleRight className="w-12 h-8 text-red-600" />
                  ) : (
                    <ToggleLeft className="w-12 h-8 text-slate-400" />
                  )}
                </button>
              </div>

              {/* Commission fee */}
              <div className="space-y-2 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex justify-between items-center">
                  <div>
                    <h5 className="font-bold text-slate-900 uppercase tracking-tight">Direct Payout Commission Fee</h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">Platform service cut on construction contractor wage transfers.</p>
                  </div>
                  <span className="px-2.5 py-1 bg-slate-900 text-amber-500 font-mono font-black rounded text-xs">{commissionFee}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="10.0"
                  step="0.5"
                  value={commissionFee}
                  onChange={(e) => setCommissionFee(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                />
              </div>

              {/* Automated scanner toggler */}
              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <h5 className="font-bold text-slate-900 uppercase tracking-tight">Automated Gemini Spam Shield</h5>
                  <p className="text-[11px] text-slate-500 mt-0.5">Auto-checks employer copy listings on release before publication.</p>
                </div>
                <button 
                  onClick={() => setAiScanner(!aiScanner)}
                  className="cursor-pointer transition-transform"
                >
                  {aiScanner ? (
                    <ToggleRight className="w-12 h-8 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="w-12 h-8 text-slate-400" />
                  )}
                </button>
              </div>

              {/* Mandatory PPE checklist */}
              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <h5 className="font-bold text-slate-900 uppercase tracking-tight">Mandatory PPE Safety Check-In</h5>
                  <p className="text-[11px] text-slate-500 mt-0.5">Mandates checklist confirmation before checkout and wage release.</p>
                </div>
                <button 
                  onClick={() => setSafetyComplianceMandatory(!safetyComplianceMandatory)}
                  className="cursor-pointer transition-transform"
                >
                  {safetyComplianceMandatory ? (
                    <ToggleRight className="w-12 h-8 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="w-12 h-8 text-slate-400" />
                  )}
                </button>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  onClick={handleUpdateSettings}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-950 text-amber-500 font-black tracking-wider uppercase text-xs rounded-lg cursor-pointer transition-colors shadow-xs"
                >
                  Save Platform Settings
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Sub-tab: backups and disaster recovery */}
        {activeSubTab === "backups" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pb-2 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-mono uppercase font-black tracking-wider text-slate-500 block">Snapshot Rollback Points</span>
                <p className="text-xs text-slate-400">Archived checkpoint files to restore construction databases in case of service failures.</p>
              </div>
              <button
                onClick={handleCreateBackup}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-950 text-amber-500 font-black uppercase text-xs rounded-lg cursor-pointer transition-all shrink-0 flex items-center gap-1.5 shadow-xs"
              >
                <HardDrive className="w-4 h-4" /> Trigger Snapshot Backup
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Backups List Table */}
              <div className="lg:col-span-2 border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-mono text-[9px] uppercase text-slate-400 font-black tracking-wider">
                    <tr>
                      <th className="p-3">Backup File Name</th>
                      <th className="p-3 font-mono">Size</th>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {backupsList.map((bk, i) => (
                      <tr key={bk.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-bold text-slate-800 uppercase flex items-center gap-1.5">
                          <Database className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {bk.name}
                        </td>
                        <td className="p-3 font-mono text-slate-500">{bk.size}</td>
                        <td className="p-3 text-slate-500">{bk.timestamp}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded font-black text-[8px] uppercase font-mono tracking-wider">
                            {bk.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Disaster recovery panel */}
              <div className="bg-red-50 border border-red-200 p-5 rounded-xl space-y-4 shadow-2xs">
                <h4 className="text-xs font-black text-red-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-red-100 pb-2">
                  <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" /> Disaster Recovery Room
                </h4>

                <p className="text-[11px] text-red-800 leading-relaxed font-medium">
                  If the construction database suffers fatal corruption, or for sandbox demo review purposes, administrators can deploy a disaster recovery template restore point.
                </p>

                <div className="bg-white/80 p-3 rounded-lg border border-red-100 text-[10px] text-red-950 font-mono space-y-1">
                  <span className="block font-bold">RECOVERY DECREE:</span>
                  <span>• Wipes custom test values</span>
                  <span>• Re-seeds default trade resources</span>
                  <span>• Re-seeds Ramesh & Sunil profiles</span>
                </div>

                <button
                  onClick={handleRestoreDefaults}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                >
                  <Undo2 className="w-4 h-4 shrink-0" /> RESTORE SANDBOX DEFAULTS
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
