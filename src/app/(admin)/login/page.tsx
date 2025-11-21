"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UniversalThemeToggle } from "@/components/ui/UniversalThemeToggle";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PWAAuthService } from "@/lib/auth/pwaAuth";

export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Sign in with Supabase client directly (this sets cookies automatically)
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (authError || !authData.user) {
        setError("Credenciales inválidas");
        setIsLoading(false);
        return;
      }

      // Get user role from database
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role")
        .eq("id", authData.user.id)
        .single();

      const role = userData?.role || authData.user.user_metadata?.role;

      // Determine PWA ID based on subdomain or current path
      const hostname = window.location.hostname;
      const parts = hostname.split(".");
      const subdomain = parts.length > 2 ? parts[0] : null;
      
      let pwaId = "admin";
      if (subdomain) {
        // Use subdomain to determine PWA
        const subdomainMap: Record<string, string> = {
          admin: "admin",
          driver: "driver",
          assistant: "assistant",
          scanner: "scanner",
          pos: "pos",
        };
        pwaId = subdomainMap[subdomain] || "admin";
      } else {
        // Fallback to path detection
        const currentPath = window.location.pathname;
        if (currentPath.includes("/mobile/driver")) pwaId = "driver";
        else if (currentPath.includes("/mobile/assistant")) pwaId = "assistant";
        else if (currentPath.includes("/scanner")) pwaId = "scanner";
        else if (currentPath.includes("/pos")) pwaId = "pos";
        else if (currentPath === "/" || currentPath.startsWith("/trips")) pwaId = "public";
      }

      // Save credentials locally for this PWA
      PWAAuthService.setPWAId(pwaId);
      PWAAuthService.saveCredentials({
        userId: authData.user.id,
        email: authData.user.email || credentials.email,
        role: role || "public",
        pwaId: pwaId,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Redirect based on role
      if (role === "pos_agent") {
        // If pos_agent, get their terminal and redirect
        const { data: terminal } = await supabase
          .from("pos_terminals")
          .select("id")
          .eq("assigned_user_id", authData.user.id)
          .eq("is_active", true)
          .single();
        
        if (terminal) {
          window.location.href = `/pos/${terminal.id}`;
        } else {
          setError("No tienes una terminal asignada. Contacta al administrador.");
          setIsLoading(false);
          return;
        }
      } else if (role === "admin" || role === "bus_owner" || role === "financial") {
        // Redirect to dashboard for admin, bus_owner, and financial
        window.location.href = "/dashboard";
      } else if (role === "driver" || role === "assistant") {
        // Redirect to mobile app for drivers and assistants
        window.location.href = "/mobile/driver";
      } else {
        // Regular passengers go to profile
        window.location.href = "/profile";
      }
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesión. Por favor intenta de nuevo.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero-light dark:bg-gradient-hero-dark p-4">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Card */}
        <div className="bg-card/80 backdrop-blur-md rounded-2xl shadow-premium p-8 border border-border/50 animate-scaleIn">
          {/* Header */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center">
                <svg
                  className="w-7 h-7 text-primary-foreground"
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
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
                TDP Admin
              </span>
            </Link>
            <h1 className="text-3xl font-bold mb-2">Iniciar Sesión</h1>
            <p className="text-muted-foreground">
              Ingresa tus credenciales para acceder al sistema
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Correo Electrónico
              </label>
              <input
                id="email"
                type="email"
                value={credentials.email}
                onChange={(e) =>
                  setCredentials({ ...credentials, email: e.target.value })
                }
                placeholder="admin@pimetransport.com"
                className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={credentials.password}
                onChange={(e) =>
                  setCredentials({ ...credentials, password: e.target.value })
                }
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                required
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm animate-fadeIn">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-primary hover:bg-primary-dark text-primary-foreground font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover-lift disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Iniciando sesión...
                </>
              ) : (
                <>
                  Iniciar Sesión
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Volver al sitio público
            </Link>
          </div>
        </div>

        {/* Theme Toggle */}
        <div className="absolute top-4 right-4 z-20">
          <UniversalThemeToggle />
        </div>
      </div>
    </div>
  );
}

