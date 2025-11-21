import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PassengerRepository } from "@/infrastructure/db/supabase/PassengerRepository";

export const dynamic = 'force-dynamic';

const passengerRepository = new PassengerRepository();

async function checkAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userData?.role !== "admin") {
    throw new Error("Forbidden");
  }

  return { user, role: userData?.role };
}

export async function GET(request: NextRequest) {
  try {
    await checkAuth();
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("documentId");

    const supabase = await createClient();

    // Build query for passenger tickets
    let query = supabase
      .from("tickets")
      .select(`
        id,
        passenger_name,
        passenger_email,
        passenger_document_id,
        passenger_document_type,
        seat_id,
        price,
        total_price,
        status,
        created_at,
        trips!inner (
          id,
          departure_time,
          arrival_estimate,
          price,
          status,
          routes!inner (
            id,
            name,
            origin,
            destination
          ),
          buses!inner (
            id,
            plate_number,
            unit_number,
            bus_class
          )
        )
      `)
      .order("created_at", { ascending: false });

    // Filter by document ID if provided
    if (documentId) {
      query = query.eq("passenger_document_id", documentId);
    }

    const { data: tickets, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch tickets: ${error.message}`);
    }

    // Get passenger summary if documentId is provided
    let passengerSummary = null;
    if (documentId) {
      const passenger = await passengerRepository.findByDocumentId(documentId);
      if (passenger) {
        passengerSummary = {
          id: passenger.id,
          name: passenger.fullName,
          email: passenger.email,
          phone: passenger.phone,
          documentId: passenger.documentId,
          documentType: passenger.documentType,
          totalTrips: passenger.totalTrips || 0,
          loyaltyPoints: passenger.loyaltyPoints || 0,
          loyaltyTier: passenger.loyaltyTier || "bronze",
        };
      }
    }

    return NextResponse.json({
      tickets: tickets || [],
      passengerSummary,
    });
  } catch (error: any) {
    console.error("Error fetching passenger history:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch passenger history" },
      { status: error.message === "Unauthorized" || error.message === "Forbidden" ? 401 : 500 }
    );
  }
}

