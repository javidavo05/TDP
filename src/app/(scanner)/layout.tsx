"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PWAAuthService } from "@/lib/auth/pwaAuth";

export default function ScannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    // Set PWA ID
    PWAAuthService.setPWAId("scanner");
    
    // Register Scanner manifest
    const link = document.createElement("link");
    link.rel = "manifest";
    link.href = "/manifest-scanner.json";
    document.head.appendChild(link);

    // Register Scanner service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw-scanner.js", { scope: "/" })
        .then((registration) => {
          console.log("Scanner Service Worker registered:", registration);
        })
        .catch((error) => {
          console.error("Scanner Service Worker registration failed:", error);
        });
    }

    // Set favicon for Scanner
    const favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement;
    if (favicon) {
      favicon.href = "/favicon-scanner.png";
    } else {
      const newFavicon = document.createElement("link");
      newFavicon.rel = "icon";
      newFavicon.href = "/favicon-scanner.png";
      document.head.appendChild(newFavicon);
    }

    // Check authentication and role (driver or assistant)
    const checkAuth = async () => {
      const savedCreds = PWAAuthService.getCredentials("scanner");
      
      // If no saved credentials, check Supabase auth
      if (!savedCreds) {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        const { data: userData } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();

        const role = userData?.role || user.user_metadata?.role;
        const allowedRoles = ["driver", "assistant", "admin"];
        
        if (!role || !allowedRoles.includes(role)) {
          router.push("/login");
          return;
        }
        
        // Save credentials for future use
        PWAAuthService.saveCredentials({
          userId: user.id,
          email: user.email || "",
          role: role,
          pwaId: "scanner",
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        });
      } else {
        // Check if credentials are valid
        if (!PWAAuthService.hasAccess("scanner", savedCreds.role)) {
          PWAAuthService.clearCredentials("scanner");
          router.push("/login");
          return;
        }
      }
    };

    checkAuth();
  }, [router]);

  return <>{children}</>;
}

