import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, generateReminderEmail } from "@/lib/mailer";
import { addDays, format } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Target date = 2 days from today
    const targetDateStr = format(addDays(new Date(), 2), "yyyy-MM-dd");

    const settings = await prisma.appSettings.findFirst();
    const companyName = settings?.companyName || "Akodefy";

    // Find confirmed bookings on target date where reminder has not been sent yet
    const upcomingBookings = await prisma.interviewBooking.findMany({
      where: {
        date: targetDateStr,
        status: "CONFIRMED",
        reminderSentAt: null,
      },
      include: {
        candidate: true,
      },
    });

    const results = [];
    for (const booking of upcomingBookings) {
      const emailHtml = generateReminderEmail({
        candidateName: booking.candidate.name,
        companyName,
        date: booking.date,
        timeSlot: booking.timeSlot,
        meetingLink: booking.meetingLink || settings?.defaultMeetingLink || "https://meet.google.com",
      });

      const sendResult = await sendEmail({
        candidateId: booking.candidate.id,
        to: booking.candidate.email,
        subject: `Interview Reminder – ${companyName}`,
        html: emailHtml,
        type: "REMINDER",
      });

      if (sendResult.success) {
        await prisma.interviewBooking.update({
          where: { id: booking.id },
          data: { reminderSentAt: new Date() },
        });
      }

      results.push({
        bookingId: booking.id,
        candidateName: booking.candidate.name,
        email: booking.candidate.email,
        ...sendResult,
      });
    }

    return NextResponse.json({
      success: true,
      targetDate: targetDateStr,
      remindersTriggered: results.length,
      results,
    });
  } catch (error: any) {
    console.error("GET /api/cron/reminders error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
