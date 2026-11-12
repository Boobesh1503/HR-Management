import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseResumeBuffer } from "@/lib/resumeParser";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No resume files uploaded." }, { status: 400 });
    }

    let successCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];
    const addedCandidates: any[] = [];

    for (const file of files) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const originalName = file.name;

        // Parse resume — data extract மட்டும், file save வேண்டாம்
        const parsed = await parseResumeBuffer(buffer, originalName);

        if (!parsed.email || !parsed.email.includes("@")) {
          skippedCount++;
          errors.push(`Could not detect email in: ${originalName}`);
          continue;
        }

        // Upsert into database
        const existing = await prisma.candidate.findUnique({
          where: { email: parsed.email },
        });

        if (existing) {
          const updated = await prisma.candidate.update({
            where: { email: parsed.email },
            data: {
              name: parsed.name !== "Applicant" ? parsed.name : existing.name,
              phone: parsed.phone || existing.phone,
              city: parsed.city || existing.city,
              state: parsed.state !== "Other States" ? parsed.state : existing.state,
              skills: parsed.skills || existing.skills,
              qualification: parsed.qualification || existing.qualification,
              degreeCourse: parsed.degreeCourse || existing.degreeCourse,
            },
          });
          updatedCount++;
          addedCandidates.push(updated);
        } else {
          const created = await prisma.candidate.create({
            data: {
              name: parsed.name,
              email: parsed.email,
              phone: parsed.phone,
              city: parsed.city,
              state: parsed.state,
              skills: parsed.skills,
              qualification: parsed.qualification,
              degreeCourse: parsed.degreeCourse,
              status: "NEW",
            },
          });
          successCount++;
          addedCandidates.push(created);
        }
      } catch (fileErr: any) {
        console.error(`Error processing file ${file.name}:`, fileErr);
        skippedCount++;
        errors.push(`${file.name}: ${fileErr.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${files.length} resume(s): ${successCount} new candidates added, ${updatedCount} updated, ${skippedCount} skipped.`,
      stats: {
        total: files.length,
        added: successCount,
        updated: updatedCount,
        skipped: skippedCount,
      },
      candidates: addedCandidates,
      errors: errors.slice(0, 5),
    });
  } catch (error: any) {
    console.error("POST /api/candidates/upload-resumes error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
