import React, { useState } from "react";
import { 
  Calculator, HardHat, ShieldAlert, Thermometer, Construction,
  Briefcase, Coins, Layers, Users, CheckCircle, Info, Sparkles,
  Flame, Zap, Shield, Check, ClipboardCheck, RefreshCw, AlertTriangle,
  Wrench, Paintbrush, Moon, Plus, Minus, Copy, FileText
} from "lucide-react";

const taskSafetyChecklists = {
  masonry: {
    title: "Masonry & Plastering",
    icon: Construction,
    iconColor: "text-amber-500",
    bgLight: "bg-amber-500/10",
    borderTheme: "border-amber-200/60",
    badgeTheme: "bg-amber-100 text-amber-800",
    items: [
      "Verify mortar mixing area has clear ventilation and zero dry dust accumulation",
      "Inspect scaffold staging planks for splits, cracks, or loose bindings",
      "Confirm protective safety goggles are worn during dry-mix splattering",
      "Ensure bricks are pre-soaked to minimize hazardous silica dust inhalation",
      "Verify clear warning signs ('Work in Progress') are placed below active plastering decks",
      "Confirm availability of fresh drinking water nearby to prevent heat exhaustion"
    ]
  },
  scaffolding: {
    title: "Altitude & Scaffolding",
    icon: HardHat,
    iconColor: "text-sky-500",
    bgLight: "bg-sky-500/10",
    borderTheme: "border-sky-200/60",
    badgeTheme: "bg-sky-100 text-sky-800",
    items: [
      "Inspect vertical steel uprights and sole-boards for level and stable grounding",
      "Confirm double guard-rails (hip & knee height) are clamped on all working platforms",
      "Ensure safety harness lanyard is anchored to an independent load-bearing lifeline",
      "Verify toe-boards are securely wired along the platform edge to prevent falling tool hazards",
      "Conduct visual check of all lock-pins, cross-braces, and couplers for structural rigidity",
      "Inspect emergency access ladders for zero obstructions and firm tie-backs"
    ]
  },
  concrete: {
    title: "Concrete & Shuttering",
    icon: Layers,
    iconColor: "text-emerald-500",
    bgLight: "bg-emerald-500/10",
    borderTheme: "border-emerald-200/60",
    badgeTheme: "bg-emerald-100 text-emerald-800",
    items: [
      "Ensure mixer machine operators are wearing heavy insulated rubber gloves and ear protection",
      "Confirm all exposed reinforcement bars (rebar) have safety caps installed",
      "Inspect shuttering/formwork supports for stability against wet concrete load deflection",
      "Verify clearly marked, level access paths for high-weight concrete wheelbarrows",
      "Confirm emergency fresh wash station is primed for accidental chemical wet cement skin contact",
      "Check that vibration machine power lines are double-insulated with ground-leakage breakers"
    ]
  },
  electrical: {
    title: "Electrical & Cabling",
    icon: Zap,
    iconColor: "text-yellow-500",
    bgLight: "bg-yellow-500/10",
    borderTheme: "border-yellow-200/60",
    badgeTheme: "bg-yellow-100 text-yellow-800",
    items: [
      "Enforce Lock-Out/Tag-Out (LOTO) protocols on active main distribution breakers",
      "Verify all handheld drilling and cutting equipment is fully insulated and shock-tested",
      "Check for dry rubber mats in front of active panels and control switchboards",
      "Ensure wet lines are completely isolated from temporary cabling layouts",
      "Mandate insulated fiberglass ladders instead of conducting aluminum/steel ladders",
      "Confirm certified CO2 / Class C dry chemical fire extinguishers are within a 10-meter radius"
    ]
  },
  welding: {
    title: "Welding & Fabrication",
    icon: Flame,
    iconColor: "text-red-500",
    bgLight: "bg-red-500/10",
    borderTheme: "border-red-200/60",
    badgeTheme: "bg-red-100 text-red-800",
    items: [
      "Ensure full-face auto-darkening welding shields (Grade 10+) are used by welder and helper",
      "Clear dry grass, sawdust, solvent cans, and flammable items from hot-work zone",
      "Verify mechanical ventilation exhaust or portable blowers are active in confined booths",
      "Inspect welding generator power and earthing clamps for bare wire gaps",
      "Enforce safety leather aprons, welding sleeves, and flame-resistant spats are worn",
      "Ensure a dedicated fire-watch helper is stationed with a ready extinguisher during hot cuts"
    ]
  },
  plumbing: {
    title: "Plumbing & Hydraulics",
    icon: Wrench,
    iconColor: "text-blue-500",
    bgLight: "bg-blue-500/10",
    borderTheme: "border-blue-200/60",
    badgeTheme: "bg-blue-100 text-blue-800",
    items: [
      "Verify pipe pressure testing zone is barricaded and cleared of bystander workers",
      "Inspect trench wall shoring for depth > 1.2m to prevent cave-in hazards",
      "Confirm heavy pipe lifters and sling straps are certified for load bearing",
      "Ensure flame shields are mounted during copper pipe soldering/hot joint operations",
      "Verify chemical safety sheets (MSDS) are on site for PVC pipe solvent cements",
      "Ensure eye wash kits are accessible near solvent gluing stations"
    ]
  },
  painting: {
    title: "Painting & Coating",
    icon: Paintbrush,
    iconColor: "text-purple-500",
    bgLight: "bg-purple-500/10",
    borderTheme: "border-purple-200/60",
    badgeTheme: "bg-purple-100 text-purple-800",
    items: [
      "Verify painters are wearing high-efficiency respirators for VOC paint spraying",
      "Confirm safety ropes and cradle lifts are safety-inspected for high wall painting",
      "Ensure paint cans are stored in a designated, ventilated, fire-safe cabinet",
      "Verify plastic sheet drops are taped to avoid slipping hazards on wet surfaces",
      "Check for availability of skin-safe cleansers for paint removal"
    ]
  },
  rebar: {
    title: "Rebar & Bar Bending",
    icon: Construction,
    iconColor: "text-teal-500",
    bgLight: "bg-teal-500/10",
    borderTheme: "border-teal-200/60",
    badgeTheme: "bg-teal-100 text-teal-800",
    items: [
      "Ensure bar bending machine guards are intact and operating smoothly",
      "Check that workers wear heavy duty leather gloves to handle raw sharp rebars",
      "Confirm cap installation on all upward pointing starter bars on columns",
      "Verify tie-wire spools are clipped to utility belts to prevent tripping",
      "Establish a designated rebar stacking zone with safe passage corridors"
    ]
  },
  supervision: {
    title: "Supervision & Layout",
    icon: ClipboardCheck,
    iconColor: "text-indigo-500",
    bgLight: "bg-indigo-500/10",
    borderTheme: "border-indigo-200/60",
    badgeTheme: "bg-indigo-100 text-indigo-800",
    items: [
      "Perform morning tool-box talk with all crews on high-risk tasks",
      "Check permit-to-work logs for active altitude or electrical works",
      "Confirm emergency assembly points are clear and well marked",
      "Verify that first aid kits are stocked with fresh bandages and antiseptic",
      "Inspect temporary power distribution boards for active earth fault trips"
    ]
  }
};

const baseRates = {
  helper: 450,
  mason: 750,
  carpenter: 800,
  electrician: 850,
  welder: 900,
  plumber: 720,
  painter: 680,
  bar_bender: 820,
  scaffolder: 750,
  concrete_operator: 780,
  supervisor: 1100
};

export default function IndustrialHubTools() {
  // Selected Sub-tool state
  const [activeTool, setActiveTool] = useState<"estimator" | "materials" | "safety" | "crew">("estimator");

  // Wage Estimator State
  const [trade, setTrade] = useState<keyof typeof baseRates>("mason");
  const [hours, setHours] = useState(8);
  const [overtime, setOvertime] = useState(2);
  const [siteHazardLevel, setSiteHazardLevel] = useState<"standard" | "high-altitude" | "demolition">("standard");
  const [nightShift, setNightShift] = useState(false);
  const [travelAllowance, setTravelAllowance] = useState(100); // INR per day
  const [mealAllowance, setMealAllowance] = useState(true); // INR 50/day standard subsidy

  // Crew Planner State
  const [crewDuration, setCrewDuration] = useState(7); // Days
  const [crewSizes, setCrewSizes] = useState<Record<keyof typeof baseRates, number>>({
    helper: 5,
    mason: 2,
    carpenter: 1,
    electrician: 1,
    welder: 0,
    plumber: 1,
    painter: 1,
    bar_bender: 2,
    scaffolder: 1,
    concrete_operator: 1,
    supervisor: 1
  });

  const [copiedProposal, setCopiedProposal] = useState(false);

  // Material & Effort State
  const [wallLength, setWallLength] = useState<number | "">(30); // in feet
  const [wallHeight, setWallHeight] = useState<number | "">(10);  // in feet
  const [thickness, setThickness] = useState<"4inch" | "9inch">("9inch");

  // Safety Advisory State
  const [siteTemp, setSiteTemp] = useState(38); // Celsius
  const [workingAtHeight, setWorkingAtHeight] = useState(true);
  const [machineryInUse, setMachineryInUse] = useState(true);

  // Interactive Task-based Safety Checklists
  const [selectedSafetyCategory, setSelectedSafetyCategory] = useState<keyof typeof taskSafetyChecklists>("masonry");
  const [checkedSafetyItems, setCheckedSafetyItems] = useState<Record<string, boolean>>({});

  const calculateDailyEarnings = () => {
    const base = baseRates[trade];
    const hourlyRate = base / 8;
    
    // 8 Hours base, extra is 1.5x overtime rate
    const normalHoursPay = Math.min(hours, 8) * hourlyRate;
    const extraHoursPay = overtime * (hourlyRate * 1.5);
    
    let hazardBonus = 0;
    if (siteHazardLevel === "high-altitude") hazardBonus = base * 0.15; // 15% risk premium
    if (siteHazardLevel === "demolition") hazardBonus = base * 0.25;    // 25% hazard pay
    
    const nightShiftBonus = nightShift ? base * 0.20 : 0;
    const mealPay = mealAllowance ? 50 : 0;
    
    return Math.round(normalHoursPay + extraHoursPay + hazardBonus + nightShiftBonus + travelAllowance + mealPay);
  };

  const calculateCrewTotal = () => {
    let totalWages = 0;
    (Object.keys(baseRates) as Array<keyof typeof baseRates>).forEach((role) => {
      const size = crewSizes[role] || 0;
      const rate = baseRates[role];
      totalWages += size * rate * crewDuration;
    });

    const standardWelfareTax = totalWages * 0.05; // 5% welfare cess / insurance fund
    const insuranceCess = totalWages * 0.02; // 2% safety premium
    const grandTotal = totalWages + standardWelfareTax + insuranceCess;

    return {
      totalWages,
      standardWelfareTax,
      insuranceCess,
      grandTotal
    };
  };

  const crewCost = calculateCrewTotal();

  // --- Calculations for Construction Material/Labor Planner ---
  // Indian Standard Code guidelines for brickwork estimation:
  // Volume of brickwork: length * height * thickness (in cubic feet converted to cubic meters)
  // 1 Cubic meter of 9-inch brickwork requires ~500 bricks and ~0.3 cubic meters of mortar.
  const calculateMaterials = () => {
    const len = Number(wallLength) || 0;
    const hgt = Number(wallHeight) || 0;
    const thicknessFeet = thickness === "4inch" ? 0.33 : 0.75;
    const volumeCuFt = len * hgt * thicknessFeet;
    const volumeCuM = volumeCuFt * 0.0283168; // CuFt to CuM
    
    const bricks = Math.round(volumeCuM * 500);
    const cementBags = Math.round(volumeCuM * 1.2 * (thickness === "4inch" ? 0.8 : 1)); 
    const sandCuFt = Math.round(volumeCuM * 4.5 * 35.3147); // conversion

    // Laborer effort days needed:
    // A standard Mason can lay ~1.25 CuM of brickwork in 1 working day with 1 Helper.
    const laborDays = Math.max(0, Math.round(volumeCuM / 1.25));

    // Rates
    const brickRate = 8.5; // Rs. per brick
    const cementRate = 420; // Rs. per cement bag
    const sandRate = 65; // Rs. per CuFt
    const masonRate = 750; // Rs. per day
    const helperRate = 450; // Rs. per day

    // Costs
    const brickCost = bricks * brickRate;
    const cementCost = cementBags * cementRate;
    const sandCost = sandCuFt * sandRate;
    const masonCost = laborDays * masonRate;
    const helperCost = laborDays * helperRate;
    const totalCost = brickCost + cementCost + sandCost + masonCost + helperCost;

    return { 
      bricks, cementBags, sandCuFt, laborDays, len, hgt, volumeCuM, volumeCuFt,
      brickCost, cementCost, sandCost, masonCost, helperCost, totalCost,
      brickRate, cementRate, sandRate, masonRate, helperRate
    };
  };

  const materials = calculateMaterials();

  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
      {/* Header Bar */}
      <div className="bg-slate-900 px-6 py-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-mono text-[10px] font-black text-amber-400 tracking-wider uppercase">
              Operational Hub & Estimator Suite
            </span>
          </div>
          <h3 className="text-white font-black text-xl flex items-center">
            <Construction className="w-6 h-6 mr-2.5 text-amber-500" />
            Industrial Site Utilities & Estimators
          </h3>
          <p className="text-[11px] text-slate-400 font-medium">Configure daily wages, brickwork materials, site safety clearance, and full crew budgets.</p>
        </div>

        {/* Tab Selectors */}
        <div className="flex flex-wrap gap-1 bg-slate-800 p-1 rounded-xl text-xs font-bold uppercase tracking-wider font-mono">
          <button
            onClick={() => setActiveTool("estimator")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center ${
              activeTool === "estimator"
                ? "bg-amber-500 text-slate-950 font-black shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Coins className="w-3.5 h-3.5 mr-1" />
            Wage Estimator
          </button>
          <button
            onClick={() => setActiveTool("materials")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center ${
              activeTool === "materials"
                ? "bg-amber-500 text-slate-950 font-black shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5 mr-1" />
            Material & Work
          </button>
          <button
            onClick={() => setActiveTool("safety")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center ${
              activeTool === "safety"
                ? "bg-amber-500 text-slate-950 font-black shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <HardHat className="w-3.5 h-3.5 mr-1" />
            Safety Gear
          </button>
          <button
            onClick={() => setActiveTool("crew")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center ${
              activeTool === "crew"
                ? "bg-amber-500 text-slate-950 font-black shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Users className="w-3.5 h-3.5 mr-1" />
            Crew Planner
          </button>
        </div>
      </div>

      {/* Tool Workspaces */}
      <div className="p-6 flex-grow">
        
        {/* Workspace 1: Daily Wage Estimator */}
        {activeTool === "estimator" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Input Side */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-500 tracking-wider font-mono mb-2">
                  Select Trade Specialty & Base Skill
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.keys(baseRates) as Array<keyof typeof baseRates>).map((t) => {
                    const labelMap: Record<string, string> = {
                      helper: "Helper (सहायक)",
                      mason: "Mason (राजमिस्त्री)",
                      carpenter: "Carpenter (बढ़ई)",
                      electrician: "Electrician (बिजली)",
                      welder: "Welder (वेल्डर)",
                      plumber: "Plumber (नलसाज)",
                      painter: "Painter (चित्रकार)",
                      bar_bender: "Rebar (सरिया)",
                      scaffolder: "Scaffolder (पाड़)",
                      concrete_operator: "Concrete (कंक्रीट)",
                      supervisor: "Supervisor (सुपरवाइजर)"
                    };
                    return (
                      <button
                        key={t}
                        onClick={() => setTrade(t)}
                        className={`py-2 px-1.5 rounded-xl text-[10px] font-black uppercase font-mono tracking-tight transition-all border cursor-pointer text-center flex flex-col justify-between h-14 ${
                          trade === t
                            ? "bg-amber-50 border-amber-400 text-amber-900 font-black shadow-xs"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <span className="truncate w-full">{labelMap[t] || t}</span>
                        <span className="block text-[9px] text-slate-500 font-bold font-mono">
                          ₹{baseRates[t]}/day
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Shift Hours sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-150">
                  <div className="flex justify-between text-xs font-bold text-slate-600 font-mono">
                    <span className="uppercase">Normal Shift Hours</span>
                    <span className="text-amber-600">{hours} Hours</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="8"
                    value={hours}
                    onChange={(e) => setHours(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                  />
                  <p className="text-[9px] text-slate-400 font-medium">Standard legal day is 8 working hours.</p>
                </div>

                <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-150">
                  <div className="flex justify-between text-xs font-bold text-slate-600 font-mono">
                    <span className="uppercase">Overtime Work</span>
                    <span className="text-amber-600">{overtime} Hours (1.5x)</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="6"
                    value={overtime}
                    onChange={(e) => setOvertime(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                  />
                  <p className="text-[9px] text-slate-400 font-medium">Overtime is disbursed at 1.5 times the base rate.</p>
                </div>
              </div>

              {/* Extra allowances */}
              <div className="p-4 border border-slate-200 rounded-2xl bg-slate-50 space-y-4">
                <span className="block text-[11px] font-black uppercase text-slate-500 tracking-wider font-mono">
                  Additional Compensations & Allowances
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <label className="flex items-center space-x-2.5 bg-white p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100/50 select-none">
                    <input
                      type="checkbox"
                      checked={nightShift}
                      onChange={(e) => setNightShift(e.target.checked)}
                      className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                    />
                    <div className="text-left">
                      <span className="font-bold text-xs text-slate-700 flex items-center gap-1 font-mono uppercase">
                        <Moon className="w-3.5 h-3.5 text-indigo-500" /> Night Shift
                      </span>
                      <span className="text-[9px] text-slate-400 block font-medium">+20% rate premium</span>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2.5 bg-white p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100/50 select-none">
                    <input
                      type="checkbox"
                      checked={mealAllowance}
                      onChange={(e) => setMealAllowance(e.target.checked)}
                      className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                    />
                    <div className="text-left">
                      <span className="font-bold text-xs text-slate-700 block font-mono uppercase">Meal Subsidy</span>
                      <span className="text-[9px] text-slate-400 block font-medium">₹50 daily food token</span>
                    </div>
                  </label>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex justify-between text-[11px] font-bold text-slate-600 font-mono">
                      <span className="uppercase">Travel:</span>
                      <span className="text-emerald-600">₹{travelAllowance}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="250"
                      step="50"
                      value={travelAllowance}
                      onChange={(e) => setTravelAllowance(Number(e.target.value))}
                      className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                    />
                    <span className="block text-[8px] text-slate-400">Daily commuting allowance</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-slate-500 tracking-wider font-mono mb-2">
                  Site Risk & Hazard Adjustment
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => setSiteHazardLevel("standard")}
                    className={`p-2.5 rounded-xl text-left border cursor-pointer transition-all ${
                      siteHazardLevel === "standard"
                        ? "bg-slate-900 border-slate-950 text-white"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span className="font-bold text-xs font-mono block">Standard Ground</span>
                    <span className="text-[10px] text-slate-400 block font-medium">Standard baseline payout</span>
                  </button>

                  <button
                    onClick={() => setSiteHazardLevel("high-altitude")}
                    className={`p-2.5 rounded-xl text-left border cursor-pointer transition-all ${
                      siteHazardLevel === "high-altitude"
                        ? "bg-amber-500 border-amber-600 text-slate-950 font-black shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span className="font-black text-xs font-mono block">High Altitude (+15%)</span>
                    <span className="text-[10px] opacity-80 block font-bold">Scaffold / Multi-story work</span>
                  </button>

                  <button
                    onClick={() => setSiteHazardLevel("demolition")}
                    className={`p-2.5 rounded-xl text-left border cursor-pointer transition-all ${
                      siteHazardLevel === "demolition"
                        ? "bg-rose-600 border-rose-700 text-white"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span className="font-bold text-xs font-mono block">Demolition Work (+25%)</span>
                    <span className="text-[10px] opacity-80 block font-medium">Heavy risk machinery / wreckage</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Display / Calculation Result Side */}
            <div className="lg:col-span-5 bg-slate-50 rounded-2xl border border-slate-200 p-6 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Coins className="w-5 h-5 text-amber-500" />
                  <span className="text-xs font-black uppercase text-slate-400 font-mono tracking-wider">
                    Gross Shift Dividend
                  </span>
                </div>
                
                <div className="space-y-0.5">
                  <span className="text-4xl font-black text-slate-950 block font-display">
                    ₹{calculateDailyEarnings()}
                  </span>
                  <span className="text-xs text-slate-500 font-bold font-mono uppercase tracking-wide">
                    Est. Day Wage Payout
                  </span>
                </div>

                <div className="border-t border-slate-200/80 pt-4 space-y-2.5 text-xs font-medium text-slate-600">
                  <div className="flex justify-between">
                    <span>Base Daily Rate ({trade}):</span>
                    <span className="font-mono text-slate-900 font-bold">₹{baseRates[trade]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Overtime Hours Pay ({overtime}h):</span>
                    <span className="font-mono text-slate-900 font-bold">
                      ₹{Math.round(overtime * ((baseRates[trade] / 8) * 1.5))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Special Risk Premium Bonus:</span>
                    <span className="font-mono text-emerald-600 font-bold">
                      +₹{Math.round(
                        siteHazardLevel === "high-altitude" 
                          ? baseRates[trade] * 0.15 
                          : siteHazardLevel === "demolition" 
                          ? baseRates[trade] * 0.25 
                          : 0
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Night Shift Premium (20%):</span>
                    <span className="font-mono text-slate-900 font-bold">
                      +₹{nightShift ? Math.round(baseRates[trade] * 0.20) : 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Meal Token / Subsidy:</span>
                    <span className="font-mono text-slate-900 font-bold">
                      +₹{mealAllowance ? 50 : 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Commuter Travel Allowance:</span>
                    <span className="font-mono text-slate-900 font-bold">
                      +₹{travelAllowance}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5 text-[11px] leading-relaxed text-amber-800 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="font-medium">
                  This estimation adheres strictly to central daily wage standards. Welfare officers verify that all builders disburse these amounts fully via digital clearance.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Workspace 2: Brickwork Material & Effort Planner */}
        {activeTool === "materials" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
            {/* Input Side */}
            <div className="lg:col-span-7 space-y-6">
              {/* Presets */}
              <div className="space-y-2">
                <label className="block text-[11px] font-black uppercase text-slate-500 tracking-wider font-mono">
                  Quick Dimensions Presets
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { name: "Small Partition (10x8ft)", l: 10, h: 8, t: "4inch" as const },
                    { name: "Medium Room (20x10ft)", l: 20, h: 10, t: "9inch" as const },
                    { name: "Boundary Wall (50x6ft)", l: 50, h: 6, t: "9inch" as const },
                    { name: "High Warehouse (35x12ft)", l: 35, h: 12, t: "9inch" as const }
                  ].map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => {
                        setWallLength(preset.l);
                        setWallHeight(preset.h);
                        setThickness(preset.t);
                      }}
                      className="py-1.5 px-2 bg-slate-50 hover:bg-amber-50 hover:border-amber-400 border border-slate-200 text-slate-700 font-bold text-[10px] uppercase rounded-lg transition-all text-center cursor-pointer font-mono"
                      type="button"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600 font-mono uppercase">
                    Wall Length (Ft)
                  </label>
                  <input
                    type="number"
                    value={wallLength}
                    onChange={(e) => {
                      const val = e.target.value;
                      setWallLength(val === "" ? "" : Math.max(0, Number(val)));
                    }}
                    placeholder="Enter length in feet"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600 font-mono uppercase">
                    Wall Height (Ft)
                  </label>
                  <input
                    type="number"
                    value={wallHeight}
                    onChange={(e) => {
                      const val = e.target.value;
                      setWallHeight(val === "" ? "" : Math.max(0, Number(val)));
                    }}
                    placeholder="Enter height in feet"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-slate-500 tracking-wider font-mono mb-2">
                  Brick Wall Width / Thickness
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setThickness("4inch")}
                    className={`p-3 rounded-xl text-left border cursor-pointer transition-all ${
                      thickness === "4inch"
                        ? "bg-slate-900 border-slate-950 text-white"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span className="font-bold text-xs font-mono block">4-inch Single-layer</span>
                    <span className="text-[10px] text-slate-400 block font-medium">Standard interior partitions</span>
                  </button>

                  <button
                    onClick={() => setThickness("9inch")}
                    className={`p-3 rounded-xl text-left border cursor-pointer transition-all ${
                      thickness === "9inch"
                        ? "bg-slate-900 border-slate-950 text-white"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span className="font-bold text-xs font-mono block">9-inch Double-layer</span>
                    <span className="text-[10px] text-slate-400 block font-medium">Load-bearing structural walls</span>
                  </button>
                </div>
              </div>

              {/* Wall Visualizer Blueprint */}
              <div className="space-y-2">
                <label className="block text-[11px] font-black uppercase text-slate-500 tracking-wider font-mono">
                  Real-time Wall Structure Blueprint
                </label>
                <div className="relative border border-slate-200 rounded-2xl bg-slate-950 p-4 overflow-hidden h-36 flex flex-col justify-between shadow-xs">
                  {/* Grid background representing bricks */}
                  <div 
                    className="absolute inset-0 opacity-15 bg-[linear-gradient(rgba(245,158,11,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(245,158,11,0.2)_1px,transparent_1px)]"
                    style={{ backgroundSize: '24px 12px' }}
                  />
                  
                  {/* Decorative corner brackets */}
                  <div className="absolute top-2 left-2 text-[9px] font-mono text-amber-500/60 uppercase">
                    SYS-REFL-GRID
                  </div>
                  <div className="absolute top-2 right-2 text-[9px] font-mono text-slate-500 uppercase">
                    Scale 1:12
                  </div>

                  {/* Simulated Brick Wall in Center */}
                  <div className="flex-grow flex items-center justify-center relative">
                    <div className="flex flex-col space-y-1 items-center">
                      <div className="flex flex-col space-y-0.5 max-w-full overflow-hidden">
                        {[0, 1, 2, 3].map((rowIdx) => (
                          <div 
                            key={rowIdx} 
                            className={`flex items-center space-x-0.5 ${rowIdx % 2 === 0 ? 'translate-x-1.5' : ''}`}
                          >
                            {Array.from({ length: Math.min(10, Math.max(2, Math.round(materials.len / 4))) }).map((_, brickIdx) => (
                              <div 
                                key={brickIdx} 
                                className="bg-amber-600/85 border border-amber-800 rounded-xs transition-all duration-300 shadow-sm"
                                style={{
                                  width: '32px',
                                  height: '14px',
                                  backgroundColor: rowIdx % 2 === 0 ? '#b45309' : '#d97706',
                                }}
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Dimensions footer bar inside visualizer */}
                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-300 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800">
                    <span className="flex items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                      L: <b className="text-white ml-0.5">{materials.len} ft</b>
                    </span>
                    <span className="flex items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 mr-1.5" />
                      H: <b className="text-white ml-0.5">{materials.hgt} ft</b>
                    </span>
                    <span className="flex items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" />
                      Vol: <b className="text-white ml-0.5">{materials.volumeCuFt.toFixed(1)} ft³ ({materials.volumeCuM.toFixed(2)} m³)</b>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Display Results */}
            <div className="lg:col-span-5 bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <span className="text-xs font-black uppercase text-slate-800 font-mono tracking-wider block">
                  Project Estimate Breakdown
                </span>
                <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-wider font-mono px-2 py-0.5 rounded-full">
                  Estimate Ready
                </span>
              </div>

              {/* Grid cards for Inventory */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white border border-slate-200 p-3 rounded-xl text-center space-y-0.5 shadow-2xs">
                  <span className="text-xl font-black text-slate-950 block font-mono">{materials.bricks.toLocaleString()}</span>
                  <span className="text-[9px] text-slate-500 font-black uppercase font-mono tracking-wider block">Standard Bricks</span>
                </div>
                
                <div className="bg-white border border-slate-200 p-3 rounded-xl text-center space-y-0.5 shadow-2xs">
                  <span className="text-xl font-black text-slate-950 block font-mono">{materials.cementBags} Bags</span>
                  <span className="text-[9px] text-slate-500 font-black uppercase font-mono tracking-wider block">Portland Cement</span>
                </div>

                <div className="bg-white border border-slate-200 p-3 rounded-xl text-center space-y-0.5 shadow-2xs">
                  <span className="text-xl font-black text-slate-950 block font-mono">{materials.sandCuFt} CuFt</span>
                  <span className="text-[9px] text-slate-500 font-black uppercase font-mono tracking-wider block">Fine Sand</span>
                </div>

                <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl text-center space-y-0.5 shadow-2xs">
                  <span className="text-xl font-black text-indigo-700 block font-mono flex items-center justify-center">
                    <Users className="w-4 h-4 mr-1 text-indigo-500" />
                    {materials.laborDays} Days
                  </span>
                  <span className="text-[9px] text-indigo-600 font-black uppercase font-mono tracking-wider block">Labor Effort</span>
                </div>
              </div>

              {/* Material & Work Budget Cost table */}
              <div className="space-y-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block font-mono">
                  Detailed Cost Breakdown (INR)
                </span>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-black uppercase font-mono text-slate-500">
                        <th className="p-2.5">Item</th>
                        <th className="p-2.5 text-right">Qty</th>
                        <th className="p-2.5 text-right">Rate</th>
                        <th className="p-2.5 text-right">Est. Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px] font-mono text-slate-700">
                      <tr>
                        <td className="p-2.5 font-bold uppercase text-slate-800">Bricks</td>
                        <td className="p-2.5 text-right">{materials.bricks.toLocaleString()}</td>
                        <td className="p-2.5 text-right">₹{materials.brickRate}</td>
                        <td className="p-2.5 text-right font-bold text-slate-900">₹{Math.round(materials.brickCost).toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold uppercase text-slate-800">Cement</td>
                        <td className="p-2.5 text-right">{materials.cementBags} Bags</td>
                        <td className="p-2.5 text-right">₹{materials.cementRate}</td>
                        <td className="p-2.5 text-right font-bold text-slate-900">₹{Math.round(materials.cementCost).toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold uppercase text-slate-800">Fine Sand</td>
                        <td className="p-2.5 text-right">{materials.sandCuFt} CuFt</td>
                        <td className="p-2.5 text-right">₹{materials.sandRate}</td>
                        <td className="p-2.5 text-right font-bold text-slate-900">₹{Math.round(materials.sandCost).toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold uppercase text-slate-800">Mason Wage</td>
                        <td className="p-2.5 text-right">{materials.laborDays} Days</td>
                        <td className="p-2.5 text-right">₹{materials.masonRate}</td>
                        <td className="p-2.5 text-right font-bold text-slate-900">₹{Math.round(materials.masonCost).toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold uppercase text-slate-800">Helper Wage</td>
                        <td className="p-2.5 text-right">{materials.laborDays} Days</td>
                        <td className="p-2.5 text-right">₹{materials.helperRate}</td>
                        <td className="p-2.5 text-right font-bold text-slate-900">₹{Math.round(materials.helperCost).toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                  
                  {/* Total Cost Bar */}
                  <div className="bg-slate-900 p-3 text-white flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase font-mono text-amber-400 tracking-wider">
                      Total Project Budget
                    </span>
                    <span className="text-sm font-black font-mono text-white">
                      ₹{Math.round(materials.totalCost).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Technical disclaimer */}
              <div className="border-t border-slate-200 pt-3 text-[10px] text-slate-500 leading-normal">
                <span className="font-bold text-slate-700 font-mono block mb-0.5">Calculation Reference:</span>
                Volume is <span className="font-mono text-slate-900 font-bold">{materials.volumeCuM.toFixed(2)}m³</span> ({materials.volumeCuFt.toFixed(1)}ft³). Estimates are based on Indian Standard Code (IS-2250) for masonry mortars, including a standard 10% structural wastage allowance.
              </div>
            </div>
          </div>
        )}

        {/* Workspace 3: Safety Gear Advisory Console */}
        {activeTool === "safety" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Input Side */}
            <div className="lg:col-span-7 space-y-6">
              {/* Site Conditions Check */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <span className="text-xs font-black uppercase text-slate-800 font-mono tracking-wider block border-b border-slate-100 pb-2">
                  Active Site Conditions Check
                </span>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-600 font-mono">
                      <span className="uppercase flex items-center">
                        <Thermometer className="w-4 h-4 mr-1 text-slate-500" /> Ambient Temperature
                      </span>
                      <span className="text-amber-600 font-black">{siteTemp}°C</span>
                    </div>
                    <input
                      type="range"
                      min="15"
                      max="45"
                      value={siteTemp}
                      onChange={(e) => setSiteTemp(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <label className="flex items-center space-x-3 bg-slate-50 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-all select-none">
                      <input
                        type="checkbox"
                        checked={workingAtHeight}
                        onChange={(e) => setWorkingAtHeight(e.target.checked)}
                        className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                      />
                      <div className="text-left">
                        <span className="font-bold text-xs text-slate-700 block font-mono uppercase">Altitude Work</span>
                        <span className="text-[10px] text-slate-400 block font-medium">Height &gt; 2.0 meters</span>
                      </div>
                    </label>

                    <label className="flex items-center space-x-3 bg-slate-50 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-all select-none">
                      <input
                        type="checkbox"
                        checked={machineryInUse}
                        onChange={(e) => setMachineryInUse(e.target.checked)}
                        className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                      />
                      <div className="text-left">
                        <span className="font-bold text-xs text-slate-700 block font-mono uppercase">Heavy Machinery</span>
                        <span className="text-[10px] text-slate-400 block font-medium">Loaders / Mixers active</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Interactive Construction Tasks Safety Checklist */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <ClipboardCheck className="w-5 h-5 text-amber-500" />
                    <div className="text-left">
                      <h4 className="text-xs font-black uppercase text-slate-950 font-mono tracking-tight">
                        Site Compliance Checklist
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase font-mono tracking-wide">
                        Interactive Task Verification
                      </p>
                    </div>
                  </div>
                  
                  {/* Reset button */}
                  <button
                    type="button"
                    onClick={() => setCheckedSafetyItems({})}
                    className="text-[10px] font-bold text-slate-500 hover:text-amber-600 uppercase font-mono flex items-center space-x-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Reset Progress</span>
                  </button>
                </div>

                {/* Task selection tabs */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {Object.entries(taskSafetyChecklists).map(([key, value]) => {
                    const Icon = value.icon;
                    const isSelected = selectedSafetyCategory === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setSelectedSafetyCategory(key as keyof typeof taskSafetyChecklists);
                          setCheckedSafetyItems({}); // Reset checked items for the new task
                        }}
                        className={`py-2 px-1.5 rounded-xl border text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-1 ${
                          isSelected
                            ? "bg-slate-950 text-white border-slate-950 shadow-sm"
                            : "bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200"
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isSelected ? "text-amber-400" : "text-slate-500"}`} />
                        <span className="text-[9px] font-black uppercase tracking-tight font-mono leading-none">
                          {value.title.split(" & ")[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Category Details & Progress */}
                {(() => {
                  const activeData = taskSafetyChecklists[selectedSafetyCategory];
                  const totalItems = activeData.items.length;
                  const completedItems = activeData.items.filter((_, idx) => checkedSafetyItems[`${selectedSafetyCategory}-${idx}`]).length;
                  const completionPercentage = Math.round((completedItems / totalItems) * 100);
                  const isFullyCompliant = completedItems === totalItems;

                  return (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <div className="flex items-center space-x-2.5">
                          <div className={`p-2 rounded-lg ${activeData.bgLight}`}>
                            <activeData.icon className={`w-5 h-5 ${activeData.iconColor}`} />
                          </div>
                          <div className="text-left">
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full font-mono ${activeData.badgeTheme}`}>
                              {activeData.title}
                            </span>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5 font-semibold">
                              Verify all {totalItems} parameters for safe site execution
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`text-[10px] font-black uppercase font-mono tracking-wider px-2 py-1 rounded-lg ${
                            isFullyCompliant 
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                          }`}>
                            {completionPercentage}% Compliant
                          </span>
                        </div>
                      </div>

                      {/* Dynamic Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-mono font-bold text-slate-500">
                          <span>VERIFICATION PROGRESS</span>
                          <span>{completedItems} / {totalItems} COMPLETED</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/40">
                          <div 
                            className={`h-full transition-all duration-500 ease-out rounded-full ${
                              isFullyCompliant ? "bg-emerald-500" : "bg-amber-500"
                            }`}
                            style={{ width: `${completionPercentage}%` }}
                          />
                        </div>
                      </div>

                      {/* Checklist item list */}
                      <div className="divide-y divide-slate-100 bg-slate-50 border border-slate-200/60 rounded-xl overflow-hidden">
                        {activeData.items.map((item, idx) => {
                          const itemKey = `${selectedSafetyCategory}-${idx}`;
                          const isChecked = !!checkedSafetyItems[itemKey];
                          return (
                            <label 
                              key={itemKey}
                              className={`flex items-start space-x-3 p-3 text-left cursor-pointer select-none transition-all ${
                                isChecked 
                                  ? "bg-emerald-50/40 hover:bg-emerald-50/60" 
                                  : "hover:bg-slate-100/80"
                              }`}
                            >
                              <input 
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  setCheckedSafetyItems(prev => ({
                                    ...prev,
                                    [itemKey]: e.target.checked
                                  }));
                                }}
                                className="sr-only" // hide native checkbox
                              />
                              
                              {/* Custom Checkbox Design */}
                              <div className={`mt-0.5 w-4 h-4 rounded border transition-all flex items-center justify-center shrink-0 ${
                                isChecked 
                                  ? "bg-emerald-500 border-emerald-600 text-white" 
                                  : "bg-white border-slate-300"
                              }`}>
                                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>

                              <div className="text-xs text-left">
                                <span className={`font-mono text-[10px] font-bold block ${
                                  isChecked ? "text-emerald-800 line-through decoration-emerald-500/40" : "text-slate-500"
                                }`}>
                                  STEP 0{idx + 1}
                                </span>
                                <span className={`font-medium transition-all block mt-0.5 ${
                                  isChecked ? "text-slate-400 line-through decoration-slate-300" : "text-slate-800"
                                }`}>
                                  {item}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>

                      {/* Fully Compliant Alert Message */}
                      {isFullyCompliant && (
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-left flex items-start gap-3 animate-in fade-in zoom-in-95 duration-300">
                          <div className="p-1 bg-emerald-500 text-white rounded-lg shrink-0">
                            <Shield className="w-4 h-4" />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] font-mono font-black uppercase text-emerald-800 tracking-widest block">
                              COMPLIANCE CLEARANCE SEAL
                            </span>
                            <p className="text-xs text-emerald-700 leading-relaxed font-bold">
                              Excellent! All safety checks for <span className="underline">{activeData.title}</span> have been fully audited and cleared. This task is compliant with site safety codes.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Advisory Display */}
            <div className="lg:col-span-5 bg-slate-900 text-white rounded-2xl p-6 space-y-4">
              <div className="flex items-center space-x-2 text-amber-400 font-mono">
                <ShieldAlert className="w-5 h-5 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider">
                  Mandatory PPE Checklist
                </span>
              </div>

              <div className="space-y-2.5">
                {/* 1. Permanent helmet requirement */}
                <div className="flex items-start bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                  <CheckCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 mr-2.5" />
                  <div className="text-xs">
                    <span className="font-black uppercase font-mono tracking-wide text-amber-400 block">Class A Industrial Helmet</span>
                    <span className="text-slate-300 font-medium">Hard Hat mandatory for all persons on the construction deck.</span>
                  </div>
                </div>

                {/* 2. Temperature based rule */}
                {siteTemp >= 35 && (
                  <div className="flex items-start bg-amber-500/10 p-3 rounded-xl border border-amber-500/35">
                    <Thermometer className="w-4 h-4 text-amber-500 shrink-0 mt-0.5 mr-2.5" />
                    <div className="text-xs">
                      <span className="font-black uppercase font-mono tracking-wide text-amber-500 block">Extreme Heat Hazard Advisory</span>
                      <span className="text-slate-300 font-medium">Mandated 15-min hydration pause every 1.5 hours. Shade canopy active.</span>
                    </div>
                  </div>
                )}

                {/* 3. Altitude Height based rule */}
                {workingAtHeight && (
                  <div className="flex items-start bg-sky-500/10 p-3 rounded-xl border border-sky-500/35">
                    <ShieldAlert className="w-4 h-4 text-sky-400 shrink-0 mt-0.5 mr-2.5" />
                    <div className="text-xs">
                      <span className="font-black uppercase font-mono tracking-wide text-sky-400 block">Full Body Safety Harness</span>
                      <span className="text-slate-300 font-medium">Double-lanyard shock absorbing harness required with secured scaffolding anchors.</span>
                    </div>
                  </div>
                )}

                {/* 4. Machinery based rule */}
                {machineryInUse && (
                  <div className="flex items-start bg-indigo-500/10 p-3 rounded-xl border border-indigo-500/35">
                    <HardHat className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5 mr-2.5" />
                    <div className="text-xs">
                      <span className="font-black uppercase font-mono tracking-wide text-indigo-400 block">Steel-Toe Boots & Ear Protection</span>
                      <span className="text-slate-300 font-medium">Heavy impact hazard boots and ear defenders during loader vibration cycles.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Workspace 4: Crew Planner & Budget Suite */}
        {activeTool === "crew" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left animate-in fade-in duration-300">
            {/* Input Side */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-950 font-mono tracking-tight">
                      Configure Crew Composition
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase font-mono tracking-wide">
                      Set workforce counts across active specialties
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setCrewSizes({
                        helper: 0,
                        mason: 0,
                        carpenter: 0,
                        electrician: 0,
                        welder: 0,
                        plumber: 0,
                        painter: 0,
                        bar_bender: 0,
                        scaffolder: 0,
                        concrete_operator: 0,
                        supervisor: 0
                      });
                    }}
                    className="text-[10px] font-bold text-slate-500 hover:text-rose-600 uppercase font-mono flex items-center space-x-1 cursor-pointer transition-colors"
                  >
                    <span>Clear All</span>
                  </button>
                </div>

                {/* Grid layout for crew configuration */}
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {(Object.keys(baseRates) as Array<keyof typeof baseRates>).map((role) => {
                    const count = crewSizes[role] || 0;
                    
                    const tradeInfo: Record<string, { label: string; details: string; icon: any; color: string }> = {
                      helper: { label: "General Helper", details: "Site clearing, loading, and mixing assistant", icon: Users, color: "text-slate-500 bg-slate-50" },
                      mason: { label: "Mason / Mistri", details: "Bricklaying, plastering, and structural finishing", icon: Construction, color: "text-amber-500 bg-amber-50" },
                      carpenter: { label: "Carpenter / Carpenter Shutterer", details: "Timber shuttering and centering setup", icon: Layers, color: "text-amber-700 bg-amber-50" },
                      electrician: { label: "Electrician / Wireman", details: "Conduiting, wiring and distribution panels", icon: Zap, color: "text-yellow-500 bg-yellow-50" },
                      welder: { label: "Welder / Fabricator", details: "Hot-cut welding and iron grill structures", icon: Flame, color: "text-red-500 bg-red-50" },
                      plumber: { label: "Plumber / Pipefitter", details: "Sewerage, drainage layouts, and sanitaries", icon: Wrench, color: "text-blue-500 bg-blue-50" },
                      painter: { label: "Painter / Wall Finisher", details: "Exterior coating and paint primers", icon: Paintbrush, color: "text-purple-500 bg-purple-50" },
                      bar_bender: { label: "Rebar / Bar Bender", details: "Slab steel tying and column framing", icon: Construction, color: "text-teal-500 bg-teal-50" },
                      scaffolder: { label: "Scaffolder", details: "Altitude steel pipe framing setups", icon: HardHat, color: "text-sky-500 bg-sky-50" },
                      concrete_operator: { label: "Concrete Mixer Operator", details: "Batching machine loading & handling", icon: Layers, color: "text-emerald-500 bg-emerald-50" },
                      supervisor: { label: "Site Supervisor", details: "Site safety clearance and attendance logs", icon: ClipboardCheck, color: "text-indigo-500 bg-indigo-50" }
                    };

                    const info = tradeInfo[role];
                    const Icon = info.icon;

                    return (
                      <div 
                        key={role} 
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-150 bg-slate-50/50 hover:bg-slate-50 transition-all"
                      >
                        <div className="flex items-center space-x-3 truncate">
                          <div className={`p-2 rounded-lg ${info.color} shrink-0`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="truncate text-left">
                            <span className="font-bold text-xs text-slate-900 block font-mono uppercase">
                              {info.label}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium block truncate max-w-[280px]">
                              {info.details}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 shrink-0">
                          <span className="font-mono text-xs font-bold text-slate-500">
                            ₹{baseRates[role]}/day
                          </span>
                          
                          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 space-x-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setCrewSizes(prev => ({
                                  ...prev,
                                  [role]: Math.max(0, count - 1)
                                }));
                              }}
                              className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-100 cursor-pointer text-slate-600 transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-5 text-center font-mono text-xs font-black text-slate-950">
                              {count}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setCrewSizes(prev => ({
                                  ...prev,
                                  [role]: Math.min(20, count + 1)
                                }));
                              }}
                              className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-100 cursor-pointer text-slate-600 transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Crew Duration Selection */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-950 font-mono tracking-tight">
                      Estimate Duration
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase font-mono tracking-wide">
                      Define overall project working days
                    </p>
                  </div>
                  <span className="bg-amber-100 text-amber-900 text-xs font-mono font-black px-2.5 py-1 rounded-lg">
                    {crewDuration} Working Days
                  </span>
                </div>

                <input
                  type="range"
                  min="1"
                  max="90"
                  value={crewDuration}
                  onChange={(e) => setCrewDuration(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-900"
                />

                <div className="grid grid-cols-4 gap-2 pt-1">
                  {[
                    { label: "1 Day (शुरुआती)", d: 1 },
                    { label: "1 Week (1 हफ्ता)", d: 7 },
                    { label: "2 Weeks (2 हफ्ता)", d: 15 },
                    { label: "1 Month (1 महीना)", d: 30 }
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setCrewDuration(preset.d)}
                      className={`py-1.5 rounded-lg border text-center transition-all cursor-pointer font-mono text-[9px] font-black uppercase ${
                        crewDuration === preset.d
                          ? "bg-slate-900 text-white border-slate-950"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                      }`}
                    >
                      {preset.label.split(" (")[0]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Proposal / Bill Display Side */}
            <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <span className="text-xs font-black uppercase text-slate-800 font-mono tracking-wider flex items-center">
                    <FileText className="w-4 h-4 mr-1.5 text-slate-500" /> Crew Budget Sheet
                  </span>
                  <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-wider font-mono px-2 py-0.5 rounded-full">
                    Quote Calculated
                  </span>
                </div>

                {/* Invoice-style layout */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-4 text-xs font-mono">
                  <div className="border-b border-dashed border-slate-200 pb-3 space-y-1 text-slate-500 text-[10px]">
                    <div className="flex justify-between">
                      <span>PROJECT NO:</span>
                      <span className="text-slate-800 font-bold">EMPO-PRJ-2026</span>
                    </div>
                    <div className="flex justify-between">
                      <span>DURATION:</span>
                      <span className="text-slate-800 font-bold">{crewDuration} working days</span>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto divide-y divide-slate-100 pr-1">
                    {Object.values(crewSizes).some((count) => Number(count) > 0) ? (
                      (Object.keys(baseRates) as Array<keyof typeof baseRates>).map((role) => {
                        const size = crewSizes[role] || 0;
                        if (size === 0) return null;
                        const lineCost = size * baseRates[role] * crewDuration;
                        return (
                          <div key={role} className="flex justify-between text-[11px] pt-2 text-slate-700">
                            <div>
                              <span className="font-bold text-slate-900 block capitalize">{role.replace("_", " ")}</span>
                              <span className="text-[10px] text-slate-400">({size} x ₹{baseRates[role]}/day)</span>
                            </div>
                            <span className="font-bold text-slate-900">₹{lineCost.toLocaleString()}</span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-6 text-slate-400 text-[11px] font-medium uppercase font-mono">
                        No active crew members selected.
                      </div>
                    )}
                  </div>

                  <div className="border-t border-dashed border-slate-200 pt-3 space-y-2 text-[11px] text-slate-600">
                    <div className="flex justify-between">
                      <span>Subtotal Base Wages:</span>
                      <span className="font-bold text-slate-900">₹{crewCost.totalWages.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Labor Welfare Cess (5%):</span>
                      <span className="font-bold text-slate-900">+₹{crewCost.standardWelfareTax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Accident Insurance Fund (2%):</span>
                      <span className="font-bold text-slate-900">+₹{crewCost.insuranceCess.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="bg-slate-900 rounded-lg p-3 text-white flex justify-between items-center">
                    <div>
                      <span className="text-[9px] font-black uppercase text-amber-400 tracking-wider block font-mono leading-none">
                        GRAND TOTAL BUDGET
                      </span>
                      <span className="text-[8px] text-slate-400 mt-0.5 block">Estimated labor clearances</span>
                    </div>
                    <span className="text-base font-black text-amber-400">
                      ₹{Math.round(crewCost.grandTotal).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Interactive clipboard copy */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    let breakdownText = "";
                    (Object.keys(baseRates) as Array<keyof typeof baseRates>).forEach((role) => {
                      const size = crewSizes[role] || 0;
                      if (size > 0) {
                        const rate = baseRates[role];
                        const total = size * rate * crewDuration;
                        breakdownText += `- ${role.replace("_", " ").toUpperCase()}: ${size} workers @ ₹${rate}/day for ${crewDuration} days = ₹${total.toLocaleString()}\n`;
                      }
                    });

                    const text = `=========================================
OFFICIAL LABOR COST ESTIMATE & PROPOSAL
Operational Hub - Empowork Utilities
=========================================
Project Duration: ${crewDuration} Working Days
-----------------------------------------
Crew Breakdown:
${breakdownText || "No crew members selected.\n"}
-----------------------------------------
Subtotal Wages:  ₹${crewCost.totalWages.toLocaleString()}
Welfare Cess (5%): ₹${crewCost.standardWelfareTax.toLocaleString()}
Accident Insurance (2%): ₹${crewCost.insuranceCess.toLocaleString()}
-----------------------------------------
GRAND TOTAL ESTIMATE: ₹${Math.round(crewCost.grandTotal).toLocaleString()}
=========================================
Generated on: ${new Date().toLocaleDateString()}
Empowork Digital Clearance Portal`;

                    navigator.clipboard.writeText(text);
                    setCopiedProposal(true);
                    setTimeout(() => setCopiedProposal(false), 2500);
                  }}
                  className={`w-full py-3 px-4 rounded-xl font-bold font-mono text-xs uppercase cursor-pointer transition-all flex items-center justify-center space-x-2 border shadow-2xs ${
                    copiedProposal
                      ? "bg-emerald-500 text-white border-emerald-600 shadow-md"
                      : "bg-slate-900 text-white hover:bg-slate-800 border-slate-950"
                  }`}
                >
                  {copiedProposal ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Copied Proposal! (प्रस्ताव कॉपी हो गया)</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Formal Cost Proposal (प्रस्ताव कॉपी करें)</span>
                    </>
                  )}
                </button>

                <p className="text-[10px] text-slate-500 leading-normal font-mono text-center">
                  Approved proposal cost logs are registered under central public welfare schemes to ensure strict regulatory compliance.
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
