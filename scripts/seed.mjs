import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding initial settings...");
  
  await prisma.appSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      companyName: "Nexus Enterprise Solutions",
      companyWebsite: "https://nexussolutions.example.com",
      companyIntro: "We are a high-growth business advisory firm partnering with top consumer and B2B enterprises across South India.",
      jobTitle: "Business Development Intern",
      jobDescription: "Support strategic outreach, perform competitor analysis, engage potential corporate leads, and assist in client onboarding workflows.",
      workingHours: "Monday to Friday, 9:30 AM - 6:00 PM (Hybrid)",
      defaultMeetingLink: "https://meet.google.com/hrc-intv-bd2",
      slotDurationMinutes: 30,
      dailyStartTime: "10:00",
      dailyEndTime: "17:00",
    },
  });

  const existingCount = await prisma.candidate.count();
  if (existingCount === 0) {
    console.log("Adding sample candidates for demonstration...");
    const sampleCandidates = [
      {
        name: "Aravind Swaminathan",
        email: "aravind.demo@gmail.com",
        phone: "+91 98401 23456",
        city: "Chennai",
        state: "Tamil Nadu",
        skills: "Lead Generation, Cold Calling, Market Research, B2B Sales",
        status: "NEW",
      },
      {
        name: "Pooja Venkatesh",
        email: "pooja.demo@gmail.com",
        phone: "+91 98840 56789",
        city: "Coimbatore",
        state: "Tamil Nadu",
        skills: "Client Relationship Management, Negotiation, PowerPoint",
        status: "NEW",
      },
      {
        name: "Rahul Hegde",
        email: "rahul.demo@gmail.com",
        phone: "+91 99001 12233",
        city: "Bengaluru",
        state: "Karnataka",
        skills: "Data Analysis, Hubspot CRM, Email Marketing, Prospecting",
        status: "NEW",
      },
      {
        name: "Deepa Gowda",
        email: "deepa.demo@gmail.com",
        phone: "+91 99805 44332",
        city: "Mysuru",
        state: "Karnataka",
        skills: "Public Speaking, Sales Pitching, Market Survey",
        status: "NEW",
      },
      {
        name: "Aditya Sharma",
        email: "aditya.demo@gmail.com",
        phone: "+91 98111 88776",
        city: "Mumbai",
        state: "Maharashtra",
        skills: "Business Development, Financial Modeling, Client Outreach",
        status: "NEW",
      },
      {
        name: "Sneha Nair",
        email: "sneha.demo@gmail.com",
        phone: "+91 97455 33221",
        city: "Kochi",
        state: "Kerala",
        skills: "Communication, Social Media Outreach, Content Writing",
        status: "NEW",
      },
    ];

    for (const c of sampleCandidates) {
      await prisma.candidate.create({
        data: c,
      });
    }
    console.log(`Added ${sampleCandidates.length} sample candidates.`);
  }

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

