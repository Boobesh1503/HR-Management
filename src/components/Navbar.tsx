"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, CalendarCheck, Settings, UploadCloud, BellRing } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const [reminderStatus, setReminderStatus] = useState<string | null>(null);
  const [loadingReminder, setLoadingReminder] = useState(false);

  // If candidate is on public scheduling or rescheduling pages, hide the admin navbar
  if (pathname.startsWith("/schedule/") || pathname.startsWith("/reschedule/")) {
    return null;
  }

  const triggerReminders = async () => {
    try {
      setLoadingReminder(true);
      const res = await fetch("/api/cron/reminders", { method: "POST" });
      const data = await res.json();
      setReminderStatus(`Triggered: ${data.remindersTriggered} reminders for ${data.targetDate}`);
      setTimeout(() => setReminderStatus(null), 5000);
    } catch (err) {
      setReminderStatus("Error checking reminders");
    } finally {
      setLoadingReminder(false);
    }
  };

  const navItems = [
    { label: "Candidates & Pipeline", href: "/", icon: Users },
    { label: "Interview Slot Manager", href: "/interviews", icon: CalendarCheck },
    { label: "Settings & Gmail Config", href: "/settings", icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-100">
              HR
            </div>
            <div>
              <div className="font-bold text-slate-900 text-lg tracking-tight flex items-center gap-2">
                RecruitFlow <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-full border border-indigo-200">Solo HR Edition</span>
              </div>
              <div className="text-xs text-slate-500">Business Development Intern Hiring Pipeline</div>
            </div>
          </div>

          <nav className="flex items-center space-x-1 sm:space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center space-x-3">
            <button
              onClick={triggerReminders}
              disabled={loadingReminder}
              title="Runs 48-hour interview reminder check"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-xs font-semibold hover:bg-amber-100 transition-colors shadow-sm disabled:opacity-50"
            >
              <BellRing className="w-3.5 h-3.5 text-amber-600" />
              <span>{loadingReminder ? "Checking..." : "Trigger 48h Reminders"}</span>
            </button>
            {reminderStatus && (
              <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded">
                {reminderStatus}
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

