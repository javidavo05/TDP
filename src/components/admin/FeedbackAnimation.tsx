"use client";

import { useEffect, useState } from "react";

interface FeedbackAnimationProps {
  type: "success" | "error";
  onComplete?: () => void;
}

export function FeedbackAnimation({ type, onComplete }: FeedbackAnimationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Auto-hide after animation
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onComplete) {
        setTimeout(onComplete, 300); // Wait for fade out
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  const isSuccess = type === "success";
  const bgColor = isSuccess ? "bg-success" : "bg-destructive";
  const borderColor = isSuccess ? "border-success" : "border-destructive";
  const icon = isSuccess ? "✓" : "✕";

  return (
    <div
      className={`
        fixed inset-0 z-[9999] flex items-center justify-center
        ${isSuccess ? "bg-success/20" : "bg-destructive/20"} backdrop-blur-sm
        animate-fadeIn pointer-events-none
      `}
      style={{ animationDuration: "0.2s" }}
    >
      <div
        className={`
          relative w-32 h-32 rounded-full
          ${isSuccess ? "bg-success border-success" : "bg-destructive border-destructive"} border-4
          flex items-center justify-center
          animate-pulse-scale
        `}
      >
        <span className="text-6xl font-bold text-white animate-fadeIn">
          {icon}
        </span>
        
        {/* Ripple effect */}
        <div
          className={`
            absolute inset-0 rounded-full
            ${isSuccess ? "bg-success" : "bg-destructive"}
            animate-ping
          `}
          style={{ animationDuration: "0.8s", opacity: 0.3 }}
        />
      </div>

    </div>
  );
}

