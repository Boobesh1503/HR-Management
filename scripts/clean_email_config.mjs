import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanEmailSetup() {
  console.log("Cleaning all email sync configurations, connected email accounts, and email logs...");

  // 1. Reset Gmail credentials in AppSettings to completely clean state
  await prisma.appSettings.updateMany({
    data: {
      gmailUser: "",
      gmailAppPassword: "",
    },
  });
  console.log("Cleared connected Gmail accounts and credentials from database.");

  // 2. Delete all existing email logs
  const deletedLogs = await prisma.emailLog.deleteMany({});
  console.log(`Deleted ${deletedLogs.count} email log record(s).`);

  // 3. Reset candidate email timestamps/invited status back to pristine state
  const resetCandidates = await prisma.candidate.updateMany({
    where: {
      status: "INVITED",
    },
    data: {
      status: "NEW",
      invitedAt: null,
    },
  });
  console.log(`Reset ${resetCandidates.count} candidate(s) from INVITED to NEW so they can receive clean invitations.`);

  // 4. Reset booking confirmation/reminder timestamps
  const resetBookings = await prisma.interviewBooking.updateMany({
    data: {
      confirmationSentAt: null,
      reminderSentAt: null,
    },
  });
  console.log(`Reset email tracking timestamps on ${resetBookings.count} interview booking(s).`);

  // 5. Verify AppSettings state
  const settings = await prisma.appSettings.findFirst();
  console.log("\n--- VERIFIED CLEAN SETTINGS ---");
  console.log({
    companyName: settings?.companyName,
    gmailUser: settings?.gmailUser || "(none - clean)",
    gmailAppPassword: settings?.gmailAppPassword ? "(masked)" : "(none - clean)",
  });
}

cleanEmailSetup()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });

