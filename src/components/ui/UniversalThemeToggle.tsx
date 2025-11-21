"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function UniversalThemeToggle() {
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
      <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative w-12 h-12 rounded-full border-2 border-border hover:bg-muted/50 hover:border-primary/50 transition-all duration-300 touch-manipulation active:scale-95 p-0 bg-background/80 backdrop-blur-sm"
      aria-label={theme === "light" ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
    >
      <div className="relative w-6 h-6">
        <Sun
          className={`absolute inset-0 w-6 h-6 text-foreground transition-all duration-300 ${
            theme === "light" ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-0"
          }`}
        />
        <Moon
          className={`absolute inset-0 w-6 h-6 text-foreground transition-all duration-300 ${
            theme === "dark" ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-0"
          }`}
        />
      </div>
    </button>
  );
}

