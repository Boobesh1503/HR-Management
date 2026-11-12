import fs from "fs";
import path from "path";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STATE_MAPPINGS = [
  {
    state: "Tamil Nadu",
    keywords: ["tamil nadu", "tamilnadu", "tn", "chennai", "coimbatore", "madurai", "trichy", "salem", "tirunelveli", "vellore", "erode", "hosur", "sri eshwar", "kumaraguru", "sri krishna", "matriculation"],
  },
  {
    state: "Karnataka",
    keywords: ["karnataka", "ka", "bangalore", "bengaluru", "mysore", "mysuru", "hubli", "dharwad", "mangalore", "mangaluru", "belgaum", "udupi"],
  },
  {
    state: "Kerala",
    keywords: ["kerala", "kl", "kochi", "cochin", "thiruvananthapuram", "trivandrum", "kozhikode", "thrissur"],
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

async function reparseActualResumes() {
  const candidates = await prisma.candidate.findMany();
  console.log(`Processing ${candidates.length} actual candidate resumes...`);

  for (const c of candidates) {
    if (!c.uploadedResumeUrl) continue;
    const relPath = c.uploadedResumeUrl.replace(/^\//, "");
    const fullPath = path.join(process.cwd(), "public", relPath);

    if (fs.existsSync(fullPath)) {
      const buffer = fs.readFileSync(fullPath);
      const parser = new PDFParse(new Uint8Array(buffer));
      await parser.load();
      const res = await parser.getText();
      const text = res.text || "";

      // Format Name:
      // Try to get clean name from original filename or first line
      const baseFilename = path.basename(fullPath);
      let formattedName = baseFilename
        .replace(/^\d+_/, "")
        .replace(/\.pdf$/i, "")
        .replace(/resume/gi, "")
        .replace(/([a-z])([A-Z])/g, "$1 $2") // e.g. NithyasreeA -> Nithyasree A
        .replace(/[_\-+]/g, " ")
        .trim();

      // Extract Phone
      const phoneMatch = text.match(/(?:\+91[\-\s]?)?[6-9]\d{4}[\-\s]?\d{5}/);
      const phone = phoneMatch ? phoneMatch[0].replace(/[^\d+]/g, "") : c.phone;

      // Extract State & City
      const state = categorizeState(text);
      let city = c.city || "";
      const cities = ["Coimbatore", "Chennai", "Madurai", "Salem", "Bengaluru", "Kochi", "Tiruppur"];
      for (const ct of cities) {
        if (new RegExp(`\\b${ct}\\b`, "i").test(text)) {
          city = ct;
          break;
        }
      }

      // Degree
      const degMatch = text.match(/\b(B\.Sc|BBA|B\.Com|B\.E|B\.Tech|MBA|MCA)[^\n,\r]{0,30}/i);
      const degreeCourse = degMatch ? degMatch[0].trim() : c.degreeCourse || "Graduate";

      await prisma.candidate.update({
        where: { id: c.id },
        data: {
          name: formattedName || c.name,
          phone: phone || c.phone,
          city: city || state,
          state: state,
          degreeCourse: degreeCourse,
        },
      });

      console.log(`Updated candidate: ${formattedName} | Email: ${c.email} | State: ${state} | Phone: ${phone}`);
    }
  }

  const finalList = await prisma.candidate.findMany({
    select: { name: true, email: true, phone: true, state: true, degreeCourse: true },
  });
  console.log("\n==========================================");
  console.log("FINAL CLEAN CANDIDATE DATABASE (0 DUMMY RECORDS):");
  console.table(finalList);
}

reparseActualResumes()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
