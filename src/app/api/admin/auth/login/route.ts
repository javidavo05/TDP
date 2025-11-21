import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña son requeridos" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    // Check user role - must be admin, owner, or pos_agent
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", authData.user.id)
      .single();

    const role = userData?.role || authData.user.user_metadata?.role;

    if (userError || !userData) {
      // If user doesn't exist in users table, check metadata
      if (role !== "admin" && role !== "owner" && role !== "pos_agent") {
        // Sign out if not admin/owner/pos_agent
        await supabase.auth.signOut();
        return NextResponse.json(
          { error: "No tienes permisos para acceder al panel administrativo" },
          { status: 403 }
        );
      }
    } else {
      // Check role from database
      if (userData.role !== "admin" && userData.role !== "owner" && userData.role !== "pos_agent") {
        await supabase.auth.signOut();
        return NextResponse.json(
          { error: "No tienes permisos para acceder al panel administrativo" },
          { status: 403 }
        );
      }
    }

    // If user is pos_agent, get their assigned terminal
    let terminalId = null;
    const userRole = userData?.role || authData.user.user_metadata?.role;
    if (userRole === "pos_agent") {
      const { data: terminal } = await supabase
        .from("pos_terminals")
        .select("id")
        .eq("assigned_user_id", authData.user.id)
        .eq("is_active", true)
        .single();
      
      if (terminal) {
        terminalId = terminal.id;
      }
    }

    return NextResponse.json({
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: userRole,
      },
      terminalId, // Include terminal ID for pos_agent users
      message: "Inicio de sesión exitoso",
    });
  } catch (error) {
    console.error("Error en login admin:", error);
    return NextResponse.json(
      { error: "Error al iniciar sesión. Por favor intenta de nuevo." },
      { status: 500 }
    );
  }
}

