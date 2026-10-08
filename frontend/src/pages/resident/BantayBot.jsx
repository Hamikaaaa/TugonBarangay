import {
  AlertCircle,
  Bot,
  ChevronDown,
  LifeBuoy,
  Search,
  Send,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  inputClass,
  primaryButtonClass,
  residentApi,
} from "../../services/residentApi";
import { shouldPromptForFeatureFeedback } from "../../services/featureFeedback";
import FeedbackPrompt from "../../components/resident/FeedbackPrompt";

const createMessageId = () => crypto.randomUUID();
const getCurrentTimestamp = () => new Date().toISOString();

function BantayBot({ token, userId }) {
  const [faqs, setFaqs] = useState([]);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [question, setQuestion] = useState("");
  const [askedQuestion, setAskedQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [activeMessageId, setActiveMessageId] = useState(null);
  const [faqLoading, setFaqLoading] = useState(true);
  const [faqError, setFaqError] = useState("");
  const [chatLoading, setChatLoading] = useState(true);
  const [chatError, setChatError] = useState("");
  const [reloadChatHistory, setReloadChatHistory] = useState(0);
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
  const [feedbackOpen, setFeedbackOpen] = useState(false);

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
    residentApi("/resident/bantaybot/messages", token)
      .then((result) => {
        if (!active) return;
        setChatError("");
        setChatMessages(
          (result.data || []).map((message) => ({
            ...message,
            sentAt: message.sent_at,
            receivedAt: message.received_at,
          })),
        );
      })
      .catch((error) => {
        if (active) setChatError(error.message);
      })
      .finally(() => {
        if (active) setChatLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadChatHistory, token]);

  useEffect(() => {
    let active = true;
    residentApi(`/resident/bantaybot/escalations?page=${escalationPage}`, token)
      .then((result) => {
        if (!active) return;
        setEscalationError("");
        setEscalations(result.data || []);
        setEscalationLastPage(result.last_page || 1);
        const newReply = result.data?.find(
          (item) =>
            item.status === "replied" &&
            item.staff_reply &&
            !hasSeenEscalationReply(userId, item.id),
        );
        if (newReply) {
          markEscalationReplySeen(userId, newReply.id);
          setSelectedEscalationId(newReply.id);
        } else {
          setSelectedEscalationId((current) =>
            result.data?.some((item) => item.id === current) ? current : null,
          );
        }
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
  }, [escalationPage, reloadEscalations, token, userId]);

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
    const submittedQuestion = value.trim();
    if (!submittedQuestion || asking) return;
    const messageId = createMessageId();
    const sentAt = getCurrentTimestamp();
    setAskedQuestion(submittedQuestion);
    setActiveMessageId(messageId);
    setChatMessages((messages) => [
      ...messages,
      { id: messageId, question: submittedQuestion, sentAt, answer: null },
    ]);
    setAsking(true);
    setAnswer(null);
    setEscalation(null);
    try {
      const data = await residentApi("/resident/bantaybot/ask", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: submittedQuestion }),
      });
      if (shouldPromptForFeatureFeedback(userId, "bantaybot")) {
        setFeedbackOpen(true);
      }
      setAnswer(data);
      setChatMessages((messages) =>
        messages.map((message) =>
          message.id === messageId
            ? {
                ...message,
                sentAt: data.sent_at || message.sentAt,
                answer: data,
                receivedAt: data.received_at || getCurrentTimestamp(),
              }
            : message,
        ),
      );
    } catch (error) {
      const errorAnswer = { answer: error.message, matched: false, faq: null };
      setAnswer(errorAnswer);
      setChatMessages((messages) =>
        messages.map((message) =>
          message.id === messageId
            ? {
                ...message,
                answer: errorAnswer,
                receivedAt: getCurrentTimestamp(),
              }
            : message,
        ),
      );
    } finally {
      setAsking(false);
    }
  };

  const escalate = async () => {
    if (!askedQuestion.trim()) return;
    setEscalating(true);
    setEscalation(null);
    try {
      const data = await residentApi("/resident/bantaybot/escalate", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: askedQuestion,
          category: answer?.faq?.category || category || null,
        }),
      });
      setEscalation({ type: "success", ...data });
      setEscalationPage(1);
      setSelectedEscalationId(null);
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
    const submittedQuestion = question;
    setQuestion("");
    ask(submittedQuestion);
  };

  const selectedEscalation = escalations.find(
    (item) => item.id === selectedEscalationId,
  );

  return (
    <div className="grid items-stretch gap-5 pb-8 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
      <section className="order-2 flex min-h-[520px] flex-col overflow-hidden rounded-[26px] border border-slate-200/80 bg-white/90 shadow-[0_8px_28px_rgba(18,63,112,0.06)] backdrop-blur-sm xl:order-1 xl:col-start-1 xl:h-[calc(100vh-13rem)] xl:max-h-[760px] xl:min-h-[420px]">
        <div className="border-b border-slate-100 px-5 py-5">
          <h2 className="text-lg font-bold tracking-tight text-[#172B4D]">
            Common questions
          </h2>
          <p className="mt-1 text-sm leading-5 text-slate-500">
            Select a question to ask BantayBot.
          </p>
          <label className="mt-4 block">
            <span className="sr-only">FAQ category</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={inputClass}
            >
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
              {chatLoading && (
                <p className="self-center text-xs text-slate-400" role="status">
                  Loading your chat history...
                </p>
              )}
            </select>
          </label>
          <label className="relative mt-3 block">
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
        {faqLoading ? (
          <div className="flex-1 space-y-3 p-5" aria-label="Loading questions">
            <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
          </div>
        ) : faqError ? (
          <div className="p-5 text-sm text-red-700" role="alert">
            {faqError}
          </div>
        ) : visibleFaqs.length ? (
          <div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto px-3">
            {visibleFaqs.map((faq) => (
              <button
                key={faq.id}
                type="button"
                disabled={asking}
                onClick={() => ask(faq.question)}
                className="group flex w-full items-start justify-between gap-2 rounded-xl px-3 py-3 text-left text-sm font-semibold leading-5 text-[#344966] transition hover:bg-[#EEF4FF] hover:text-[#2455D6] disabled:cursor-wait disabled:opacity-60"
              >
                <span>{faq.question}</span>
                <ChevronDown
                  className="mt-0.5 h-4 w-4 shrink-0 -rotate-90 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#2455D6]"
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
        ) : (
          <p className="px-5 py-12 text-center text-sm text-slate-500">
            No questions match this search.
          </p>
        )}
        {chatError && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">
            <p role="alert">
              Chat history could not be loaded: {chatError}
            </p>
            <button
              type="button"
              onClick={() => {
                setChatLoading(true);
                setChatError("");
                residentApi("/resident/bantaybot/messages", token)
                  .then((result) => setChatMessages(result.data || []))
                  .catch((error) => setChatError(error.message))
                  .finally(() => setChatLoading(false));
              }}
              className="font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}
        {!faqLoading && !faqError && (
          <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
            {visibleFaqs.length} questions in {category}
          </div>
        )}
      </section>

      <section className="order-1 flex min-h-[680px] flex-col overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_12px_36px_rgba(18,63,112,0.10)] xl:order-2 xl:col-start-2 xl:h-[calc(100vh-13rem)] xl:max-h-[760px] xl:min-h-[420px]">
        <header className="flex items-center gap-3 bg-gradient-to-r from-[#123F70] to-[#2455D6] px-5 py-4 text-white sm:px-7">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
            <Bot className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl">
              BantayBot
            </h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/80">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              Barangay assistant · Online
            </p>
          </div>
          <span className="hidden text-xs text-white/75 sm:block">
            Resident services
          </span>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain bg-[#F7F9FC] px-4 py-6 sm:px-8 sm:py-8">
          <div className="flex items-end gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#123F70] text-white shadow-sm">
              <Bot className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="max-w-[88%] rounded-2xl rounded-bl-sm border border-slate-100 bg-white px-4 py-3 shadow-sm sm:max-w-[75%]">
              <p className="text-xs font-bold text-[#123F70]">BantayBot</p>
              <p className="mt-1 text-sm leading-6 text-[#344966]">
                Hello! I'm BantayBot. I can help with barangay services,
                documents, and resident concerns. What would you like to know?
              </p>
            </div>
          </div>

          {chatMessages.map((message) => (
            <div key={message.id} className="space-y-4">
              <div className="flex justify-end">
                <div className="max-w-[88%] sm:max-w-[78%]">
                  <p className="mb-1 text-right text-[11px] font-semibold text-slate-400">
                    You
                  </p>
                  <div className="rounded-2xl rounded-br-sm bg-[#2455D6] px-4 py-3 text-sm leading-6 text-white shadow-sm">
                    {message.question}
                  </div>
                  <p className="mt-1.5 text-right text-[11px] text-slate-400">
                    Sent {new Date(message.sentAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {message.answer ? (
                <div className="flex items-end gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#123F70] text-white shadow-sm">
                    <Bot className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-slate-100 bg-white px-4 py-3 shadow-sm sm:max-w-[78%]">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-bold text-[#123F70]">
                        BantayBot
                      </p>
                      {message.answer.faq?.category && (
                        <span className="rounded-full bg-[#EEF4FF] px-2.5 py-1 text-[10px] font-semibold text-[#2455D6]">
                          {message.answer.faq.category}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#344966]">
                      {message.answer.answer}
                    </p>
                    <p className="mt-1.5 text-[11px] text-slate-400">
                      {new Date(message.receivedAt).toLocaleString()}
                    </p>
                    {!message.answer.matched && (
                      <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-[#805900]">
                        <AlertCircle
                          className="mt-0.5 h-4 w-4 shrink-0"
                          aria-hidden="true"
                        />
                        This answer was not found in the predefined catalog.
                        Send the question to the barangay for follow-up.
                      </p>
                    )}
                    {message.id === activeMessageId &&
                      message.answer.intent !== "greeting" &&
                      !escalation && (
                      <button
                        type="button"
                        onClick={escalate}
                        disabled={escalating}
                        className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-xl border border-[#2455D6]/20 bg-[#EEF4FF] px-3 text-xs font-semibold text-[#2455D6] transition hover:border-[#2455D6]/40 hover:bg-[#2455D6]/10 disabled:cursor-wait disabled:opacity-60"
                      >
                        <LifeBuoy className="h-4 w-4" aria-hidden="true" />
                        {escalating
                          ? "Sending for follow-up..."
                          : "Ask barangay staff"}
                      </button>
                    )}
                    {message.id === activeMessageId &&
                      message.answer.intent !== "greeting" &&
                      escalation && (
                      <p
                        role={
                          escalation.type === "error" ? "alert" : "status"
                        }
                        className={`mt-3 rounded-lg px-3 py-2 text-xs font-semibold ${escalation.type === "error" ? "bg-red-50 text-red-800" : "bg-[#ECF9F1] text-[#21864A]"}`}
                      >
                        {escalation.type === "error"
                          ? escalation.message
                          : `${escalation.message} Reference: ${escalation.reference}.`}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-end gap-2.5" role="status">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#123F70] text-white">
                    <Bot className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-slate-100 bg-white px-4 py-3 text-sm text-[#41658A] shadow-sm">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#2455D6]/20 border-t-[#2455D6]" />
                    Looking for an answer...
                  </div>
                </div>
              )}
            </div>
          ))}
          {chatLoading && (
            <p className="self-center text-xs text-slate-400" role="status">
              Loading your chat history...
            </p>
          )}
        </div>

        <div className="border-t border-slate-100 bg-white px-4 py-4 sm:px-6">
          <form onSubmit={submitQuestion}>
            <label className="sr-only" htmlFor="bantaybot-question">
              Type your question
            </label>
            <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-[#F7F9FC] p-2 transition focus-within:border-[#2455D6]/50 focus-within:ring-2 focus-within:ring-[#2455D6]/10">
              <textarea
                id="bantaybot-question"
                required
                maxLength={1000}
                rows={1}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    if (!asking && question.trim()) {
                      const submittedQuestion = question;
                      setQuestion("");
                      ask(submittedQuestion);
                    }
                  }
                }}
                className="max-h-32 min-h-10 flex-1 resize-y border-0 bg-transparent px-2 py-2 text-sm text-[#172B4D] outline-none placeholder:text-slate-400 focus:ring-0"
                placeholder="Type your message..."
              />
              <button
                type="submit"
                aria-label={asking ? "Finding an answer" : "Send question"}
                disabled={asking || !question.trim()}
                className={`${primaryButtonClass} h-10 w-10 shrink-0 justify-center rounded-xl px-0`}
              >
                <Send className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 px-1">
              <span className="text-[11px] text-slate-400">
                Press Enter to send · Shift+Enter for a new line
              </span>
              <span className="shrink-0 text-[11px] text-slate-400">
                {question.length}/1000
              </span>
            </div>
          </form>
          {faqError && (
            <p className="mt-3 text-xs text-red-700" role="alert">
              Common questions could not be loaded: {faqError}
            </p>
          )}
          {chatError && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">
              <p role="alert">
                Chat history could not be loaded: {chatError}
              </p>
              <button
                type="button"
                onClick={() => {
                  setChatLoading(true);
                  setReloadChatHistory((current) => current + 1);
                }}
                className="font-semibold underline"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="order-3 flex min-h-[520px] flex-col overflow-hidden rounded-[26px] border border-slate-200/80 bg-white/90 shadow-[0_8px_28px_rgba(18,63,112,0.06)] backdrop-blur-sm xl:order-3 xl:col-start-3 xl:h-[calc(100vh-13rem)] xl:max-h-[760px] xl:min-h-[420px]">
        <div className="border-b border-slate-100 px-5 py-5">
          <h2 className="text-lg font-bold tracking-tight text-[#172B4D]">
            Escalation history
          </h2>
          <p className="mt-1 text-sm leading-5 text-slate-500">
            Track questions sent to barangay staff.
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
          <>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-[#55708F]">
                Your requests
              </p>
              <span className="text-xs text-slate-400">
                Page {escalationPage} of {escalationLastPage}
              </span>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-[#F7F9FC] p-4 sm:p-5">
              {escalations.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedEscalationId(item.id)}
                  className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-[#2455D6]/40 hover:shadow-md"
                >
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#55708F]">
                      BOT-{String(item.id).padStart(5, "0")}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        item.status === "replied"
                          ? "bg-[#ECF9F1] text-[#21864A]"
                          : "bg-[#FFF7E7] text-[#B87900]"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          item.status === "replied"
                            ? "bg-[#21864A]"
                            : "bg-[#D89B18]"
                        }`}
                      />
                      {item.status === "replied"
                        ? "Answered · View reply"
                        : "Waiting for reply"}
                    </span>
                  </span>
                  <span className="mt-3 block line-clamp-2 text-sm font-semibold leading-5 text-[#172B4D]">
                    {item.question}
                  </span>
                  <span className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                    <span>
                      {item.faq_category || "Barangay support"}
                    </span>
                    {item.created_at && (
                      <time dateTime={item.created_at}>
                        {new Date(item.created_at).toLocaleString()}
                      </time>
                    )}
                  </span>
                </button>
              ))}
            </div>
            {escalationLastPage > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 bg-white px-4 py-3">
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
                  <ChevronDown className="h-4 w-4 rotate-90" aria-hidden="true" />
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
                  <ChevronDown className="h-4 w-4 -rotate-90" aria-hidden="true" />
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {selectedEscalation && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#071B3D]/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedEscalationId(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="escalation-detail-title"
            className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#55708F]">
                  BOT-{String(selectedEscalation.id).padStart(5, "0")}
                </p>
                <h3
                  id="escalation-detail-title"
                  className="mt-1 text-lg font-bold text-[#172B4D]"
                >
                  Escalated question
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEscalationId(null)}
                aria-label="Close escalation details"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </header>
            <div className="space-y-5 p-5">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#55708F]">
                    Your question
                  </p>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      selectedEscalation.status === "replied"
                        ? "bg-[#ECF9F1] text-[#21864A]"
                        : "bg-[#FFF7E7] text-[#B87900]"
                    }`}
                  >
                    {selectedEscalation.status === "replied"
                      ? "Answered"
                      : "Waiting for reply"}
                  </span>
                </div>
                <p className="mt-2 rounded-xl bg-[#F7F9FC] p-4 text-sm leading-6 text-[#344966]">
                  {selectedEscalation.question}
                </p>
                {selectedEscalation.created_at && (
                  <time
                    dateTime={selectedEscalation.created_at}
                    className="mt-2 block text-right text-xs text-slate-400"
                  >
                    Sent {new Date(selectedEscalation.created_at).toLocaleString()}
                  </time>
                )}
              </div>
              {selectedEscalation.staff_reply ? (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#21864A]">
                    Reply from barangay staff
                  </p>
                  <p className="mt-2 whitespace-pre-wrap rounded-xl border border-emerald-100 bg-[#ECF9F1]/60 p-4 text-sm leading-6 text-[#344966]">
                    {selectedEscalation.staff_reply}
                  </p>
                  {selectedEscalation.replied_at && (
                    <time
                      dateTime={selectedEscalation.replied_at}
                      className="mt-2 block text-right text-xs text-slate-400"
                    >
                      Replied {new Date(selectedEscalation.replied_at).toLocaleString()}
                    </time>
                  )}
                </div>
              ) : (
                <p className="flex items-center gap-2 rounded-xl border border-amber-100 bg-[#FFF7E7] px-4 py-3 text-sm text-[#805900]">
                  <LifeBuoy className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Your question is with barangay staff. The status will update
                  here when they reply.
                </p>
              )}
            </div>
          </section>
        </div>
      )}
      {feedbackOpen && (
        <FeedbackPrompt
          token={token}
          serviceType="bantaybot"
          onClose={() => setFeedbackOpen(false)}
        />
      )}
    </div>
  );
}

function hasSeenEscalationReply(userId, escalationId) {
  try {
    const savedIds = localStorage.getItem(`resident-escalation-replies-seen:${userId}`);
    if (!savedIds) return false;

    const ids = JSON.parse(savedIds);
    if (!Array.isArray(ids) || !ids.every(Number.isInteger)) {
      throw new Error("Saved escalation reply state is invalid.");
    }
    return ids.includes(escalationId);
  } catch (error) {
    console.warn("Could not read saved escalation reply state.", error);
    return false;
  }
}

function markEscalationReplySeen(userId, escalationId) {
  try {
    const key = `resident-escalation-replies-seen:${userId}`;
    const savedIds = localStorage.getItem(key);
    const ids = savedIds ? JSON.parse(savedIds) : [];
    if (!Array.isArray(ids) || !ids.every(Number.isInteger)) {
      throw new Error("Saved escalation reply state is invalid.");
    }
    localStorage.setItem(key, JSON.stringify([...new Set([...ids, escalationId])]));
  } catch (error) {
    console.warn("Could not save escalation reply state.", error);
  }
}

export default BantayBot;
