import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/mailer";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const candidateId = params.id;
    const body = await request.json();
    const { status, customNote, sendEmailNotification, customMessage } = body;

    const [candidate, settings] = await Promise.all([
      prisma.candidate.findUnique({
        where: { id: candidateId },
      }),
      prisma.appSettings.findFirst(),
    ]);

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    const updated = await prisma.candidate.update({
      where: { id: candidateId },
      data: {
        status,
        notes: customNote ? `${candidate.notes ? candidate.notes + "\n" : ""}${customNote}` : candidate.notes,
      },
    });

    // Optionally dispatch status email
    if (sendEmailNotification) {
      let subject = `Update on your ${settings?.jobTitle || "Business Development Intern"} application`;
      let emailBody = "";

      if (status === "SELECTED") {
        subject = `Congratulations! Offer for ${settings?.jobTitle || "Business Development Intern"} - ${settings?.companyName}`;
        emailBody = `
          <p>Dear <strong>${candidate.name}</strong>,</p>
          <p>We are thrilled to inform you that based on your interview, you have been <strong>selected</strong> for the <strong>${settings?.jobTitle}</strong> internship at <strong>${settings?.companyName}</strong>!</p>
          <p>${customMessage || "Our HR team will reach out with your formal internship offer letter, onboarding date, and stipend details within 48 hours."}</p>
          <p>Congratulations once again, and we look forward to having you on the team!</p>
        `;
      } else if (status === "REJECTED") {
        subject = `Application Update: ${settings?.jobTitle || "Business Development Intern"} - ${settings?.companyName}`;
        emailBody = `
          <p>Dear <strong>${candidate.name}</strong>,</p>
          <p>Thank you for taking the time to interview with us for the <strong>${settings?.jobTitle}</strong> position.</p>
          <p>${customMessage || "While we were impressed with your background, we have chosen to proceed with another candidate whose experience more closely matches our immediate business priorities at this time."}</p>
          <p>We will keep your resume on file for future openings and wish you the absolute best in your career pursuits.</p>
        `;
      } else {
        emailBody = `
          <p>Dear <strong>${candidate.name}</strong>,</p>
          <p>${customMessage || "Thank you for completing your interview with us. We are currently finalizing our evaluations and will share the next steps soon."}</p>
        `;
      }

      await sendEmail({
        candidateId,
        to: candidate.email,
        subject,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #1e293b; margin-top: 0;">${settings?.companyName}</h2>
            ${emailBody}
            <p style="margin-top: 30px; font-size: 14px; color: #64748b;">Best regards,<br>Talent Acquisition Team<br>${settings?.companyName}</p>
          </div>
        `,
        type: "STATUS_UPDATE",
      });
    }

    return NextResponse.json({ success: true, candidate: updated });
  } catch (error: any) {
    console.error("POST /api/candidates/[id]/status error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

