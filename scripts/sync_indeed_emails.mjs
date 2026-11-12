import imaps from "imap-simple";
import { simpleParser } from "mailparser";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

const STATE_MAPPINGS = [
  {
    state: "Tamil Nadu",
    keywords: ["tamil nadu", "tamilnadu", "tn", "chennai", "coimbatore", "madurai", "trichy", "salem", "tirunelveli", "vellore", "erode", "hosur"],
  },
  {
    state: "Karnataka",
    keywords: ["karnataka", "ka", "bangalore", "bengaluru", "mysore", "mysuru", "hubli", "dharwad", "mangalore", "mangaluru", "belgaum", "udupi"],
  },
  {
    state: "Kerala",
    keywords: ["kerala", "kl", "kochi", "cochin", "thiruvananthapuram", "trivandrum", "kozhikode", "thrissur"],
  },
  {
    state: "Maharashtra",
    keywords: ["maharashtra", "mh", "mumbai", "pune", "nagpur", "thane", "nashik"],
  },
];

function categorizeState(text) {
  if (!text) return "Other States";
  const lower = text.toLowerCase();
  for (const item of STATE_MAPPINGS) {
    for (const kw of item.keywords) {
      if (new RegExp(`\\b${kw}\\b`, "i").test(lower)) {
        return item.state;
      }
    }
  }
  return "Other States";
}

export async function syncIndeedEmails() {
  const settings = await prisma.appSettings.findFirst();
  const user = process.env.GMAIL_USER || settings?.gmailUser;
  const password = process.env.GMAIL_APP_PASSWORD || settings?.gmailAppPassword;

  if (!user || !password) {
    return {
      success: false,
      error: "Please configure your Gmail address and 16-character App Password in Settings first.",
    };
  }

  const config = {
    imap: {
      user,
      password: password.replace(/\s+/g, ""), // strip spaces from app password
      host: "imap.gmail.com",
      port: 993,
      tls: true,
      authTimeout: 10000,
      tlsOptions: { rejectUnauthorized: false },
    },
  };

  console.log(`Connecting to Gmail IMAP for: ${user}...`);
  const connection = await imaps.connect(config);
  await connection.openBox("INBOX");

  // Search for Indeed emails from the last 30 days
  const searchCriteria = [
    ["OR", ["FROM", "indeed.com"], ["SUBJECT", "Application"]],
  ];
  const fetchOptions = {
    bodies: ["HEADER", "TEXT", ""],
    markSeen: false,
    struct: true,
  };

  const messages = await connection.search(searchCriteria, fetchOptions);
  console.log(`Found ${messages.length} potential Indeed/Application email(s).`);

  let added = 0;
  let updated = 0;
  const processedEmails = [];

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "resumes");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  for (const item of messages) {
    const all = item.parts.find((p) => p.which === "");
    const id = item.attributes.uid;
    const idHeader = `Imap-Id: ${id}\r\n`;

    const parsed = await simpleParser(idHeader + all.body);

    const subject = parsed.subject || "";
    const textBody = parsed.text || parsed.html || "";

    // Candidate email extraction
    // Indeed typically lists candidate email inside body: "Email: candidate@email.com" or Reply-To
    let candidateEmail = "";
    if (parsed.replyTo && parsed.replyTo.value && parsed.replyTo.value[0]?.address) {
      candidateEmail = parsed.replyTo.value[0].address;
    } else {
      const emailMatch = textBody.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (emailMatch && !emailMatch[1].includes("indeed.com") && !emailMatch[1].includes("google.com")) {
        candidateEmail = emailMatch[1];
      }
    }

    const IGNORED_DOMAINS = ["paypal.com", "myworkday.com", "workday.com", "linkedin.com", "glassdoor.com", "indeed.com", "google.com", "noreply", "no-reply", "mailer-daemon", "donotreply", "support@", "billing@"];
    if (IGNORED_DOMAINS.some((d) => candidateEmail.toLowerCase().includes(d))) {
      continue;
    }

    // Candidate Name extraction
    let candidateName = "";
    if (parsed.from && parsed.from.value && parsed.from.value[0]?.name) {
      candidateName = parsed.from.value[0].name.replace(/via Indeed/gi, "").trim();
    }
    if (!candidateName || candidateName.toLowerCase().includes("indeed")) {
      const nameMatch = subject.match(/(?:Application|New application|Applied).*?[-:]\s*([A-Za-z\s]+)/i);
      if (nameMatch) candidateName = nameMatch[1].trim();
      else candidateName = candidateEmail.split("@")[0].replace(/[._]/g, " ");
    }

    // Phone
    const phoneMatch = textBody.match(/(?:\+91[\-\s]?)?[6-9]\d{4}[\-\s]?\d{5}/);
    const phone = phoneMatch ? phoneMatch[0].replace(/[^\d+]/g, "") : null;

    // State
    const state = categorizeState(textBody);

    // Check for attachments (resume PDF)
    let resumeUrl = null;
    if (parsed.attachments && parsed.attachments.length > 0) {
      for (const att of parsed.attachments) {
        if (att.filename && att.filename.toLowerCase().endsWith(".pdf")) {
          const safeName = `${Date.now()}_${att.filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
          fs.writeFileSync(path.join(uploadsDir, safeName), att.content);
          resumeUrl = `/uploads/resumes/${safeName}`;
          break;
        }
      }
    }

    // Upsert into Candidate table
    const existing = await prisma.candidate.findUnique({
      where: { email: candidateEmail },
    });

    if (existing) {
      await prisma.candidate.update({
        where: { email: candidateEmail },
        data: {
          name: candidateName || existing.name,
          phone: phone || existing.phone,
          state: existing.state !== "Other States" ? existing.state : state,
          uploadedResumeUrl: resumeUrl || existing.uploadedResumeUrl,
        },
      });
      updated++;
    } else {
      await prisma.candidate.create({
        data: {
          name: candidateName,
          email: candidateEmail,
          phone,
          state,
          uploadedResumeUrl: resumeUrl,
          skills: "Business Development, Communication",
          status: "NEW",
        },
      });
      added++;
    }

    processedEmails.push({ name: candidateName, email: candidateEmail, state });
  }

  connection.end();

  return {
    success: true,
    message: `Gmail Sync Complete: Added ${added} new candidate(s), updated ${updated} existing candidate(s).`,
    stats: { added, updated, totalEmailsExamined: messages.length },
    candidates: processedEmails,
  };
}

if (process.argv[1]?.includes("sync_indeed_emails.mjs")) {
  syncIndeedEmails()
    .then((r) => console.log(JSON.stringify(r, null, 2)))
    .catch(console.error)
    .finally(async () => {
      await prisma.$disconnect();
    });
}

