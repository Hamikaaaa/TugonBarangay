import {
  Activity,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  LayoutDashboard,
  Pencil,
  Plus,
  Save,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import { useAuth } from "../../context/AuthContext";
import { primaryButtonClass } from "../../utils/buttonStyles";

const API_URL = "http://127.0.0.1:8000/api";
const EMPTY_FAQ = { category: "", question: "", answer: "" };

function Chatbot() {
  const { token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const section =
    location.pathname === "/admin/chatbot/questions"
      ? "questions"
      : location.pathname === "/admin/chatbot/escalations"
        ? "escalations"
        : "dashboard";
  const [faqs, setFaqs] = useState([]);
  const [stats, setStats] = useState(null);
  const [faqSearch, setFaqSearch] = useState("");
  const [selectedFaqCategory, setSelectedFaqCategory] = useState(null);
  const [faqDraft, setFaqDraft] = useState(null);
  const [faqPendingDelete, setFaqPendingDelete] = useState(null);
  const [faqLoading, setFaqLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [faqSaving, setFaqSaving] = useState(false);
  const [deletingFaqId, setDeletingFaqId] = useState(null);
  const [escalations, setEscalations] = useState([]);
  const [selectedEscalationId, setSelectedEscalationId] = useState(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [replySaving, setReplySaving] = useState(false);
  const [escalationPage, setEscalationPage] = useState(1);
  const [escalationLastPage, setEscalationLastPage] = useState(1);
  const [escalationLoading, setEscalationLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadFaqs, setReloadFaqs] = useState(0);
  const [reloadEscalations, setReloadEscalations] = useState(0);

  const request = useCallback(
    async (path, options = {}) => {
      const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const validationMessage = data.errors
          ? Object.values(data.errors).flat()[0]
          : null;
        throw new Error(
          validationMessage || data.message || "The request could not be completed.",
        );
      }
      return data;
    },
    [token],
  );

  useEffect(() => {
    let active = true;
    request("/admin/bantaybot/faqs")
      .then((result) => {
        if (active) setFaqs(result.data || []);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setFaqLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadFaqs, request]);

  useEffect(() => {
    let active = true;
    request("/admin/bantaybot/stats")
      .then((result) => {
        if (active) setStats(result);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setStatsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadFaqs, reloadEscalations, request]);

  useEffect(() => {
    let active = true;
    request(`/admin/bantaybot/escalations?page=${escalationPage}`)
      .then((result) => {
        if (!active) return;
        const items = result.data || [];
        setEscalations(items);
        setEscalationLastPage(result.last_page || 1);
        setSelectedEscalationId((current) =>
          items.some((item) => item.id === current)
            ? current
            : items[0]?.id || null,
        );
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setEscalationLoading(false);
      });
    return () => {
      active = false;
    };
  }, [escalationPage, reloadEscalations, request]);

  const visibleFaqs = useMemo(() => {
    const term = faqSearch.trim().toLowerCase();
    if (!term) return faqs;
    return faqs.filter(
      (faq) =>
        faq.question.toLowerCase().includes(term) ||
        faq.answer.toLowerCase().includes(term) ||
        faq.category.toLowerCase().includes(term),
    );
  }, [faqSearch, faqs]);

  const selectedEscalation = escalations.find(
    (item) => item.id === selectedEscalationId,
  );
  const faqGroups = useMemo(
    () =>
      visibleFaqs.reduce((groups, faq) => {
        (groups[faq.category] ||= []).push(faq);
        return groups;
      }, {}),
    [visibleFaqs],
  );

  const saveFaq = async (event) => {
    event.preventDefault();
    if (!faqDraft || faqSaving) return;
    setFaqSaving(true);
    setError("");
    setNotice("");
    try {
      const editing = Boolean(faqDraft.id);
      const result = await request(
        editing
          ? `/admin/bantaybot/faqs/${faqDraft.id}`
          : "/admin/bantaybot/faqs",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: faqDraft.category.trim(),
            question: faqDraft.question.trim(),
            answer: faqDraft.answer.trim(),
          }),
        },
      );
      setNotice(result.message);
      setSelectedFaqCategory(result.faq.category);
      setFaqDraft(null);
      setReloadFaqs((value) => value + 1);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setFaqSaving(false);
    }
  };

  const deleteFaq = (faq) => {
    if (!deletingFaqId) setFaqPendingDelete(faq);
  };

  const confirmDeleteFaq = async () => {
    if (!faqPendingDelete || deletingFaqId) return;
    const faq = faqPendingDelete;
    setDeletingFaqId(faq.id);
    setError("");
    setNotice("");
    try {
      const result = await request(`/admin/bantaybot/faqs/${faq.id}`, {
        method: "DELETE",
      });
      setNotice(result.message);
      setFaqPendingDelete(null);
      setReloadFaqs((value) => value + 1);
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeletingFaqId(null);
    }
  };

  const sendReply = async (event) => {
    event.preventDefault();
    if (!selectedEscalation || !replyDraft.trim() || replySaving) return;
    setReplySaving(true);
    setError("");
    setNotice("");
    try {
      const result = await request(
        `/admin/bantaybot/escalations/${selectedEscalation.id}/reply`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ staff_reply: replyDraft.trim() }),
        },
      );
      setNotice(result.message);
      setReplyDraft("");
      setReloadEscalations((value) => value + 1);
    } catch (replyError) {
      setError(replyError.message);
    } finally {
      setReplySaving(false);
    }
  };

  return (
    <AdminLayout title="Chatbot">
      <div className="space-y-6 pt-6">
        <AdminPageHeader
          eyebrow={`BantayBot · ${section === "dashboard" ? "Overview" : section === "questions" ? "Knowledge base" : "Staff follow-up"}`}
          title={
            section === "dashboard"
              ? "Chatbot dashboard"
              : section === "questions"
                ? "Questions and answers"
                : "Escalated questions"
          }
          description={
            section === "dashboard"
              ? "Monitor BantayBot’s knowledge base and resident follow-up activity."
              : section === "questions"
                ? "Browse and maintain resident-facing answers, organized by category."
                : "Review resident questions that need a response from barangay staff."
          }
        >
          {section === "questions" && (
            <button
              type="button"
              onClick={() => {
                setError("");
                setNotice("");
                setFaqDraft({ ...EMPTY_FAQ });
              }}
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#2455D6] shadow-lg transition hover:-translate-y-0.5 hover:bg-[#EEF4FF] hover:shadow-xl active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add question
            </button>
          )}
        </AdminPageHeader>

        <nav
          aria-label="Chatbot sections"
          className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"
        >
          <button
            type="button"
            onClick={() => navigate("/admin/chatbot/dashboard")}
            aria-current={section === "dashboard" ? "page" : undefined}
            className={chatbotTabClass(section === "dashboard")}
          >
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => navigate("/admin/chatbot/questions")}
            aria-current={section === "questions" ? "page" : undefined}
            className={chatbotTabClass(section === "questions")}
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            Questions &amp; Answers
          </button>
          <button
            type="button"
            onClick={() => navigate("/admin/chatbot/escalations")}
            aria-current={section === "escalations" ? "page" : undefined}
            className={chatbotTabClass(section === "escalations")}
          >
            <Activity className="h-4 w-4" aria-hidden="true" />
            Escalated Questions
            {stats?.pending > 0 && (
              <span className="rounded-full bg-[#FFF0F0] px-2 py-0.5 text-[10px] font-bold text-[#E45757]">
                {stats.pending}
              </span>
            )}
          </button>
        </nav>

        {error && (
          <div
            role="alert"
            className="flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            <p>{error}</p>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
              className="shrink-0"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
        {notice && (
          <p
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            {notice}
          </p>
        )}

        {section === "dashboard" && (
          <div className="space-y-6">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Saved questions"
                value={statsLoading ? "…" : stats?.questions ?? 0}
                detail={`${stats?.categories ?? 0} categories`}
                icon={BookOpen}
                onClick={() => navigate("/admin/chatbot/questions")}
              />
              <StatCard
                label="Escalations"
                value={statsLoading ? "…" : stats?.escalations ?? 0}
                detail="All resident follow-ups"
                icon={Activity}
                onClick={() => navigate("/admin/chatbot/escalations")}
              />
              <StatCard
                label="Awaiting reply"
                value={statsLoading ? "…" : stats?.pending ?? 0}
                detail="Needs staff attention"
                icon={Clock3}
                accent="amber"
                onClick={() => navigate("/admin/chatbot/escalations")}
              />
              <StatCard
                label="Answered"
                value={statsLoading ? "…" : stats?.replied ?? 0}
                detail="Staff replies sent"
                icon={ShieldCheck}
                accent="green"
                onClick={() => navigate("/admin/chatbot/escalations")}
              />
            </section>
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div>
                  <h3 className="text-lg font-bold text-[#172B4D]">
                    Questions by category
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Current knowledge-base distribution
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/admin/chatbot/questions")}
                  className="inline-flex items-center gap-2 text-sm font-bold text-[#2455D6] hover:text-[#1948B8]"
                >
                  Manage questions
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              {statsLoading ? (
                <div className="p-5 text-sm text-slate-500" role="status">
                  Loading chatbot statistics...
                </div>
              ) : stats?.questions_by_category?.length ? (
                <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
                  {stats.questions_by_category.map((item) => (
                    <div
                      key={item.category}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                    >
                      <span className="text-sm font-semibold text-[#344966]">
                        {item.category}
                      </span>
                      <span className="rounded-full bg-[#EEF4FF] px-2.5 py-1 text-xs font-bold text-[#2455D6]">
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="p-5 text-sm text-slate-500">
                  No chatbot categories are available yet.
                </p>
              )}
            </section>
            {stats?.pending > 0 && (
              <button
                type="button"
                onClick={() => navigate("/admin/chatbot/escalations")}
                className="flex w-full items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-left transition hover:bg-amber-100"
              >
                <span>
                  <span className="block font-bold text-amber-900">
                    {stats.pending} question{stats.pending === 1 ? "" : "s"} need a reply
                  </span>
                  <span className="mt-1 block text-sm text-amber-800">
                    Open the escalation queue to respond to residents.
                  </span>
                </span>
                <ArrowRight className="h-5 w-5 shrink-0 text-amber-800" aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        {section === "questions" && faqDraft && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#071B3D]/50 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !faqSaving) {
                setFaqDraft(null);
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="faq-editor-title"
              className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6"
            >
              <form onSubmit={saveFaq} className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h3
                    id="faq-editor-title"
                    className="text-lg font-bold text-[#172B4D]"
                  >
                    {faqDraft.id
                      ? "Edit chatbot question"
                      : "Add chatbot question"}
                  </h3>
                  <button
                    type="button"
                    disabled={faqSaving}
                    onClick={() => setFaqDraft(null)}
                    aria-label="Close editor"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <div className="grid gap-4 md:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
                  <label className="text-xs font-bold text-slate-600">
                    Category
                    <input
                      required
                      maxLength={100}
                      value={faqDraft.category}
                      onChange={(event) =>
                        setFaqDraft({
                          ...faqDraft,
                          category: event.target.value,
                        })
                      }
                      className={fieldClass}
                      placeholder="e.g. Document Requirements"
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-600">
                    Question
                    <input
                      required
                      maxLength={255}
                      value={faqDraft.question}
                      onChange={(event) =>
                        setFaqDraft({
                          ...faqDraft,
                          question: event.target.value,
                        })
                      }
                      className={fieldClass}
                      placeholder="Enter the resident's question"
                    />
                  </label>
                </div>
                <label className="block text-xs font-bold text-slate-600">
                  Answer
                  <textarea
                    required
                    maxLength={5000}
                    rows={5}
                    value={faqDraft.answer}
                    onChange={(event) =>
                      setFaqDraft({ ...faqDraft, answer: event.target.value })
                    }
                    className={fieldClass}
                    placeholder="Write a clear, resident-facing answer"
                  />
                </label>
                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    disabled={faqSaving}
                    onClick={() => setFaqDraft(null)}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={faqSaving}
                    className={primaryButtonClass}
                  >
                    <Save className="h-4 w-4" aria-hidden="true" />
                    {faqSaving ? "Saving..." : "Save question"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {section === "questions" && faqPendingDelete && (
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-[#071B3D]/50 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (
                event.target === event.currentTarget &&
                deletingFaqId !== faqPendingDelete.id
              ) {
                setFaqPendingDelete(null);
              }
            }}
          >
            <section
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="faq-delete-title"
              aria-describedby="faq-delete-description"
              className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
                <Trash2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3
                id="faq-delete-title"
                className="mt-4 text-lg font-bold text-[#172B4D]"
              >
                Delete this question and answer?
              </h3>
              <p
                id="faq-delete-description"
                className="mt-2 text-sm leading-6 text-slate-600"
              >
                Are you sure you want to delete “{faqPendingDelete.question}”?
                This action cannot be undone.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={deletingFaqId === faqPendingDelete.id}
                  onClick={() => setFaqPendingDelete(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deletingFaqId === faqPendingDelete.id}
                  onClick={confirmDeleteFaq}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  {deletingFaqId === faqPendingDelete.id
                    ? "Deleting..."
                    : "Delete"}
                </button>
              </div>
            </section>
          </div>
        )}

        {section === "questions" && <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
            <div>
              <h3 className="text-lg font-bold text-[#172B4D]">
                Question and answer catalog
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {faqs.length} saved questions
              </p>
            </div>
            <label className="relative block w-full sm:max-w-xs">
              <span className="sr-only">Search chatbot catalog</span>
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                value={faqSearch}
                onChange={(event) => setFaqSearch(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#2455D6]"
                placeholder="Search questions and answers"
              />
            </label>
          </div>
          {faqLoading ? (
            <div className="space-y-3 p-5" role="status">
              <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
            </div>
          ) : visibleFaqs.length && !selectedFaqCategory ? (
            <div className="divide-y divide-slate-100">
              {Object.entries(faqGroups).map(([group, items]) => (
                <button
                  key={group}
                  type="button"
                  onClick={() => setSelectedFaqCategory(group)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-[#F7F9FC]"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold text-[#172B4D]">
                      {group}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      View questions and answers in this category
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="rounded-full bg-[#EEF4FF] px-2.5 py-1 text-xs font-bold text-[#2455D6]">
                      {items.length}
                    </span>
                    <ChevronRight
                      className="h-4 w-4 text-slate-400"
                      aria-hidden="true"
                    />
                  </span>
                </button>
              ))}
            </div>
          ) : visibleFaqs.length ? (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-[#F7F9FC] px-5 py-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedFaqCategory(null)}
                    className="text-sm font-semibold text-[#2455D6] hover:underline"
                  >
                    All categories
                  </button>
                  <ChevronRight
                    className="h-4 w-4 text-slate-300"
                    aria-hidden="true"
                  />
                  <span className="text-sm font-bold text-[#172B4D]">
                    {selectedFaqCategory}
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  {faqGroups[selectedFaqCategory]?.length || 0} questions
                </span>
              </div>
              {(faqGroups[selectedFaqCategory] || []).map((faq) => (
                <article
                  key={faq.id}
                  className="flex flex-col justify-between gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0 sm:flex-row sm:items-start"
                >
                  <div className="min-w-0">
                    <h4 className="font-bold text-[#172B4D]">{faq.question}</h4>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {faq.answer}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setError("");
                        setNotice("");
                        setFaqDraft({
                          id: faq.id,
                          category: faq.category,
                          question: faq.question,
                          answer: faq.answer,
                        });
                      }}
                      aria-label={`Edit ${faq.question}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-[#2455D6] hover:bg-[#EEF4FF]"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteFaq(faq)}
                      disabled={deletingFaqId === faq.id}
                      aria-label={`Delete ${faq.question}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      {deletingFaqId === faq.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </article>
              ))}
              {faqGroups[selectedFaqCategory]?.length === 0 && (
                <p className="px-5 py-10 text-center text-sm text-slate-500">
                  No questions in this category match your search.
                </p>
              )}
            </div>
          ) : (
            <div className="px-5 py-12 text-center text-sm text-slate-500">
              {faqSearch
                ? "No chatbot questions match your search."
                : "No chatbot questions have been added."}
            </div>
          )}
        </section>}

        {section === "escalations" && <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-lg font-bold text-[#172B4D]">
              Escalated resident questions
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Review unresolved questions and send residents a staff response.
            </p>
          </div>
          {escalationLoading ? (
            <div className="space-y-3 p-5" role="status">
              <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
            </div>
          ) : escalations.length ? (
            <div className="grid lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.2fr)]">
              <div className="divide-y divide-slate-100 border-b border-slate-100 lg:max-h-[560px] lg:overflow-y-auto lg:border-b-0 lg:border-r">
                {escalations.map((item) => {
                  const selected = item.id === selectedEscalationId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        setSelectedEscalationId(item.id);
                        setReplyDraft("");
                      }}
                      className={`w-full border-l-[3px] px-4 py-4 text-left transition ${
                        selected
                          ? "border-[#2455D6] bg-[#EEF4FF]/70"
                          : "border-transparent hover:bg-slate-50"
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#55708F]">
                          BOT-{String(item.id).padStart(5, "0")}
                        </span>
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                            item.status === "replied"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {item.status === "replied" ? "Replied" : "Pending"}
                        </span>
                      </span>
                      <span className="mt-2 block line-clamp-2 text-sm font-semibold text-[#172B4D]">
                        {item.question}
                      </span>
                      <span className="mt-1 block text-xs text-slate-400">
                        {item.resident?.name || item.resident?.email || "Resident"}
                        {item.faq_category ? ` · ${item.faq_category}` : ""}
                      </span>
                    </button>
                  );
                })}
                {escalationLastPage > 1 && (
                  <div className="flex items-center justify-between px-4 py-3">
                    <button
                      type="button"
                      disabled={escalationPage <= 1}
                      onClick={() => setEscalationPage((page) => page - 1)}
                      className="rounded-lg border border-slate-200 p-2 text-[#2455D6] disabled:opacity-40"
                      aria-label="Previous escalation page"
                    >
                      <ChevronDown className="h-4 w-4 rotate-90" />
                    </button>
                    <span className="text-xs text-slate-500">
                      {escalationPage} / {escalationLastPage}
                    </span>
                    <button
                      type="button"
                      disabled={escalationPage >= escalationLastPage}
                      onClick={() => setEscalationPage((page) => page + 1)}
                      className="rounded-lg border border-slate-200 p-2 text-[#2455D6] disabled:opacity-40"
                      aria-label="Next escalation page"
                    >
                      <ChevronDown className="h-4 w-4 -rotate-90" />
                    </button>
                  </div>
                )}
              </div>
              {selectedEscalation ? (
                <div className="space-y-5 p-5">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#55708F]">
                      <CircleHelp className="h-4 w-4" aria-hidden="true" />
                      Resident question
                    </div>
                    <p className="mt-2 rounded-xl bg-[#F7F9FC] p-4 text-sm leading-6 text-[#344966]">
                      {selectedEscalation.question}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      {selectedEscalation.resident?.name || "Resident"} ·{" "}
                      {new Date(selectedEscalation.created_at).toLocaleString()}
                    </p>
                  </div>
                  {selectedEscalation.staff_reply && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                        Staff answer
                      </p>
                      <p className="mt-2 whitespace-pre-wrap rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm leading-6 text-[#344966]">
                        {selectedEscalation.staff_reply}
                      </p>
                      {selectedEscalation.replied_at && (
                        <p className="mt-2 text-xs text-slate-400">
                          Replied {new Date(selectedEscalation.replied_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                  {selectedEscalation.status === "pending" ? (
                    <form onSubmit={sendReply}>
                      <label className="block text-xs font-bold text-slate-600">
                        Your answer to the resident
                        <textarea
                          required
                          maxLength={5000}
                          rows={5}
                          value={replyDraft}
                          onChange={(event) => setReplyDraft(event.target.value)}
                          className={fieldClass}
                          placeholder="Write a clear reply for the resident..."
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={replySaving || !replyDraft.trim()}
                        className={`${primaryButtonClass} mt-3`}
                      >
                        <Send className="h-4 w-4" aria-hidden="true" />
                        {replySaving ? "Sending..." : "Send answer"}
                      </button>
                    </form>
                  ) : (
                    <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                      <Check className="h-4 w-4" aria-hidden="true" />
                      This escalation has been answered.
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
                  <CircleHelp className="h-8 w-8 text-slate-300" aria-hidden="true" />
                  <p className="mt-3 text-sm font-semibold text-[#172B4D]">
                    Select an escalated question
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="px-5 py-12 text-center">
              <CircleHelp className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold text-[#172B4D]">
                No escalated questions
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Resident questions sent for staff follow-up will appear here.
              </p>
            </div>
          )}
        </section>}
      </div>
    </AdminLayout>
  );
}

const fieldClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2455D6] focus:bg-white focus:ring-4 focus:ring-[#2455D6]/10";

function chatbotTabClass(active) {
  return `inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
    active
      ? "border-[#D9E6FF] bg-[#EEF4FF] text-[#2455D6]"
      : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"
  }`;
}

function StatCard({ label, value, detail, icon: Icon, accent, onClick }) {
  const colors =
    accent === "amber"
      ? "bg-amber-50 text-amber-700"
      : accent === "green"
        ? "bg-emerald-50 text-emerald-700"
        : "bg-[#EEF4FF] text-[#2455D6]";
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className="flex items-start justify-between gap-3">
        <span>
          <span className="block text-sm font-semibold text-slate-500">{label}</span>
          <span className="mt-2 block text-3xl font-bold tracking-tight text-[#172B4D]">
            {value}
          </span>
        </span>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </span>
      <span className="mt-3 flex items-center justify-between text-xs text-slate-400">
        {detail}
        <ArrowRight className="h-4 w-4 text-[#2455D6]" aria-hidden="true" />
      </span>
    </button>
  );
}

export default Chatbot;
