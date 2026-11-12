import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { parseResumeBuffer } from "@/lib/resumeParser";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const resumesDir = path.join(process.cwd(), "resumes");
    if (!fs.existsSync(resumesDir)) {
      fs.mkdirSync(resumesDir, { recursive: true });
    }

    const files = fs.readdirSync(resumesDir).filter((f) => f.toLowerCase().endsWith(".pdf"));

    if (files.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No PDF files found in the 'resumes' folder. Place your downloaded PDF resumes into 'd:\\HR Management\\resumes' to scan.",
        stats: { total: 0, added: 0, updated: 0, skipped: 0 },
      });
    }

    let added = 0;
    let updated = 0;
    let skipped = 0;

    for (const file of files) {
      const filePath = path.join(resumesDir, file);
      try {
        const buffer = fs.readFileSync(filePath);
        const parsed = await parseResumeBuffer(buffer, file);

        if (!parsed.email) {
          skipped++;
          continue;
        }

        const existing = await prisma.candidate.findUnique({
          where: { email: parsed.email },
        });

        if (existing) {
          await prisma.candidate.update({
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
          updated++;
        } else {
          await prisma.candidate.create({
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
          added++;
        }
      } catch (err) {
        console.error(`Error scanning ${file}:`, err);
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Local folder scan complete: ${added} new candidate(s) added, ${updated} updated, ${skipped} skipped out of ${files.length} PDF(s).`,
      stats: { total: files.length, added, updated, skipped },
    });
  } catch (error: any) {
    console.error("POST /api/candidates/scan-local error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

