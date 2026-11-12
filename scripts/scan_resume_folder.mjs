import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import pdfParse from "pdf-parse";

const prisma = new PrismaClient();

// State Classifier logic for node script
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

async function scanFolder() {
  const resumesDir = path.join(process.cwd(), "resumes");
  if (!fs.existsSync(resumesDir)) {
    console.log("No 'resumes' folder found.");
    return;
  }

  const files = fs.readdirSync(resumesDir).filter((f) => f.toLowerCase().endsWith(".pdf"));
  console.log(`Found ${files.length} PDF file(s) in 'resumes' folder.`);

  if (files.length === 0) {
    console.log("Tip: Drop your downloaded Indeed PDF resumes into the 'resumes' folder and re-run this script!");
    return;
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "resumes");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const file of files) {
    const filePath = path.join(resumesDir, file);
    try {
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      const text = data.text || "";

      // Extract Email
      const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
      const email = emailMatch ? emailMatch[1].trim() : null;

      if (!email) {
        console.warn(`[SKIP] Could not find email in: ${file}`);
        skipped++;
        continue;
      }

      // Extract Phone
      const phoneMatch = text.match(/(?:\+91[\-\s]?)?[6-9]\d{4}[\-\s]?\d{5}/);
      const phone = phoneMatch ? phoneMatch[0].replace(/[^\d+]/g, "") : null;

      // Extract Name
      let name = file
        .replace(/\.pdf$/i, "")
        .replace(/resume|cv|biodata|profile|indeed/gi, "")
        .replace(/[_\-+]/g, " ")
        .trim();
      if (!name || name.length < 3) {
        const firstLine = text.split("\n").map((l) => l.trim()).find((l) => l.length > 2 && l.length < 35 && !l.includes("@"));
        name = firstLine || "Applicant";
      }

      // State & Skills
      const state = categorizeState(text);
      const skillsKeywords = ["Lead Generation", "Cold Calling", "Market Research", "B2B Sales", "Client Acquisition", "Business Development", "Excel"];
      const skills = skillsKeywords.filter((s) => new RegExp(`\\b${s}\\b`, "i").test(text)).join(", ") || "Business Development Intern";

      // Degree
      const degMatch = text.match(/\b(BBA|B\.Com|B\.E|B\.Tech|MBA|PGDM|B\.Sc|BCA|BMS)[^,\n\r]{0,25}/i);
      const degreeCourse = degMatch ? degMatch[0].trim() : "Graduate";

      // Copy to public uploads
      const destName = `${Date.now()}_${file.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      fs.copyFileSync(filePath, path.join(uploadsDir, destName));
      const resumeUrl = `/uploads/resumes/${destName}`;

      const existing = await prisma.candidate.findUnique({ where: { email } });
      if (existing) {
        await prisma.candidate.update({
          where: { email },
          data: {
            name: name || existing.name,
            phone: phone || existing.phone,
            state: existing.state !== "Other States" ? existing.state : state,
            skills: skills || existing.skills,
            uploadedResumeUrl: resumeUrl,
          },
        });
        updated++;
      } else {
        await prisma.candidate.create({
          data: {
            name,
            email,
            phone,
            state,
            skills,
            qualification: "Bachelor's",
            degreeCourse,
            uploadedResumeUrl: resumeUrl,
            status: "NEW",
          },
        });
        added++;
      }
      console.log(`[SUCCESS] Processed: ${name} (${email}) -> State: ${state}`);
    } catch (err) {
      console.error(`Error processing ${file}:`, err.message);
      skipped++;
    }
  }

  console.log(`\n========================================`);
  console.log(`Scan Complete! Added: ${added} | Updated: ${updated} | Skipped: ${skipped}`);
  console.log(`All candidates are now in your database and visible on http://localhost:3000`);
}

scanFolder()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });

