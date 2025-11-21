import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { UserRepository } from "@/infrastructure/db/supabase/UserRepository";
import { User } from "@/domain/entities";

export const dynamic = 'force-dynamic';

const userRepository = new UserRepository();

export async function POST(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Create Supabase client with cookie handling
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return request.cookies.get(name)?.value;
          },
          set(name, value, options) {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          },
          remove(name, options) {
            request.cookies.set({
              name,
              value: "",
              ...options,
              maxAge: 0,
            });
            response.cookies.set(name, "", {
              ...options,
              maxAge: 0,
            });
          },
        },
      }
    );

    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || "Credenciales inválidas" },
        { 
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Get or create user in database
    let user = await userRepository.findByEmail(email);
    if (!user) {
      // Create user if doesn't exist, using the auth user's ID
      user = User.create({
        id: authData.user.id, // Use the auth user's ID
        email: authData.user.email || email,
        role: (authData.user.user_metadata?.role as any) || "passenger",
      });
      try {
        user = await userRepository.create(user);
      } catch (error) {
        // If creation fails, try to fetch again (might have been created by trigger)
        user = await userRepository.findByEmail(email);
        if (!user) {
          throw error;
        }
      }
    }

    // If user is pos_agent, get their assigned terminal
    let terminalId = null;
    if (user.role === "pos_agent") {
      const { data: terminal } = await supabase
        .from("pos_terminals")
        .select("id")
        .eq("assigned_user_id", user.id)
        .eq("is_active", true)
        .single();
      
      if (terminal) {
        terminalId = terminal.id;
      }
    }

    // Return response with cookies set
    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          fullName: user.fullName,
        },
        terminalId, // Include terminal ID for pos_agent users
        message: "Signed in successfully",
      },
      {
        status: 200,
        headers: response.headers,
      }
    );
  } catch (error) {
    console.error("Error signing in:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to sign in" },
      { 
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}

