"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@/domain/entities";

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchUser = async () => {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        setUser(null);
        return;
      }

      // Fetch user from database
      const { data: userData, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", authUser.email)
        .single();

      if (error || !userData) {
        setUser(null);
        return;
      }

      // Map to User entity
      const userEntity = new User(
        userData.id,
        userData.email,
        userData.phone,
        userData.role,
        userData.full_name,
        userData.avatar_url,
        userData.email_verified_at ? new Date(userData.email_verified_at) : null,
        userData.phone_verified_at ? new Date(userData.phone_verified_at) : null,
        new Date(userData.created_at),
        new Date(userData.updated_at)
      );

      setUser(userEntity);
    } catch (error) {
      console.error("Error fetching user:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchUser();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const refresh = async () => {
    setLoading(true);
    await fetchUser();
  };

  return { user, loading, isAuthenticated: !!user, signOut, refresh };
}
