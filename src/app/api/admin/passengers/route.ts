import { NextRequest, NextResponse } from "next/server";
import { PassengerRepository } from "@/infrastructure/db/supabase/PassengerRepository";
import { PassengerService } from "@/services/admin/PassengerService";
import { createClient } from "@/lib/supabase/server";

const passengerRepository = new PassengerRepository();
const passengerService = new PassengerService(passengerRepository);

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin or bus owner
    const userData = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!["admin", "bus_owner"].includes(userData.data?.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    let result;
    if (query) {
      result = await passengerService.searchPassengers(query, { page, limit, offset });
    } else {
      result = await passengerService.listPassengers({ page, limit, offset });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching passengers:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to fetch passengers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const userData = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userData.data?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { documentId, documentType, fullName, phone, email, dateOfBirth, address } = body;

    if (!documentId || !documentType || !fullName) {
      return NextResponse.json(
        { error: "documentId, documentType, and fullName are required" },
        { status: 400 }
      );
    }

    const passenger = await passengerService.findOrCreatePassenger({
      documentId,
      documentType,
      fullName,
      phone,
      email,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      address,
    });

    return NextResponse.json({ passenger }, { status: 201 });
  } catch (error) {
    console.error("Error creating passenger:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to create passenger" },
      { status: 400 }
    );
  }
}

