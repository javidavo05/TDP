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
    const { email, password, fullName, phone, role } = body;

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

    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone,
          role: role || "passenger",
        },
      },
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || "Failed to create user" },
        { status: 400 }
      );
    }

    // Create user in database
    const user = User.create({
      email,
      role: (role as any) || "passenger",
      fullName: fullName,
      phone: phone,
    });

    const savedUser = await userRepository.create(user);

    // Return response with cookies set
    return NextResponse.json(
      {
        user: {
          id: savedUser.id,
          email: savedUser.email,
          role: savedUser.role,
          fullName: savedUser.fullName,
        },
        message: "User created successfully",
      },
      {
        status: 201,
        headers: response.headers,
      }
    );
  } catch (error) {
    console.error("Error signing up:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to sign up" },
      { status: 400 }
    );
  }
}

