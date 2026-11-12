import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const settings = await prisma.appSettings.findFirst();
    return NextResponse.json({ settings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      companyName,
      companyWebsite,
      companyIntro,
      jobTitle,
      jobDescription,
      workingHours,
      defaultMeetingLink,
      slotDurationMinutes,
      dailyStartTime,
      dailyEndTime,
      gmailUser,
      gmailAppPassword,
    } = body;

    const updated = await prisma.appSettings.upsert({
      where: { id: "default" },
      update: {
        companyName,
        companyWebsite,
        companyIntro,
        jobTitle,
        jobDescription,
        workingHours,
        defaultMeetingLink,
        slotDurationMinutes: Number(slotDurationMinutes) || 30,
        dailyStartTime,
        dailyEndTime,
        gmailUser,
        gmailAppPassword: gmailAppPassword || undefined,
      },
      create: {
        id: "default",
        companyName,
        companyWebsite,
        companyIntro,
        jobTitle,
        jobDescription,
        workingHours,
        defaultMeetingLink,
        slotDurationMinutes: Number(slotDurationMinutes) || 30,
        dailyStartTime,
        dailyEndTime,
        gmailUser,
        gmailAppPassword,
      },
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

