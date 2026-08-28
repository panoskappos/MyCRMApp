import React from "react";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "white";
}

export const Logo: React.FC<LogoProps> = ({ className = "", size = "md", variant = "default" }) => {
  const iconSizes = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-14 w-14",
    xl: "h-20 w-20",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-3xl",
    xl: "text-5xl",
  };

  const subTextSizes = {
    sm: "text-[9px]",
    md: "text-[11px]",
    lg: "text-xs",
    xl: "text-sm",
  };

  const isWhite = variant === "white";

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* 2026 Sleek Vector Emblem */}
      <div className={`relative flex items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-sky-500 to-sky-300 shadow-md shadow-blue-500/20 text-white ${iconSizes[size]}`}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3/5 w-3/5"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </div>

      {/* Brand Typography */}
      <div className="flex flex-col leading-none">
        <div className={`font-extrabold tracking-tight ${textSizes[size]} ${isWhite ? 'text-white' : 'text-slate-900'}`}>
          MyCRM<span className="text-blue-600">App</span>
        </div>
        <span className={`font-medium tracking-wider uppercase ${subTextSizes[size]} ${isWhite ? 'text-sky-200' : 'text-slate-500'}`}>
          Enterprise Platform
        </span>
      </div>
    </div>
  );
};
