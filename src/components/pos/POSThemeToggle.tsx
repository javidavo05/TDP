"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Large touch-friendly theme toggle for POS screens
 */
export function POSThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme") as "light" | "dark" | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = stored || (prefersDark ? "dark" : "light");
    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  if (!mounted) {
    return (
      <div className="w-16 h-16 rounded-full bg-muted animate-pulse" />
    );
  }

  return (
    <Button
      onClick={toggleTheme}
      variant="outline"
      size="lg"
      className="relative w-12 h-12 rounded-full border-2 border-primary-foreground/20 hover:bg-primary-foreground/10 hover:border-primary-foreground/40 transition-all duration-300 touch-manipulation active:scale-95 p-0 bg-transparent"
      aria-label={theme === "light" ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
    >
      <div className="relative w-6 h-6">
        {/* Sun Icon */}
        <Sun
          className={`absolute inset-0 w-6 h-6 text-primary-foreground transition-all duration-300 ${
            theme === "light" ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-0"
          }`}
        />
        {/* Moon Icon */}
        <Moon
          className={`absolute inset-0 w-6 h-6 text-primary-foreground transition-all duration-300 ${
            theme === "dark" ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-0"
          }`}
        />
      </div>
    </Button>
  );
}

