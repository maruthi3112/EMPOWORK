import React, { useState } from "react";
import { 
  PlusCircle, Search, Filter, Briefcase, MapPin, Calendar, Coins, 
  Trash2, Copy, Eye, Edit, CheckCircle, XCircle, Sparkles, AlertCircle, 
  Map, CheckSquare, Clock, ShieldCheck, Heart, User, ArrowLeft, Download, Info
} from "lucide-react";
import { Job, JobApplication } from "../../types";

interface EmployerJobsProps {
  jobs: Job[];
  applications: JobApplication[];
  onPostJob: (newJob: Partial<Job>) => Promise<any>;
  onEditJob: (jobId: string, updatedFields: Partial<Job>) => Promise<any>;
  onDeleteJob: (jobId: string) => Promise<any>;
}

export default function EmployerJobs({
  jobs = [],
  applications = [],
  onPostJob,
  onEditJob,
  onDeleteJob
}: EmployerJobsProps) {
  const [showPostForm, setShowPostForm] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tradeFilter, setTradeFilter] = useState("all");

  // Selected Job for View Details Modal
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Form Fields State
  const [title, setTitle] = useState("");
  const [trade, setTrade] = useState("Mason");
  const [skills, setSkills] = useState("Mixing cement, Bricklaying, Plastering");
  const [wage, setWage] = useState(800);
  const [workingHours, setWorkingHours] = useState("8:00 AM - 5:00 PM");
  const [foodProvided, setFoodProvided] = useState(true);
  const [accommodationProvided, setAccommodationProvided] = useState(false);
  const [safetyEquipmentProvided, setSafetyEquipmentProvided] = useState(true);
  const [experienceRequired, setExperienceRequired] = useState("1-2 years");
  const [genderPreference, setGenderPreference] = useState("No Preference");
  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(50);
  const [deadline, setDeadline] = useState("");
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState(12.9716);
  const [longitude, setLongitude] = useState(77.5946);
  const [description, setDescription] = useState("");

  const [formLoading, setFormLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Gemini Smart Autofill helper
  const handleAiAutofill = async () => {
    if (!title.trim()) {
      alert("Please enter a short Assignment Title first (e.g., 'Need Plumber for bathroom piping'), and then click Autofill!");
      return;
    }
    setAiGenerating(true);
    try {
      const res = await fetch("/api/gemini/generate-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.trade) setTrade(data.trade);
        if (data.description) setDescription(data.description);
        if (data.wage) setWage(Number(data.wage));
        if (data.location) setLocation(data.location);
        
        // Add additional details
        setSkills(data.skills || "Relevant tools handling, site clearance, structural safety");
        setExperienceRequired(data.experience || "1-2 years");
        setWorkingHours("8:00 AM - 5:00 PM");
        setFormError(null);
      } else {
        // Fallback local smart completion
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes("plumb")) {
          setTrade("Plumber");
          setSkills("Pipe fitting, Leak repairs, Threading, PVC welding");
          setDescription("Looking for an experienced Plumber to run site PVC piping networks, check joints, and seal fittings. Must bring basic spanners.");
          setWage(850);
          setLocation("Whitefield Tech Hub, Bengaluru");
        } else if (lowerTitle.includes("carpenter") || lowerTitle.includes("wood")) {
          setTrade("Carpenter");
          setSkills("Timber sawing, Wood cutting, Framing, Sanding");
          setDescription("Carpentry assignment to construct wooden support scaffolding, align frameworks, and assemble internal doors on site.");
          setWage(900);
          setLocation("Koramangala Construction Block, Bengaluru");
        } else {
          setTrade("Mason");
          setSkills("Brick laying, Cement mortar, Scaffold alignment");
          setDescription("Site bricklaying task. Mixing mortar ratios, aligning plumb bobs, and building brick facade panels.");
          setWage(800);
          setLocation("Electronic City Block C, Bengaluru");
        }
      }
    } catch (err) {
      console.error("AI Autofill error:", err);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleOpenPostForm = () => {
    setEditingJob(null);
    setTitle("");
    setTrade("Mason");
    setSkills("Mixing cement, Bricklaying, Plastering");
    setWage(800);
    setWorkingHours("8:00 AM - 5:00 PM");
    setFoodProvided(true);
    setAccommodationProvided(false);
    setSafetyEquipmentProvided(true);
    setExperienceRequired("1-2 years");
    setGenderPreference("No Preference");
    setMinAge(18);
    setMaxAge(50);
    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 7);
    setDeadline(tmr.toISOString().split("T")[0]);
    setLocation("Site Alpha Main Gate, Electronic City");
    setLatitude(12.9716 + (Math.random() * 0.04 - 0.02));
    setLongitude(77.5946 + (Math.random() * 0.04 - 0.02));
    setDescription("");
    setShowPostForm(true);
  };

  const handleOpenEditForm = (job: Job) => {
    setEditingJob(job);
    setTitle(job.title);
    setTrade(job.trade);
    setSkills("Mortar leveling, Hand tool handling, site safety");
    setWage(job.wage);
    setWorkingHours("8:00 AM - 5:00 PM");
    setFoodProvided(true);
    setAccommodationProvided(false);
    setSafetyEquipmentProvided(true);
    setExperienceRequired("1-2 years");
    setGenderPreference("No Preference");
    setMinAge(18);
    setMaxAge(50);
    setDeadline(job.endDate || "");
    setLocation(job.location);
    setLatitude(job.latitude || 12.9716);
    setLongitude(job.longitude || 77.5946);
    setDescription(job.description || "");
    setShowPostForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError("Job title is required.");
      return;
    }
    if (!location.trim()) {
      setFormError("Worksite location address is required.");
      return;
    }
    if (!wage || Number(wage) <= 0) {
      setFormError("Please state a valid positive daily wage.");
      return;
    }

    setFormLoading(true);
    try {
      const payload = {
        title: title.trim(),
        trade,
        description: description.trim(),
        location: location.trim(),
        wage: Number(wage),
        startDate: new Date().toISOString().split("T")[0],
        endDate: deadline || new Date().toISOString().split("T")[0],
        slots: 3,
        latitude,
        longitude
      };

      if (editingJob) {
        await onEditJob(editingJob.id, payload);
      } else {
        await onPostJob(payload);
      }
      setShowPostForm(false);
    } catch (err: any) {
      setFormError(err.message || "Failed to process database saving.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDuplicate = async (job: Job) => {
    try {
      const duplicated = {
        title: `${job.title} (Copy)`,
        trade: job.trade,
        description: job.description,
        location: job.location,
        wage: job.wage,
        startDate: new Date().toISOString().split("T")[0],
        endDate: job.endDate,
        slots: job.slots,
        latitude: job.latitude,
        longitude: job.longitude
      };
      await onPostJob(duplicated);
      alert("Job assignment duplicated successfully!");
    } catch (e) {
      console.error("Duplicate failed", e);
    }
  };

  // Filter & Search Logic
  const filteredJobs = jobs.filter(j => {
    const matchesSearch = j.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          j.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          j.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || j.status === statusFilter;
    const matchesTrade = tradeFilter === "all" || j.trade === tradeFilter;
    return matchesSearch && matchesStatus && matchesTrade;
  });

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentJobs = filteredJobs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Header Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-950 uppercase tracking-tight">Manage Construction Postings</h2>
          <p className="text-xs text-slate-500">Post contract demands, edit site terms, and track vacancies live.</p>
        </div>
        
        {!showPostForm && (
          <button
            onClick={handleOpenPostForm}
            className="inline-flex items-center px-4 py-2 bg-slate-950 hover:bg-slate-800 text-amber-500 font-extrabold text-xs rounded-xl uppercase tracking-wider shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer border border-slate-850"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Create Job Post
          </button>
        )}
      </div>

      {showPostForm ? (
        /* Posting Job Form Overlay Frame */
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm max-w-4xl">
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100">
            <button 
              onClick={() => setShowPostForm(false)}
              className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Listings
            </button>
            <h3 className="text-xs font-black uppercase text-slate-950 tracking-wider">
              {editingJob ? "Modify Assignment Details" : "Publish New Contract Demand"}
            </h3>
          </div>

          {formError && (
            <div className="mb-5 p-4 bg-rose-50 border-l-4 border-rose-500 rounded-xl text-xs text-rose-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Row 1: Title and Trade Category */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Assignment Title*</label>
                <div className="relative">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Mason bricklayers needed for boundary wall"
                    className="w-full p-3 pl-3.5 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-500 bg-slate-50 text-slate-900 font-medium"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleAiAutofill}
                    disabled={aiGenerating}
                    className="absolute right-2.5 top-1.5 inline-flex items-center py-1.5 px-3 rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-60 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                    {aiGenerating ? "Writing..." : "AI Autofill"}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Required Trade*</label>
                <select
                  value={trade}
                  onChange={(e) => setTrade(e.target.value)}
                  className="w-full p-3 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-bold"
                >
                  {["Mason", "Carpenter", "Plumber", "Electrician", "Painter", "Welder", "General Worker"].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Skills tags & wage expectations */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Required Skills / Credentials</label>
                <input
                  type="text"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="e.g., Bricklaying, scaffolding setup, hand tool usage"
                  className="w-full p-3 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Daily Wage Offered (₹)*</label>
                <div className="relative">
                  <Coins className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    value={wage}
                    onChange={(e) => setWage(Number(e.target.value))}
                    className="w-full p-3 pl-9 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-black"
                    min={300}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Row 3: Hours & Benefits Checklist */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Shift Timings</label>
                <input
                  type="text"
                  value={workingHours}
                  onChange={(e) => setWorkingHours(e.target.value)}
                  className="w-full p-3 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-medium"
                />
              </div>

              <div className="md:col-span-2 flex items-end h-full">
                <div className="grid grid-cols-3 gap-2 w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-700">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" checked={foodProvided} onChange={(e) => setFoodProvided(e.target.checked)} className="rounded text-amber-500" />
                    <span>Free Meals</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" checked={accommodationProvided} onChange={(e) => setAccommodationProvided(e.target.checked)} className="rounded text-amber-500" />
                    <span>Lodging Provided</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" checked={safetyEquipmentProvided} onChange={(e) => setSafetyEquipmentProvided(e.target.checked)} className="rounded text-amber-500" />
                    <span>PPE Provided</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Row 4: Experience, Age & Date Boundaries */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Experience Level</label>
                <select
                  value={experienceRequired}
                  onChange={(e) => setExperienceRequired(e.target.value)}
                  className="w-full p-3 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-bold"
                >
                  <option value="No experience">No experience required</option>
                  <option value="1-2 years">1-2 years experience</option>
                  <option value="3-5 years">3-5 years experience</option>
                  <option value="5+ years">5+ years senior lead</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Gender Preference</label>
                <select
                  value={genderPreference}
                  onChange={(e) => setGenderPreference(e.target.value)}
                  className="w-full p-3 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-bold"
                >
                  <option value="No Preference">No preference</option>
                  <option value="Male">Male only</option>
                  <option value="Female">Female only</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Shift Expiry Date*</label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full p-3 pl-10 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-bold"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Row 5: Detailed Description */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Detailed Site Work Description*</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Specify scaffold heights, concrete ratios, bricks counts, shift breaks, and any protective site guidelines..."
                className="w-full p-3 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-900 h-28 resize-none focus:outline-hidden focus:border-amber-500"
                required
              />
            </div>

            {/* Row 6: Geolocation Picker (Verification Map coordinates) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Site Street Address*</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g., Boundary Wall Segment B, Whitefield, Bengaluru"
                    className="w-full p-3 pl-10 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Site GPS boundary coordinates</label>
                <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-mono">
                  <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200 text-slate-700">
                    <span className="text-[8px] text-slate-400 uppercase tracking-wider block">LAT</span>
                    <span className="font-bold">{latitude.toFixed(5)}</span>
                  </div>
                  <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200 text-slate-700">
                    <span className="text-[8px] text-slate-400 uppercase tracking-wider block">LON</span>
                    <span className="font-bold">{longitude.toFixed(5)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Simulated Interactive Map Location Selector */}
            <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-200/40 space-y-2">
              <span className="text-[9px] font-bold uppercase tracking-widest text-amber-700 flex items-center gap-1">
                <Map className="w-3.5 h-3.5" /> Interactive Geofence Map Picker (Verification Anchor)
              </span>
              <p className="text-[10px] text-slate-500">The platform locks coordinates within a 200m radius of check-in boundaries to verify site worker presence.</p>
              
              {/* Map Canvas Visualizer */}
              <div className="relative h-40 bg-slate-100 border border-slate-200 rounded-lg overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-slate-50 opacity-40" style={{ backgroundImage: "radial-gradient(#CBD5E1 1px, transparent 0)", backgroundSize: "16px 16px" }} />
                
                {/* Circular Radar Geofence zone */}
                <div className="absolute w-24 h-24 rounded-full border border-dashed border-amber-400/80 bg-amber-400/10 animate-pulse flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-amber-600 shadow-lg relative">
                    <span className="absolute -top-6 -left-12 bg-slate-950 text-white font-mono text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md whitespace-nowrap shadow-sm">
                      Site Hub Marker
                    </span>
                  </div>
                </div>
                
                <span className="absolute bottom-2 right-2 text-[8px] font-bold text-slate-400 font-mono">MAP CENTER: BENGALURU, IN</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center space-x-2.5 pt-4 border-t border-slate-150 justify-end">
              <button
                type="button"
                onClick={() => setShowPostForm(false)}
                className="py-2.5 px-5 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold uppercase rounded-xl cursor-pointer transition-all"
              >
                Discard Draft
              </button>
              <button
                type="submit"
                disabled={formLoading}
                className="py-2.5 px-6 bg-slate-950 hover:bg-slate-850 text-amber-500 text-xs font-black uppercase rounded-xl cursor-pointer shadow-md transition-all border border-slate-800"
              >
                {formLoading ? "Publishing..." : editingJob ? "Apply Updates" : "Publish Active Posting"}
              </button>
            </div>

          </form>
        </div>
      ) : (
        /* Data table showing current listings */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          
          {/* Filters Bar */}
          <div className="p-4 bg-slate-50/50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search job titles, locations..."
                className="w-full p-2 pl-9 text-xs border border-slate-200 rounded-xl bg-white text-slate-900 font-medium"
              />
            </div>

            {/* Filters selectors */}
            <div className="flex items-center space-x-3 text-xs">
              <div className="flex items-center space-x-1.5 font-bold text-slate-600">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span>Status:</span>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="p-1.5 border border-slate-200 rounded-lg bg-white font-bold"
              >
                <option value="all">All States</option>
                <option value="open">Recruiting (Open)</option>
                <option value="active">Active Shifts</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <select
                value={tradeFilter}
                onChange={(e) => setTradeFilter(e.target.value)}
                className="p-1.5 border border-slate-200 rounded-lg bg-white font-bold"
              >
                <option value="all">All Trades</option>
                {["Mason", "Carpenter", "Plumber", "Electrician", "Painter", "Welder", "General Worker"].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 font-mono text-[10px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-200">
                  <th className="p-4">Job Info</th>
                  <th className="p-4">Trade Category</th>
                  <th className="p-4">Site Location</th>
                  <th className="p-4 text-right">Daily Wage</th>
                  <th className="p-4 text-center">Vacancies Taken</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Expiry Date</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {currentJobs.length > 0 ? (
                  currentJobs.map((job) => {
                    const statusColors: Record<string, string> = {
                      open: "text-amber-700 bg-amber-50 border-amber-200/50",
                      active: "text-emerald-700 bg-emerald-50 border-emerald-200/50",
                      completed: "text-indigo-700 bg-indigo-50 border-indigo-200/50",
                      cancelled: "text-slate-500 bg-slate-50 border-slate-200/50",
                    };

                    const appCount = applications.filter(a => a.jobId === job.id).length;

                    return (
                      <tr key={job.id} className="hover:bg-slate-50/55 transition-colors">
                        <td className="p-4 font-bold text-slate-900 leading-tight">
                          <div className="space-y-0.5">
                            <span className="truncate block font-black text-sm">{job.title}</span>
                            <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">{job.id}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center bg-slate-100 border border-slate-200 rounded px-2 py-0.5 font-bold uppercase tracking-wide text-[10px]">
                            {job.trade}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="truncate block max-w-xs">{job.location}</span>
                        </td>
                        <td className="p-4 text-right font-black text-slate-900">
                          ₹{job.wage}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center space-x-1.5 font-mono">
                            <span className="font-bold text-slate-900">{job.slotsTaken || 0}</span>
                            <span className="text-slate-300">/</span>
                            <span className="text-slate-400">{job.slots || 3}</span>
                            <span className="text-[10px] text-slate-400 ml-1">({appCount} app)</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center border rounded px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${statusColors[job.status]}`}>
                            {job.status === "open" ? "Recruiting" : job.status}
                          </span>
                        </td>
                        <td className="p-4 font-mono font-bold text-slate-500">
                          {job.endDate || "N/A"}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => setSelectedJob(job)}
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                              title="Inspect Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEditForm(job)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg cursor-pointer"
                              title="Edit"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDuplicate(job)}
                              className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg cursor-pointer"
                              title="Duplicate"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm(`Are you sure you want to permanently delete job posting ${job.title}?`)) {
                                  await onDeleteJob(job.id);
                                }
                              }}
                              className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg cursor-pointer"
                              title="Delete"
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
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Briefcase className="w-8 h-8 text-slate-300" />
                        <span className="text-xs font-semibold">No active job assignments matching current queries.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-150 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500">
                Showing page {currentPage} of {totalPages} ({filteredJobs.length} assignments)
              </span>
              <div className="flex items-center space-x-1.5 text-xs">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="py-1 px-2.5 border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                >
                  Prev
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="py-1 px-2.5 border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Details inspection modal overlay */}
      {selectedJob && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-left">
            <div className="h-1 bg-amber-500" />
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="space-y-0.5">
                <span className="text-[9px] font-mono font-bold uppercase text-amber-600 tracking-wider">Site Inspection Hub</span>
                <h4 className="font-black text-sm text-slate-900 uppercase leading-tight">{selectedJob.title}</h4>
              </div>
              <button 
                onClick={() => setSelectedJob(null)}
                className="text-slate-400 hover:text-slate-800 text-xs font-black p-1 hover:bg-slate-100 rounded-full cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Daily Wage</span>
                  <p className="font-black text-slate-900 text-sm">₹{selectedJob.wage} / day</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Vacancies Taken</span>
                  <p className="font-black text-slate-900">{selectedJob.slotsTaken || 0} / {selectedJob.slots || 3} Slots filled</p>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Street Address</span>
                <div className="flex items-center space-x-1 font-bold text-slate-800">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{selectedJob.location}</span>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Required Skills</span>
                <p className="font-bold text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                  {selectedJob.trade} standard tools handling, site leveling, safety helmet clearance.
                </p>
              </div>

              <div className="space-y-1 text-xs">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Assignment Overview</span>
                <p className="text-slate-600 leading-relaxed font-semibold">
                  {selectedJob.description || "No custom description published for this construction post."}
                </p>
              </div>

              {/* simulated GPS radius */}
              {selectedJob.latitude && (
                <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-200/50 text-[11px] font-medium text-emerald-800 space-y-1">
                  <span className="font-bold block uppercase text-[9px] tracking-wider text-emerald-700 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Geofence Status: ACTIVE & VERIFIED
                  </span>
                  <p>Check-in tracking point: {selectedJob.latitude.toFixed(4)}, {selectedJob.longitude?.toFixed(4)}. Mobile devices checks must anchor within 200m boundaries.</p>
                </div>
              )}

            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedJob(null)}
                className="py-1.5 px-4 bg-slate-950 text-white hover:bg-slate-850 text-xs font-bold uppercase rounded-lg cursor-pointer"
              >
                Close Portal
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
