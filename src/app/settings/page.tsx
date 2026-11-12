"use client";

import { useEffect, useState } from "react";
import {
  Settings,
  Mail,
  Building,
  Briefcase,
  KeyRound,
  CheckCircle,
  HelpCircle,
  Clock,
  Video,
  Save,
} from "lucide-react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form State
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [companyIntro, setCompanyIntro] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [workingHours, setWorkingHours] = useState("");
  const [defaultMeetingLink, setDefaultMeetingLink] = useState("");
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(30);
  const [dailyStartTime, setDailyStartTime] = useState("10:00");
  const [dailyEndTime, setDailyEndTime] = useState("17:00");

  // Gmail Credentials
  const [gmailUser, setGmailUser] = useState("");
  const [gmailAppPassword, setGmailAppPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings");
        const data = await res.json();
        if (data.settings) {
          const s = data.settings;
          setCompanyName(s.companyName || "");
          setCompanyWebsite(s.companyWebsite || "");
          setCompanyIntro(s.companyIntro || "");
          setJobTitle(s.jobTitle || "");
          setJobDescription(s.jobDescription || "");
          setWorkingHours(s.workingHours || "");
          setDefaultMeetingLink(s.defaultMeetingLink || "");
          setSlotDurationMinutes(s.slotDurationMinutes || 30);
          setDailyStartTime(s.dailyStartTime || "10:00");
          setDailyEndTime(s.dailyEndTime || "17:00");
          setGmailUser(s.gmailUser || "");
          setGmailAppPassword(s.gmailAppPassword || "");
        }
      } catch (err) {
        console.error("Failed to load settings", err);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSaveSuccess(false);

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          companyWebsite,
          companyIntro,
          jobTitle,
          jobDescription,
          workingHours,
          defaultMeetingLink,
          slotDurationMinutes: Number(slotDurationMinutes),
          dailyStartTime,
          dailyEndTime,
          gmailUser,
          gmailAppPassword,
        }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        alert("Failed to save settings");
      }
    } catch (err) {
      alert("Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnectEmail = async () => {
    if (!confirm("Are you sure you want to remove all email configurations and reset to a clean setup?")) return;
    try {
      setSaving(true);
      setGmailUser("");
      setGmailAppPassword("");
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          companyWebsite,
          companyIntro,
          jobTitle,
          jobDescription,
          workingHours,
          defaultMeetingLink,
          slotDurationMinutes: Number(slotDurationMinutes),
          dailyStartTime,
          dailyEndTime,
          gmailUser: "",
          gmailAppPassword: "",
        }),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch {
      alert("Error clearing email setup");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 text-sm">
        Loading system configuration...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page Title */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            System & Email Configuration
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure your personal Gmail SMTP credentials, interview slots, and company invitation email templates.
          </p>
        </div>
        {saveSuccess && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Settings Saved!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Personal Gmail Account Setup (Requirement 2 from user) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900">Personal Gmail Configuration</h2>
            </div>
            {gmailUser ? (
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  Connected: {gmailUser}
                </span>
                <button
                  type="button"
                  onClick={handleDisconnectEmail}
                  className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors"
                >
                  Disconnect & Clear
                </button>
              </div>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                Status: Not Connected (Clean Setup)
              </span>
            )}
          </div>

          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-blue-950">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              <span>How to use your Personal Gmail for Automated Emails:</span>
            </div>
            <p>
              Google requires a <strong>16-letter App Password</strong> instead of your regular password for automated apps:
            </p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Open your Google Account: <a href="https://myaccount.google.com/security" target="_blank" className="underline font-semibold text-blue-700">Google Account Security</a>.</li>
              <li>Ensure <strong>2-Step Verification</strong> is enabled.</li>
              <li>Search for or go to <strong>App Passwords</strong> (<a href="https://myaccount.google.com/apppasswords" target="_blank" className="underline font-semibold text-blue-700">direct link</a>).</li>
              <li>Type an App Name like <code className="bg-white px-1 py-0.5 rounded border border-blue-200">HR Recruitment</code> and click <strong>Create</strong>.</li>
              <li>Copy the generated 16-character password and paste it below.</li>
            </ol>
            <p className="text-[11px] text-blue-700/80 italic">
              * Note: If left blank, the system runs in simulation mode and logs all emails safely to the database without sending real emails.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Your Personal Gmail Address
              </label>
              <input
                type="email"
                placeholder="yourname@gmail.com"
                value={gmailUser}
                onChange={(e) => setGmailUser(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Google App Password (16 characters)
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="xxxx xxxx xxxx xxxx"
                value={gmailAppPassword}
                onChange={(e) => setGmailAppPassword(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Company Information & Internship Details */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">Company & Internship Details</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Company Website URL *
              </label>
              <input
                type="url"
                required
                value={companyWebsite}
                onChange={(e) => setCompanyWebsite(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Company Short Introduction (Shown in Invitation Email) *
              </label>
              <textarea
                rows={2}
                required
                value={companyIntro}
                onChange={(e) => setCompanyIntro(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Job Position Title *
              </label>
              <input
                type="text"
                required
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Working Hours & Mode *
              </label>
              <input
                type="text"
                required
                value={workingHours}
                onChange={(e) => setWorkingHours(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Role Summary & Responsibilities *
              </label>
              <textarea
                rows={3}
                required
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Interview Slot & Meeting Settings */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Clock className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">Interview Scheduling Parameters</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Slot Duration
              </label>
              <select
                value={slotDurationMinutes}
                onChange={(e) => setSlotDurationMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value={30}>30 Minutes per interview</option>
                <option value={60}>1 Hour per interview</option>
                <option value={45}>45 Minutes per interview</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Daily Start Time
              </label>
              <input
                type="time"
                value={dailyStartTime}
                onChange={(e) => setDailyStartTime(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Daily End Time
              </label>
              <input
                type="time"
                value={dailyEndTime}
                onChange={(e) => setDailyEndTime(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Google Meet Link (Sent to confirmed applicants)
              </label>
              <input
                type="text"
                placeholder="https://meet.google.com/abc-defg-hij"
                value={defaultMeetingLink}
                onChange={(e) => setDefaultMeetingLink(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving Changes..." : "Save Settings"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

