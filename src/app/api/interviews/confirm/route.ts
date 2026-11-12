import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, generateConfirmationEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingIds, meetingLink } = body;

    if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
      return NextResponse.json({ error: "bookingIds array is required" }, { status: 400 });
    }

    const settings = await prisma.appSettings.findFirst();
    const finalMeetingLink = meetingLink || settings?.defaultMeetingLink || "https://meet.google.com";
    const companyName = settings?.companyName || "Akodefy";
    const duration = `${settings?.slotDurationMinutes || 60} Minutes`;

    const bookings = await prisma.interviewBooking.findMany({
      where: { id: { in: bookingIds } },
      include: { candidate: true },
    });

    const results = [];

    for (const booking of bookings) {
      const emailHtml = generateConfirmationEmail({
        candidateName: booking.candidate.name,
        companyName,
        date: booking.date,
        timeSlot: booking.timeSlot,
        meetingLink: finalMeetingLink,
        duration,
      });

      const sendResult = await sendEmail({
        candidateId: booking.candidate.id,
        to: booking.candidate.email,
        subject: `Interview Confirmed – ${companyName}`,
        html: emailHtml,
        type: "CONFIRMATION",
      });

      await prisma.$transaction([
        prisma.interviewBooking.update({
          where: { id: booking.id },
          data: {
            status: "CONFIRMED",
            meetingLink: finalMeetingLink,
            confirmationSentAt: new Date(),
          },
        }),
        prisma.candidate.update({
          where: { id: booking.candidate.id },
          data: {
            status: "CONFIRMED",
          },
        }),
      ]);

      results.push({
        bookingId: booking.id,
        candidateName: booking.candidate.name,
        email: booking.candidate.email,
        ...sendResult,
      });
    }

    return NextResponse.json({
      success: true,
      confirmedCount: results.length,
      results,
    });
  } catch (error: any) {
    console.error("POST /api/interviews/confirm error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
