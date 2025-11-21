"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AdminNavbar } from "@/components/admin/AdminNavbar";
import { createClient } from "@/lib/supabase/client";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Register Admin manifest
    const link = document.createElement("link");
    link.rel = "manifest";
    link.href = "/manifest-admin.json";
    document.head.appendChild(link);

    // Register Admin service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw-admin.js", { scope: "/dashboard" })
        .then((registration) => {
          console.log("Admin Service Worker registered:", registration);
        })
        .catch((error) => {
          console.error("Admin Service Worker registration failed:", error);
        });
    }

    // Set favicon for admin
    const favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement;
    if (favicon) {
      favicon.href = "/favicon-admin.png";
    } else {
      const newFavicon = document.createElement("link");
      newFavicon.rel = "icon";
      newFavicon.href = "/favicon-admin.png";
      document.head.appendChild(newFavicon);
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const isLoginPage = pathname?.includes("/login");

      // Small delay to ensure cookies are set after login
      if (!isLoginPage) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      try {
        // Check Supabase session
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        // AuthSessionMissingError is normal when not logged in - don't log it as error
        if (userError && userError.message !== "Auth session missing!") {
          console.error("Auth error:", userError);
        }

        // If there's an error and we're not on login page, redirect
        if (userError && !isLoginPage && userError.message !== "Auth session missing!") {
          router.push("/login");
          setIsLoading(false);
          return;
        }

        // If no user and not on login page, redirect to login
        if (!user) {
          if (!isLoginPage) {
            router.push("/login");
          }
          setIsLoading(false);
          return;
        }

        // User exists - check role
        const { data: userData } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();

        const role = userData?.role || user.user_metadata?.role;

        // Allow admin, bus_owner, and financial roles to access admin dashboard
        const allowedRoles = ["admin", "bus_owner", "financial"];
        if (!role || !allowedRoles.includes(role)) {
          // Not authorized - sign out and redirect
          await supabase.auth.signOut();
          if (!isLoginPage) {
            router.push("/login");
          }
          setIsLoading(false);
          return;
        }

        // User is authenticated and has allowed role
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Error checking auth:", error);
        if (!isLoginPage) {
          router.push("/login");
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [pathname, router]);

  // Don't show layout on login page
  if (pathname?.includes("/login")) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Don't show navbar on secondary display page
  const isSecondaryDisplay = pathname?.includes("/pos/secondary-display");

  return (
    <div className="min-h-screen bg-background">
      {!isSecondaryDisplay && <AdminNavbar />}
      <main className="flex-1">{children}</main>
    </div>
  );
}

