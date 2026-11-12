import { NextRequest, NextResponse } from "next/server";
import { syncIndeedEmails } from "../../../../../scripts/sync_indeed_emails.mjs";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await syncIndeedEmails();
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("POST /api/ingest/gmail-sync error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

