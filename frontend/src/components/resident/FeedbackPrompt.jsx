import { useState } from "react";
import { residentApi } from "../../services/residentApi";

function FeedbackPrompt({ token, serviceType, onClose }) {
  const [rating, setRating] = useState("");
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      await residentApi("/resident/feedback", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service_type: serviceType, rating, comment }),
      });
      onClose();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-prompt-title"
        className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#E45757]">
              Quick feedback
            </p>
            <h2
              id="feedback-prompt-title"
              className="mt-2 text-xl font-bold text-[#172B4D]"
            >
              How was your experience?
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Your feedback helps us improve this service.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close feedback"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl text-slate-500 transition hover:bg-slate-100"
          >
            ×
          </button>
        </div>

        <form onSubmit={submit}>
          <fieldset className="mt-6">
            <legend className="text-sm font-semibold text-slate-700">
              Choose a rating from 1 to 5
            </legend>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={rating === String(value)}
                  onClick={() => setRating(String(value))}
                  className={`h-11 rounded-lg border text-sm font-bold transition ${rating === String(value) ? "border-[#2455D6] bg-[#EEF4FF] text-[#2455D6]" : "border-slate-200 text-slate-600 hover:border-slate-400"}`}
                >
                  {value}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="mt-5 block">
            <span className="text-sm font-semibold text-slate-700">
              Anything we can improve?{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </span>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              maxLength={2000}
              rows={3}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-[#2455D6] focus:ring-2 focus:ring-[#2455D6]/15"
            />
          </label>

          {message && (
            <p role="alert" className="mt-3 text-sm font-medium text-red-700">
              {message}
            </p>
          )}

          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              Not now
            </button>
            <button
              type="submit"
              disabled={!rating || submitting}
              className="rounded-lg bg-[#2455D6] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1D46B5] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Sending..." : "Send feedback"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default FeedbackPrompt;
