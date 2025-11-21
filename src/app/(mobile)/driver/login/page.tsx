"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PWAAuthService } from "@/lib/auth/pwaAuth";

export default function DriverLoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Set PWA ID
    PWAAuthService.setPWAId("driver");
    
    // Check if already logged in
    const savedCreds = PWAAuthService.getCredentials("driver");
    if (savedCreds && savedCreds.role === "driver") {
      router.push("/mobile/driver");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (authError || !authData.user) {
        setError("Credenciales inválidas");
        setIsLoading(false);
        return;
      }

      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", authData.user.id)
        .single();

      const role = userData?.role || authData.user.user_metadata?.role;

      // Only allow drivers and admins
      if (role !== "driver" && role !== "admin") {
        setError("No tienes acceso a esta aplicación");
        setIsLoading(false);
        return;
      }

      // Save credentials locally
      PWAAuthService.saveCredentials({
        userId: authData.user.id,
        email: authData.user.email || credentials.email,
        role: role,
        pwaId: "driver",
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      router.push("/mobile/driver");
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesión");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 p-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">TDP Chofer</h1>
          <p className="text-muted-foreground">Inicia sesión para acceder</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Correo Electrónico
            </label>
            <input
              id="email"
              type="email"
              value={credentials.email}
              onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
              className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
          </button>
        </form>
      </div>
    </div>
  );
}

