import { useEffect, useState } from "react";
import { Bell, Check, MailOpen, Trash2 } from "lucide-react";
import { residentApi } from "../../services/residentApi";

function Notifications({ token, unreadCount = 0, onRefresh }) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;

    residentApi(`/resident/notifications?page=${page}`, token)
      .then((result) => {
        if (!active) return;
        setItems(result.data || []);
        setMeta({
          current_page: result.current_page || 1,
          last_page: result.last_page || 1,
          total: result.total || 0,
        });
        setError("");
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, reload, token]);

  const refreshDashboard = async () => {
    try {
      await onRefresh?.();
    } catch {
      setActionError(
        "Your change was saved, but the unread count could not refresh.",
      );
    }
  };

  const updateNotification = async (item, read) => {
    setBusyId(item.id);
    setActionError("");
    try {
      const result = await residentApi(
        `/resident/notifications/${item.id}`,
        token,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ read }),
        },
      );
      setItems((current) =>
        current.map((notification) =>
          notification.id === item.id ? result.notification : notification,
        ),
      );
      await refreshDashboard();
    } catch (requestError) {
      setActionError(requestError.message);
    } finally {
      setBusyId(null);
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    setActionError("");
    try {
      await residentApi("/resident/notifications/read-all", token, {
        method: "PATCH",
      });
      const readAt = new Date().toISOString();
      setItems((current) =>
        current.map((item) => ({ ...item, read_at: item.read_at || readAt })),
      );
      await refreshDashboard();
    } catch (requestError) {
      setActionError(requestError.message);
    } finally {
      setMarkingAll(false);
    }
  };

  const deleteNotification = async (item) => {
    setBusyId(item.id);
    setActionError("");
    try {
      await residentApi(`/resident/notifications/${item.id}`, token, {
        method: "DELETE",
      });
      setItems((current) => current.filter(({ id }) => id !== item.id));
      setMeta((current) => ({
        ...current,
        total: Math.max(0, current.total - 1),
      }));
      if (items.length === 1 && page > 1) {
        setLoading(true);
        setPage((current) => current - 1);
      }
      await refreshDashboard();
    } catch (requestError) {
      setActionError(requestError.message);
    } finally {
      setBusyId(null);
    }
  };

  const changePage = (nextPage) => {
    setLoading(true);
    setPage(nextPage);
  };

  return (
    <section className="mx-auto max-w-5xl space-y-6 pb-8">
      <header className="relative overflow-hidden rounded-[28px] border border-white/70 bg-white/70 px-6 py-7 shadow-[0_8px_28px_rgba(18,63,112,0.05)] backdrop-blur-sm sm:px-8">
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#123F70] text-white">
              <Bell className="h-7 w-7" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-medium text-[#41658A]">
                Resident services
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#123F70] sm:text-4xl">
                Notifications
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                Updates about your requests and account, newest first.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={markAllRead}
            disabled={unreadCount === 0 || markingAll}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#2455D6] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#1D46B5] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            {markingAll ? "Updating..." : "Mark all as read"}
          </button>
        </div>
      </header>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-white/80 bg-white/60 px-4 py-3 text-sm text-slate-500 shadow-sm">
        <Bell className="h-4 w-4" aria-hidden="true" />
        <span>
          {unreadCount} unread · {meta.total} total
        </span>
      </div>

      <div className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white/90 shadow-[0_8px_28px_rgba(18,63,112,0.06)] backdrop-blur-sm">
        {actionError && (
          <p
            role="alert"
            className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700"
          >
            {actionError}
          </p>
        )}
        {loading ? (
          <div className="space-y-4 p-6" aria-label="Loading notifications">
            <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setReload((current) => current + 1);
              }}
              className="mt-3 text-sm font-semibold text-[#2455D6] hover:underline"
            >
              Try again
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Bell
              className="mx-auto h-8 w-8 text-slate-300"
              aria-hidden="true"
            />
            <h2 className="mt-3 text-sm font-bold text-slate-700">
              You’re all caught up
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              New service updates will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((item) => {
              const isUnread = !item.read_at;
              const isBusy = busyId === item.id;
              return (
                <article
                  key={item.id}
                  className={`flex gap-4 px-5 py-5 sm:px-6 ${isUnread ? "bg-blue-50/40" : "bg-white"}`}
                >
                  <span
                    className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${isUnread ? "bg-[#2455D6]" : "bg-slate-200"}`}
                    aria-label={isUnread ? "Unread" : "Read"}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2
                        className={`text-sm text-slate-800 ${isUnread ? "font-bold" : "font-semibold"}`}
                      >
                        {item.title}
                      </h2>
                      {isUnread && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase text-[#2455D6]">
                          New
                        </span>
                      )}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {item.message}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      {new Date(item.created_at).toLocaleString()} ·{" "}
                      {item.type.replaceAll("_", " ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-start gap-1">
                    <button
                      type="button"
                      onClick={() => updateNotification(item, isUnread)}
                      disabled={isBusy || markingAll}
                      title={isUnread ? "Mark as read" : "Mark as unread"}
                      aria-label={`${isUnread ? "Mark as read" : "Mark as unread"}: ${item.title}`}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-[#2455D6] disabled:opacity-50"
                    >
                      {isUnread ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <MailOpen className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteNotification(item)}
                      disabled={isBusy || markingAll}
                      title="Delete notification"
                      aria-label={`Delete notification: ${item.title}`}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {!loading && !error && meta.last_page > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 sm:px-6">
            <p className="text-xs text-slate-500">
              Page {meta.current_page} of {meta.last_page}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => changePage(page - 1)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= meta.last_page}
                onClick={() => changePage(page + 1)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default Notifications;
