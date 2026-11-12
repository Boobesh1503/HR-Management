import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const candidate = await prisma.candidate.findUnique({
      where: { schedulingToken: params.token },
      include: {
        bookings: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!candidate) {
      return NextResponse.json({ error: "Invalid or expired scheduling link." }, { status: 404 });
    }

    const settings = await prisma.appSettings.findFirst();

    return NextResponse.json({
      candidate: {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        city: candidate.city,
        state: candidate.state,
        qualification: candidate.qualification,
        degreeCourse: candidate.degreeCourse,
        fullAddress: candidate.fullAddress,
        existingBooking: candidate.bookings[0] || null,
      },
      settings: {
        companyName: settings?.companyName,
        jobTitle: settings?.jobTitle,
        jobDescription: settings?.jobDescription,
        workingHours: settings?.workingHours,
        companyWebsite: settings?.companyWebsite,
        slotDurationMinutes: settings?.slotDurationMinutes,
      },
    });
  } catch (error: any) {
    console.error("GET /api/schedule/[token] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

