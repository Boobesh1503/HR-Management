import { categorizeState } from "./stateClassifier";

export interface ParsedResumeData {
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  skills: string;
  qualification: string;
  degreeCourse: string;
  rawText: string;
}

export async function parseResumeBuffer(
  buffer: Buffer,
  originalFilename: string
): Promise<ParsedResumeData> {
  let text = "";

  try {
    if (originalFilename.toLowerCase().endsWith(".pdf")) {
      try {
        const { PDFParse } = require("pdf-parse");
        const parser = new PDFParse(new Uint8Array(buffer));
        await parser.load();
        const res = await parser.getText();
        text = res.text || "";
      } catch (pdfErr) {
        console.warn(`[ResumeParser] pdf-parse error for ${originalFilename}:`, pdfErr);
        text = buffer.toString("utf-8");
      }
    } else {
      text = buffer.toString("utf-8");
    }
  } catch (err) {
    console.warn(`[ResumeParser] Fallback for ${originalFilename}:`, err);
    try {
      text = buffer.toString("utf-8");
    } catch {
      text = "";
    }
  }

  // 1. Extract Email: from text or filename
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i;
  let emailMatch = text.match(emailRegex);
  if (!emailMatch) {
    emailMatch = originalFilename.match(emailRegex);
  }
  let email = emailMatch ? emailMatch[1].trim().toLowerCase() : "";

  // 2. Extract Phone: Indian mobile formats (+91, 10 digits starting with 6,7,8,9)
  const phoneRegex = /(?:\+91[\-\s]?)?[6-9]\d{4}[\-\s]?\d{5}/;
  const phoneMatch = text.match(phoneRegex);
  let phone = phoneMatch ? phoneMatch[0].replace(/[^\d+]/g, "") : "";

  // 3. Extract Name:
  // Clean CamelCase filename (e.g. "ResumeNithyasreeA.pdf" -> "Nithyasree A")
  let name = "";
  const cleanFilename = originalFilename
    .replace(/\.pdf$/i, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_\-+.]/g, " ")
    .replace(/\b(resume|cv|biodata|profile|indeed|aiml|ai|ml|cse|it|ece|eee|mech|civil|intern|internship|fresher|updated|latest|final)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleanFilename.length > 2 && !cleanFilename.match(/^\d+$/)) {
    name = cleanFilename
      .split(" ")
      .filter((w) => w.length > 0)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }

  if (!name || name.length < 3) {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 2 && l.length < 40 && !l.includes("@") && !l.match(/\d/) && !l.toLowerCase().includes("curriculum"));
    if (lines.length > 0) {
      name = lines[0];
    } else {
      name = "Applicant";
    }
  }

  // If email was not found, create a deterministic email placeholder so the record is NOT lost!
  if (!email) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    email = `${slug || "applicant"}_${phone ? phone.slice(-4) : Math.floor(Math.random() * 10000)}@candidate.review`;
  }

  // 4. Extract Location & State
  const autoState = categorizeState(text);
  let city = "";
  const cities = [
    "Chennai", "Coimbatore", "Madurai", "Trichy", "Salem", "Tirunelveli", "Vellore", "Erode", "Hosur",
    "Bengaluru", "Bangalore", "Mysuru", "Mysore", "Hubballi", "Hubli", "Mangaluru", "Mangalore", "Belagavi",
    "Kochi", "Thiruvananthapuram", "Kozhikode", "Hyderabad", "Mumbai", "Pune", "Delhi", "Noida", "Gurugram"
  ];
  for (const c of cities) {
    const r = new RegExp(`\\b${c}\\b`, "i");
    if (r.test(text)) {
      city = c;
      break;
    }
  }

  // 5. Extract Qualification & Course
  let qualification = "Bachelor's";
  let degreeCourse = "";
  if (/\b(MBA|PGDM|Postgraduate|Master|M\.Com|M\.Sc|MCA|M\.Tech)\b/i.test(text)) {
    qualification = "Postgraduate / Master's";
  } else if (/\b(B\.Com|BBA|B\.Sc|B\.Tech|B\.E|BMS|BCA|Bachelor)\b/i.test(text)) {
    qualification = "Bachelor's";
  }

  const degreeMatch = text.match(/\b(BBA|B\.Com|B\.E\.?|B\.Tech\.?|MBA|PGDM|B\.Sc\.?|BCA|BMS|M\.Com)[^,\n\r]{0,35}/i);
  if (degreeMatch) {
    degreeCourse = degreeMatch[0].trim();
  } else {
    degreeCourse = qualification;
  }

  // 6. Extract Skills / Key competencies
  const skillsKeywords = [
    "Lead Generation", "Cold Calling", "Market Research", "B2B Sales", "Client Acquisition",
    "Business Development", "Communication", "CRM", "HubSpot", "Negotiation", "Sales Pitch",
    "Digital Marketing", "Social Media", "Excel", "Data Analysis", "Presentation"
  ];
  const detectedSkills = skillsKeywords.filter((s) => new RegExp(`\\b${s}\\b`, "i").test(text));
  const skills = detectedSkills.length > 0 ? detectedSkills.join(", ") : "Business Development, Communication";

  return {
    name,
    email,
    phone,
    city: city || (autoState !== "Other States" ? autoState : "India"),
    state: autoState,
    skills,
    qualification,
    degreeCourse,
    rawText: text.slice(0, 1000),
  };
}
