import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get("state");

    const where: any = {};
    if (state && state !== "ALL") {
      where.state = state;
    }

    const candidates = await prisma.candidate.findMany({
      where,
      include: {
        bookings: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { appliedAt: "desc" },
    });

    const rows = candidates.map((c) => ({
      "Full Name": c.name,
      Email: c.email,
      Phone: c.phone || "",
      State: c.state,
      City: c.city || "",
      Status: c.status,
      Qualification: c.qualification || "",
      "Degree/Course": c.degreeCourse || "",
      "Scheduled Date": c.bookings[0]?.date || "",
      "Scheduled Time Slot": c.bookings[0]?.timeSlot || "",
      "Booking Status": c.bookings[0]?.status || "",
      "Meeting Link": c.bookings[0]?.meetingLink || "",
      "Applied Date": c.appliedAt.toISOString().split("T")[0],
      Skills: c.skills || "",
      "Resume Link": c.indeedResumeUrl || c.uploadedResumeUrl || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Candidates");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="Candidates_Export_${new Date().toISOString().split("T")[0]}.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error: any) {
    console.error("GET /api/candidates/export error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
