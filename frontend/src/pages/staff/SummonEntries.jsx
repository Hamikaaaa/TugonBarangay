import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, FileText, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import StaffLayout from "./StaffLayout";
import useComplaintStaffNavigation from "../../hooks/useComplaintStaffNavigation";

const API_URL = "http://127.0.0.1:8000/api";

function displayDate(value) {
  if (!value) return "—";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-PH", {
    year: "numeric", month: "short", day: "numeric", timeZone: "Asia/Manila",
  });
}

function displayTime(value) {
  if (!value) return "—";
  const [hours, minutes] = String(value).split(":");
  const parsedHours = Number(hours);
  if (!Number.isInteger(parsedHours) || parsedHours < 0 || parsedHours > 23) return value;
  return `${parsedHours % 12 || 12}:${minutes || "00"} ${parsedHours >= 12 ? "PM" : "AM"}`;
}

export default function SummonEntries() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const navigationItems = useComplaintStaffNavigation();
  const [entries, setEntries] = useState([]);
  const [page, setPage] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingEntryId, setSavingEntryId] = useState(null);

  const loadEntries = useCallback(async (pageNumber = 1) => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/staff/blotter/summon-entries?page=${pageNumber}`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Unable to load summon entries.");
      setEntries(payload.data || []);
      setPage({ current_page: payload.current_page || 1, last_page: payload.last_page || 1, total: payload.total || 0 });
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const updateEntry = async (entry, field, value) => {
    if (savingEntryId) return;
    setSavingEntryId(entry.id);
    setError("");
    const update = field.endsWith("_attended") ? { [field]: value === "" ? null : value === "yes" } : { [field]: value };
    try {
      const response = await fetch(`${API_URL}/staff/blotter/summon-entries/${entry.id}`, {
        method: "PATCH",
        headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(update),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Unable to update summon entry.");
      setEntries((current) => current.map((item) => item.id === entry.id ? payload.data : item));
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSavingEntryId(null);
    }
  };

  return (
    <StaffLayout title="Summon Entries" navigationItems={navigationItems} activePath="/staff/blotter/summons" onNavigate={navigate}>
      <div className="mx-auto w-full max-w-[1600px] space-y-6 px-5 pb-10 pt-6 sm:px-7 lg:px-9">
        <AdminPageHeader eyebrow="Katarungang Pambarangay" title="Summon Entries" description="Saved barangay mediation notices prepared by complaint staff.">
          <div className="flex gap-2">
            <button type="button" onClick={() => navigate("/staff/blotter/summon")} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-[#2455D6] shadow-sm hover:bg-[#EEF4FF]"><Plus size={15} /> Prepare notice</button>
          </div>
        </AdminPageHeader>

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

        <section className="overflow-hidden rounded-2xl border border-[#E6ECF5] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E6ECF5] px-5 py-4">
            <div><h2 className="text-sm font-bold text-[#172B4D]">Saved notices</h2><p className="mt-1 text-xs text-slate-500">{page.total} {page.total === 1 ? "entry" : "entries"}</p></div>
            <FileText className="text-[#2455D6]" size={19} />
          </div>
          {loading ? <div className="space-y-3 p-5"><div className="h-12 animate-pulse rounded-lg bg-slate-100" /><div className="h-12 animate-pulse rounded-lg bg-slate-100" /></div> : entries.length === 0 ? (
            <div className="px-5 py-16 text-center"><FileText size={28} className="mx-auto text-slate-300" /><h3 className="mt-3 text-sm font-bold text-[#172B4D]">No summon entries yet</h3><p className="mt-1 text-xs text-slate-500">Saved notices will appear here.</p></div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-left text-sm">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Parties & attendance</th><th className="px-4 py-3">Meeting</th><th className="px-4 py-3">Venue</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Prepared by</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {entries.map((entry) => <tr key={entry.id} className="hover:bg-slate-50/70">
                      <td className="whitespace-nowrap px-4 py-4 font-bold text-[#2455D6]">SUM-{String(entry.id).padStart(5, "0")}</td>
                      <td className="px-4 py-3"><div className="grid grid-cols-2 gap-2">
                        <PartyAttendance name="Complainant" party={entry.complainant} value={entry.complainant_attended} disabled={savingEntryId === entry.id} onChange={(value) => updateEntry(entry, "complainant_attended", value)} entryId={entry.id} />
                        <PartyAttendance name="Respondent" party={entry.respondent} value={entry.respondent_attended} disabled={savingEntryId === entry.id} onChange={(value) => updateEntry(entry, "respondent_attended", value)} entryId={entry.id} />
                      </div></td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-600"><span className="block font-semibold text-[#172B4D]">{displayDate(entry.hearing_date)}</span><span className="mt-1 block text-xs text-slate-500">{displayTime(entry.hearing_time)}</span></td>
                      <td className="max-w-48 px-4 py-4 text-slate-600"><span className="block truncate" title={entry.venue}>{entry.venue}</span></td>
                      <td className="px-4 py-4"><EntrySelect label={`Summon status for entry ${entry.id}`} value={entry.status || "scheduled"} disabled={savingEntryId === entry.id} onChange={(value) => updateEntry(entry, "status", value)} options={[["scheduled", "Scheduled"], ["completed", "Completed"], ["rescheduled", "Rescheduled"], ["cancelled", "Cancelled"]]} /></td>
                      <td className="max-w-32 px-4 py-4 text-slate-600"><span className="block truncate" title={entry.recorder?.name || entry.issued_by || "—"}>{entry.recorder?.name || entry.issued_by || "—"}</span></td>
                    </tr>)}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-[#E6ECF5] px-5 py-3">
                <p className="text-xs text-slate-500">Page {page.current_page} of {page.last_page}</p>
                <div className="flex gap-2">
                  <button type="button" disabled={page.current_page <= 1} onClick={() => loadEntries(page.current_page - 1)} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 disabled:opacity-40"><ChevronLeft size={14} /> Previous</button>
                  <button type="button" disabled={page.current_page >= page.last_page} onClick={() => loadEntries(page.current_page + 1)} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 disabled:opacity-40">Next <ChevronRight size={14} /></button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </StaffLayout>
  );
}

function EntrySelect({ label, value, options, disabled, onChange }) {
  return (
    <select aria-label={label} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="min-h-9 w-full min-w-28 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-[#2455D6] disabled:cursor-wait disabled:opacity-60">
      {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
    </select>
  );
}

function PartyAttendance({ name, party, value, disabled, onChange, entryId }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-100 bg-slate-50 p-2">
      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{name}</p>
      <p className="mt-0.5 truncate text-xs font-semibold text-[#172B4D]" title={party}>{party}</p>
      <select aria-label={`${name} attendance for entry ${entryId}`} value={value === null ? "" : value ? "yes" : "no"} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="mt-1.5 min-h-8 w-full rounded-md border border-slate-200 bg-white px-1.5 text-[11px] font-semibold text-slate-700 outline-none focus:border-[#2455D6] disabled:cursor-wait disabled:opacity-60">
        <option value="">Not marked</option><option value="yes">Attended</option><option value="no">Absent</option>
      </select>
    </div>
  );
}
