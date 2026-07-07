import React, { useState } from "react";
import { 
  Briefcase, FileText, Check, Ban, Trash2, Search, Calendar, MapPin, 
  User, CheckCircle2, AlertTriangle, XCircle, ChevronRight, Info 
} from "lucide-react";
import { Job, JobApplication } from "../../types";
import { db, doc, updateDoc, deleteDoc } from "../../lib/firebase";

interface JobsApplicationsTabProps {
  jobs: Job[];
  jobApplications: JobApplication[];
  onRefresh: () => void;
  logAction: (action: string, category: string, details: string) => Promise<void>;
}

export default function JobsApplicationsTab({ jobs, jobApplications, onRefresh, logAction }: JobsApplicationsTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<"jobs" | "applications">("jobs");
  const [searchQuery, setSearchQuery] = useState("");
  const [jobStatusFilter, setJobStatusFilter] = useState<"all" | "pending_approval" | "open" | "active" | "completed" | "cancelled">("all");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);

  // Filter jobs
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = 
      job.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.employerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Status filter
    const status = (job as any).status || "open";
    const matchesStatus = jobStatusFilter === "all" || status === jobStatusFilter;

    return matchesSearch && matchesStatus;
  });

  // Filter applications
  const filteredApplications = jobApplications.filter(app => 
    app.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.workerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.employerName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUpdateJobStatus = async (job: Job, newStatus: "open" | "active" | "completed" | "cancelled") => {
    try {
      await updateDoc(doc(db, "jobs", job.id), {
        status: newStatus
      });
      await logAction(
        `Moderated Job Status: ${job.title}`,
        "Job Management",
        `Set job status to "${newStatus}" for Job ID: ${job.id} by ${job.employerName}`
      );
      onRefresh();
      if (selectedJob?.id === job.id) {
        setSelectedJob({ ...job, status: newStatus } as any);
      }
    } catch (error) {
      console.error("Error updating job status:", error);
    }
  };

  const handlePermanentDeleteJob = async (job: Job) => {
    if (!window.confirm(`⚠️ PERMANENT JOB REMOVAL\n\nAre you sure you want to permanently delete job "${job.title}"?\n\nThis will remove the job post and cannot be undone.`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, "jobs", job.id));
      await logAction(
        `Permanently Deleted Job: ${job.title}`,
        "Job Management",
        `Purged job listing ${job.id} from the database.`
      );
      setSelectedJob(null);
      onRefresh();
    } catch (error) {
      console.error("Error deleting job:", error);
    }
  };

  const handleUpdateApplicationStatus = async (app: JobApplication, newStatus: "pending" | "accepted" | "rejected") => {
    try {
      await updateDoc(doc(db, "job_applications", app.id), {
        status: newStatus
      });
      await logAction(
        `Overrode Application Status: ${app.workerName}`,
        "Job Applications",
        `Admin overrode application ${app.id} status to "${newStatus}" for job "${app.jobTitle}"`
      );
      onRefresh();
      if (selectedApplication?.id === app.id) {
        setSelectedApplication({ ...app, status: newStatus } as any);
      }
    } catch (error) {
      console.error("Error updating application status:", error);
    }
  };

  const handlePermanentDeleteApplication = async (app: JobApplication) => {
    if (!window.confirm(`⚠️ PURGE APPLICATION\n\nAre you sure you want to permanently delete worker application ID: ${app.id}?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, "job_applications", app.id));
      await logAction(
        `Purged Application: ${app.workerName}`,
        "Job Applications",
        `Removed application ${app.id} for job "${app.jobTitle}" from the registry.`
      );
      setSelectedApplication(null);
      onRefresh();
    } catch (error) {
      console.error("Error deleting application:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Selectors */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4 gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center">
            <Briefcase className="w-5 h-5 mr-2 text-slate-900" /> Job Postings & Application Moderation
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Audit site vacancy postings, approve pending employer requests, cancel disputed listings, and moderate contractor selections.</p>
        </div>

        {/* Sub-tab switcher */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-black uppercase tracking-wider font-mono shrink-0">
          <button
            onClick={() => { setActiveSubTab("jobs"); setSelectedJob(null); }}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${activeSubTab === "jobs" ? "bg-slate-900 text-amber-500" : "text-slate-500 hover:text-slate-950"}`}
          >
            Job Postings Moderation ({jobs.length})
          </button>
          <button
            onClick={() => { setActiveSubTab("applications"); setSelectedApplication(null); }}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${activeSubTab === "applications" ? "bg-slate-900 text-amber-500" : "text-slate-500 hover:text-slate-950"}`}
          >
            Worker Applications ({jobApplications.length})
          </button>
        </div>
      </div>

      {/* Control Console Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={activeSubTab === "jobs" ? "Search jobs by title, company, site..." : "Search applications by title, worker, company..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 bg-white"
          />
        </div>
        {activeSubTab === "jobs" && (
          <select
            value={jobStatusFilter}
            onChange={(e: any) => setJobStatusFilter(e.target.value)}
            className="p-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 bg-white font-bold uppercase tracking-wider font-mono"
          >
            <option value="all">All Job Statuses</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="open">Open Listings</option>
            <option value="active">Active Projects</option>
            <option value="completed">Completed Projects</option>
            <option value="cancelled">Cancelled Listings</option>
          </select>
        )}
      </div>

      {/* Main Workspace Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table panel */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          {activeSubTab === "jobs" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-black tracking-wider font-mono">
                    <th className="p-3">Job Title & Company</th>
                    <th className="p-3">Trade</th>
                    <th className="p-3">Wage / Slots</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredJobs.length > 0 ? (
                    filteredJobs.map((job, idx) => {
                      const isPending = (job as any).status === "pending_approval";
                      const status = (job as any).status || "open";
                      return (
                        <tr 
                          key={`${job.id || idx}-${idx}`}
                          onClick={() => setSelectedJob(job)}
                          className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${selectedJob?.id === job.id ? "bg-amber-50/50" : ""}`}
                        >
                          <td className="p-3">
                            <div className="font-bold text-slate-900 uppercase flex items-center">
                              {isPending && <span className="w-2 h-2 rounded-full bg-red-500 mr-2 animate-pulse" />}
                              {job.title}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{job.employerName} • {job.id.slice(0, 8)}</div>
                          </td>
                          <td className="p-3 font-medium capitalize">{job.trade}</td>
                          <td className="p-3">
                            <div className="font-black text-slate-800">₹{job.wage}/day</div>
                            <div className="text-[9px] text-slate-400 font-mono">Slots: {job.slotsTaken}/{job.slots}</div>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                              status === "open" 
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                : status === "active"
                                ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                : status === "pending_approval"
                                ? "bg-amber-100 text-amber-900 animate-pulse"
                                : "bg-slate-100 text-slate-600"
                            }`}>
                              {status === "pending_approval" ? "PENDING REVIEW" : status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400 font-bold uppercase text-[10px] tracking-wider font-mono">No job postings found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-black tracking-wider font-mono">
                    <th className="p-3">Applicant & Position</th>
                    <th className="p-3">Contractor</th>
                    <th className="p-3">Trade Required</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredApplications.length > 0 ? (
                    filteredApplications.map((app, idx) => {
                      const status = app.status || "pending";
                      return (
                        <tr 
                          key={`${app.id || idx}-${idx}`}
                          onClick={() => setSelectedApplication(app)}
                          className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${selectedApplication?.id === app.id ? "bg-amber-50/50" : ""}`}
                        >
                          <td className="p-3">
                            <div className="font-bold text-slate-900 uppercase">{app.workerName}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">Applied for: {app.jobTitle}</div>
                          </td>
                          <td className="p-3 font-semibold uppercase text-slate-700">{app.employerName}</td>
                          <td className="p-3 font-medium capitalize">{app.workerTrade || "General Worker"}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                              status === "accepted" 
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                : status === "rejected"
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}>
                              {status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400 font-bold uppercase text-[10px] tracking-wider font-mono">No worker applications found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detailed Review and Moderation Panel */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-5 shadow-xs">
          {activeSubTab === "jobs" ? (
            selectedJob ? (
              <div className="space-y-4">
                <div className="pb-3 border-b border-slate-200">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-mono block">Moderating Job Posting</span>
                  <h3 className="text-sm font-black text-slate-900 uppercase mt-1">{selectedJob.title}</h3>
                  <span className="text-[10px] text-slate-500 font-mono block">Posted by: {selectedJob.employerName}</span>
                </div>

                <div className="space-y-2.5 text-xs text-slate-600 bg-white p-4 rounded-lg border border-slate-200 leading-relaxed shadow-2xs">
                  <div className="flex items-start gap-1.5 font-bold text-slate-800 uppercase text-[10px] font-mono border-b border-slate-100 pb-1.5 mb-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0 text-slate-400" /> Listing Specifications
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{selectedJob.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{selectedJob.startDate} to {selectedJob.endDate}</span>
                  </div>
                  <p className="mt-2 text-slate-500 text-[11px] leading-relaxed italic">
                    "{selectedJob.description}"
                  </p>
                </div>

                {/* Job action buttons */}
                <div className="pt-3 border-t border-slate-200/60 space-y-2.5">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-mono block font-bold">Administrative Actions</span>
                  
                  {/* Approval Actions */}
                  {((selectedJob as any).status === "pending_approval" || (selectedJob as any).status === "cancelled") && (
                    <button
                      onClick={() => handleUpdateJobStatus(selectedJob, "open")}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve & Make Public
                    </button>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleUpdateJobStatus(selectedJob, "cancelled")}
                      className="py-1.5 px-3 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-wider text-center cursor-pointer"
                    >
                      Cancel Listing
                    </button>
                    <button
                      onClick={() => handlePermanentDeleteJob(selectedJob)}
                      className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded-lg text-[9px] font-black uppercase tracking-wider text-center cursor-pointer"
                    >
                      Wipe Job Post
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-16 text-slate-400">
                <Briefcase className="w-10 h-10 text-slate-300 mb-2" />
                <p className="text-xs font-black text-slate-900 uppercase tracking-wider">Select a job listing.</p>
                <p className="text-[11px] text-slate-500 mt-1">Audit description copy, approve new listings, or delete duplicates and spam.</p>
              </div>
            )
          ) : selectedApplication ? (
            <div className="space-y-4">
              <div className="pb-3 border-b border-slate-200">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-mono block">Auditing Application</span>
                <h3 className="text-sm font-black text-slate-900 uppercase mt-1">{selectedApplication.workerName}</h3>
                <span className="text-[10px] text-slate-500 font-mono block">Job: {selectedApplication.jobTitle}</span>
              </div>

              <div className="space-y-2.5 text-xs text-slate-600 bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-bold">Applicant Name: {selectedApplication.workerName}</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Trade: {selectedApplication.workerTrade || "General worker"}</span>
                </div>
                {selectedApplication.note && (
                  <p className="mt-2 text-slate-500 text-[11px] italic leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-100">
                    "{selectedApplication.note}"
                  </p>
                )}
              </div>

              {/* Action Overrides */}
              <div className="pt-3 border-t border-slate-200/60 space-y-2">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-mono block font-bold">Administrative Overrides</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleUpdateApplicationStatus(selectedApplication, "accepted")}
                    className="py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[9px] font-black uppercase tracking-wider text-center cursor-pointer"
                  >
                    Force Accept
                  </button>
                  <button
                    onClick={() => handleUpdateApplicationStatus(selectedApplication, "rejected")}
                    className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded-lg text-[9px] font-black uppercase tracking-wider text-center cursor-pointer"
                  >
                    Force Reject
                  </button>
                </div>
                <button
                  onClick={() => handlePermanentDeleteApplication(selectedApplication)}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-950 text-white font-black text-xs uppercase tracking-widest rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Delete Application
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-16 text-slate-400">
              <FileText className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-xs font-black text-slate-900 uppercase tracking-wider">Select an application.</p>
              <p className="text-[11px] text-slate-500 mt-1">Audit matching trades, override selections, and clear outdated records.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
