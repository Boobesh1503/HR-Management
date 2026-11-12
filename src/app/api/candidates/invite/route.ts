import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, generateInvitationEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { candidateIds } = body;

    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      return NextResponse.json({ error: "candidateIds array is required" }, { status: 400 });
    }

    const [settings, candidates] = await Promise.all([
      prisma.appSettings.findFirst(),
      prisma.candidate.findMany({
        where: { id: { in: candidateIds } },
      }),
    ]);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const companyName = settings?.companyName || "Akodefy";
    const companyWebsite = settings?.companyWebsite || "https://akodefy.com/";

    const results = [];
    for (const candidate of candidates) {
      // Validate email format and reject dummy/placeholder addresses to avoid Gmail bounce
      const isValidEmail = candidate.email && 
        candidate.email.includes("@") && 
        candidate.email.includes(".") && 
        !candidate.email.endsWith("@candidate.review") &&
        !candidate.email.endsWith("@candidate.local");

      if (!isValidEmail) {
        results.push({
          candidateId: candidate.id,
          email: candidate.email,
          success: false,
          error: "Invalid or placeholder email address. Skipped to prevent Gmail bounce.",
        });
        continue;
      }

      const schedulingUrl = `${baseUrl}/schedule/${candidate.schedulingToken}`;
      const emailHtml = generateInvitationEmail({
        candidateName: candidate.name,
        companyName,
        companyWebsite,
        schedulingUrl,
      });

      const sendResult = await sendEmail({
        candidateId: candidate.id,
        to: candidate.email,
        subject: `Interview Invitation – Business Development Intern | ${companyName}`,
        html: emailHtml,
        type: "INVITATION",
      });

      if (sendResult.success) {
        await prisma.candidate.update({
          where: { id: candidate.id },
          data: {
            status: "INVITED",
            invitedAt: new Date(),
          },
        });
      }

      results.push({
        candidateId: candidate.id,
        email: candidate.email,
        ...sendResult,
      });
    }

    return NextResponse.json({
      success: true,
      sentCount: results.filter((r) => r.success).length,
      failedCount: results.filter((r) => !r.success).length,
      results,
    });
  } catch (error: any) {
    console.error("POST /api/candidates/invite error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
