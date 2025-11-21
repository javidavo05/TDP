"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function POSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Register POS manifest
    const link = document.createElement("link");
    link.rel = "manifest";
    link.href = "/manifest-pos.json";
    document.head.appendChild(link);

    // Register POS service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw-pos.js", { scope: "/pos" })
        .then((registration) => {
          console.log("POS Service Worker registered:", registration);
        })
        .catch((error) => {
          console.error("POS Service Worker registration failed:", error);
        });
    }

    // Check authentication and role
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

      if (userData?.role !== "pos_agent" && userData?.role !== "admin") {
        router.push("/dashboard");
        return;
      }
    };

    checkAuth();
  }, [router]);

  return <>{children}</>;
}

