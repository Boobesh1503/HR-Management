import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, generateRescheduleEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, newDate, newTimeSlot } = body;

    if (!bookingId || !newDate || !newTimeSlot) {
      return NextResponse.json({ error: "bookingId, newDate, and newTimeSlot are required" }, { status: 400 });
    }

    const currentBooking = await prisma.interviewBooking.findUnique({
      where: { id: bookingId },
      include: { candidate: true },
    });

    if (!currentBooking) {
      return NextResponse.json({ error: "Booking record not found." }, { status: 404 });
    }

    // Verify slot availability
    const conflict = await prisma.interviewBooking.findFirst({
      where: {
        date: newDate,
        timeSlot: newTimeSlot,
        status: { notIn: ["CANCELLED", "RESCHEDULED"] },
        id: { not: bookingId },
      },
    });

    if (conflict) {
      return NextResponse.json(
        { error: "The chosen time slot is already taken. Please pick another time slot." },
        { status: 409 }
      );
    }

    const settings = await prisma.appSettings.findFirst();
    const companyName = settings?.companyName || "Akodefy";
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const updatedBooking = await prisma.interviewBooking.update({
      where: { id: bookingId },
      data: {
        date: newDate,
        timeSlot: newTimeSlot,
        status: "CONFIRMED",
        confirmationSentAt: new Date(),
      },
    });

    await prisma.candidate.update({
      where: { id: currentBooking.candidateId },
      data: { status: "RESCHEDULED" },
    });

    // Send Email 4: Reschedule Email
    const rescheduleUrl = `${baseUrl}/reschedule/${bookingId}`;
    const emailHtml = generateRescheduleEmail({
      candidateName: currentBooking.candidate.name,
      companyName,
      rescheduleUrl,
    });

    await sendEmail({
      candidateId: currentBooking.candidateId,
      to: currentBooking.candidate.email,
      subject: `Interview Rescheduling – ${companyName}`,
      html: emailHtml,
      type: "RESCHEDULE_ACK",
    });

    return NextResponse.json({
      success: true,
      message: "Your interview has been successfully rescheduled.",
      booking: updatedBooking,
    });
  } catch (error: any) {
    console.error("POST /api/interviews/reschedule error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
