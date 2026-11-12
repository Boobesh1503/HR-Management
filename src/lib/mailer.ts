import nodemailer from "nodemailer";
import { prisma } from "./prisma";

interface SendEmailParams {
  candidateId: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  type: "INVITATION" | "CONFIRMATION" | "REMINDER" | "RESCHEDULE_ACK" | "STATUS_UPDATE";
}

export async function sendEmail({ candidateId, to, subject, html, text, type }: SendEmailParams) {
  try {
    const settings = await prisma.appSettings.findFirst();
    const gmailUser = process.env.GMAIL_USER || settings?.gmailUser;
    const gmailPass = process.env.GMAIL_APP_PASSWORD || settings?.gmailAppPassword;

    let status = "SIMULATED";
    let errorMessage: string | null = null;

    if (gmailUser && gmailPass) {
      try {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: gmailUser,
            pass: gmailPass.replace(/\s+/g, ""),
          },
        });

        await transporter.sendMail({
          from: `"${settings?.companyName || "Akodefy"} HR Team" <${gmailUser}>`,
          to,
          subject,
          text: text || html.replace(/<[^>]*>/g, ""),
          html,
        });
        status = "SENT";
      } catch (err: any) {
        console.error("Nodemailer error:", err);
        status = "FAILED";
        errorMessage = err.message || "Failed to send email via Gmail SMTP";
      }
    } else {
      console.log(`[SIMULATED EMAIL - Configure Gmail to send live emails] To: ${to} | Subject: ${subject}`);
      status = "SIMULATED";
    }

    await prisma.emailLog.create({
      data: {
        candidateId,
        recipient: to,
        subject,
        type,
        status,
        error: errorMessage,
      },
    });

    return { success: status === "SENT" || status === "SIMULATED", status, error: errorMessage };
  } catch (error: any) {
    console.error("sendEmail root error:", error);
    return { success: false, status: "FAILED", error: error.message };
  }
}

function getFirstName(name?: string): string {
  if (!name || name === "Applicant") return "Candidate";
  const clean = name.trim().split(/\s+/)[0];
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

// -------------------------------------------------------------
// Email 1 – Initial Interview Invitation
// -------------------------------------------------------------
export function generateInvitationEmail(data: {
  candidateName: string;
  companyName: string;
  companyWebsite: string;
  schedulingUrl: string;
}) {
  const company = data.companyName || "Akodefy";
  const website = data.companyWebsite || "https://akodefy.com/";
  const firstName = getFirstName(data.candidateName);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #202124; background-color: #ffffff; margin: 0; padding: 24px; }
    p { margin: 0 0 16px 0; }
    a { color: #1a73e8; text-decoration: underline; word-break: break-all; }
    .signature { margin-top: 24px; line-height: 1.5; }
  </style>
</head>
<body>
  <p>Dear ${firstName},</p>

  <p>Greetings from ${company}!</p>

  <p>Thank you for applying for the Business Development Intern position at ${company}.</p>

  <p>We are pleased to inform you that your application has been shortlisted for the early stage of our recruitment process.</p>

  <p>We invite you to complete the interview application form using the link below.</p>

  <p><strong>Application Form:</strong> <a href="${data.schedulingUrl}" target="_blank">${data.schedulingUrl}</a></p>

  <p>The form includes your educational details, resume submission and preferred interview date and time.</p>

  <p><strong>About ${company}</strong><br>
  ${company} is an IT services company working on website development, application development and digital solutions.</p>

  <p>We look forward to connecting with you.</p>

  <div class="signature">
    Best Regards,<br>
    <strong>HR Team</strong><br>
    ${company}<br>
    <a href="${website}" target="_blank" style="text-decoration: none;">${website}</a>
  </div>
</body>
</html>
  `.trim();
}

// -------------------------------------------------------------
// Email 2 – HR Approved Interview Confirmation
// -------------------------------------------------------------
export function generateConfirmationEmail(data: {
  candidateName: string;
  companyName: string;
  date: string;
  timeSlot: string;
  meetingLink: string;
  duration?: string;
}) {
  const company = data.companyName || "Akodefy";
  const duration = data.duration || "60 Minutes";
  const firstName = getFirstName(data.candidateName);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #202124; background-color: #ffffff; margin: 0; padding: 24px; }
    p { margin: 0 0 16px 0; }
    ul { margin: 8px 0 16px 0; padding-left: 20px; line-height: 1.8; }
    li { margin-bottom: 4px; }
    a { color: #1a73e8; text-decoration: underline; word-break: break-all; }
    .signature { margin-top: 24px; line-height: 1.5; }
  </style>
</head>
<body>
  <p>Dear ${firstName},</p>

  <p>Your interview for the Business Development Intern position has been confirmed.</p>

  <p><strong>Interview Details</strong></p>

  <ul>
    <li><strong>Date:</strong> ${data.date}</li>
    <li><strong>Time:</strong> ${data.timeSlot}</li>
    <li><strong>Duration:</strong> ${duration}</li>
    <li><strong>Meeting Platform:</strong> Google Meet</li>
    <li><strong>Meeting Link:</strong> <a href="${data.meetingLink}" target="_blank">${data.meetingLink}</a></li>
  </ul>

  <p>Please join the meeting 5 minutes before the scheduled time.</p>

  <p>If you are unavailable, kindly inform us in advance so that we can arrange another slot.</p>

  <div class="signature">
    Best Regards,<br>
    <strong>HR Team</strong><br>
    ${company}
  </div>
</body>
</html>
  `.trim();
}

// -------------------------------------------------------------
// Email 3 – Two Days Before Interview (Reminder)
// -------------------------------------------------------------
export function generateReminderEmail(data: {
  candidateName: string;
  companyName: string;
  date: string;
  timeSlot: string;
  meetingLink: string;
}) {
  const company = data.companyName || "Akodefy";
  const firstName = getFirstName(data.candidateName);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #202124; background-color: #ffffff; margin: 0; padding: 24px; }
    p { margin: 0 0 16px 0; }
    a { color: #1a73e8; text-decoration: underline; word-break: break-all; }
    .signature { margin-top: 24px; line-height: 1.5; }
  </style>
</head>
<body>
  <p>Dear ${firstName},</p>

  <p>This is a reminder regarding your upcoming interview.</p>

  <p>Your interview is scheduled for <strong>${data.date}</strong> at <strong>${data.timeSlot}</strong>.</p>

  <p><strong>Meeting Link:</strong> <a href="${data.meetingLink}" target="_blank">${data.meetingLink}</a></p>

  <p>Kindly confirm your availability by replying to this email.</p>

  <p>If you are unable to attend, please inform us immediately so that we can reschedule your interview.</p>

  <div class="signature">
    Best Regards,<br>
    <strong>HR Team</strong><br>
    ${company}
  </div>
</body>
</html>
  `.trim();
}

// -------------------------------------------------------------
// Email 4 – Reschedule
// -------------------------------------------------------------
export function generateRescheduleEmail(data: {
  candidateName: string;
  companyName: string;
  rescheduleUrl: string;
}) {
  const company = data.companyName || "Akodefy";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #202124; background-color: #ffffff; margin: 0; padding: 24px; }
    p { margin: 0 0 16px 0; }
    a { color: #1a73e8; text-decoration: underline; word-break: break-all; }
    .signature { margin-top: 24px; line-height: 1.5; }
  </style>
</head>
<body>
  <p>Dear ${data.candidateName},</p>

  <p>We understand that you are unavailable for the previously scheduled interview.</p>

  <p>Please use the link below to select another available interview slot.</p>

  <p><strong>Reschedule Link:</strong> <a href="${data.rescheduleUrl}" target="_blank">${data.rescheduleUrl}</a></p>

  <p>Thank you for your cooperation.</p>

  <div class="signature">
    Best Regards,<br>
    <strong>HR Team</strong><br>
    ${company}
  </div>
</body>
</html>
  `.trim();
}
