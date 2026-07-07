import React, { useState, useEffect } from "react";
import { 
  Calculator, Coins, Clock, Calendar, Sparkles, Plus, Trash2, 
  HelpCircle, TrendingUp, Target, PiggyBank, Award, ShieldCheck, HardHat, Info
} from "lucide-react";
import { UserProfile, SavingsGoal } from "../types";

interface WageEstimatorProps {
  user: UserProfile;
  savingsGoals: SavingsGoal[];
}

interface SavedScenario {
  id: string;
  name: string;
  rateType: "hourly" | "daily";
  rate: number;
  timeValue: number; // hours per day (if hourly) or total days
  days: number;
  activeBonuses: string[];
  customBonus: number;
  estimatedNet: number;
  date: string;
}

export default function WageEstimator({ user, savingsGoals }: WageEstimatorProps) {
  // Mode selection: hourly vs daily
  const [rateType, setRateType] = useState<"hourly" | "daily">("daily");

  // Base rate inputs (pre-filled with user defaults if available)
  const defaultDailyRate = user.wageExpectation || 600;
  const defaultHourlyRate = Math.round(defaultDailyRate / 8);

  const [rate, setRate] = useState<number>(defaultDailyRate);
  const [hoursPerDay, setHoursPerDay] = useState<number>(8);
  const [days, setDays] = useState<number>(5); // default to a standard 5-day week work estimation

  // Reset rate when switching rateType
  useEffect(() => {
    if (rateType === "daily") {
      setRate(defaultDailyRate);
    } else {
      setRate(defaultHourlyRate);
    }
  }, [rateType, defaultDailyRate, defaultHourlyRate]);

  // Site-specific bonuses selection
  const [safetyBonus, setSafetyBonus] = useState(false);
  const [nightShiftBonus, setNightShiftBonus] = useState(false);
  const [nightShiftsCount, setNightShiftsCount] = useState<number>(1);
  const [hazardAllowance, setHazardAllowance] = useState(false);
  const [customBonusAmount, setCustomBonusAmount] = useState<string>("");

  // Saved scenarios state (persisted to localStorage)
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [scenarioName, setScenarioName] = useState("");
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`empowork_saved_scenarios_${user.uid}`);
      if (stored) {
        setSavedScenarios(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Error loading saved scenarios:", e);
    }
  }, [user.uid]);

  // Calculation Logic
  const calculateEstimations = () => {
    let basePay = 0;
    let overtimePay = 0;
    let overtimeHoursPerDay = 0;

    if (rateType === "hourly") {
      // If hourly, calculate base pay up to 8 hours per day, and overtime beyond 8 hours
      const standardHours = Math.min(8, hoursPerDay);
      overtimeHoursPerDay = Math.max(0, hoursPerDay - 8);
      
      const standardDailyPay = standardHours * rate;
      // Overtime rate: 1.5x of hourly rate (standard site bonus rate)
      const overtimeDailyPay = overtimeHoursPerDay * (rate * 1.5);
      
      basePay = standardDailyPay * days;
      overtimePay = overtimeDailyPay * days;
    } else {
      // If daily, base pay is simply rate * days
      basePay = rate * days;
    }

    // Site bonuses calculation
    let safetyPay = safetyBonus ? 100 * days : 0;
    let nightShiftPay = nightShiftBonus ? 200 * Math.min(days, nightShiftsCount) : 0;
    let hazardPay = hazardAllowance ? 150 * days : 0;
    let customPay = Number(customBonusAmount) || 0;

    const totalBonuses = overtimePay + safetyPay + nightShiftPay + hazardPay + customPay;
    const grossEarnings = basePay + totalBonuses;

    // Connect to Savings Goals: calculate earmarks
    // We fetch the active allocations from savingsGoals
    const activeAllocations = savingsGoals.length > 0 
      ? savingsGoals.reduce((sum, goal) => sum + (goal.allocatedPercentage || 15), 0)
      : 15; // default 15% earmark if no specific goals configured

    const estimatedSavingsEarmark = Math.round(grossEarnings * (activeAllocations / 100));
    const takeHomeWages = grossEarnings - estimatedSavingsEarmark;

    return {
      basePay,
      overtimePay,
      overtimeHoursPerDay,
      safetyPay,
      nightShiftPay,
      hazardPay,
      customPay,
      totalBonuses,
      grossEarnings,
      activeAllocations,
      estimatedSavingsEarmark,
      takeHomeWages
    };
  };

  const results = calculateEstimations();

  // Save Scenario handler
  const handleSaveScenario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scenarioName.trim()) return;

    const activeBonuses: string[] = [];
    if (results.overtimePay > 0) activeBonuses.push("Overtime");
    if (safetyBonus) activeBonuses.push("Safety");
    if (nightShiftBonus) activeBonuses.push(`Night Shift (${Math.min(days, nightShiftsCount)}x)`);
    if (hazardAllowance) activeBonuses.push("Hazardous Scaffold");

    const newScenario: SavedScenario = {
      id: `scen-${Date.now()}`,
      name: scenarioName.trim(),
      rateType,
      rate,
      timeValue: rateType === "hourly" ? hoursPerDay : days,
      days,
      activeBonuses,
      customBonus: Number(customBonusAmount) || 0,
      estimatedNet: results.grossEarnings,
      date: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    };

    const updated = [newScenario, ...savedScenarios].slice(0, 5); // keep last 5
    setSavedScenarios(updated);
    localStorage.setItem(`empowork_saved_scenarios_${user.uid}`, JSON.stringify(updated));
    setScenarioName("");
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 3000);
  };

  // Delete Scenario
  const handleDeleteScenario = (id: string) => {
    const updated = savedScenarios.filter(s => s.id !== id);
    setSavedScenarios(updated);
    localStorage.setItem(`empowork_saved_scenarios_${user.uid}`, JSON.stringify(updated));
  };

  // Load Scenario back into inputs
  const handleLoadScenario = (s: SavedScenario) => {
    setRateType(s.rateType);
    setRate(s.rate);
    setDays(s.days);
    if (s.rateType === "hourly") {
      setHoursPerDay(s.timeValue);
    }
    setSafetyBonus(s.activeBonuses.includes("Safety"));
    setHazardAllowance(s.activeBonuses.includes("Hazardous Scaffold"));
    
    const nightBonusStr = s.activeBonuses.find(b => b.startsWith("Night Shift"));
    if (nightBonusStr) {
      setNightShiftBonus(true);
      const match = nightBonusStr.match(/\d+/);
      if (match) setNightShiftsCount(Number(match[0]));
    } else {
      setNightShiftBonus(false);
    }
    setCustomBonusAmount(s.customBonus > 0 ? String(s.customBonus) : "");
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs text-left space-y-5">
      {/* Tool Header */}
      <div className="border-b border-slate-100 pb-3 flex justify-between items-start">
        <div>
          <h3 className="font-bold text-xs text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
            <Calculator className="w-4 h-4 text-indigo-600" />
            Interactive Wage Estimator
          </h3>
          <p className="text-[10px] text-slate-400 uppercase font-semibold mt-0.5">
            Model your expected site payouts and contractor bonuses
          </p>
        </div>
        <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-150 rounded text-[9px] font-bold text-indigo-700 uppercase tracking-wider animate-pulse flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-indigo-500" />
          Live Calculator
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* INPUTS COLUMN */}
        <div className="space-y-4">
          {/* Rate Type Selector Tab */}
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Estimation Mode</span>
            <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200/50">
              <button
                type="button"
                onClick={() => setRateType("daily")}
                className={`py-1 text-center font-bold text-[10px] uppercase tracking-wide rounded transition-all cursor-pointer ${
                  rateType === "daily" 
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200/60" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Daily Wage Rate
              </button>
              <button
                type="button"
                onClick={() => setRateType("hourly")}
                className={`py-1 text-center font-bold text-[10px] uppercase tracking-wide rounded transition-all cursor-pointer ${
                  rateType === "hourly" 
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200/60" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Hourly Wage Rate
              </button>
            </div>
          </div>

          {/* Rate & Time Inputs */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {rateType === "daily" ? "Daily Wage Rate (₹)" : "Hourly Wage Rate (₹)"}
                </label>
                <span className="text-[11px] font-bold text-indigo-600 font-mono">₹{rate} / {rateType === "daily" ? "day" : "hr"}</span>
              </div>
              <input
                type="number"
                min="10"
                max="5000"
                value={rate}
                onChange={(e) => setRate(Number(e.target.value) || 0)}
                className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-hidden focus:border-indigo-500 font-bold text-slate-900"
              />
            </div>

            {rateType === "hourly" && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Average Hours Worked Per Day
                  </label>
                  <span className="text-[11px] font-bold text-slate-800 font-mono">{hoursPerDay} hrs</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="16"
                  step="0.5"
                  value={hoursPerDay}
                  onChange={(e) => setHoursPerDay(Number(e.target.value))}
                  className="w-full accent-indigo-600 h-1 bg-slate-250 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-slate-400 font-bold px-0.5 mt-1">
                  <span>4 hrs</span>
                  <span className="text-indigo-600 font-black">8 hrs (Standard)</span>
                  <span>16 hrs (OT Cap)</span>
                </div>
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Number of Days Estimated
                </label>
                <span className="text-[11px] font-bold text-slate-800 font-mono">{days} working days</span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-full accent-indigo-600 h-1 bg-slate-250 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-400 font-bold px-0.5 mt-1">
                <span>1 day</span>
                <span>15 days</span>
                <span>30 days</span>
              </div>
            </div>
          </div>

          {/* SITE BONUSES EXPANSION CHECKBOXES */}
          <div className="bg-slate-50 border border-slate-200/65 rounded-xl p-3.5 space-y-2.5">
            <span className="block text-[10px] font-black text-slate-500 uppercase tracking-wide flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-indigo-650" />
              Contractor Site-Specific Bonuses
            </span>

            <div className="space-y-2 text-xs">
              {rateType === "hourly" && hoursPerDay > 8 && (
                <div className="flex items-center space-x-2.5 p-2 bg-emerald-50 border border-emerald-100 rounded-lg">
                  <div className="flex-1 text-left">
                    <p className="font-bold text-emerald-950 uppercase text-[9px] tracking-wide">✓ Overtime Multiplier Enabled</p>
                    <p className="text-[10px] text-emerald-700 leading-snug">
                      Hours beyond 8 rewarded at 1.5x standard hourly rate (+₹{Math.round(rate * 0.5)}/hr).
                    </p>
                  </div>
                  <span className="text-[11px] font-black text-emerald-850 font-mono">+₹{Math.round(results.overtimePay)}</span>
                </div>
              )}

              <label className="flex items-start space-x-2.5 p-2 bg-white border border-slate-200 hover:bg-slate-50/50 rounded-lg cursor-pointer transition-all select-none">
                <input
                  type="checkbox"
                  checked={safetyBonus}
                  onChange={(e) => setSafetyBonus(e.target.checked)}
                  className="mt-0.5 accent-indigo-600 rounded"
                />
                <div className="flex-1 text-left">
                  <p className="font-bold text-slate-900 text-[10px] uppercase">Safety Gear Wear Compliance</p>
                  <p className="text-[10px] text-slate-400 leading-tight">Contractor incentive for wearing Helmet, Boots & Harness daily (+₹100/day)</p>
                </div>
                {safetyBonus && <span className="text-[11px] font-bold text-indigo-600 font-mono">+₹{results.safetyPay}</span>}
              </label>

              <label className="flex flex-col p-2 bg-white border border-slate-200 hover:bg-slate-50/50 rounded-lg cursor-pointer transition-all select-none space-y-2">
                <div className="flex items-start space-x-2.5">
                  <input
                    type="checkbox"
                    checked={nightShiftBonus}
                    onChange={(e) => setNightShiftBonus(e.target.checked)}
                    className="mt-0.5 accent-indigo-600 rounded"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1 text-left">
                    <p className="font-bold text-slate-900 text-[10px] uppercase">Night Shift Allowance</p>
                    <p className="text-[10px] text-slate-400 leading-tight">Premium dispatch for night operations (+₹200/night shift)</p>
                  </div>
                  {nightShiftBonus && <span className="text-[11px] font-bold text-indigo-600 font-mono">+₹{results.nightShiftPay}</span>}
                </div>
                {nightShiftBonus && (
                  <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] pl-6" onClick={(e) => e.stopPropagation()}>
                    <span className="text-slate-500 font-bold">Number of night shifts:</span>
                    <div className="flex items-center space-x-1.5">
                      <button 
                        onClick={() => setNightShiftsCount(Math.max(1, nightShiftsCount - 1))}
                        className="w-5 h-5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 flex items-center justify-center font-bold"
                      >
                        -
                      </button>
                      <span className="font-bold font-mono text-slate-800">{Math.min(days, nightShiftsCount)}</span>
                      <button 
                        onClick={() => setNightShiftsCount(Math.min(days, nightShiftsCount + 1))}
                        className="w-5 h-5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 flex items-center justify-center font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
              </label>

              <label className="flex items-start space-x-2.5 p-2 bg-white border border-slate-200 hover:bg-slate-50/50 rounded-lg cursor-pointer transition-all select-none">
                <input
                  type="checkbox"
                  checked={hazardAllowance}
                  onChange={(e) => setHazardAllowance(e.target.checked)}
                  className="mt-0.5 accent-indigo-600 rounded"
                />
                <div className="flex-1 text-left">
                  <p className="font-bold text-slate-900 text-[10px] uppercase">Scaffold & Hazardous Task Allowance</p>
                  <p className="text-[10px] text-slate-400 leading-tight">High-altitude safety scaffolding risk premium (+₹150/day)</p>
                </div>
                {hazardAllowance && <span className="text-[11px] font-bold text-indigo-600 font-mono">+₹{results.hazardPay}</span>}
              </label>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Custom Contractor Promise Bonus (₹)</label>
                <input
                  type="number"
                  placeholder="e.g., ₹500 completion bonus"
                  value={customBonusAmount}
                  onChange={(e) => setCustomBonusAmount(e.target.value)}
                  className="w-full text-[11px] p-2 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:border-indigo-500 font-bold text-slate-900 placeholder:text-slate-350"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RESULTS & BREAKDOWN COLUMN */}
        <div className="flex flex-col justify-between space-y-4">
          <div className="border border-slate-250 bg-gradient-to-br from-indigo-950 to-slate-900 text-white rounded-2xl p-5 space-y-4 relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 rounded-full bg-indigo-500/10 blur-xl"></div>
            
            <span className="text-[10px] text-indigo-300 font-black tracking-wider uppercase block">Estimated Earnings Ledger</span>

            {/* Main Take-home figure */}
            <div>
              <span className="text-3xl font-black text-white font-mono flex items-baseline gap-1.5">
                ₹{results.grossEarnings.toLocaleString()}
                <span className="text-xs text-indigo-300 font-bold uppercase tracking-wide font-sans">Gross est.</span>
              </span>
              <p className="text-[10px] text-slate-300 mt-1 leading-normal">
                Estimated base + performance bonuses over <strong className="text-white">{days} shifts</strong>
              </p>
            </div>

            {/* Calculations List */}
            <div className="space-y-2 text-xs pt-3 border-t border-white/10 font-medium">
              <div className="flex justify-between items-center text-slate-300">
                <span>Base Payout ({rateType === "hourly" ? "Standard Hours" : "Base days"})</span>
                <span className="font-mono text-white font-bold">₹{results.basePay.toLocaleString()}</span>
              </div>

              {results.overtimePay > 0 && (
                <div className="flex justify-between items-center text-emerald-400">
                  <span>Overtime Multiplier ({results.overtimeHoursPerDay} hrs/day)</span>
                  <span className="font-mono font-bold">+₹{results.overtimePay.toLocaleString()}</span>
                </div>
              )}

              {results.safetyPay > 0 && (
                <div className="flex justify-between items-center text-emerald-400">
                  <span className="flex items-center gap-1">
                    <HardHat className="w-3 h-3 text-emerald-400" />
                    Safety Compliance Bonus
                  </span>
                  <span className="font-mono font-bold">+₹{results.safetyPay.toLocaleString()}</span>
                </div>
              )}

              {results.nightShiftPay > 0 && (
                <div className="flex justify-between items-center text-emerald-400">
                  <span>Night Allowance ({Math.min(days, nightShiftsCount)} shifts)</span>
                  <span className="font-mono font-bold">+₹{results.nightShiftPay.toLocaleString()}</span>
                </div>
              )}

              {results.hazardPay > 0 && (
                <div className="flex justify-between items-center text-emerald-400">
                  <span>Scaffold / Hazard Allowance</span>
                  <span className="font-mono font-bold">+₹{results.hazardPay.toLocaleString()}</span>
                </div>
              )}

              {results.customPay > 0 && (
                <div className="flex justify-between items-center text-emerald-400">
                  <span>Custom Contractor Bonus</span>
                  <span className="font-mono font-bold">+₹{results.customPay.toLocaleString()}</span>
                </div>
              )}

              {/* Total Bonus Segment */}
              {results.totalBonuses > 0 && (
                <div className="flex justify-between items-center text-indigo-300 font-bold border-t border-white/5 pt-2">
                  <span>Cumulative Added Bonuses</span>
                  <span className="font-mono font-bold">+₹{results.totalBonuses.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Savings Connection */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-amber-400 font-black uppercase tracking-wide flex items-center gap-1">
                  <PiggyBank className="w-3.5 h-3.5 text-amber-400" />
                  Savings Earmark Allocation ({results.activeAllocations}%)
                </span>
                <span className="text-xs font-black text-amber-400 font-mono">-₹{results.estimatedSavingsEarmark.toLocaleString()}</span>
              </div>
              <p className="text-[10px] text-slate-350 leading-relaxed text-left">
                Recommended savings to auto-fund your locked target roadmaps. 
                Leaving a take-home net estimate of <strong className="text-white">₹{results.takeHomeWages.toLocaleString()}</strong>.
              </p>
            </div>

            <div className="text-[10px] text-indigo-200/80 italic flex items-center gap-1 bg-indigo-500/10 p-2 rounded border border-indigo-500/10 text-left">
              <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Estimates act as planning models. Cleared wages are verified post daily attendance scan-outs.</span>
            </div>
          </div>

          {/* Scenario Saving Form */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
              Save This Model to Projections
            </span>

            <form onSubmit={handleSaveScenario} className="flex gap-2">
              <input
                type="text"
                required
                placeholder="e.g., L&T Heavy Scaffold Estimate"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                className="flex-1 text-xs p-2 border border-slate-250 rounded-lg bg-white focus:outline-hidden focus:border-indigo-500 font-bold text-slate-900"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-amber-500 text-[10px] font-black uppercase tracking-wider rounded-lg shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Save Scenario
              </button>
            </form>

            {showSaveSuccess && (
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide bg-emerald-50 border border-emerald-100 p-1.5 rounded-lg text-center animate-fade-in">
                ✓ Scenario model pinned to saved comparisons list!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* SAVED COMPARISONS AREA */}
      {savedScenarios.length > 0 && (
        <div className="border-t border-slate-100 pt-4 space-y-2.5">
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Your Pinned Comparison Projections ({savedScenarios.length}/5)
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {savedScenarios.map((scen) => (
              <div 
                key={scen.id} 
                onClick={() => handleLoadScenario(scen)}
                className="p-3 bg-slate-50 hover:bg-slate-100/75 border border-slate-200 hover:border-indigo-300 rounded-xl transition-all cursor-pointer text-xs relative group flex flex-col justify-between"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteScenario(scen.id);
                  }}
                  className="absolute top-2 right-2 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 p-0.5"
                  title="Remove Saved Projection"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <div className="space-y-1 pr-4">
                  <h4 className="font-black text-slate-900 uppercase text-[10px] leading-tight truncate">{scen.name}</h4>
                  <p className="text-[9px] text-slate-400 uppercase font-bold">
                    {scen.rateType === "hourly" ? "Hourly" : "Daily"} • {scen.days} days
                  </p>
                  {scen.activeBonuses.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {scen.activeBonuses.slice(0, 2).map((b) => (
                        <span key={b} className="text-[8px] bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold px-1 py-0.5 rounded uppercase">
                          {b}
                        </span>
                      ))}
                      {scen.activeBonuses.length > 2 && (
                        <span className="text-[8px] text-slate-400 font-bold py-0.5">+{scen.activeBonuses.length - 2} more</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex justify-between items-baseline">
                  <span className="text-[9px] text-slate-400 font-medium">Click to load</span>
                  <span className="text-xs font-black text-indigo-950 font-mono">₹{scen.estimatedNet.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
