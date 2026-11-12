import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { categorizeState } from "@/lib/stateClassifier";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get("state");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: any = {};

    if (state && state !== "ALL") {
      where.state = state;
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { skills: { contains: search } },
        { city: { contains: search } },
      ];
    }

    const [candidates, totalCount, stateCounts] = await Promise.all([
      prisma.candidate.findMany({
        where,
        include: {
          bookings: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { appliedAt: "desc" },
      }),
      prisma.candidate.count(),
      prisma.candidate.groupBy({
        by: ["state"],
        _count: { _all: true },
      }),
    ]);

    return NextResponse.json({
      candidates,
      totalCount,
      stateCounts: stateCounts.map((s) => ({ state: s.state, count: s._count._all })),
    });
  } catch (error: any) {
    console.error("GET /api/candidates error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, city, skills, resumeUrl } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Name and Email are required." }, { status: 400 });
    }

    const autoState = categorizeState(`${city || ""} ${body.state || ""}`);

    const candidate = await prisma.candidate.upsert({
      where: { email },
      update: {
        name,
        phone: phone || undefined,
        city: city || undefined,
        skills: skills || undefined,
      },
      create: {
        name,
        email,
        phone,
        city,
        state: autoState,
        skills,
        indeedResumeUrl: resumeUrl,
        status: "NEW",
      },
    });

    return NextResponse.json({ success: true, candidate });
  } catch (error: any) {
    console.error("POST /api/candidates error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { candidateIds } = body;

    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      return NextResponse.json({ error: "candidateIds array is required" }, { status: 400 });
    }

    // 1. Find any bookings belonging to these candidates
    const bookings = await prisma.interviewBooking.findMany({
      where: { candidateId: { in: candidateIds } },
      select: { id: true },
    });
    const bookingIds = bookings.map((b) => b.id);

    if (bookingIds.length > 0) {
      // 2. Clear interview slots associated with these bookings
      await prisma.interviewSlot.updateMany({
        where: { bookingId: { in: bookingIds } },
        data: { bookingId: null, isAvailable: true },
      });

      // 3. Delete the bookings
      await prisma.interviewBooking.deleteMany({
        where: { id: { in: bookingIds } },
      });
    }

    // 4. Delete email logs associated with these candidates
    await prisma.emailLog.deleteMany({
      where: { candidateId: { in: candidateIds } },
    });

    // 5. Delete the candidates
    const deleteResult = await prisma.candidate.deleteMany({
      where: {
        id: { in: candidateIds },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deleteResult.count} candidate record(s).`,
      count: deleteResult.count,
    });
  } catch (error: any) {
    console.error("DELETE /api/candidates error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

