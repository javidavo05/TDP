"use client";

import { useState, useEffect } from "react";
import { Download, Check, Smartphone, Monitor, QrCode, User, Users } from "lucide-react";

interface PWAConfig {
  id: string;
  name: string;
  shortName: string;
  description: string;
  manifestPath: string;
  url: string;
  icon: React.ReactNode;
  color: string;
}

const PWA_CONFIGS: PWAConfig[] = [
  {
    id: "admin",
    name: "TDP Admin Dashboard",
    shortName: "Admin",
    description: "Panel de administración completo del sistema",
    manifestPath: "/manifest-admin.json",
    url: "/dashboard",
    icon: <Monitor className="w-6 h-6" />,
    color: "bg-purple-500",
  },
  {
    id: "public",
    name: "TDP Público",
    shortName: "Público",
    description: "Aplicación pública para compra de boletos",
    manifestPath: "/manifest.json",
    url: "/",
    icon: <Smartphone className="w-6 h-6" />,
    color: "bg-blue-500",
  },
  {
    id: "scanner",
    name: "TDP Scanner",
    shortName: "Scanner",
    description: "Escáner de códigos QR para validación de boletos",
    manifestPath: "/manifest-scanner.json",
    url: "/scanner",
    icon: <QrCode className="w-6 h-6" />,
    color: "bg-green-500",
  },
  {
    id: "driver",
    name: "TDP Chofer",
    shortName: "Chofer",
    description: "Aplicación móvil para choferes",
    manifestPath: "/manifest-driver.json",
    url: "/mobile/driver",
    icon: <User className="w-6 h-6" />,
    color: "bg-blue-600",
  },
  {
    id: "assistant",
    name: "TDP Ayudante",
    shortName: "Ayudante",
    description: "Aplicación móvil para ayudantes de bus",
    manifestPath: "/manifest-assistant.json",
    url: "/mobile/assistant",
    icon: <Users className="w-6 h-6" />,
    color: "bg-emerald-500",
  },
];

export function PWAInstaller() {
  const [installPrompts, setInstallPrompts] = useState<Map<string, BeforeInstallPromptEvent | null>>(new Map());
  const [installedApps, setInstalledApps] = useState<Set<string>>(new Set());
  const [isInstalling, setIsInstalling] = useState<string | null>(null);

  useEffect(() => {
    // Check for install prompts
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      // Try to determine which PWA based on current URL or manifest
      const currentPath = window.location.pathname;
      const matchingPWA = PWA_CONFIGS.find(pwa => currentPath.startsWith(pwa.url));
      if (matchingPWA) {
        setInstallPrompts(prev => new Map(prev).set(matchingPWA.id, promptEvent));
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Check installed apps (limited browser support)
    if ("getInstalledRelatedApps" in navigator) {
      (navigator as any).getInstalledRelatedApps().then((apps: any[]) => {
        const installed = new Set<string>();
        apps.forEach((app: any) => {
          // Match installed apps to our PWAs (simplified matching)
          const matchingPWA = PWA_CONFIGS.find(pwa => 
            app.url?.includes(pwa.url) || app.id?.includes(pwa.id)
          );
          if (matchingPWA) {
            installed.add(matchingPWA.id);
          }
        });
        setInstalledApps(installed);
      });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async (pwa: PWAConfig) => {
    setIsInstalling(pwa.id);

    try {
      // Check if we have a stored prompt for this PWA
      const prompt = installPrompts.get(pwa.id);
      
      if (prompt) {
        // Use the stored prompt
        await prompt.prompt();
        const { outcome } = await prompt.userChoice;
        if (outcome === "accepted") {
          setInstalledApps(prev => new Set(prev).add(pwa.id));
        }
        setInstallPrompts(prev => {
          const newMap = new Map(prev);
          newMap.delete(pwa.id);
          return newMap;
        });
      } else {
        // Fallback: Open the PWA URL in a new window/tab
        // This will trigger the browser's install prompt if available
        window.open(pwa.url, "_blank");
        
        // Show instructions for manual installation
        alert(
          `Para instalar ${pwa.name}:\n\n` +
          `1. Abre ${pwa.url} en tu navegador\n` +
          `2. En Chrome/Edge: Menú (⋮) > "Instalar aplicación"\n` +
          `3. En Safari: Compartir > "Añadir a pantalla de inicio"\n` +
          `4. En Firefox: Menú > "Instalar"\n\n` +
          `O visita directamente: ${window.location.origin}${pwa.url}`
        );
      }
    } catch (error) {
      console.error(`Error installing ${pwa.name}:`, error);
      alert(`Error al instalar ${pwa.name}. Por favor, intenta manualmente visitando ${pwa.url}`);
    } finally {
      setIsInstalling(null);
    }
  };

  const isInstalled = (pwaId: string) => installedApps.has(pwaId);
  const canInstall = (pwaId: string) => installPrompts.has(pwaId) || !isInstalled(pwaId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Aplicaciones Móviles</h2>
        <p className="text-muted-foreground">
          Instala las aplicaciones PWA en tu dispositivo para acceso rápido y experiencia optimizada
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PWA_CONFIGS.map((pwa) => {
          const installed = isInstalled(pwa.id);
          const installing = isInstalling === pwa.id;
          const canInstallApp = canInstall(pwa.id);

          return (
            <div
              key={pwa.id}
              className="bg-card border border-border rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className={`${pwa.color} text-white p-3 rounded-lg`}>
                  {pwa.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{pwa.shortName}</h3>
                  <p className="text-sm text-muted-foreground">{pwa.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4">
                {installed ? (
                  <div className="flex items-center gap-2 text-success text-sm">
                    <Check className="w-4 h-4" />
                    <span>Instalada</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Download className="w-4 h-4" />
                    <span>No instalada</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <a
                  href={pwa.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium text-center transition-colors"
                >
                  Abrir
                </a>
                {canInstallApp && (
                  <button
                    onClick={() => handleInstall(pwa)}
                    disabled={installing || installed}
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {installing ? "Instalando..." : installed ? "Instalada" : "Instalar"}
                  </button>
                )}
              </div>

              {!canInstallApp && !installed && (
                <p className="text-xs text-muted-foreground mt-2">
                  Visita {pwa.url} para instalar manualmente
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-muted/50 border border-border rounded-lg p-4">
        <h3 className="font-semibold mb-2">Instrucciones de Instalación</h3>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>Chrome/Edge: Menú (⋮) → "Instalar aplicación" o "Añadir a pantalla de inicio"</li>
          <li>Safari (iOS): Compartir → "Añadir a pantalla de inicio"</li>
          <li>Firefox: Menú → "Instalar"</li>
          <li>Algunas aplicaciones requieren que visites su URL directamente para instalar</li>
        </ul>
      </div>
    </div>
  );
}

// Type definition for beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

