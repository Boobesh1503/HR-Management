"use client";

import { useEffect, useState, useRef } from "react";
import {
  Users,
  MapPin,
  Mail,
  Calendar,
  Download,
  Upload,
  Search,
  CheckCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  Filter,
  RefreshCw,
  Send,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Trash2,
} from "lucide-react";

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  state: string;
  skills?: string;
  indeedResumeUrl?: string;
  uploadedResumeUrl?: string;
  status: string;
  schedulingToken: string;
  qualification?: string;
  degreeCourse?: string;
  appliedAt: string;
  bookings?: {
    id: string;
    date: string;
    timeSlot: string;
    status: string;
    meetingLink?: string;
  }[];
}

export default function CandidatesDashboard() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedState, setSelectedState] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [stateCounts, setStateCounts] = useState<{ state: string; count: number }[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // Modals & Action States
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusModalCandidate, setStatusModalCandidate] = useState<Candidate | null>(null);
  const [selectedNewStatus, setSelectedNewStatus] = useState("SELECTED");
  const [statusMessage, setStatusMessage] = useState("");
  const [notifyCandidate, setNotifyCandidate] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingResumes, setIsUploadingResumes] = useState(false);
  const [isSyncingGmail, setIsSyncingGmail] = useState(false);
  const [isScanningFolder, setIsScanningFolder] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
    percentage: number;
    added: number;
    updated: number;
    statusText: string;
  } | null>(null);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedState !== "ALL") params.set("state", selectedState);
      if (selectedStatus !== "ALL") params.set("status", selectedStatus);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/candidates?${params.toString()}`);
      const data = await res.json();
      setCandidates(data.candidates || []);
      setTotalCount(data.totalCount || 0);
      setStateCounts(data.stateCounts || []);
    } catch (err) {
      console.error("Failed to fetch candidates", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, [selectedState, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCandidates();
  };

  // Select / Deselect All
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedCandidateIds(candidates.map((c) => c.id));
    } else {
      setSelectedCandidateIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedCandidateIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk File Upload (Indeed CSV / Excel)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadMessage(null);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/candidates/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to upload");
      }

      setUploadMessage(data.message);
      fetchCandidates();
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      setUploadMessage(`Error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Bulk PDF Resumes Upload with Micro-Batch Chunking (Supports 100-500+ files without timeouts or memory spikes)
  const handleResumeFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    const totalFiles = files.length;
    // Process 2 files at a time to stay well under Vercel's 4.5MB payload limit and 10s timeout
    const CHUNK_SIZE = 2;
    let totalAdded = 0;
    let totalUpdated = 0;
    let totalProcessed = 0;

    try {
      setIsUploadingResumes(true);
      setUploadMessage(null);
      setUploadProgress({
        current: 0,
        total: totalFiles,
        percentage: 0,
        added: 0,
        updated: 0,
        statusText: `Starting batch upload of ${totalFiles} resumes...`,
      });

      for (let i = 0; i < totalFiles; i += CHUNK_SIZE) {
        const chunk = files.slice(i, i + CHUNK_SIZE);
        const formData = new FormData();
        chunk.forEach((f) => formData.append("files", f));

        const res = await fetch("/api/candidates/upload-resumes", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errText = await res.text();
          let msg = `Server returned status ${res.status}`;
          try {
            const errJson = JSON.parse(errText);
            if (errJson.error) msg = errJson.error;
          } catch {
            if (res.status === 413) {
              msg = "File payload too large for serverless function limit (4.5MB).";
            } else if (res.status === 504) {
              msg = "Server timed out processing these files.";
            }
          }
          throw new Error(msg);
        }

        const data = await res.json();

        if (data.stats) {
          totalAdded += data.stats.added || 0;
          totalUpdated += data.stats.updated || 0;
        }

        totalProcessed = Math.min(i + CHUNK_SIZE, totalFiles);
        const percentage = Math.round((totalProcessed / totalFiles) * 100);

        setUploadProgress({
          current: totalProcessed,
          total: totalFiles,
          percentage,
          added: totalAdded,
          updated: totalUpdated,
          statusText: `Processed ${totalProcessed} of ${totalFiles} resumes (${percentage}%)...`,
        });
      }

      setUploadMessage(
        `Bulk Upload Complete! Successfully processed ${totalFiles} resumes: ${totalAdded} new candidates added, ${totalUpdated} updated.`
      );
      fetchCandidates();
      if (resumeInputRef.current) resumeInputRef.current.value = "";
    } catch (err: any) {
      setUploadMessage(`Error during bulk upload: ${err.message}`);
    } finally {
      setIsUploadingResumes(false);
      setTimeout(() => setUploadProgress(null), 4000);
    }
  };

  // 1-Click Scan for local "resumes" folder
  const handleScanFolder = async () => {
    try {
      setIsScanningFolder(true);
      setUploadMessage(null);
      const res = await fetch("/api/candidates/scan-local", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to scan folder");
      setUploadMessage(data.message);
      fetchCandidates();
    } catch (err: any) {
      setUploadMessage(`Folder Scan Error: ${err.message}`);
    } finally {
      setIsScanningFolder(false);
    }
  };

  // 1-Click Sync from Gmail for Indeed Applications
  const handleGmailSync = async () => {
    try {
      setIsSyncingGmail(true);
      setUploadMessage(null);

      const res = await fetch("/api/ingest/gmail-sync", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to sync emails");
      }

      setUploadMessage(data.message);
      fetchCandidates();
    } catch (err: any) {
      setUploadMessage(`Gmail Sync: ${err.message}`);
    } finally {
      setIsSyncingGmail(false);
    }
  };

  // Delete Candidates (Individual & Bulk)
  const handleDeleteCandidates = async (candidateIds: string[]) => {
    if (candidateIds.length === 0) return;
    const confirmMsg =
      candidateIds.length === 1
        ? "Are you sure you want to permanently delete this candidate record?"
        : `Are you sure you want to permanently delete these ${candidateIds.length} candidate records?`;

    if (!confirm(confirmMsg)) return;

    try {
      setActionLoading(true);
      const res = await fetch("/api/candidates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateIds }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete candidates");
      }

      setSelectedCandidateIds((prev) => prev.filter((id) => !candidateIds.includes(id)));
      fetchCandidates();
      setUploadMessage(data.message);
    } catch (err: any) {
      alert(`Delete Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Send Invitations
  const handleSendInvitations = async (targetIds?: string[]) => {
    const idsToSend = targetIds || selectedCandidateIds;
    if (idsToSend.length === 0) {
      alert("Please select at least one candidate to send an invitation.");
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch("/api/candidates/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateIds: idsToSend }),
      });
      const data = await res.json();

      if (res.ok) {
        alert(`Successfully sent invitations to ${data.sentCount} candidate(s)!`);
        setSelectedCandidateIds([]);
        fetchCandidates();
      } else {
        alert(`Failed: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error sending invitations: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Update Post-Interview Status
  const handleUpdateStatus = async () => {
    if (!statusModalCandidate) return;

    try {
      setActionLoading(true);
      const res = await fetch(`/api/candidates/${statusModalCandidate.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: selectedNewStatus,
          customMessage: statusMessage,
          sendEmailNotification: notifyCandidate,
        }),
      });

      if (res.ok) {
        setStatusModalCandidate(null);
        setStatusMessage("");
        fetchCandidates();
      } else {
        alert("Failed to update status");
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const getTNCount = () => stateCounts.find((s) => s.state === "Tamil Nadu")?.count || 0;
  const getKACount = () => stateCounts.find((s) => s.state === "Karnataka")?.count || 0;
  const getOtherCount = () =>
    stateCounts
      .filter((s) => s.state !== "Tamil Nadu" && s.state !== "Karnataka")
      .reduce((acc, curr) => acc + curr.count, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "NEW":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">New Applicant</span>;
      case "INVITED":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">Invite Sent</span>;
      case "FORM_COMPLETED":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">Slot Booked</span>;
      case "CONFIRMED":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Confirmed</span>;
      case "RESCHEDULED":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">Rescheduled</span>;
      case "ATTENDED":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-800">Attended</span>;
      case "SELECTED":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">Selected / Offer</span>;
      case "REJECTED":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">Rejected</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Candidate Pipeline & Automation
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Automate data extraction, state categorization, interview invitations, and scheduling for your internship applicants.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Sync from Gmail Button */}
          <button
            onClick={handleGmailSync}
            disabled={isSyncingGmail}
            title="Automatically extracts candidate applications from your Indeed alert emails"
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-semibold hover:bg-rose-100 hover:border-rose-300 transition-all shadow-sm"
          >
            <Mail className="w-4 h-4 text-rose-600" />
            <span>{isSyncingGmail ? "Checking Gmail for Indeed Emails..." : "Sync from Gmail"}</span>
          </button>

          {/* Bulk PDF Resumes Upload Button */}
          <input
            type="file"
            ref={resumeInputRef}
            onChange={handleResumeFilesUpload}
            accept=".pdf"
            multiple
            className="hidden"
          />
          <button
            onClick={() => resumeInputRef.current?.click()}
            disabled={isUploadingResumes}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-sm font-semibold hover:bg-indigo-100 hover:border-indigo-300 transition-all shadow-sm"
          >
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>
              {isUploadingResumes ? "Uploading Resumes..." : "Upload Resumes (PDF Batch)"}
            </span>
          </button>

          {/* Scan Local Folder Button */}
          <button
            onClick={handleScanFolder}
            disabled={isScanningFolder}
            title="Scan all PDF files placed in d:\HR Management\resumes"
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-100 hover:border-slate-400 transition-all shadow-sm"
          >
            <FolderOpen className="w-4 h-4 text-slate-600" />
            <span>{isScanningFolder ? "Scanning Folder..." : "Scan 'resumes/' Folder"}</span>
          </button>

          {/* Upload Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv, .xlsx, .xls"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm"
          >
            <Upload className="w-4 h-4 text-indigo-600" />
            <span>{isUploading ? "Importing Candidates..." : "Import Indeed CSV / Excel"}</span>
          </button>

          {/* Export to Excel */}
          <a
            href={`/api/candidates/export${selectedState !== "ALL" ? `?state=${encodeURIComponent(selectedState)}` : ""}`}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export to Excel</span>
          </a>

          {/* Delete Selected Button */}
          {selectedCandidateIds.length > 0 && (
            <button
              onClick={() => handleDeleteCandidates(selectedCandidateIds)}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 border border-rose-700 text-white rounded-xl text-sm font-bold hover:bg-rose-700 active:bg-rose-800 transition-all shadow-md shadow-rose-200"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Selected ({selectedCandidateIds.length})</span>
            </button>
          )}

          {/* Batch Invite Button */}
          <button
            onClick={() => handleSendInvitations()}
            disabled={actionLoading || selectedCandidateIds.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>
              {selectedCandidateIds.length > 0
                ? `Send Invites (${selectedCandidateIds.length})`
                : "Send Invitations"}
            </span>
          </button>
        </div>
      </div>

      {/* Live Micro-Batch Progress Bar (for 10 to 500+ resumes) */}
      {uploadProgress && (
        <div className="bg-white p-5 rounded-2xl border-2 border-indigo-500 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin" />
              <span className="font-bold text-slate-900 text-sm">{uploadProgress.statusText}</span>
            </div>
            <span className="text-sm font-extrabold text-indigo-600">{uploadProgress.percentage}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress.percentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Processed: {uploadProgress.current} / {uploadProgress.total} resumes</span>
            <span className="text-emerald-700 font-semibold">{uploadProgress.added} new candidates added · {uploadProgress.updated} updated</span>
          </div>
        </div>
      )}

      {uploadMessage && (
        <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-sm flex items-center justify-between">
          <span>{uploadMessage}</span>
          <button onClick={() => setUploadMessage(null)} className="text-indigo-600 font-bold ml-4">
            ✕
          </button>
        </div>
      )}

      {/* State Categorization Metric Cards (Requirement 2) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => setSelectedState("ALL")}
          className={`p-5 rounded-2xl border text-left transition-all ${
            selectedState === "ALL"
              ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200"
              : "bg-white text-slate-900 border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider opacity-75">All Applicants</span>
            <Users className="w-5 h-5 opacity-80" />
          </div>
          <div className="mt-3 text-3xl font-extrabold">{totalCount}</div>
          <div className="mt-1 text-xs opacity-75">Total applications in database</div>
        </button>

        {/* Tamil Nadu Candidates Card */}
        <button
          onClick={() => setSelectedState("Tamil Nadu")}
          className={`p-5 rounded-2xl border text-left transition-all ${
            selectedState === "Tamil Nadu"
              ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100"
              : "bg-white text-slate-900 border-slate-200 hover:border-indigo-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider opacity-85">Tamil Nadu</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-white/20">TN State</span>
          </div>
          <div className="mt-3 text-3xl font-extrabold">{getTNCount()}</div>
          <div className="mt-1 text-xs opacity-80">Chennai, Coimbatore, Madurai, etc.</div>
        </button>

        {/* Karnataka Candidates Card */}
        <button
          onClick={() => setSelectedState("Karnataka")}
          className={`p-5 rounded-2xl border text-left transition-all ${
            selectedState === "Karnataka"
              ? "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100"
              : "bg-white text-slate-900 border-slate-200 hover:border-emerald-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider opacity-85">Karnataka</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-white/20">KA State</span>
          </div>
          <div className="mt-3 text-3xl font-extrabold">{getKACount()}</div>
          <div className="mt-1 text-xs opacity-80">Bengaluru, Mysuru, Hubballi, etc.</div>
        </button>

        {/* Other States Card */}
        <button
          onClick={() => setSelectedState("Other States")}
          className={`p-5 rounded-2xl border text-left transition-all ${
            selectedState === "Other States"
              ? "bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-100"
              : "bg-white text-slate-900 border-slate-200 hover:border-purple-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider opacity-85">Other States</span>
            <MapPin className="w-5 h-5 opacity-80" />
          </div>
          <div className="mt-3 text-3xl font-extrabold">{getOtherCount()}</div>
          <div className="mt-1 text-xs opacity-80">Kerala, Maharashtra, AP, Delhi, etc.</div>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* State Filter Pills */}
        <div className="flex items-center flex-wrap gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase mr-1">Filter by State:</span>
          {["ALL", "Tamil Nadu", "Karnataka", "Other States"].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedState(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedState === st
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {st === "ALL" ? "All States" : st}
            </button>
          ))}
        </div>

        {/* Status Filter and Search Form */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Application Statuses</option>
            <option value="NEW">New Applicants</option>
            <option value="INVITED">Invitation Sent</option>
            <option value="FORM_COMPLETED">Slot Booked</option>
            <option value="CONFIRMED">Interview Confirmed</option>
            <option value="RESCHEDULED">Rescheduled</option>
            <option value="ATTENDED">Attended</option>
            <option value="SELECTED">Selected / Offer</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <form onSubmit={handleSearchSubmit} className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search candidate name, email, skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </form>

          <button
            onClick={fetchCandidates}
            title="Refresh Table"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Candidates Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className={`border-b text-xs font-semibold uppercase tracking-wider transition-colors ${
              selectedCandidateIds.length > 0
                ? "bg-rose-50 border-rose-200 text-slate-800"
                : "bg-slate-50 border-slate-200 text-slate-500"
            }`}>
              {selectedCandidateIds.length > 0 ? (
                <tr>
                  <th className="p-4 w-10">
                    <input
                      type="checkbox"
                      checked={
                        candidates.length > 0 && selectedCandidateIds.length === candidates.length
                      }
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                    />
                  </th>
                  <th colSpan={6} className="p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="font-extrabold text-rose-950 text-sm">
                          {selectedCandidateIds.length} candidate(s) selected
                        </span>
                        <button
                          onClick={() => setSelectedCandidateIds(candidates.map((c) => c.id))}
                          className="text-xs font-semibold text-rose-700 underline hover:text-rose-900"
                        >
                          Select all on page ({candidates.length})
                        </button>
                        <button
                          onClick={() => setSelectedCandidateIds([])}
                          className="text-xs font-medium text-slate-500 hover:text-slate-800"
                        >
                          Clear selection
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDeleteCandidates(selectedCandidateIds)}
                          disabled={actionLoading}
                          className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete Selected ({selectedCandidateIds.length})</span>
                        </button>

                        <button
                          onClick={() => handleSendInvitations()}
                          disabled={actionLoading}
                          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Send Invites ({selectedCandidateIds.length})</span>
                        </button>
                      </div>
                    </div>
                  </th>
                </tr>
              ) : (
                <tr>
                  <th className="p-4 w-10">
                    <input
                      type="checkbox"
                      checked={
                        candidates.length > 0 && selectedCandidateIds.length === candidates.length
                      }
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="p-4">Candidate</th>
                  <th className="p-4">State & Location</th>
                  <th className="p-4">Qualification / Skills</th>
                  <th className="p-4">Interview Schedule</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
                      <span>Loading candidate applications...</span>
                    </div>
                  </td>
                </tr>
              ) : candidates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500">
                    <div className="max-w-sm mx-auto space-y-3">
                      <Users className="w-10 h-10 text-slate-300 mx-auto" />
                      <div className="font-semibold text-slate-700">No candidates found</div>
                      <p className="text-xs text-slate-400">
                        Upload your Indeed CSV / Excel file or adjust your search filters to view candidates.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                candidates.map((c) => {
                  const booking = c.bookings?.[0];
                  const isTN = c.state === "Tamil Nadu";
                  const isKA = c.state === "Karnataka";

                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        selectedCandidateIds.includes(c.id) ? "bg-indigo-50/40" : ""
                      }`}
                    >
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedCandidateIds.includes(c.id)}
                          onChange={() => handleSelectOne(c.id)}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                        />
                      </td>

                      <td className="p-4">
                        <div className="font-semibold text-slate-900">{c.name}</div>
                        <div className="text-xs text-slate-500">{c.email}</div>
                        {c.phone && <div className="text-xs text-slate-400">{c.phone}</div>}
                        {(c.uploadedResumeUrl || c.indeedResumeUrl) && (
                          <a
                            href={c.uploadedResumeUrl || c.indeedResumeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 hover:underline mt-1"
                          >
                            <FileText className="w-3 h-3" />
                            <span>View Resume PDF</span>
                          </a>
                        )}
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              isTN
                                ? "bg-indigo-100 text-indigo-800"
                                : isKA
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-purple-100 text-purple-800"
                            }`}
                          >
                            {c.state}
                          </span>
                        </div>
                        {c.city && <div className="text-xs text-slate-500 mt-1">{c.city}</div>}
                      </td>

                      <td className="p-4 max-w-xs">
                        {c.degreeCourse ? (
                          <div className="text-xs font-medium text-slate-800">
                            {c.qualification ? `${c.qualification} - ` : ""}
                            {c.degreeCourse}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 italic">Not filled yet</div>
                        )}
                        {c.skills && (
                          <div className="text-xs text-slate-500 truncate mt-0.5" title={c.skills}>
                            {c.skills}
                          </div>
                        )}
                      </td>

                      <td className="p-4">
                        {booking ? (
                          <div className="space-y-0.5">
                            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                              <span>{booking.date}</span>
                            </div>
                            <div className="text-xs text-slate-600 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>{booking.timeSlot}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No slot chosen</span>
                        )}
                      </td>

                      <td className="p-4">{getStatusBadge(c.status)}</td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Send Individual Invite */}
                          {c.status === "NEW" && (
                            <button
                              onClick={() => handleSendInvitations([c.id])}
                              disabled={actionLoading}
                              className="px-2.5 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200"
                            >
                              Send Invite
                            </button>
                          )}

                          {/* Open Candidate Scheduling Form */}
                          <a
                            href={`/schedule/${c.schedulingToken}`}
                            target="_blank"
                            title="Open candidate scheduling portal link"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>

                          {/* Update Status / Post-Interview */}
                          <button
                            onClick={() => {
                              setStatusModalCandidate(c);
                              setSelectedNewStatus("SELECTED");
                            }}
                            className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                          >
                            Status
                          </button>

                          {/* Delete Individual Candidate */}
                          <button
                            onClick={() => handleDeleteCandidates([c.id])}
                            disabled={actionLoading}
                            title="Delete candidate record"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Post-Interview Status Update Modal (Requirement 8) */}
      {statusModalCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-lg">Update Candidate Status</h3>
              <button
                onClick={() => setStatusModalCandidate(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div>
              <div className="font-semibold text-slate-800">{statusModalCandidate.name}</div>
              <div className="text-xs text-slate-500">{statusModalCandidate.email}</div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Outcome Status:
              </label>
              <select
                value={selectedNewStatus}
                onChange={(e) => setSelectedNewStatus(e.target.value)}
                className="w-full text-sm bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="SELECTED">Selected for Internship (Send Offer Email)</option>
                <option value="ATTENDED">Interview Attended (Under Evaluation)</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="REJECTED">Rejected (Send Regret Email)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Custom Message / Instructions (Included in candidate email):
              </label>
              <textarea
                rows={3}
                placeholder="Optional custom message to accompany the automated email..."
                value={statusMessage}
                onChange={(e) => setStatusMessage(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="notifyCheck"
                checked={notifyCandidate}
                onChange={(e) => setNotifyCandidate(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300"
              />
              <label htmlFor="notifyCheck" className="text-xs text-slate-700 font-medium cursor-pointer">
                Send automated email notification to candidate
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setStatusModalCandidate(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStatus}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg shadow-sm"
              >
                {actionLoading ? "Updating..." : "Save & Notify"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Floating Bulk Action Bar (Fixed bottom for effortless one-click bulk delete) */}
      {selectedCandidateIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100 pr-2 border-r border-slate-700">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{selectedCandidateIds.length} Selected</span>
          </div>

          <button
            onClick={() => handleDeleteCandidates(selectedCandidateIds)}
            disabled={actionLoading}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-rose-900/30 active:scale-95"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Selected ({selectedCandidateIds.length})</span>
          </button>

          <button
            onClick={() => handleSendInvitations()}
            disabled={actionLoading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-900/30 active:scale-95"
          >
            <Send className="w-4 h-4" />
            <span>Send Invites ({selectedCandidateIds.length})</span>
          </button>

          <button
            onClick={() => setSelectedCandidateIds([])}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 transition-colors"
          >
            Deselect All
          </button>
        </div>
      )}
    </div>
  );
}

