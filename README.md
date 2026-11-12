# RecruitFlow - Solo HR Recruitment & Interview Automation System

A production-ready applicant tracking and automated interview scheduling platform designed specifically for solo HR managers handling high application volumes (300–500+ candidates) for the **Business Development Intern** role.

---

## 🚀 Key Features Built to Your Requirements

1. **Flexible Candidate Ingestion (No Indeed Enterprise Plan Required)**:
   - **Upload PDF Resumes (Batch)**: Multi-select 10, 50, or 100+ PDF resumes directly in the web browser. The system parses them automatically.
   - **Folder Drop & Auto-Scan (`npm run scan:resumes`)**: Place all downloaded candidate PDF files into the `resumes/` folder and scan them in seconds.
   - **1-Click Sync from Gmail**: Automatically inspects your Gmail inbox for Indeed application notification emails and extracts the applicant details and resume attachments.
   - **1-Click Bulk CSV/Excel Importer**: Still available if you have spreadsheets or export files from any source.
2. **Automated State Categorization**:
   - Instantly segregates candidates into **Tamil Nadu**, **Karnataka**, and **Other States** based on location intelligence (recognizes Chennai, Coimbatore, Madurai, Bengaluru, Mysuru, Hubballi, etc.).
   - Interactive filter tabs on the dashboard allow one-click filtering.
3. **Automated Interview Invitation Emails**:
   - Sends a beautifully styled, branded invitation email featuring your company intro, Business Development Intern role details, working hours, company website link, and a personalized scheduling link.
4. **Integrated Interview Scheduling Form**:
   - Replaces manual Google Forms.
   - Pre-fills candidate details and captures qualification (Bachelor's / Postgraduate), degree/course name, and address.
   - Features a live slot calendar between **10:00 AM and 5:00 PM** (30-min or 1-hour configurable).
   - **Race Condition Prevention**: Prevents two candidates from double-booking the same slot.
5. **Interview Slot Management & Batch Approval**:
   - Filter by date (e.g. Nov 15) to view all applicants who selected that day.
   - Review applicant profiles and check the candidates you wish to proceed with (e.g., select 15 out of 20).
   - One-click **"Confirm & Send Meeting Links"** to dispatch the Google Meet link and attendance instructions only to chosen candidates.
6. **Automated 48-Hour Reminders**:
   - Background check identifies confirmed interviews occurring in 2 days and dispatches a reminder email asking for availability confirmation or advance rescheduling.
7. **Self-Service Rescheduling**:
   - If a candidate cannot attend, they can click the reschedule link in their confirmation or reminder email.
   - The old slot is immediately released, and the candidate picks a new available slot.
8. **Post-Interview Status & Follow-ups**:
   - Easily transition candidates between **Attended**, **Selected / Offer**, **On Hold**, and **Rejected**.
   - Automated notification emails with customizable notes can be sent to candidates at any step.
9. **Personal Gmail Account Integration**:
   - Directly configure your personal Gmail address and a 16-character Google App Password in the Settings tab.

---

## 🛠️ Quick Start Instructions

### 1. Launch the Application
Run the development server inside the workspace:
```bash
npm run dev
```
Open your browser and navigate to:
```
http://localhost:3000
```

### 2. Connect Your Personal Gmail Account
1. Open the **Settings & Gmail Config** tab in the top navigation (`http://localhost:3000/settings`).
2. Follow the 2-minute step guide to generate a **16-letter Google App Password**:
   - Go to [Google Account Security](https://myaccount.google.com/security) (make sure 2-Step Verification is ON).
   - Open [Google App Passwords](https://myaccount.google.com/apppasswords).
   - Enter App Name: `HR Recruitment` and click Create.
   - Copy the 16-letter password into the settings form.
3. Click **Save Settings**.
*(Note: If left blank, the system operates in simulation mode and logs all emails safely in the database).*

### 3. Test With the Sample Indeed Applicants File
1. On the main Dashboard, click **"Import Indeed CSV / Excel"**.
2. Select the provided `sample_indeed_applicants.csv` file located in the root project folder.
3. Watch the system instantly categorize candidates into **Tamil Nadu**, **Karnataka**, and **Other States**.
4. Select candidates and click **"Send Invites"**.

---

## 📂 Project Structure

```
d:\HR Management
├── prisma/
│   ├── dev.db                      # SQLite relational database
│   └── schema.prisma               # Candidate, Slot, Booking & Email schema
├── src/
│   ├── app/
│   │   ├── page.tsx                # Centralized HR Dashboard
│   │   ├── interviews/page.tsx     # Interview Slot Manager (Batch approvals)
│   │   ├── schedule/[token]/       # Public candidate scheduling portal
│   │   ├── reschedule/[bookingId]/ # Public rescheduling portal
│   │   ├── settings/page.tsx       # Gmail SMTP & Company configuration
│   │   └── api/                    # REST API endpoints (import, export, book, confirm, etc.)
│   ├── components/                 # UI components & Navigation
│   └── lib/
│       ├── prisma.ts               # Prisma ORM singleton
│       ├── stateClassifier.ts      # Indian state categorization engine
│       ├── slotService.ts          # Slot generation & conflict prevention
│       └── mailer.ts               # Nodemailer Gmail transport & HTML templates
└── sample_indeed_applicants.csv    # Sample test dataset for Indeed imports
```

