import React from "react";
import { motion } from "motion/react";

interface LogoProps {
  layout?: "horizontal" | "vertical" | "icon";
  className?: string;
  iconClassName?: string;
  darkBackground?: boolean;
  compact?: boolean;
}

export default function Logo({
  layout = "horizontal",
  className = "",
  iconClassName,
  darkBackground = false,
  compact = false,
}: LogoProps) {
  const defaultIconClass = iconClassName || (compact ? "w-8 h-8" : "w-12 h-12");
  // SVG Representation of the emblem
  const LogoIcon = () => (
    <svg
      className={`${defaultIconClass} shrink-0`}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Dark blue / slate circular shield background (resembling the emblem's blue backing globe) */}
      <path
        d="M25 110 C 25 50, 70 30, 120 30 C 160 30, 175 60, 175 100 C 175 140, 130 160, 80 160 C 45 160, 25 145, 25 110 Z"
        fill="#0f4c81"
      />

      {/* Buildings (Skyline) on the right side */}
      {/* Tallest center building (yellow-orange) */}
      <rect x="94" y="52" width="24" height="75" rx="1.5" fill="#f97316" />
      {/* Windows on tallest building */}
      <rect x="100" y="59" width="3" height="4" rx="0.5" fill="#fef08a" />
      <rect x="100" y="68" width="3" height="4" rx="0.5" fill="#fef08a" />
      <rect x="100" y="77" width="3" height="4" rx="0.5" fill="#fef08a" />
      <rect x="100" y="86" width="3" height="4" rx="0.5" fill="#fef08a" />
      <rect x="100" y="95" width="3" height="4" rx="0.5" fill="#fef08a" />
      <rect x="109" y="59" width="3" height="4" rx="0.5" fill="#fef08a" />
      <rect x="109" y="68" width="3" height="4" rx="0.5" fill="#fef08a" />
      <rect x="109" y="77" width="3" height="4" rx="0.5" fill="#fef08a" />
      <rect x="109" y="86" width="3" height="4" rx="0.5" fill="#fef08a" />
      <rect x="109" y="95" width="3" height="4" rx="0.5" fill="#fef08a" />

      {/* Medium orange-yellow building on the right */}
      <rect x="121" y="68" width="22" height="58" rx="1.5" fill="#facc15" />
      {/* Windows on medium building */}
      <rect x="127" y="75" width="3" height="4" rx="0.5" fill="#f97316" />
      <rect x="127" y="84" width="3" height="4" rx="0.5" fill="#f97316" />
      <rect x="127" y="93" width="3" height="4" rx="0.5" fill="#f97316" />
      <rect x="127" y="102" width="3" height="4" rx="0.5" fill="#f97316" />
      <rect x="134" y="75" width="3" height="4" rx="0.5" fill="#f97316" />
      <rect x="134" y="84" width="3" height="4" rx="0.5" fill="#f97316" />
      <rect x="134" y="93" width="3" height="4" rx="0.5" fill="#f97316" />
      <rect x="134" y="102" width="3" height="4" rx="0.5" fill="#f97316" />

      {/* Small dark orange building behind */}
      <rect x="80" y="78" width="12" height="48" rx="1" fill="#ea580c" />

      {/* Worker Silhouette (White) on the left side */}
      {/* Body / Torso */}
      <path
        d="M32 142 C32 118, 42 106, 60 106 C78 106, 88 118, 88 142 Z"
        fill="#ffffff"
      />
      {/* Blue overalls */}
      <path
        d="M44 115 L 76 115 C 76 115, 78 142, 78 142 L 42 142 Z"
        fill="#0284c7"
      />
      {/* Overalls straps */}
      <rect x="48" y="106" width="5" height="10" fill="#0284c7" stroke="#ffffff" strokeWidth="0.5" />
      <rect x="67" y="106" width="5" height="10" fill="#0284c7" stroke="#ffffff" strokeWidth="0.5" />

      {/* Wrench over shoulder */}
      {/* Handle */}
      <rect
        x="36"
        y="108"
        width="45"
        height="5.5"
        transform="rotate(-15 36 108)"
        fill="#e2e8f0"
        rx="1"
      />
      {/* Wrench Jaw (left side) */}
      <circle cx="34" cy="113" r="8" fill="#e2e8f0" />
      <circle cx="32" cy="113" r="4.5" fill="#0f4c81" />
      <rect
        x="27"
        y="110"
        width="7"
        height="5"
        transform="rotate(-15 27 110)"
        fill="#0f4c81"
      />
      
      {/* Worker's neck and face */}
      <circle cx="60" cy="84" r="15" fill="#ffffff" />
      <rect x="56" y="94" width="8" height="14" fill="#ffffff" />

      {/* Yellow Safety Hard Hat */}
      <path
        d="M43 80 C 43 60, 77 60, 77 80 Z"
        fill="#eab308"
      />
      {/* Hat brim */}
      <path
        d="M38 79 C 38 79, 60 77, 82 79 C 84 81, 78 82, 60 82 C 42 82, 36 81, 38 79 Z"
        fill="#facc15"
      />
      {/* Middle ridge of hat */}
      <path
        d="M57 62 C 57 62, 60 67, 63 62"
        stroke="#ca8a04"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Elegant green upward-pointing arrow/swoosh */}
      <path
        d="M20 134 C 40 148, 120 152, 185 80"
        stroke="#22c55e"
        strokeWidth="9.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Arrow head */}
      <path
        d="M187 78 L 191 93 L 176 89 Z"
        fill="#22c55e"
        stroke="#22c55e"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Swooping orange ribbon wing at the bottom right */}
      <path
        d="M85 149 C 135 147, 168 132, 178 108 C 172 128, 148 138, 100 144 Z"
        fill="#ea580c"
      />
    </svg>
  );

  if (layout === "icon") {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <LogoIcon />
      </div>
    );
  }

  return (
    <div
      className={`flex ${
        layout === "vertical" ? "flex-col items-center text-center space-y-3" : "items-center space-x-2"
      } ${className}`}
    >
      <LogoIcon />
      
      <div className={`flex flex-col ${layout === "vertical" ? "items-center" : "items-start"} leading-tight`}>
        {/* Main Brand Text */}
        <div className={`flex items-center font-black tracking-tight leading-none ${
          compact ? "text-lg" : "text-2xl sm:text-3xl"
        }`}>
          <span className={darkBackground ? "text-white" : "text-slate-900"}>
            Empo
          </span>
          <span className="text-orange-500">
            Work
          </span>
        </div>

        {/* Brand Tagline & Divider */}
        {!compact && (
          <>
            {layout === "vertical" && (
              <div className="w-20 h-0.5 bg-slate-300/60 my-2 rounded-full" />
            )}
            
            <p
              className={`text-[10px] sm:text-[11px] font-bold italic tracking-wide ${
                darkBackground ? "text-slate-300" : "text-slate-500"
              } mt-1`}
            >
              Empowering Workers, Enabling Opportunities
            </p>
          </>
        )}
      </div>
    </div>
  );
}
