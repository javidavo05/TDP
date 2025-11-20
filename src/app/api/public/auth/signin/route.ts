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
        { status: 401 }
      );
    }

    // Get or create user in database
    let user = await userRepository.findByEmail(email);
    if (!user) {
      // Create user if doesn't exist
      user = User.create({
        email,
        role: "passenger",
      });
      user = await userRepository.create(user);
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
      { status: 401 }
    );
  }
}

