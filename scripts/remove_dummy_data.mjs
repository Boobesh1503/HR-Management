import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const allCandidates = await prisma.candidate.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      state: true,
      uploadedResumeUrl: true,
      indeedResumeUrl: true,
      createdAt: true,
    },
  });

  console.log("Current total candidates:", allCandidates.length);

  // Identify sample/dummy records:
  // 1. Any candidate with email ending in .demo@gmail.com
  // 2. Any candidate with sample indeed url like https://drive.google.com/sample/...
  // 3. Any candidate without uploadedResumeUrl and with dummy emails
  const dummyCandidates = allCandidates.filter((c) => {
    const isDemoEmail = c.email.toLowerCase().includes(".demo@") || c.email.toLowerCase().includes(".sample@");
    const isSampleUrl = c.indeedResumeUrl && c.indeedResumeUrl.includes("drive.google.com/sample");
    return isDemoEmail || isSampleUrl;
  });

  console.log("Identified dummy candidates:", dummyCandidates.map((d) => `${d.name} (${d.email})`));

  if (dummyCandidates.length > 0) {
    const dummyIds = dummyCandidates.map((d) => d.id);
    const deleteResult = await prisma.candidate.deleteMany({
      where: {
        id: { in: dummyIds },
      },
    });
    console.log(`Deleted ${deleteResult.count} dummy candidate record(s).`);
  }

  const remaining = await prisma.candidate.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      state: true,
      uploadedResumeUrl: true,
    },
  });

  console.log("\n--- ONLY ACTUAL CANDIDATES REMAINING ---");
  console.log(`Total actual candidates: ${remaining.length}`);
  console.table(remaining);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });

