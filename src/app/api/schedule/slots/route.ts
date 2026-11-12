import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlotsForDate } from "@/lib/slotService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");

    if (!dateStr) {
      return NextResponse.json({ error: "date parameter (YYYY-MM-DD) is required" }, { status: 400 });
    }

    const slots = await getAvailableSlotsForDate(dateStr);
    return NextResponse.json({ date: dateStr, slots });
  } catch (error: any) {
    console.error("GET /api/schedule/slots error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
