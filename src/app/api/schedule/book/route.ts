import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PrismaClient } from "@prisma/client";
import { categorizeState } from "@/lib/stateClassifier";

type TransactionClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      token,
      name,
      email,
      phone,
      qualification,
      degreeCourse,
      fullAddress,
      date,
      timeSlot,
      uploadedResumeUrl,
    } = body;

    if (!token || !date || !timeSlot || !qualification || !degreeCourse) {
      return NextResponse.json(
        { error: "Please fill all required fields and select an interview slot." },
        { status: 400 }
      );
    }

    const candidate = await prisma.candidate.findUnique({
      where: { schedulingToken: token },
    });

    if (!candidate) {
      return NextResponse.json({ error: "Candidate record not found." }, { status: 404 });
    }

    // Atomic transaction: verify slot availability and reserve
    const result = await prisma.$transaction(async (tx: TransactionClient) => {
      // Check if another candidate has already booked this exact date & slot
      const existingActiveBooking = await tx.interviewBooking.findFirst({
        where: {
          date,
          timeSlot,
          status: {
            notIn: ["CANCELLED", "RESCHEDULED"],
          },
          candidateId: { not: candidate.id },
        },
      });

      if (existingActiveBooking) {
        throw new Error("SLOT_TAKEN");
      }

      // Check if candidate already has a booking
      const previousBooking = await tx.interviewBooking.findFirst({
        where: {
          candidateId: candidate.id,
          status: { notIn: ["CANCELLED"] },
        },
      });

      let booking;
      if (previousBooking) {
        booking = await tx.interviewBooking.update({
          where: { id: previousBooking.id },
          data: {
            date,
            timeSlot,
            status: "PENDING_APPROVAL",
          },
        });
      } else {
        booking = await tx.interviewBooking.create({
          data: {
            candidateId: candidate.id,
            date,
            timeSlot,
            status: "PENDING_APPROVAL",
          },
        });
      }

      // Detect state and city from candidate's manually entered address
      let detectedState = candidate.state;
      let detectedCity = candidate.city;
      if (fullAddress && fullAddress.trim()) {
        const cat = categorizeState(fullAddress);
        if (cat) detectedState = cat;
        const parts = fullAddress.split(",");
        if (parts.length > 0) detectedCity = parts[0].trim();
      }

      const updatedCandidate = await tx.candidate.update({
        where: { id: candidate.id },
        data: {
          name: name?.trim() || candidate.name,
          email: email?.trim() ? email.trim().toLowerCase() : candidate.email,
          phone: phone?.trim() || candidate.phone,
          qualification: qualification?.trim() || candidate.qualification,
          degreeCourse: degreeCourse?.trim() || candidate.degreeCourse,
          fullAddress: fullAddress?.trim() || candidate.fullAddress,
          city: detectedCity,
          state: detectedState,
          uploadedResumeUrl: uploadedResumeUrl?.trim() || candidate.uploadedResumeUrl,
          status: "FORM_COMPLETED",
        },
      });

      return { booking, candidate: updatedCandidate };
    });

    return NextResponse.json({
      success: true,
      message: "Your interview slot has been booked and is pending HR confirmation.",
      booking: result.booking,
    });
  } catch (error: any) {
    if (error.message === "SLOT_TAKEN") {
      return NextResponse.json(
        { error: "The selected time slot was just booked by another applicant. Please select another slot." },
        { status: 409 }
      );
    }
    console.error("POST /api/schedule/book error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

