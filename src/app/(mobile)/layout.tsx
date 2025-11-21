"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { PWAAuthService } from "@/lib/auth/pwaAuth";

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Determine PWA ID from path or subdomain
    let pwaId = "driver";
    if (pathname?.includes("/assistant")) {
      pwaId = "assistant";
    }
    
    // Also check subdomain
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      const parts = hostname.split(".");
      const subdomain = parts.length > 2 ? parts[0] : null;
      if (subdomain === "assistant") {
        pwaId = "assistant";
      } else if (subdomain === "driver") {
        pwaId = "driver";
      }
    }
    
    PWAAuthService.setPWAId(pwaId);

    // Register manifest and service worker
    const manifestPath = pwaId === "driver" ? "/manifest-driver.json" : "/manifest-assistant.json";
    const swPath = pwaId === "driver" ? "/sw-driver.js" : "/sw-assistant.js";
    
    // Register manifest
    const link = document.createElement("link");
    link.rel = "manifest";
    link.href = manifestPath;
    document.head.appendChild(link);

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register(swPath, { scope: "/" })
        .then((registration) => {
          console.log(`${pwaId} Service Worker registered:`, registration);
        })
        .catch((error) => {
          console.error(`${pwaId} Service Worker registration failed:`, error);
        });
    }

    // Check for saved credentials
    const savedCreds = PWAAuthService.getCredentials(pwaId);
    
    if (!savedCreds) {
      // No saved credentials, redirect to login
      if (pathname && !pathname.includes("/login")) {
        router.push(`/mobile/${pwaId}/login`);
      }
      return;
    }

    // Check if credentials are valid for this PWA
    if (!PWAAuthService.hasAccess(pwaId, savedCreds.role)) {
      // User doesn't have access, redirect to login
      PWAAuthService.clearCredentials(pwaId);
      router.push(`/mobile/${pwaId}/login`);
      return;
    }

    // If on login page but has valid credentials, redirect to main page
    if (pathname?.includes("/login") && savedCreds) {
      router.push(`/mobile/${pwaId}`);
    }
  }, [pathname, router]);

  return <>{children}</>;
}

