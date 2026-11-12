"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Building,
  RefreshCw,
  Check,
} from "lucide-react";
import { format, addDays } from "date-fns";

interface SlotInfo {
  startTime: string;
  endTime: string;
  label: string;
  isAvailable: boolean;
}

export default function ReschedulePage() {
  const params = useParams();
  const bookingId = params.bookingId as string;

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // New Slot Selection
  const [selectedDate, setSelectedDate] = useState<string>(
    format(addDays(new Date(), 2), "yyyy-MM-dd")
  );
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [rescheduledSuccess, setRescheduledSuccess] = useState(false);

  // Min and Max dates
  const minDate = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const maxDate = format(addDays(new Date(), 30), "yyyy-MM-dd");

  useEffect(() => {
    async function loadSlots() {
      if (!selectedDate) return;
      try {
        setLoadingSlots(true);
        const res = await fetch(`/api/schedule/slots?date=${selectedDate}`);
        const data = await res.json();
        setSlots(data.slots || []);
      } catch (err) {
        console.error("Failed to load time slots", err);
      } finally {
        setLoadingSlots(false);
      }
    }

    loadSlots();
  }, [selectedDate]);

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) {
      alert("Please choose a new time slot.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch("/api/interviews/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          newDate: selectedDate,
          newTimeSlot: selectedSlot,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Rescheduling failed");
      }

      setRescheduledSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (rescheduledSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-lg w-full p-8 md:p-10 text-center border border-slate-200 shadow-xl space-y-6">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto">
            <CheckCircle className="w-10 h-10" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-900">Interview Rescheduled!</h2>
            <p className="text-slate-600 text-sm mt-2">
              Your interview has been updated to <strong>{selectedDate}</strong> at <strong>{selectedSlot}</strong>.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-sm text-slate-600">
            A revised confirmation email with the updated time and meeting instructions has been dispatched to your email address.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            Interview Rescheduling Portal
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Choose an Alternate Interview Date & Time
          </h1>
          <p className="text-slate-600 text-sm">
            Select a new convenient time slot from our live calendar below. Your previous slot will be automatically released for other candidates.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleReschedule} className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select New Interview Date:
            </label>
            <input
              type="date"
              required
              min={minDate}
              max={maxDate}
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedSlot(null);
              }}
              className="w-full sm:w-64 px-4 py-2.5 text-sm font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-800"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700">
                Choose Available Time Slot (10:00 AM - 5:00 PM):
              </label>
              <span className="text-xs text-slate-400">
                {slots.filter((s) => s.isAvailable).length} slots free
              </span>
            </div>

            {loadingSlots ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Checking available slots for {selectedDate}...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {slots.map((slot) => {
                  const isSelected = selectedSlot === slot.label;
                  return (
                    <button
                      key={slot.label}
                      type="button"
                      disabled={!slot.isAvailable}
                      onClick={() => setSelectedSlot(slot.label)}
                      className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                        !slot.isAvailable
                          ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed line-through"
                          : isSelected
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100"
                          : "bg-white border-slate-200 text-slate-700 hover:border-indigo-400 hover:bg-indigo-50/50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Clock className={`w-3.5 h-3.5 ${isSelected ? "text-white" : "text-slate-400"}`} />
                        <span>{slot.label}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                      {!slot.isAvailable && <span className="text-[10px] text-slate-400">Booked</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={submitting || !selectedSlot}
              className="w-full py-3.5 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{submitting ? "Updating Schedule..." : "Confirm New Interview Slot"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

