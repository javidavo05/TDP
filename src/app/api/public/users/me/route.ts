import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { UserRepository } from "@/infrastructure/db/supabase/UserRepository";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRepository = new UserRepository();
    let user = await userRepository.findByEmail(authUser.email!);

    if (!user) {
      // Create user if doesn't exist
      user = await userRepository.create({
        email: authUser.email!,
        role: "passenger",
        fullName: authUser.user_metadata?.full_name || authUser.email?.split("@")[0],
      });
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch user" },
      { status: 500 }
    );
  }
}

