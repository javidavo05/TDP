"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ScannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    // Register Scanner manifest
    const link = document.createElement("link");
    link.rel = "manifest";
    link.href = "/manifest-scanner.json";
    document.head.appendChild(link);

    // Register Scanner service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw-scanner.js", { scope: "/scanner" })
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

      const allowedRoles = ["driver", "assistant", "admin"];
      if (!userData?.role || !allowedRoles.includes(userData.role)) {
        router.push("/dashboard");
        return;
      }
    };

    checkAuth();
  }, [router]);

  return <>{children}</>;
}

