"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UniversalThemeToggle } from "@/components/ui/UniversalThemeToggle";

export function AdminNavbar() {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("admin_auth");
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg
                className="w-6 h-6 text-primary-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                />
              </svg>
            </div>
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
                TDP Admin
              </span>
              <div className="text-xs text-muted-foreground">Panel de Control</div>
            </div>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
            </button>

            {/* Theme Toggle */}
            <UniversalThemeToggle />

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary-foreground">A</span>
                </div>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg py-2 animate-scaleIn">
                  <Link
                    href="/dashboard"
                    className="block px-4 py-2 text-sm hover:bg-muted transition-colors"
                    onClick={() => setShowMenu(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/profile"
                    className="block px-4 py-2 text-sm hover:bg-muted transition-colors"
                    onClick={() => setShowMenu(false)}
                  >
                    Mi Perfil
                  </Link>
                  <div className="border-t border-border my-2" />
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      handleLogout();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-muted transition-colors"
                  >
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

