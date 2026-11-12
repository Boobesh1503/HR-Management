import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { categorizeState } from "@/lib/stateClassifier";
import Papa from "papaparse";
import * as XLSX from "xlsx";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let rows: Record<string, any>[] = [];

    if (file.name.endsWith(".csv")) {
      const csvText = buffer.toString("utf-8");
      const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
      });
      rows = parsed.data as Record<string, any>[];
    } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      rows = XLSX.utils.sheet_to_json(sheet);
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a CSV or XLSX file." },
        { status: 400 }
      );
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: "The uploaded file is empty." }, { status: 400 });
    }

    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const row of rows) {
      // Normalize column header keys (case-insensitive lookup)
      const keys = Object.keys(row);
      const findVal = (keywords: string[]) => {
        for (const k of keys) {
          const lowerK = k.toLowerCase().trim();
          if (keywords.some((kw) => lowerK.includes(kw))) {
            return String(row[k] || "").trim();
          }
        }
        return "";
      };

      const name = findVal(["candidate name", "full name", "applicant name", "name"]);
      const email = findVal(["email address", "candidate email", "email"]);
      const phone = findVal(["phone number", "phone", "contact", "mobile"]);
      const location = findVal(["location", "city", "address", "state", "residence"]);
      const skills = findVal(["skills", "qualifications", "experience", "education", "headline"]);
      const resumeUrl = findVal(["resume link", "resume url", "resume", "link"]);

      if (!name || !email || !email.includes("@")) {
        skippedCount++;
        continue;
      }

      const autoState = categorizeState(location);

      const existing = await prisma.candidate.findUnique({
        where: { email },
      });

      if (existing) {
        await prisma.candidate.update({
          where: { email },
          data: {
            name,
            phone: phone || existing.phone,
            city: location || existing.city,
            state: existing.state !== "Uncategorized" ? existing.state : autoState,
            skills: skills || existing.skills,
            indeedResumeUrl: resumeUrl || existing.indeedResumeUrl,
          },
        });
        updatedCount++;
      } else {
        await prisma.candidate.create({
          data: {
            name,
            email,
            phone,
            city: location,
            state: autoState,
            skills,
            indeedResumeUrl: resumeUrl,
            status: "NEW",
          },
        });
        importedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${rows.length} rows: ${importedCount} newly imported, ${updatedCount} updated, ${skippedCount} skipped.`,
      stats: { importedCount, updatedCount, skippedCount, totalProcessed: rows.length },
    });
  } catch (error: any) {
    console.error("POST /api/candidates/import error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

