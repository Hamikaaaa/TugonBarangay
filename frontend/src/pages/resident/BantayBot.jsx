import {
  AlertCircle,
  Bot,
  ChevronDown,
  LifeBuoy,
  MessageCircle,
  Search,
  Send,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  inputClass,
  primaryButtonClass,
  residentApi,
} from "../../services/residentApi";

function BantayBot({ token }) {
  const [faqs, setFaqs] = useState([]);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const [faqLoading, setFaqLoading] = useState(true);
  const [faqError, setFaqError] = useState("");
  const [asking, setAsking] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [escalation, setEscalation] = useState(null);
  const [escalations, setEscalations] = useState([]);
  const [selectedEscalationId, setSelectedEscalationId] = useState(null);
  const [escalationPage, setEscalationPage] = useState(1);
  const [escalationLastPage, setEscalationLastPage] = useState(1);
  const [escalationLoading, setEscalationLoading] = useState(true);
  const [escalationError, setEscalationError] = useState("");
  const [reloadEscalations, setReloadEscalations] = useState(0);

  useEffect(() => {
    let active = true;
    residentApi("/resident/faqs", token)
      .then((data) => {
        if (!active) return;
        setFaqs(data);
        if (data.length) setCategory(data[0].category);
      })
      .catch((error) => {
        if (active) setFaqError(error.message);
      })
      .finally(() => {
        if (active) setFaqLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    let active = true;
    residentApi(`/resident/bantaybot/escalations?page=${escalationPage}`, token)
      .then((result) => {
        if (!active) return;
        setEscalationError("");
        setEscalations(result.data || []);
        setEscalationLastPage(result.last_page || 1);
        setSelectedEscalationId((current) =>
          result.data?.some((item) => item.id === current)
            ? current
            : result.data?.[0]?.id || null,
        );
      })
      .catch((error) => {
        if (active) setEscalationError(error.message);
      })
      .finally(() => {
        if (active) setEscalationLoading(false);
      });

    return () => {
      active = false;
    };
  }, [escalationPage, reloadEscalations, token]);

  const categories = useMemo(
    () => [...new Set(faqs.map((faq) => faq.category))],
    [faqs],
  );
  const visibleFaqs = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return faqs.filter(
      (faq) =>
        faq.category === category &&
        (!normalizedSearch ||
          faq.question.toLowerCase().includes(normalizedSearch)),
    );
  }, [category, faqs, search]);

  const ask = async (value = question) => {
    if (!value.trim()) return;
    setQuestion(value);
    setAsking(true);
    setAnswer(null);
    setEscalation(null);
    try {
      const data = await residentApi("/resident/bantaybot/ask", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: value }),
      });
      setAnswer(data);
    } catch (error) {
      setAnswer({ answer: error.message, matched: false, faq: null });
    } finally {
      setAsking(false);
    }
  };

  const escalate = async () => {
    if (!question.trim()) return;
    setEscalating(true);
    setEscalation(null);
    try {
      const data = await residentApi("/resident/bantaybot/escalate", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          category: answer?.faq?.category || category || null,
        }),
      });
      setEscalation({ type: "success", ...data });
      setEscalationPage(1);
      setSelectedEscalationId(data.escalation?.id || null);
      setEscalationLoading(true);
      setReloadEscalations((current) => current + 1);
    } catch (error) {
      setEscalation({ type: "error", message: error.message });
    } finally {
      setEscalating(false);
    }
  };

  const submitQuestion = (event) => {
    event.preventDefault();
    ask();
  };

  const selectedEscalation = escalations.find(
    (item) => item.id === selectedEscalationId,
  );

  return (
    <div className="space-y-6 pb-8">
      <header className="relative overflow-hidden rounded-[28px] border border-white/70 bg-white/70 px-6 py-7 shadow-[0_8px_28px_rgba(18,63,112,0.05)] backdrop-blur-sm sm:px-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[#2455D6]/5 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#123F70] text-white">
            <Bot className="h-7 w-7" strokeWidth={1.8} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-medium text-[#41658A]">
              Resident services
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#123F70] sm:text-4xl">
              Ask BantayBot
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Find answers about barangay services, document requests, and
              resident accounts.
            </p>
          </div>
        </div>
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white/90 shadow-[0_8px_28px_rgba(18,63,112,0.06)] backdrop-blur-sm">
          <div className="border-b border-slate-100 px-6 py-5 sm:px-7">
            <h2 className="text-lg font-bold tracking-tight text-[#172B4D]">
              Browse common questions
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Select a category or search the answer catalog.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
              <label className="block">
                <span className="sr-only">FAQ category</span>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className={inputClass}
                >
                  {categories.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="relative block">
                <span className="sr-only">Search questions</span>
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className={`${inputClass} pl-10`}
                  placeholder="Search questions"
                />
              </label>
            </div>
          </div>

          {faqLoading ? (
            <div className="space-y-3 p-6" aria-label="Loading questions">
              <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
            </div>
          ) : faqError ? (
            <div className="p-6 text-sm text-red-700" role="alert">
              {faqError}
            </div>
          ) : visibleFaqs.length ? (
            <div className="max-h-[560px] divide-y divide-slate-100 overflow-y-auto px-5 sm:px-7">
              {visibleFaqs.map((faq) => (
                <button
                  key={faq.id}
                  type="button"
                  disabled={asking}
                  onClick={() => ask(faq.question)}
                  className="group flex min-h-14 w-full items-center justify-between gap-4 py-3 text-left text-sm font-semibold text-[#344966] transition hover:text-[#2455D6] disabled:cursor-wait disabled:opacity-60"
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className="h-4 w-4 shrink-0 -rotate-90 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#2455D6]"
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
          ) : (
            <p className="px-6 py-12 text-center text-sm text-slate-500">
              No questions match this search.
            </p>
          )}
          {!faqLoading && !faqError && (
            <div className="border-t border-slate-100 px-6 py-3 text-xs text-slate-400 sm:px-7">
              {visibleFaqs.length} questions in {category}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white/90 shadow-[0_8px_28px_rgba(18,63,112,0.06)] backdrop-blur-sm">
          <div className="border-b border-slate-100 px-6 py-5 sm:px-7">
            <h2 className="text-lg font-bold tracking-tight text-[#172B4D]">
              Ask a question
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose a listed question or write your own.
            </p>
          </div>
          <div className="p-6 sm:p-7">
            <form onSubmit={submitQuestion}>
              <label className="block">
                <span className="text-sm font-bold text-slate-700">
                  Your question
                </span>
                <textarea
                  required
                  maxLength={1000}
                  rows={4}
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  className={inputClass}
                  placeholder="Type your question..."
                />
              </label>
              <div className="mt-3 flex items-center justify-between gap-4">
                <span className="text-xs text-slate-400">
                  {question.length}/1000
                </span>
                <button
                  type="submit"
                  disabled={asking || !question.trim()}
                  className={primaryButtonClass}
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  {asking ? "Looking for an answer..." : "Ask BantayBot"}
                </button>
              </div>
            </form>

            {asking && (
              <div
                className="mt-6 flex items-center gap-3 rounded-xl bg-[#F3F6FB] p-4 text-sm font-medium text-[#41658A]"
                role="status"
              >
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#2455D6]/20 border-t-[#2455D6]" />
                Searching the answer catalog...
              </div>
            )}

            {answer && !asking && (
              <div className="mt-6 rounded-xl border border-[#E6ECF5] bg-[#F3F6FB] p-5">
                <div className="flex items-center gap-2 text-sm font-bold text-[#123F70]">
                  <MessageCircle
                    className="h-4 w-4 text-[#2455D6]"
                    aria-hidden="true"
                  />
                  BantayBot
                  {answer.faq?.category && (
                    <span className="ml-auto rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#55708F]">
                      {answer.faq.category}
                    </span>
                  )}
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#344966]">
                  {answer.answer}
                </p>
                {!answer.matched && (
                  <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-[#805900]">
                    <AlertCircle
                      className="mt-0.5 h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />
                    This answer was not found in the predefined catalog. Send
                    the question to the barangay for follow-up.
                  </p>
                )}

                {!escalation && (
                  <button
                    type="button"
                    onClick={escalate}
                    disabled={escalating}
                    className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-[#2455D6] transition hover:border-[#2455D6]/40 hover:bg-[#2455D6]/5 disabled:cursor-wait disabled:opacity-60"
                  >
                    <LifeBuoy className="h-4 w-4" aria-hidden="true" />
                    {escalating
                      ? "Sending for follow-up..."
                      : "Escalate to staff"}
                  </button>
                )}

                {escalation && (
                  <p
                    role={escalation.type === "error" ? "alert" : "status"}
                    className={`mt-4 rounded-lg px-3 py-2 text-sm font-semibold ${escalation.type === "error" ? "bg-red-50 text-red-800" : "bg-[#ECF9F1] text-[#21864A]"}`}
                  >
                    {escalation.type === "error"
                      ? escalation.message
                      : `${escalation.message} Reference: ${escalation.reference}.`}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white/90 shadow-[0_8px_28px_rgba(18,63,112,0.06)] backdrop-blur-sm">
        <div className="border-b border-slate-100 px-6 py-5 sm:px-7">
          <h2 className="text-lg font-bold tracking-tight text-[#172B4D]">
            My escalated questions
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Staff replies and follow-up status for questions you sent to the
            barangay.
          </p>
        </div>

        {escalationLoading ? (
          <div
            className="space-y-3 p-6"
            aria-label="Loading escalated questions"
          >
            <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
          </div>
        ) : escalationError ? (
          <div className="px-6 py-10 text-center">
            <p role="alert" className="text-sm text-red-700">
              {escalationError}
            </p>
            <button
              type="button"
              onClick={() => {
                setEscalationLoading(true);
                setReloadEscalations((current) => current + 1);
              }}
              className="mt-3 rounded-lg px-3 py-2 text-sm font-semibold text-[#2455D6] hover:bg-[#2455D6]/5"
            >
              Try again
            </button>
          </div>
        ) : escalations.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF4FF] text-[#2455D6]">
              <LifeBuoy className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm font-semibold text-[#172B4D]">
              No escalated questions yet
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Questions you send to staff will appear here with their replies.
            </p>
          </div>
        ) : (
          <div className="grid min-h-[470px] md:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="flex min-h-0 flex-col border-b border-slate-100 md:border-b-0 md:border-r">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-[#55708F]">
                  Conversations
                </p>
                <span className="text-xs text-slate-400">
                  Page {escalationPage} of {escalationLastPage}
                </span>
              </div>
              <div className="max-h-[260px] flex-1 divide-y divide-slate-100 overflow-y-auto md:max-h-[480px]">
                {escalations.map((item) => {
                  const selected = item.id === selectedEscalationId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setSelectedEscalationId(item.id)}
                      className={`w-full border-l-[3px] px-4 py-4 text-left transition ${selected ? "border-[#2455D6] bg-[#EEF4FF]/70" : "border-transparent hover:bg-slate-50"}`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#55708F]">
                          BOT-{String(item.id).padStart(5, "0")}
                        </span>
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${item.status === "replied" ? "bg-[#21864A]" : "bg-[#D89B18]"}`}
                          aria-label={
                            item.status === "replied"
                              ? "Staff replied"
                              : "Waiting for staff"
                          }
                        />
                      </span>
                      <span className="mt-2 block line-clamp-2 text-sm font-semibold leading-5 text-[#172B4D]">
                        {item.question}
                      </span>
                      <span className="mt-2 block truncate text-xs text-slate-500">
                        {item.staff_reply || "Waiting for a reply from staff"}
                      </span>
                      {item.faq_category && (
                        <span className="mt-2 block truncate text-[11px] text-slate-400">
                          {item.faq_category}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {escalationLastPage > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                  <button
                    type="button"
                    aria-label="Previous conversations page"
                    disabled={escalationPage <= 1}
                    onClick={() => {
                      setEscalationLoading(true);
                      setEscalationPage((page) => Math.max(1, page - 1));
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-[#2455D6] disabled:opacity-40"
                  >
                    <ChevronDown
                      className="h-4 w-4 rotate-90"
                      aria-hidden="true"
                    />
                  </button>
                  <span className="text-xs text-slate-500">
                    {escalationPage} / {escalationLastPage}
                  </span>
                  <button
                    type="button"
                    aria-label="Next conversations page"
                    disabled={escalationPage >= escalationLastPage}
                    onClick={() => {
                      setEscalationLoading(true);
                      setEscalationPage((page) =>
                        Math.min(escalationLastPage, page + 1),
                      );
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-[#2455D6] disabled:opacity-40"
                  >
                    <ChevronDown
                      className="h-4 w-4 -rotate-90"
                      aria-hidden="true"
                    />
                  </button>
                </div>
              )}
            </aside>

            <div className="flex min-h-[470px] flex-col bg-[#F7F9FC]">
              {selectedEscalation ? (
                <>
                  <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#172B4D]">
                        Barangay support
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        BOT-{String(selectedEscalation.id).padStart(5, "0")}
                        {selectedEscalation.faq_category &&
                          ` · ${selectedEscalation.faq_category}`}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${selectedEscalation.status === "replied" ? "bg-[#ECF9F1] text-[#21864A]" : "bg-[#FFF7E7] text-[#B87900]"}`}
                    >
                      {selectedEscalation.status === "replied"
                        ? "Replied"
                        : "Pending"}
                    </span>
                  </div>

                  <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-7">
                    <div className="flex justify-end">
                      <div className="max-w-[88%] sm:max-w-[78%]">
                        <p className="mb-1.5 text-right text-[11px] font-semibold text-slate-400">
                          You
                        </p>
                        <div className="rounded-2xl rounded-br-sm bg-[#2455D6] px-4 py-3 text-sm leading-6 text-white shadow-sm">
                          {selectedEscalation.question}
                        </div>
                        {selectedEscalation.created_at && (
                          <p className="mt-1.5 text-right text-[11px] text-slate-400">
                            {new Date(
                              selectedEscalation.created_at,
                            ).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>

                    {selectedEscalation.staff_reply ? (
                      <div className="flex items-end gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#123F70] text-white">
                          <Bot className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <div className="max-w-[88%] sm:max-w-[78%]">
                          <p className="mb-1.5 text-[11px] font-semibold text-slate-400">
                            Barangay staff
                          </p>
                          <div className="rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-[#344966] shadow-sm">
                            {selectedEscalation.staff_reply}
                          </div>
                          {selectedEscalation.replied_at && (
                            <p className="mt-1.5 text-[11px] text-slate-400">
                              {new Date(
                                selectedEscalation.replied_at,
                              ).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5 pl-10">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#2455D6] shadow-sm">
                          <LifeBuoy className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <p className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                          Your question is in the staff queue. A reply will
                          appear here.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-200 bg-white px-5 py-3 sm:px-6">
                    <p className="text-center text-xs text-slate-400">
                      Replies to this escalation will appear in this
                      conversation.
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
                  <MessageCircle
                    className="h-8 w-8 text-slate-300"
                    aria-hidden="true"
                  />
                  <p className="mt-3 text-sm font-semibold text-[#172B4D]">
                    Choose a conversation
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Select an escalated question to view the conversation.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default BantayBot;
