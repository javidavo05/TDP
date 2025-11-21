"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PWAAuthService } from "@/lib/auth/pwaAuth";

export default function POSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Set PWA ID
    PWAAuthService.setPWAId("pos");
    
    // Register POS manifest
    const link = document.createElement("link");
    link.rel = "manifest";
    link.href = "/manifest-pos.json";
    document.head.appendChild(link);

    // Register POS service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw-pos.js", { scope: "/" })
        .then((registration) => {
          console.log("POS Service Worker registered:", registration);
        })
        .catch((error) => {
          console.error("POS Service Worker registration failed:", error);
        });
    }

    // Set favicon for POS
    const favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement;
    if (favicon) {
      favicon.href = "/favicon-pos.png";
    } else {
      const newFavicon = document.createElement("link");
      newFavicon.rel = "icon";
      newFavicon.href = "/favicon-pos.png";
      document.head.appendChild(newFavicon);
    }

    // Check authentication and role
    const checkAuth = async () => {
      const savedCreds = PWAAuthService.getCredentials("pos");
      
      // If no saved credentials, check Supabase auth
      if (!savedCreds) {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/pos/login");
          return;
        }

        const { data: userData } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();

        const role = userData?.role || user.user_metadata?.role;
        
        if (role !== "pos_agent" && role !== "admin") {
          router.push("/pos/login");
          return;
        }
        
        // Save credentials for future use
        PWAAuthService.saveCredentials({
          userId: user.id,
          email: user.email || "",
          role: role,
          pwaId: "pos",
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        });
      } else {
        // Check if credentials are valid
        if (!PWAAuthService.hasAccess("pos", savedCreds.role)) {
          PWAAuthService.clearCredentials("pos");
          router.push("/login");
          return;
        }
      }
    };

    checkAuth();
  }, [router]);

  return <>{children}</>;
}

