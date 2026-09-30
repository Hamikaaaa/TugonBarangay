import { useState } from "react";
import { UserRound } from "lucide-react";
import {
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
  residentApi,
} from "../../services/residentApi";
import { Avatar } from "../../components/resident/ResidentNav";
import { useAuth } from "../../context/AuthContext";

function Profile({ user, verified, token }) {
  const { updateUser } = useAuth();
  const [form, setForm] = useState({
    address: user?.address || "",
    mobile_number: user?.mobile_number || "",
  });
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const isDirty =
    form.address !== (user?.address || "") ||
    form.mobile_number !== (user?.mobile_number || "");

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const result = await residentApi("/resident/profile", token, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      updateUser(result.user);
      setForm({
        address: result.user.address || "",
        mobile_number: result.user.mobile_number || "",
      });
      setMessage({ type: "success", text: result.message });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setForm({
      address: user?.address || "",
      mobile_number: user?.mobile_number || "",
    });
    setMessage(null);
  };

  const verificationStatus =
    {
      verified: "Verified",
      pending: "Pending verification",
      rejected: "Verification rejected",
    }[user?.verification_status] || "Status unavailable";

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-8">
      <header className="relative overflow-hidden rounded-[28px] border border-white/70 bg-white/70 px-6 py-7 shadow-[0_8px_28px_rgba(18,63,112,0.05)] backdrop-blur-sm sm:px-8">
        <div className="relative flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#123F70] text-white">
            <UserRound
              className="h-7 w-7"
              strokeWidth={1.8}
              aria-hidden="true"
            />
          </span>
          <div>
            <p className="text-sm font-medium text-[#41658A]">
              Resident services
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#123F70] sm:text-4xl">
              My profile
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Review your account details and keep your contact information
              current.
            </p>
          </div>
        </div>
      </header>

      <section className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white/90 shadow-[0_8px_28px_rgba(18,63,112,0.06)] backdrop-blur-sm">
        <div className="flex items-center gap-4 border-b border-slate-100 p-6 sm:p-8">
          <Avatar name={user?.first_name || user?.name || "R"} large />
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#172B4D]">
              {user?.name || "Resident account"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {user?.email || "No email available"}
            </p>
          </div>
        </div>
        <dl className="grid gap-6 p-6 sm:grid-cols-2 sm:p-8">
          <Detail
            label="Resident ID"
            value={
              user?.id
                ? `TB-${String(user.id).padStart(5, "0")}`
                : "Pending assignment"
            }
          />
          <Detail
            label="Verification"
            value={verified ? "Verified" : verificationStatus}
          />
          <Detail
            label="Date of birth"
            value={user?.date_of_birth || "Not provided"}
          />
          <Detail label="Sex" value={user?.sex || "Not provided"} />
          <Detail label="Purok" value={user?.purok || "Not provided"} />
        </dl>
        <form
          onSubmit={saveProfile}
          className="border-t border-slate-100 bg-slate-50/60 p-6 sm:p-8"
        >
          <div>
            <h2 className="text-base font-bold text-slate-800">
              Contact information
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Keep your phone number and house or street details up to date.
            </p>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-bold text-slate-700">
                Mobile number
              </span>
              <input
                required
                type="tel"
                name="mobile_number"
                autoComplete="tel"
                inputMode="numeric"
                pattern="09[0-9]{9}"
                maxLength={11}
                value={form.mobile_number}
                onChange={(event) => {
                  setForm({ ...form, mobile_number: event.target.value });
                  setMessage(null);
                }}
                placeholder="09XXXXXXXXX"
                title="Enter an 11-digit number starting with 09."
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-slate-700">
                House no. / street
              </span>
              <input
                type="text"
                name="address"
                autoComplete="address-line1"
                maxLength={255}
                value={form.address}
                onChange={(event) => {
                  setForm({ ...form, address: event.target.value });
                  setMessage(null);
                }}
                placeholder="House number or street name"
                className={inputClass}
              />
            </label>
          </div>
          {message && (
            <p
              role={message.type === "error" ? "alert" : "status"}
              className={`mt-4 text-sm font-semibold ${message.type === "error" ? "text-red-700" : "text-emerald-700"}`}
            >
              {message.text}
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving || !isDirty}
              className={primaryButtonClass}
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              disabled={saving || !isDirty}
              className={secondaryButtonClass}
            >
              Reset
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </dt>
      <dd className="mt-2 wrap-break-word text-sm font-semibold text-slate-700">
        {value}
      </dd>
    </div>
  );
}

export default Profile;
