import { useEffect, useState } from "react";
import { Archive, CalendarDays, CheckCircle2, Clock3, FileText, LayoutDashboard, LoaderCircle, LogOut, Menu, MessageSquareWarning, X, XCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

function StaffLayout({ title, navigationItems, notificationCounts = {}, activePath, onNavigate, children }) {
  const { user, token, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(() => new Date());
  const [pendingComplaintCount, setPendingComplaintCount] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentDateTime(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!token || user?.designation !== "Complaint Management Officer") return undefined;
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/api/staff/complaints?per_page=1", {
          headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        });
        const payload = await response.json();
        if (active && response.ok) setPendingComplaintCount(Number(payload.counts?.pending || 0));
      } catch { /* Keep the latest count during a temporary connection issue. */ }
    };
    refresh();
    const timer = window.setInterval(refresh, 10000);
    return () => { active = false; window.clearInterval(timer); };
  }, [token, user?.designation]);

  return (
    <div className="min-h-screen bg-[#F5F7FB] text-[#172B4D]">
      {sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-[#071B3D]/60 lg:hidden"
          aria-label="Close navigation"
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[min(19rem,88vw)] flex-col overflow-hidden bg-[#123F70] px-5 py-6 text-white shadow-2xl transition-transform duration-300 lg:w-72 lg:translate-x-0 lg:shadow-none ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="shrink-0 border-b border-white/10 px-2 pb-5">
          <div className="flex items-center gap-3">
            <img src="/images/logo-white-version.png" alt="TugonBarangay" className="h-12 w-12 object-contain" />
            <div>
              <p className="text-lg font-bold tracking-tight">Tugon<span className="text-[#FF6B6B]">Barangay</span></p>
              <p className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.15em] text-white/70">Staff Portal</p>
            </div>
            <button type="button" onClick={() => setSidebarOpen(false)} className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 lg:hidden" aria-label="Close navigation">
              <X size={18} />
            </button>
          </div>
        </div>

        <nav className="sidebar-scroll mt-7 min-h-0 flex-1 overflow-y-auto overscroll-contain" aria-label="Staff workspace">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">Workspace</p>
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const active = activePath === item.path;
              const Icon = item.icon || (item.value
                ? FileText
                : item.label === "Pending"
                  ? Clock3
                  : item.label === "In Progress"
                    ? LoaderCircle
                    : item.label === "Resolved"
                      ? CheckCircle2
                      : item.label === "Rejected"
                        ? XCircle
                        : item.label === "Closed"
                          ? Archive
                    : item.label === "Complaints"
                      ? MessageSquareWarning
                      : LayoutDashboard);
              return (
                <div key={item.path}>
                  <button
                    type="button"
                    onClick={() => {
                      onNavigate(item.path);
                      setSidebarOpen(false);
                    }}
                    aria-current={active ? "page" : undefined}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${active ? "bg-white text-[#123F70] shadow-lg" : "text-white/85 hover:bg-white/10"}`}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${active ? "bg-[#EAF1FF] text-[#2455D6]" : "bg-white/10 text-white/85"}`}>
                      <Icon size={15} />
                    </span>
                    <span className="min-w-0 flex-1 whitespace-normal break-words leading-5">{item.label}</span>
                    {user?.designation === "Document Request Officer" && notificationCounts[item.path] > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E52B32] px-1 text-[10px] font-bold text-white" aria-label={`${notificationCounts[item.path]} unseen pending requests`}>
                        {notificationCounts[item.path] > 99 ? "99+" : notificationCounts[item.path]}
                      </span>
                    )}
                    {item.label === "Pending" && pendingComplaintCount > 0 && user?.designation === "Complaint Management Officer" && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E52B32] px-1 text-[10px] font-bold text-white" aria-label={`${pendingComplaintCount} pending complaints`}>{pendingComplaintCount > 99 ? "99+" : pendingComplaintCount}</span>
                    )}
                    {active && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF6B6B]" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </nav>

        <div className="mt-auto shrink-0 pt-6">
          <div className="rounded-xl bg-white/10 p-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-bold text-[#2455D6]">{(user?.name || "S").charAt(0)}</span>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold">{user?.name || "Staff"}</p>
                <p className="truncate text-[10px] text-white/65">{user?.designation || "Staff"}</p>
              </div>
            </div>
          </div>
          <button type="button" onClick={logout} className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-[#FFD0D0] transition hover:bg-[#FF6B6B]/15">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF6B6B]/15"><LogOut size={15} aria-hidden="true" /></span>
            Logout
          </button>
        </div>
      </aside>

      <main className="min-w-0 lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-7 lg:px-9">
          <div className="flex items-center justify-between gap-5">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" onClick={() => setSidebarOpen(true)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#2455D6] shadow-sm lg:hidden" aria-label="Open navigation">
                <Menu size={18} />
              </button>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2455D6]">Staff workspace</p>
                <h1 className="mt-0.5 truncate text-xl font-bold tracking-tight text-[#172B4D] sm:text-2xl">{title}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-5">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[#2455D6]" aria-label="Current date and time in Manila">
                <CalendarDays size={14} className="shrink-0 sm:h-4 sm:w-4" />
                <div className="text-right">
                  <p className="text-xs font-bold text-[#172B4D]">
                    <span className="sm:hidden">
                      {currentDateTime.toLocaleDateString("en-PH", {
                        timeZone: "Asia/Manila",
                        day: "2-digit",
                        month: "short",
                      })}
                    </span>
                    <span className="hidden sm:inline">
                      {currentDateTime.toLocaleDateString("en-PH", {
                        timeZone: "Asia/Manila",
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </p>
                  <time dateTime={currentDateTime.toISOString()} className="mt-0.5 block text-[10px] font-semibold text-[#55708F]">
                    {currentDateTime.toLocaleTimeString("en-PH", {
                      timeZone: "Asia/Manila",
                      hour: "2-digit",
                      minute: "2-digit",
                    })} PHT
                  </time>
                </div>
              </div>
              <div className="hidden text-right lg:block">
                <p className="max-w-[220px] truncate text-sm font-bold text-[#172B4D]">{user?.name || "Staff"}</p>
                <p className="mt-0.5 text-[10px] text-[#55708F]">{user?.designation || "Staff"}</p>
              </div>
            </div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

export default StaffLayout;
