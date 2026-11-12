"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  CheckCircle,
  Briefcase,
  Building,
  GraduationCap,
  MapPin,
  FileText,
  AlertCircle,
  Check,
} from "lucide-react";
import { format, addDays } from "date-fns";

interface SlotInfo {
  startTime: string;
  endTime: string;
  label: string;
  isAvailable: boolean;
}

export default function CandidateSchedulePage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [candidate, setCandidate] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Form Fields - All completely blank so candidates enter everything manually
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [qualification, setQualification] = useState("");
  const [degreeCourse, setDegreeCourse] = useState("");
  const [fullAddress, setFullAddress] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");

  // Scheduling State
  const [selectedDate, setSelectedDate] = useState<string>(
    format(addDays(new Date(), 1), "yyyy-MM-dd")
  );
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Load candidate & settings info
  useEffect(() => {
    async function loadCandidate() {
      try {
        setLoading(true);
        const res = await fetch(`/api/schedule/${token}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Unable to load interview booking page.");
          return;
        }

        setCandidate(data.candidate);
        setSettings(data.settings);

        // All fields remain clean and blank for candidate manual entry (no pre-filling)

        if (data.candidate.existingBooking) {
          setSelectedDate(data.candidate.existingBooking.date);
          setSelectedSlot(data.candidate.existingBooking.timeSlot);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load booking form.");
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      loadCandidate();
    }
  }, [token]);

  // Fetch slots whenever selectedDate changes
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) {
      alert("Please choose an available interview time slot.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch("/api/schedule/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          qualification: qualification.trim(),
          degreeCourse: degreeCourse.trim(),
          fullAddress: fullAddress.trim(),
          date: selectedDate,
          timeSlot: selectedSlot,
          uploadedResumeUrl: resumeUrl.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Booking failed");
      }

      setSubmittedSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="font-semibold text-slate-700">Loading interview scheduling form...</div>
        </div>
      </div>
    );
  }

  if (error && !candidate) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center border border-slate-200 shadow-xl space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Link Not Found</h2>
          <p className="text-sm text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (submittedSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-lg w-full p-8 md:p-10 text-center border border-slate-200 shadow-xl space-y-6">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto">
            <CheckCircle className="w-10 h-10" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-900">Interview Slot Requested!</h2>
            <p className="text-slate-600 text-sm mt-2">
              Thank you, <strong>{name}</strong>. Your details and slot preference have been successfully registered.
            </p>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-left space-y-3 text-sm">
            <div className="flex justify-between border-b border-slate-200/60 pb-2">
              <span className="text-slate-500">Position:</span>
              <span className="font-semibold text-slate-900">{settings?.jobTitle}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200/60 pb-2">
              <span className="text-slate-500">Requested Date:</span>
              <span className="font-semibold text-slate-900">{selectedDate}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200/60 pb-2">
              <span className="text-slate-500">Time Slot:</span>
              <span className="font-semibold text-indigo-600">{selectedSlot}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Company:</span>
              <span className="font-semibold text-slate-900">{settings?.companyName}</span>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Our HR team will review your booking and dispatch the official Google Meet link and instructions to <strong>{candidate?.email}</strong>.
          </p>
        </div>
      </div>
    );
  }

  // Min date: tomorrow
  const minDate = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const maxDate = format(addDays(new Date(), 30), "yyyy-MM-dd");

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Company & Role Branding Card */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
              <Building className="w-4 h-4" />
              <span>{settings?.companyName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {settings?.jobTitle} - Interview Form
            </h1>
            <p className="text-slate-600 text-sm leading-relaxed">
              {settings?.jobDescription}
            </p>
            <div className="inline-flex items-center gap-2 text-xs bg-slate-100 text-slate-700 font-semibold px-3 py-1.5 rounded-lg">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>{settings?.workingHours}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* The Main Application & Slot Booking Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-8">
          {/* Section 1: Candidate Verification & Qualifications */}
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
              <GraduationCap className="w-5 h-5 text-indigo-600" />
              <span>Step 1: Your Educational & Contact Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Enter your 10-digit mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Highest Qualification *
                </label>
                <select
                  required
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">-- Select Highest Qualification --</option>
                  <option value="Bachelor's Degree">Bachelor's Degree (Completed / Pursuing)</option>
                  <option value="Master's / Postgraduate">Master's / Postgraduate</option>
                  <option value="Diploma">Diploma</option>
                  <option value="Higher Secondary / 12th">Higher Secondary / 12th</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Degree / Course Name & Specialization *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BBA, B.Com Marketing, B.Sc Computer Science, MBA, B.E Mechanical"
                  value={degreeCourse}
                  onChange={(e) => setDegreeCourse(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Current City & Address *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anna Nagar, Chennai, Tamil Nadu"
                  value={fullAddress}
                  onChange={(e) => setFullAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Updated Resume Link (Google Drive / LinkedIn / Portfolio) (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/file/d/... or LinkedIn profile URL"
                  value={resumeUrl}
                  onChange={(e) => setResumeUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Choose Interview Date & Time Slot (10 AM to 5 PM) */}
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <span>Step 2: Choose Your Interview Date & Slot</span>
            </h3>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Preferred Interview Date (Monday to Saturday):
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
                    Available Time Slots between 10:00 AM and 5:00 PM:
                  </label>
                  <span className="text-xs text-slate-400">
                    {slots.filter((s) => s.isAvailable).length} slots free
                  </span>
                </div>

                {loadingSlots ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    Loading available time slots for {selectedDate}...
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
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
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100 scale-[1.02]"
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
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={submitting || !selectedSlot}
              className="w-full py-4 bg-indigo-600 text-white font-bold text-base rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              <span>
                {submitting ? "Confirming Slot..." : "Submit Form & Request Interview Slot"}
              </span>
            </button>
            <p className="text-center text-xs text-slate-400 mt-3">
              By submitting, you confirm your availability to attend the virtual interview via Google Meet.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

