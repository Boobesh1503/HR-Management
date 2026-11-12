"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  CheckCircle2,
  Mail,
  Video,
  AlertCircle,
  Users,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Send,
} from "lucide-react";
import { format, addDays } from "date-fns";

interface BookingItem {
  id: string;
  candidateId: string;
  date: string;
  timeSlot: string;
  status: string;
  meetingLink?: string;
  candidate: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    state: string;
    city?: string;
    qualification?: string;
    degreeCourse?: string;
    skills?: string;
    status: string;
  };
}

export default function InterviewSlotManager() {
  const [selectedDate, setSelectedDate] = useState<string>(
    format(addDays(new Date(), 1), "yyyy-MM-dd")
  );
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBookingIds, setSelectedBookingIds] = useState<string[]>([]);
  const [customMeetingLink, setCustomMeetingLink] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchBookingsForDate = async (dateStr: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/candidates?status=ALL`);
      const data = await res.json();

      const allBookings: BookingItem[] = [];
      for (const c of data.candidates || []) {
        if (c.bookings) {
          for (const b of c.bookings) {
            if (b.date === dateStr) {
              allBookings.push({
                ...b,
                candidate: c,
              });
            }
          }
        }
      }

      setBookings(allBookings);
      setSelectedBookingIds([]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookingsForDate(selectedDate);
    // Fetch default meeting link from settings
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings?.defaultMeetingLink) {
          setCustomMeetingLink(d.settings.defaultMeetingLink);
        }
      })
      .catch(() => {});
  }, [selectedDate]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedBookingIds(bookings.map((b) => b.id));
    } else {
      setSelectedBookingIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedBookingIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Batch Confirm Bookings & Send Meeting Links (Requirement 5)
  const handleConfirmSelected = async () => {
    if (selectedBookingIds.length === 0) {
      alert("Please select candidates to confirm.");
      return;
    }

    try {
      setActionLoading(true);
      setActionMessage(null);
      const res = await fetch("/api/interviews/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingIds: selectedBookingIds,
          meetingLink: customMeetingLink,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setActionMessage(
          `Successfully confirmed and dispatched meeting links to ${data.confirmedCount} candidate(s)!`
        );
        fetchBookingsForDate(selectedDate);
        setSelectedBookingIds([]);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const pendingCount = bookings.filter((b) => b.status === "PENDING_APPROVAL").length;
  const confirmedCount = bookings.filter((b) => b.status === "CONFIRMED").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Interview Slot Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review slot bookings date-by-date, approve selected candidates (e.g. 15 out of 20), and automatically dispatch meeting invites.
          </p>
        </div>

        {/* Date Selector & Navigator */}
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3.5 py-2 text-sm font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-800"
          />
          <button
            onClick={() => fetchBookingsForDate(selectedDate)}
            className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-emerald-700 font-bold ml-4">
            ✕
          </button>
        </div>
      )}

      {/* Date Summary Card & Meeting Link Config */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Bookings on {selectedDate}
            </div>
            <div className="text-3xl font-extrabold text-slate-900 mt-2">{bookings.length}</div>
            <div className="text-xs text-slate-500 mt-1">
              {pendingCount} Pending Review · {confirmedCount} Confirmed
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="md:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Google Meet Link for Selected Batch
            </span>
            <span className="text-xs text-slate-400">Sent automatically in confirmation email</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Video className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={customMeetingLink}
                onChange={(e) => setCustomMeetingLink(e.target.value)}
                placeholder="https://meet.google.com/xyz-abcd-efg"
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={handleConfirmSelected}
              disabled={actionLoading || selectedBookingIds.length === 0}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {selectedBookingIds.length > 0
                  ? `Confirm & Send Links (${selectedBookingIds.length})`
                  : "Confirm Selected"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Booked Candidates Table for this date */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50/50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-bold text-slate-800">
              Applicants Scheduled for {selectedDate}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 font-semibold text-slate-700">
              {bookings.length} Candidates
            </span>
          </div>

          <div className="text-xs text-slate-500">
            {selectedBookingIds.length} candidate(s) selected
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={bookings.length > 0 && selectedBookingIds.length === bookings.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                </th>
                <th className="p-4">Time Slot</th>
                <th className="p-4">Candidate Details</th>
                <th className="p-4">State</th>
                <th className="p-4">Education & Qualification</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
                      <span>Loading bookings for {selectedDate}...</span>
                    </div>
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500">
                    <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <div className="font-semibold text-slate-700">No interviews booked for {selectedDate}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      Candidates will appear here as soon as they select this date on their scheduling form.
                    </div>
                  </td>
                </tr>
              ) : (
                bookings.map((b) => {
                  const isTN = b.candidate.state === "Tamil Nadu";
                  const isKA = b.candidate.state === "Karnataka";
                  const isConfirmed = b.status === "CONFIRMED";

                  return (
                    <tr
                      key={b.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        selectedBookingIds.includes(b.id) ? "bg-indigo-50/40" : ""
                      }`}
                    >
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedBookingIds.includes(b.id)}
                          onChange={() => handleSelectOne(b.id)}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                        />
                      </td>

                      <td className="p-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                          <Clock className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{b.timeSlot}</span>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-semibold text-slate-900">{b.candidate.name}</div>
                        <div className="text-xs text-slate-500">{b.candidate.email}</div>
                        {b.candidate.phone && (
                          <div className="text-xs text-slate-400">{b.candidate.phone}</div>
                        )}
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isTN
                              ? "bg-indigo-100 text-indigo-800"
                              : isKA
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {b.candidate.state}
                        </span>
                        {b.candidate.city && (
                          <div className="text-xs text-slate-500 mt-0.5">{b.candidate.city}</div>
                        )}
                      </td>

                      <td className="p-4">
                        <div className="text-xs font-medium text-slate-800">
                          {b.candidate.qualification || "Qualification"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {b.candidate.degreeCourse || "Course not entered"}
                        </div>
                      </td>

                      <td className="p-4">
                        {isConfirmed ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1 w-max">
                            <CheckCircle2 className="w-3 h-3" /> Confirmed
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 flex items-center gap-1 w-max">
                            <AlertCircle className="w-3 h-3" /> Pending Selection
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isConfirmed && (
                            <button
                              onClick={() => {
                                setSelectedBookingIds([b.id]);
                                handleConfirmSelected();
                              }}
                              className="px-2.5 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
                            >
                              Confirm
                            </button>
                          )}
                          <a
                            href={`/reschedule/${b.id}`}
                            target="_blank"
                            title="Reschedule portal link"
                            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

