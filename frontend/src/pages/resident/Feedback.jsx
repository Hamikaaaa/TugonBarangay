import { useState } from "react";
import {
  inputClass,
  primaryButtonClass,
  residentApi,
} from "../../services/residentApi";

function Feedback({ token }) {
  const [form, setForm] = useState({
    service_type: "general",
    rating: "",
    comment: "",
  });
  const [message, setMessage] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    try {
      const data = await residentApi("/resident/feedback", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setMessage(data.message);
      setForm({ service_type: "general", rating: "", comment: "" });
    } catch (error) {
      setMessage(error.message);
    }
  };
  return (
    <section className="max-w-2xl">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E45757]">
        Your voice matters
      </p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
        Share feedback
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Tell the barangay team about your service experience.
      </p>
      <form
        onSubmit={submit}
        className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
      >
        <label className="block">
          <span className="text-sm font-bold text-slate-700">
            Related service
          </span>
          <select
            value={form.service_type}
            onChange={(event) =>
              setForm({ ...form, service_type: event.target.value })
            }
            className={inputClass}
          >
            <option value="general">General service</option>
            <option value="document_request">Document request</option>
            <option value="complaint">Complaint</option>
          </select>
        </label>
        <fieldset className="mt-6">
          <legend className="text-sm font-bold text-slate-700">
            Your rating
          </legend>
          <div className="mt-3 flex gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => setForm({ ...form, rating: String(rating) })}
                className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-bold ${form.rating === String(rating) ? "border-[#2455D6] bg-[#EEF4FF] text-[#2455D6]" : "border-slate-200 text-slate-500"}`}
              >
                {rating}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="mt-6 block">
          <span className="text-sm font-bold text-slate-700">
            Comment (optional)
          </span>
          <textarea
            value={form.comment}
            onChange={(event) =>
              setForm({ ...form, comment: event.target.value })
            }
            rows="4"
            className={inputClass}
          />
        </label>
        {message && (
          <p className="mt-5 rounded-lg bg-[#EEF4FF] px-4 py-3 text-sm font-semibold text-[#2455D6]">
            {message}
          </p>
        )}
        <button
          type="submit"
          disabled={!form.rating}
          className={`${primaryButtonClass} mt-6`}
        >
          Submit feedback
        </button>
      </form>
    </section>
  );
}

export default Feedback;
