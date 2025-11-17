import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/services/auth/AuthService";
import { UserRepository } from "@/infrastructure/db/supabase/UserRepository";

const userRepository = new UserRepository();
const authService = new AuthService(userRepository);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const result = await authService.signIn(email, password);

    return NextResponse.json({
      user: result.user,
      message: "Signed in successfully",
    });
  } catch (error) {
    console.error("Error signing in:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to sign in" },
      { status: 401 }
    );
  }
}

