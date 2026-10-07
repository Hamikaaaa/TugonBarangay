import { useState } from "react";

const API_URL = "http://127.0.0.1:8000/api";

function FeeAssessment({ request, token, role, onUpdated }) {
  const [fee, setFee] = useState(String(request.fee ?? "0"));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const assessed = request.details?.fee_mode === "assessed";

  const saveFee = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        `${API_URL}/${role}/document-requests/${request.id}/fee`,
        {
          method: "PATCH",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fee: Number(fee) }),
        },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Unable to update the fee.");
      setFee(String(payload.data.fee));
      setNotice("Assessed fee saved.");
      onUpdated(payload.data);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  if (!assessed) {
    return (
      <div className="rounded-xl border border-[#E6ECF5] bg-white p-3">
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">Fee</p>
        <p className="mt-1.5 text-xs font-semibold text-slate-700">
          {Number(request.fee || 0) === 0 ? "No fee" : `₱${Number(request.fee).toFixed(2)}`}
        </p>
        {Number(request.fee || 0) > 0 && (
          <p className="mt-1 text-[10px] text-slate-500">Payable at the barangay upon release.</p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={saveFee} className="rounded-xl border border-[#D9E6FF] bg-[#EEF4FF]/70 p-3">
      <label className="block text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">
        Assessed fee (₱)
        <div className="mt-1.5 flex gap-2">
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={fee}
            onChange={(event) => setFee(event.target.value)}
            disabled={!["pending", "under_review", "processing"].includes(request.status)}
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-[#2455D6]/15"
          />
          {["pending", "under_review", "processing"].includes(request.status) && (
            <button disabled={saving} className="rounded-lg bg-[#2455D6] px-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#1D46B5] focus:outline-none focus:ring-2 focus:ring-[#2455D6]/30 disabled:opacity-50">
              {saving ? "Saving" : "Save"}
            </button>
          )}
        </div>
      </label>
      <p className="mt-1 text-[10px] text-slate-500">Set according to business details and barangay fee rules.</p>
      {error && <p role="alert" className="mt-2 text-xs text-[#C74444]">{error}</p>}
      {notice && <p role="status" className="mt-2 text-xs text-[#21864A]">{notice}</p>}
    </form>
  );
}

export default FeeAssessment;
