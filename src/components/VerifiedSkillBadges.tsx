import React, { useState } from "react";
import { 
  Award, CheckCircle2, ShieldAlert, Sparkles, AlertCircle, HelpCircle, 
  ArrowRight, RefreshCw, Hammer, Droplets, Zap, Flame, Grid3X3, BookOpen, Scale, ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile } from "../types";

interface VerifiedSkillBadgesProps {
  user: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
}

// Concrete definition of skills, details, icons and assessment questions
interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

interface SkillBadgeConfig {
  key: string;
  title: string;
  hindiTitle: string;
  description: string;
  icon: React.ReactNode;
  colorClass: string;
  borderGlow: string;
  questions: QuizQuestion[];
}

const BADGES_CONFIG: SkillBadgeConfig[] = [
  {
    key: "masonry",
    title: "Bricklaying & Masonry",
    hindiTitle: "ईंट-चिनाई और राजमिस्त्री",
    description: "Expertise in proper mortar mixing, brick layering, structural alignment, and plastering.",
    icon: <Hammer className="w-5 h-5" />,
    colorClass: "from-amber-500/10 to-orange-500/10 text-orange-600 border-orange-200/40",
    borderGlow: "shadow-[0_0_15px_rgba(249,115,22,0.15)]",
    questions: [
      {
        id: 1,
        question: "What is the standard recommended ratio of Cement to Sand for general brick wall masonry?",
        options: [
          "1 part Cement : 1 part Sand",
          "1 part Cement : 4 to 6 parts Sand",
          "1 part Cement : 12 parts Sand",
          "Only water and pure sand"
        ],
        correctAnswerIndex: 1,
        explanation: "A ratio of 1:4 to 1:6 is recommended for general brickwork to provide optimum strength and workability."
      },
      {
        id: 2,
        question: "Why must bricks be soaked in clean water before laying them with mortar?",
        options: [
          "To wash away mud and dust",
          "To make them lighter and easier to carry",
          "To prevent bricks from absorbing moisture from the wet mortar, which weakens the bond",
          "To change the color of the bricks"
        ],
        correctAnswerIndex: 2,
        explanation: "Dry bricks absorb water rapidly from wet mortar, leading to poor bonding and weak joint structures."
      },
      {
        id: 3,
        question: "Which simple tool is used to check the perfect vertical alignment of a brick wall?",
        options: [
          "Measuring Tape",
          "Plumb Bob (साहुल / ಓಲಗುಂಡು)",
          "Chisel and Hammer",
          "Steel Trowel"
        ],
        correctAnswerIndex: 1,
        explanation: "A Plumb Bob uses gravity to provide a true vertical reference line to ensure the wall doesn't tilt."
      }
    ]
  },
  {
    key: "tiling",
    title: "Tiling & Marbling",
    hindiTitle: "टाइलिंग और संगमरमर कार्य",
    description: "Skills in leveling, uniform spacer distribution, tile cutting, adhesive application, and grouting.",
    icon: <Grid3X3 className="w-5 h-5" />,
    colorClass: "from-violet-500/10 to-indigo-500/10 text-indigo-600 border-indigo-200/40",
    borderGlow: "shadow-[0_0_15px_rgba(99,102,241,0.15)]",
    questions: [
      {
        id: 1,
        question: "What is the main purpose of using tile spacers during installation?",
        options: [
          "To prevent tiles from cracking during delivery",
          "To ensure uniform, consistent grout lines and alignment across the floor",
          "To stick the tiles to the wall",
          "To clean the tile surface"
        ],
        correctAnswerIndex: 1,
        explanation: "Spacers maintain exact equal distances between tiles, ensuring parallel grout joints across the layout."
      },
      {
        id: 2,
        question: "Which tool is preferred to spread tile adhesive uniformly on the subfloor?",
        options: [
          "Notched Trowel (कंडी)",
          "Plumb Bob",
          "Sledgehammer",
          "Paint Brush"
        ],
        correctAnswerIndex: 0,
        explanation: "A notched trowel creates uniform ridges of adhesive, facilitating solid bedding and air release when tiles are pressed down."
      },
      {
        id: 3,
        question: "When should grout be applied to tile joints?",
        options: [
          "Immediately after placing tiles, while adhesive is completely wet",
          "At least 24 hours after tiling, once the adhesive has fully cured",
          "Only when the floor begins to make noise",
          "Grout is not needed; tiles fit tightly without joints"
        ],
        correctAnswerIndex: 1,
        explanation: "Waiting 24 hours allows the adhesive to cure completely, preventing any moisture entrapment or tile shift."
      }
    ]
  },
  {
    key: "plumbing",
    title: "Plumbing & Piping",
    hindiTitle: "प्लंबिंग और पाइपलाइन",
    description: "Expertise in solvent welding, pressure testing, shut-off valve fittings, and leak containment.",
    icon: <Droplets className="w-5 h-5" />,
    colorClass: "from-sky-500/10 to-blue-500/10 text-blue-600 border-blue-200/40",
    borderGlow: "shadow-[0_0_15px_rgba(14,165,233,0.15)]",
    questions: [
      {
        id: 1,
        question: "What material is wrapped around metal pipe threads to seal them and prevent water leaks?",
        options: [
          "Cotton rope and oil",
          "Teflon Thread Seal Tape (तेफ़्लॉन टेप)",
          "Electrician's PVC tape",
          "Paper glue"
        ],
        correctAnswerIndex: 1,
        explanation: "Teflon tape fills the microscopic gaps in male pipe threads, acting as a lubricant and solid watertight seal."
      },
      {
        id: 2,
        question: "What does the U-shaped 'P-trap' bend under sinks prevent from entering the room?",
        options: [
          "Foul sewer gases and odors by keeping a small water barrier",
          "Valuable items like rings from slipping away",
          "Hot water from turning cold",
          "High water pressure"
        ],
        correctAnswerIndex: 0,
        explanation: "The P-trap traps a small volume of clean water, creating a physical liquid block that stops toxic and foul sewer gases from flowing back up."
      },
      {
        id: 3,
        question: "Before performing any pipe cut or tap repair, what is the critical first safety step?",
        options: [
          "Turn on all taps in the house",
          "Apply plumbing glue onto the wet leaks",
          "Shut off the main water control valve to stop pressure",
          "Prepare a bucket of hot water"
        ],
        correctAnswerIndex: 2,
        explanation: "Isolating the water source prevents high pressure floods and makes it safe to extract damaged fittings."
      }
    ]
  },
  {
    key: "electrical",
    title: "Electrical Assembly",
    hindiTitle: "विद्युत तारों की स्थापना",
    description: "Understanding wire gauges, color codes, MCB breaker installation, and insulated tool safety.",
    icon: <Zap className="w-5 h-5" />,
    colorClass: "from-yellow-500/10 to-amber-500/10 text-yellow-600 border-yellow-200/40",
    borderGlow: "shadow-[0_0_15px_rgba(234,179,8,0.15)]",
    questions: [
      {
        id: 1,
        question: "In standard domestic wiring in India, what color wire represents the Earth (Safety Ground)?",
        options: [
          "Black Wire",
          "Red Wire",
          "Green or Green-with-Yellow stripe",
          "Blue Wire"
        ],
        correctAnswerIndex: 2,
        explanation: "Green or Green-with-Yellow is globally standardized for earth/ground wires to carry leakage current safely to the ground."
      },
      {
        id: 2,
        question: "What does a Miniature Circuit Breaker (MCB) do in a distribution board?",
        options: [
          "Saves electricity to reduce the bill",
          "Automatically cuts off current flow during short-circuits or overloads to prevent fires",
          "Increases voltage when the power is dim",
          "Acts as a simple light bulb socket"
        ],
        correctAnswerIndex: 1,
        explanation: "An MCB acts as a smart switch that trips off the circuit when excessive current flows, protecting home electronics and preventing fires."
      },
      {
        id: 3,
        question: "Which tool must an electrician ALWAYS use to verify if a wire or terminal has live electricity?",
        options: [
          "Insulated pliers by checking for sparks",
          "A certified Neon Line Tester/Multimeter probe",
          "A dry wooden stick",
          "Bare fingers on the metal core"
        ],
        correctAnswerIndex: 1,
        explanation: "A Neon Line Tester or a reliable Multimeter is the only safe tool to verify live voltage without direct hazard or shock."
      }
    ]
  },
  {
    key: "welding",
    title: "Structural Welding",
    hindiTitle: "वेल्डिंग और लोहे का कार्य",
    description: "Skills in metal joining, gas flow setup, weld integrity inspection, and thermal protection.",
    icon: <Flame className="w-5 h-5" />,
    colorClass: "from-red-500/10 to-rose-500/10 text-red-600 border-red-200/40",
    borderGlow: "shadow-[0_0_15px_rgba(239,68,68,0.15)]",
    questions: [
      {
        id: 1,
        question: "Why must a welder always wear an auto-darkening helmet or heavy welding glass?",
        options: [
          "To look fashionable on site",
          "To block toxic metallic dust from the eyes",
          "To protect eyes from blinding ultraviolet (UV) and infrared rays that cause 'Arc Eye' cataracts",
          "To keep the face warm"
        ],
        correctAnswerIndex: 2,
        explanation: "Welding arcs generate high-intensity UV and IR rays which cause painful, irreversible corneal burns and cataracts."
      },
      {
        id: 2,
        question: "What is the primary function of the flux coating on an arc welding electrode?",
        options: [
          "To prevent the welder from getting electric shocks",
          "To create a protective gas shield that prevents atmospheric oxygen from contaminating the hot molten weld",
          "To make the electrode melt faster",
          "To glue the metals together without heat"
        ],
        correctAnswerIndex: 1,
        explanation: "As the flux melts, it generates a shield of inert gases around the weld puddle to prevent oxygen/nitrogen oxidation, which causes brittle welds."
      },
      {
        id: 3,
        question: "What safety step is essential when welding near a highly confined or flammable paint/oil storage area?",
        options: [
          "Wear a heavy woolen sweater",
          "Relocate all flammable materials at least 35 feet away and have a functional fire extinguisher at hand",
          "Spray cold water on the welding cables",
          "Turn on high exhaust fans without moving the cans"
        ],
        correctAnswerIndex: 1,
        explanation: "Welding sparks can travel long distances. Removing combustibles and maintaining a fire watch is standard hazard mitigation."
      }
    ]
  },
  {
    key: "safety_officer",
    title: "Site Safety Protocol",
    hindiTitle: "साइट सुरक्षा और स्वास्थ्य",
    description: "Verified capability in hazard risk reduction, harness anchoring, scaffold inspection, and PPE enforcement.",
    icon: <ShieldCheck className="w-5 h-5" />,
    colorClass: "from-emerald-500/10 to-teal-500/10 text-emerald-600 border-emerald-200/40",
    borderGlow: "shadow-[0_0_15px_rgba(16,185,129,0.15)]",
    questions: [
      {
        id: 1,
        question: "Above what height is it mandatory for a worker to wear and securely anchor a full-body Safety Harness?",
        options: [
          "Above 1.8 meters (6 feet) from the lower level",
          "Only when working on the 20th floor",
          "Harnesses are never mandatory; handrails are sufficient",
          "Only when wind speeds exceed 50 km/h"
        ],
        correctAnswerIndex: 0,
        explanation: "Global OSHA guidelines dictate fall protection (harnesses anchored to a secure structural point) is mandatory for working heights above 6 feet (1.8m)."
      },
      {
        id: 2,
        question: "What color coding is commonly used on a scaffold tag to signal that it is fully inspected and safe to climb?",
        options: [
          "Red Tag (Do Not Use)",
          "Yellow Tag (Under Construction)",
          "Green Tag (Safe For Use)",
          "Blue Tag (Requires Tools)"
        ],
        correctAnswerIndex: 2,
        explanation: "A green scaffold tag indicates the scaffolding structure has been fully certified by an inspector and is safe for labor."
      },
      {
        id: 3,
        question: "In case of a hazardous chemical splash into a worker's eyes, what is the immediate first-aid protocol?",
        options: [
          "Cover eyes with a dry cotton bandage and wait",
          "Flush eyes with clean running water continuously for at least 15 minutes and call for medical help",
          "Apply mustard oil or ghee to soothe the burn",
          "Ask the worker to rub their eyes vigorously"
        ],
        correctAnswerIndex: 1,
        explanation: "Flooding the eyes with water instantly dilutes and washes away corrosive chemicals, preventing permanent corneal destruction."
      }
    ]
  }
];

export default function VerifiedSkillBadges({ user, onUpdateProfile }: VerifiedSkillBadgesProps) {
  // Extract user's current skills. Assume keys are matched case-insensitively
  const activeSkills = user.skills || [];
  const isSkillActive = (badgeKey: string) => {
    const key = (badgeKey || "").toLowerCase();
    return activeSkills.some(s => {
      if (!s) return false;
      const lowerS = String(s).toLowerCase();
      return lowerS === key || lowerS.includes(key);
    });
  };

  const [selectedBadge, setSelectedBadge] = useState<SkillBadgeConfig | null>(null);
  const [quizActive, setQuizActive] = useState(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Sound feedback upon correct answer
  const playSfx = (type: "correct" | "wrong" | "unlock") => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === "correct") {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === "wrong") {
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.setValueAtTime(110, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === "unlock") {
        // Glorious arpeggio chime
        const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        freqs.forEach((f, idx) => {
          const oscNode = ctx.createOscillator();
          const gainNode = ctx.createGain();
          oscNode.frequency.setValueAtTime(f, ctx.currentTime + idx * 0.08);
          gainNode.gain.setValueAtTime(0.1, ctx.currentTime + idx * 0.08);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.08 + 0.3);
          oscNode.connect(gainNode);
          gainNode.connect(ctx.destination);
          oscNode.start(ctx.currentTime + idx * 0.08);
          oscNode.stop(ctx.currentTime + idx * 0.08 + 0.3);
        });
      }
    } catch (e) {
      console.warn("SFX failed:", e);
    }
  };

  const handleStartQuiz = (badge: SkillBadgeConfig) => {
    setSelectedBadge(badge);
    setQuizActive(true);
    setCurrentQuestionIdx(0);
    setSelectedAnswer(null);
    setAnswered(false);
    setScore(0);
    setQuizComplete(false);
  };

  const handleSelectAnswer = (idx: number) => {
    if (answered) return;
    setSelectedAnswer(idx);
  };

  const handleConfirmAnswer = () => {
    if (selectedAnswer === null || !selectedBadge || answered) return;

    const currentQ = selectedBadge.questions[currentQuestionIdx];
    const isCorrect = selectedAnswer === currentQ.correctAnswerIndex;
    setAnswered(true);

    if (isCorrect) {
      setScore(prev => prev + 1);
      playSfx("correct");
    } else {
      playSfx("wrong");
    }
  };

  const handleNextQuestion = () => {
    if (!selectedBadge) return;
    
    if (currentQuestionIdx + 1 < selectedBadge.questions.length) {
      setCurrentQuestionIdx(prev => prev + 1);
      setSelectedAnswer(null);
      setAnswered(false);
    } else {
      // End of questions
      setQuizComplete(true);
      if (score + (selectedAnswer === selectedBadge.questions[currentQuestionIdx].correctAnswerIndex ? 1 : 0) === selectedBadge.questions.length) {
        // Perfect score triggers unlock!
        handleUnlockSkill(selectedBadge);
      }
    }
  };

  const handleUnlockSkill = (badge: SkillBadgeConfig) => {
    setIsVerifying(true);
    playSfx("unlock");

    // Dynamic state persistence with the database partial update trigger
    const finalSkills = [...activeSkills];
    // Find if skill already exists to avoid duplication
    if (!finalSkills.some(s => s && String(s).toLowerCase() === (badge.title || "").toLowerCase())) {
      finalSkills.push(badge.title);
    }

    setTimeout(() => {
      onUpdateProfile({
        skills: finalSkills
      });
      setIsVerifying(false);
    }, 1200);
  };

  const handleCloseQuiz = () => {
    setQuizActive(false);
    setSelectedBadge(null);
  };

  return (
    <div className="space-y-4">
      
      {/* HEADER SECTION */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-5 shadow-xs relative overflow-hidden">
        {/* Decorative ambient visual glow */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-12 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl -z-10" />

        <div className="flex justify-between items-start flex-wrap gap-3">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-amber-500">
              <Award className="w-5 h-5 text-amber-400 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest font-mono">Government & Welfare Verified Badges</span>
            </div>
            <h2 className="text-lg font-black tracking-tight uppercase">Your Practical Skill Credentials</h2>
            <p className="text-slate-300 text-xs leading-normal max-w-2xl">
              Complete offline-friendly skill assessments to certify your expertise. Verified badges are highlighted on your public profile to attract high-paying contractors automatically.
            </p>
          </div>
          
          {/* Summary indicator */}
          <div className="bg-slate-800/80 border border-slate-700 p-3 rounded-xl text-center min-w-[120px]">
            <span className="text-slate-400 text-[9px] uppercase font-bold block tracking-wider">Verified Badges</span>
            <span className="text-2xl font-black text-amber-500">{activeSkills.length}</span>
            <span className="text-[9px] text-slate-400 block font-medium">Out of {BADGES_CONFIG.length} Available</span>
          </div>
        </div>
      </div>

      {/* DETAILED GRID OF SKILL BADGES */}
      {!quizActive ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {BADGES_CONFIG.map((badge) => {
            const verified = isSkillActive(badge.key);
            return (
              <motion.div
                key={badge.key}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.15 }}
                className={`bg-white border rounded-xl p-4.5 shadow-2xs flex flex-col justify-between transition-all relative overflow-hidden ${
                  verified 
                    ? "border-amber-400/80 bg-gradient-to-br from-amber-50/10 via-white to-amber-50/20" 
                    : "border-slate-200"
                }`}
              >
                {/* Visual Accent for verified badges */}
                {verified && (
                  <>
                    <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 rounded-full blur-xl" />
                    <div className="absolute -top-1 -right-1 w-12 h-12 bg-amber-400/20 rounded-bl-full border-b border-l border-amber-300/30 flex items-start justify-end p-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 fill-amber-100" />
                    </div>
                  </>
                )}

                <div className="space-y-3">
                  {/* Badge Icon and status */}
                  <div className="flex items-center space-x-3">
                    <div className={`p-2.5 rounded-xl border flex items-center justify-center shrink-0 ${badge.colorClass} ${verified ? "shadow-md bg-white border-amber-300" : ""}`}>
                      {badge.icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 uppercase leading-none">{badge.title}</h4>
                      <p className="text-[9px] text-slate-500 font-bold tracking-wider uppercase mt-1">
                        {badge.hindiTitle}
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                    {badge.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100/80 flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-1.5">
                    {verified ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                        <Award className="w-3 h-3 text-amber-600 mr-1 shrink-0" />
                        Verified Professional
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                        Unverified
                      </span>
                    )}
                  </div>

                  {!verified ? (
                    <button
                      type="button"
                      onClick={() => handleStartQuiz(badge)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-500 font-black text-[10px] uppercase tracking-wider rounded-lg border border-slate-800 flex items-center space-x-1 cursor-pointer transition-colors shadow-2xs"
                    >
                      <span>Take Test</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  ) : (
                    <span className="text-[10px] font-mono font-bold text-emerald-600 uppercase flex items-center bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                      Approved ✓
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* INTERACTIVE ASSESSMENT INTERFACE */
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm max-w-2xl mx-auto space-y-5"
        >
          {/* Header */}
          <div className="flex justify-between items-center pb-4 border-b border-slate-150">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-slate-100 rounded-xl text-slate-700">
                {selectedBadge?.icon}
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600 block">Active Skill Assessment</span>
                <h3 className="font-black text-xs text-slate-900 uppercase tracking-tight">{selectedBadge?.title} ({selectedBadge?.hindiTitle})</h3>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCloseQuiz}
              className="px-2.5 py-1 text-slate-400 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 font-bold text-[10px] uppercase cursor-pointer"
            >
              Cancel
            </button>
          </div>

          {!quizComplete ? (
            /* ACTIVE QUIZ QUESTION */
            <div className="space-y-5">
              
              {/* Progress Indicator bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <span>Question {currentQuestionIdx + 1} of {selectedBadge?.questions.length}</span>
                  <span>Correct Answers: {score} / {selectedBadge?.questions.length}</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full transition-all duration-300" 
                    style={{ width: `${((currentQuestionIdx) / (selectedBadge?.questions.length || 3)) * 100}%` }} 
                  />
                </div>
              </div>

              {/* Question Statement */}
              <div className="p-4 bg-indigo-50/50 border border-indigo-100/50 rounded-xl space-y-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-700 font-mono">PRACTICAL SCENARIO:</span>
                <p className="text-slate-800 font-bold text-sm leading-snug">
                  {selectedBadge?.questions[currentQuestionIdx].question}
                </p>
              </div>

              {/* Multiple Choice Options */}
              <div className="space-y-2.5">
                {selectedBadge?.questions[currentQuestionIdx].options.map((option, idx) => {
                  const isSelected = selectedAnswer === idx;
                  const currentQ = selectedBadge.questions[currentQuestionIdx];
                  const showCorrect = answered && idx === currentQ.correctAnswerIndex;
                  const showIncorrect = answered && isSelected && idx !== currentQ.correctAnswerIndex;

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={answered}
                      onClick={() => handleSelectAnswer(idx)}
                      className={`w-full text-left p-3.5 rounded-xl border text-xs leading-normal transition-all flex items-center justify-between cursor-pointer ${
                        showCorrect
                          ? "bg-emerald-50 border-emerald-400 text-emerald-800 font-bold"
                          : showIncorrect
                          ? "bg-red-50 border-red-400 text-red-800 font-bold"
                          : isSelected
                          ? "bg-indigo-50 border-indigo-400 text-indigo-900 font-bold shadow-2xs"
                          : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                      }`}
                    >
                      <span>{option}</span>
                      
                      {/* Interactive Right/Wrong Check Visualizers */}
                      {showCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />}
                      {showIncorrect && <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 ml-2" />}
                      {!answered && isSelected && <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0 ml-2 animate-pulse" />}
                    </button>
                  );
                })}
              </div>

              {/* Explanation section if answered */}
              <AnimatePresence>
                {answered && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-3.5 rounded-xl border text-[11px] leading-relaxed ${
                      selectedAnswer === selectedBadge?.questions[currentQuestionIdx].correctAnswerIndex
                        ? "bg-emerald-50/40 border-emerald-100 text-emerald-800"
                        : "bg-amber-50/40 border-amber-100 text-amber-800"
                    }`}
                  >
                    <div className="flex items-center space-x-1 mb-1 font-bold uppercase tracking-wider">
                      {selectedAnswer === selectedBadge?.questions[currentQuestionIdx].correctAnswerIndex ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Correct Knowledge Alignment!</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Incorrect Assessment Alignment</span>
                        </>
                      )}
                    </div>
                    <p className="font-medium text-slate-700">
                      {selectedBadge?.questions[currentQuestionIdx].explanation}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation Controls */}
              <div className="flex justify-end pt-3">
                {!answered ? (
                  <button
                    type="button"
                    onClick={handleConfirmAnswer}
                    disabled={selectedAnswer === null}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg shadow-xs transition-all cursor-pointer ${
                      selectedAnswer === null
                        ? "bg-slate-100 border border-slate-200 text-slate-400"
                        : "bg-slate-900 hover:bg-slate-800 text-white"
                    }`}
                  >
                    Confirm Answer
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-xs cursor-pointer flex items-center space-x-1"
                  >
                    <span>{currentQuestionIdx + 1 === selectedBadge?.questions.length ? "Finish Assessment" : "Next Question"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

            </div>
          ) : (
            /* ASSESSMENT SCORE AND RESULT CELEBRATION */
            <div className="text-center py-6 space-y-6 select-none">
              
              {score === selectedBadge?.questions.length ? (
                /* PERFECT SCORE - CELEBRATION UNLOCKED */
                <div className="space-y-4 animate-in zoom-in-95 duration-350">
                  <div className="relative w-24 h-24 mx-auto bg-gradient-to-tr from-amber-400 to-amber-500 rounded-full flex items-center justify-center border-4 border-white shadow-lg animate-bounce">
                    <Award className="w-12 h-12 text-slate-950 animate-pulse" />
                    {/* Ring sparkle halo */}
                    <div className="absolute inset-0 border-2 border-amber-300 rounded-full animate-ping opacity-30" />
                  </div>

                  <div className="space-y-1 max-w-md mx-auto">
                    <h4 className="font-black text-base text-slate-900 uppercase tracking-tight">Perfect Score 3/3!</h4>
                    <h3 className="font-black text-xl text-amber-500 uppercase tracking-tight">Badge Unlocked: {selectedBadge?.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium">
                      Congratulations! You have demonstrated total mastery over safety and practical guidelines. Your verified credentials have been stamped directly onto your digital resume.
                    </p>
                  </div>

                  {isVerifying ? (
                    <div className="inline-flex items-center space-x-2 bg-indigo-50 border border-indigo-150 px-3 py-1.5 rounded-full text-[10px] text-indigo-700 font-bold font-mono uppercase tracking-wider">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Writing Verified Status to Ledger...</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCloseQuiz}
                      className="py-2.5 px-6 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      Return to Badges Board
                    </button>
                  )}
                </div>
              ) : (
                /* PARTIAL SCORE - FAIL CRITERIA */
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto border-2 border-white shadow-md">
                    <ShieldAlert className="w-8 h-8 text-red-600" />
                  </div>

                  <div className="space-y-1.5 max-w-sm mx-auto">
                    <h4 className="font-black text-base text-slate-900 uppercase tracking-tight">Assessment Incomplete</h4>
                    <p className="text-xs text-red-600 font-black uppercase tracking-wider font-mono">
                      Score: {score} / {selectedBadge?.questions.length} Correct
                    </p>
                    <p className="text-xs text-slate-500 leading-normal font-medium">
                      Site safety and technical precision require 100% compliance. Don't worry, you can study the recommended training sessions and retake this assessment anytime to unlock your badge!
                    </p>
                  </div>

                  <div className="flex justify-center space-x-2.5">
                    <button
                      type="button"
                      onClick={handleCloseQuiz}
                      className="py-2 px-4 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold uppercase rounded-xl cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartQuiz(selectedBadge!)}
                      className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase rounded-xl cursor-pointer shadow-xs"
                    >
                      Retake Test
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}
        </motion.div>
      )}

    </div>
  );
}
