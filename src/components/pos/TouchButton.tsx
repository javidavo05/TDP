"use client";

import { ReactNode } from "react";

interface TouchButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "success" | "danger";
  size?: "sm" | "md" | "lg";
  className?: string;
  type?: "button" | "submit" | "reset";
}

export function TouchButton({
  children,
  onClick,
  disabled = false,
  variant = "primary",
  size = "lg",
  className = "",
  type = "button",
}: TouchButtonProps) {
  const baseClasses = "font-semibold rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const sizeClasses = {
    sm: "px-4 py-3 text-base min-h-[48px]",
    md: "px-6 py-4 text-lg min-h-[56px]",
    lg: "px-8 py-6 text-xl min-h-[64px]",
  };

  const variantClasses = {
    primary: "bg-primary text-primary-foreground hover:bg-primary-dark shadow-lg hover:shadow-xl",
    secondary: "bg-muted text-foreground hover:bg-muted/80 border border-border",
    success: "bg-success text-success-foreground hover:bg-success/90 shadow-lg hover:shadow-xl",
    danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg hover:shadow-xl",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
