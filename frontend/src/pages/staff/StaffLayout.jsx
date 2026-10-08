import { useEffect, useState } from "react";
import { Archive, CalendarDays, CheckCircle2, ChevronDown, Clock3, FileText, LayoutDashboard, LoaderCircle, Menu, MessageSquareWarning, X, XCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

function StaffLayout({ title, navigationItems, activePath, onNavigate, selectedNavigationChild, onNavigationChildSelect, children }) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedNavigation, setExpandedNavigation] = useState(null);
  const [currentDateTime, setCurrentDateTime] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

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

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[min(19rem,88vw)] flex-col overflow-y-auto bg-[#123F70] px-5 py-6 text-white shadow-2xl transition-transform duration-300 lg:w-72 lg:translate-x-0 lg:shadow-none ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="border-b border-white/10 px-2 pb-5">
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

        <nav className="mt-7" aria-label="Staff workspace">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">Workspace</p>
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const active = activePath === item.path;
              const hasChildren = Boolean(item.children?.length);
              const expanded = expandedNavigation === item.path;
              const Icon = item.value
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
                      : LayoutDashboard;
              return (
                <div key={item.path}>
                  <button
                    type="button"
                    onClick={() => {
                      if (hasChildren) {
                        setExpandedNavigation(expanded ? null : item.path);
                        return;
                      }
                      onNavigate(item.path);
                      setSidebarOpen(false);
                    }}
                    aria-current={active ? "page" : undefined}
                    aria-expanded={hasChildren ? expanded : undefined}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${active ? "bg-white text-[#123F70] shadow-lg" : "text-white/85 hover:bg-white/10"}`}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${active ? "bg-[#EAF1FF] text-[#2455D6]" : "bg-white/10 text-white/85"}`}>
                      <Icon size={15} />
                    </span>
                    <span className="truncate">{item.label}</span>
                    {hasChildren ? (
                      <ChevronDown size={15} className={`ml-auto transition-transform ${expanded ? "rotate-180" : ""}`} />
                    ) : active ? (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#FF6B6B]" />
                    ) : null}
                  </button>
                  {hasChildren && expanded && (
                    <div className="ml-7 border-l border-white/20 py-1 pl-5" role="group" aria-label="Complaint categories">
                      {item.children.map((category) => {
                        const selected = selectedNavigationChild === category;
                        return (
                          <button
                            key={category}
                            type="button"
                            onClick={() => {
                              onNavigationChildSelect?.(category);
                              setSidebarOpen(false);
                            }}
                            aria-pressed={selected}
                            className={`block w-full py-2 text-left text-xs font-medium leading-4 transition ${selected ? "text-white" : "text-white/75 hover:text-white"}`}
                          >
                            {category}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        <div className="mt-auto pt-6">
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
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF6B6B]/15"><X size={15} /></span>
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
                      second: "2-digit",
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
