import {
  Bot,
  Bell,
  CalendarDays,
  ChartNoAxesColumn,
  ChevronDown,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareWarning,
  ChevronLeft,
  ChevronRight,
  Star,
  Users,
  UserCog,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";

const navigation = [
  { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
  {
    label: "User Management",
    path: "/admin/staff-accounts",
    icon: UserCog,
    children: [
      { label: "Staff Accounts", path: "/admin/staff-accounts" },
      { label: "Residents Account", path: "/admin/user-management/residents" },
    ],
  },
  {
    label: "Residents & Registry",
    path: "/admin/residents",
    icon: Users,
    children: [
      { label: "Dashboard", path: "/admin/residents/dashboard" },
      { label: "Barangay Masterlist", path: "/admin/residents" },
      { label: "Account Verification", path: "/admin/residents/verification" },
    ],
  },
  {
    label: "Document Request",
    path: "/admin/document-requests/dashboard",
    icon: ClipboardList,
    children: [
      { label: "Dashboard", path: "/admin/document-requests/dashboard" },
      { label: "Document Requests", path: "/admin/document-requests" },
      { label: "Document Types", path: "/admin/document-types" },
    ],
  },
  {
    label: "Complaints",
    path: "/admin/complaints",
    icon: MessageSquareWarning,
    children: [
      { label: "Dashboard", path: "/admin/complaints" },
      { label: "Resident Complaints", path: "/admin/complaints/resident-complaints" },
      { label: "Category Management", path: "/admin/complaints/categories" },
      { label: "Blotter", path: "/admin/complaints/blotter-history", icon: FileText },
      { label: "Summons Settings", path: "/admin/complaints/summons-settings", icon: FileText },
      { label: "Summon History", path: "/admin/complaints/summon-history", icon: FileText },
    ],
  },
  {
    label: "Chatbot",
    path: "/admin/chatbot/dashboard",
    icon: Bot,
    children: [
      { label: "Dashboard", path: "/admin/chatbot/dashboard" },
      { label: "Questions & Answers", path: "/admin/chatbot/questions" },
      { label: "Escalated Questions", path: "/admin/chatbot/escalations" },
    ],
  },
  { label: "Feedback", path: "/admin/feedback", icon: Star },
  {
    label: "Reports and Analytics",
    path: "/admin/reports",
    icon: ChartNoAxesColumn,
  },
];

const matchesRoute = (routePath, pathname) =>
  pathname === routePath || pathname.startsWith(`${routePath}/`);

const getActiveChild = (item, pathname) =>
  item.children
    ?.filter((child) => matchesRoute(child.path, pathname))
    .sort((left, right) => right.path.length - left.path.length)[0];

const isActiveNavigationItem = (item, pathname) =>
  (item.label === "Chatbot" && pathname === "/admin/chatbot") ||
  matchesRoute(item.path, pathname) ||
  Boolean(getActiveChild(item, pathname));

function AdminLayout({ children, title }) {
  const { token, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => window.localStorage.getItem("adminSidebarCollapsed") === "true",
  );
  const activeItem = navigation.find((item) =>
    isActiveNavigationItem(item, location.pathname),
  );
  const activeChild = activeItem
    ? getActiveChild(activeItem, location.pathname)
    : undefined;
  const activePanel = activeChild?.label || activeItem?.label || title;

  const handleSelect = (path) => {
    navigate(path);
    setSidebarOpen(false);
  };

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((collapsed) => {
      const nextCollapsed = !collapsed;
      window.localStorage.setItem(
        "adminSidebarCollapsed",
        String(nextCollapsed),
      );
      return nextCollapsed;
    });
  };

  return (
    <div className="min-h-screen bg-[#F5F7FB] text-[#172B4D]">
      <AdminSidebar
        token={token}
        activePath={location.pathname}
        onSelect={handleSelect}
        onLogout={logout}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapsed}
      />

      <main
        className={`min-w-0 bg-[#F5F7FB] transition-[padding] duration-300 ${
          sidebarCollapsed ? "lg:pl-20" : "lg:pl-72"
        }`}
      >
        <AdminHeader
          token={token}
          activePanel={activePanel}
          onMenu={() => setSidebarOpen(true)}
          onNavigate={handleSelect}
        />

        <div className="mx-auto w-full max-w-[1600px] px-5 pb-10 sm:px-7 lg:px-9">
          {children}
        </div>
      </main>
    </div>
  );
}

function AdminSidebar({
  token,
  activePath,
  onSelect,
  onLogout,
  open,
  onClose,
  collapsed,
  onToggleCollapse,
}) {
  const [openMenuOverride, setOpenMenuOverride] = useState(null);
  const [pendingEscalationCount, setPendingEscalationCount] = useState(null);
  const [pendingVerificationCount, setPendingVerificationCount] = useState(null);
  const [documentRequestCount, setDocumentRequestCount] = useState(null);
  const [complaintCount, setComplaintCount] = useState(null);
  const activeNavigationItem = navigation.find((item) =>
    isActiveNavigationItem(item, activePath),
  );
  const openMenu = openMenuOverride ?? activeNavigationItem?.label ?? "";

  useEffect(() => {
    let cancelled = false;
    let loading = false;
    const loadEscalationCount = async () => {
      if (!token || loading) return;
      loading = true;
      try {
        const response = await fetch("http://127.0.0.1:8000/api/admin/bantaybot/stats", {
          headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const payload = await response.json();
        const count = Number(payload.pending);
        if (!cancelled && Number.isFinite(count)) setPendingEscalationCount(count);
      } catch {
        // The sidebar remains usable if the count cannot be refreshed.
      } finally {
        loading = false;
      }
    };
    const loadVerificationCount = async () => {
      if (!token) return;
      try {
        const response = await fetch("http://127.0.0.1:8000/api/admin/residents/registry-stats", {
          headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const payload = await response.json();
        const count = Number(payload.pending_total);
        if (!cancelled && Number.isFinite(count)) setPendingVerificationCount(count);
      } catch {
        // Keep the last known count if the server is temporarily unavailable.
      }
    };
    const loadAttentionCounts = async () => {
      if (!token) return;
      try {
        const response = await fetch("http://127.0.0.1:8000/api/admin/notifications", {
          headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const payload = await response.json();
        const items = payload.items || [];
        const documents = items.find((item) => item.type === "document_requests");
        const complaints = items.find((item) => item.type === "complaints");
        if (!cancelled) {
          setDocumentRequestCount(Number(documents?.count) || 0);
          setComplaintCount(Number(complaints?.count) || 0);
        }
      } catch {
        // Keep the last known counts while the notification endpoint is unavailable.
      }
    };
    loadEscalationCount();
    loadVerificationCount();
    loadAttentionCounts();
    window.addEventListener("resident-verification-updated", loadVerificationCount);
    const timer = window.setInterval(() => {
      loadEscalationCount();
      loadVerificationCount();
      loadAttentionCounts();
    }, 30000);
    return () => {
      cancelled = true;
      window.removeEventListener("resident-verification-updated", loadVerificationCount);
      window.clearInterval(timer);
    };
  }, [token]);

  const isActiveItem = (item) => isActiveNavigationItem(item, activePath);

  return (
    <>
      {open && (
        <button
          type="button"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-[#071B3D]/60 lg:hidden"
          aria-label="Close navigation"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(19rem,88vw)] flex-col overflow-hidden bg-[#123F70] px-5 py-6 text-white shadow-2xl transition-[width,transform,padding] duration-300 lg:translate-x-0 lg:shadow-none ${
          collapsed ? "lg:w-20 lg:px-3" : "lg:w-72"
        } ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div
          className={`shrink-0 border-b border-white/10 pb-5 ${
            collapsed ? "px-0" : "px-2"
          }`}
        >
          <div
            className={`flex items-center gap-3 ${
              collapsed ? "flex-col" : ""
            }`}
          >
            <img
              src="/images/logo-white-version.png"
              alt="TugonBarangay"
              className="h-10 w-10 shrink-0 object-contain"
            />

            {!collapsed && <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight">
                Tugon<span className="text-[#FF6B6B]">Barangay</span>
              </h1>
              <p className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.15em] text-blue-100/70">
                Admin Portal
              </p>
            </div>}

            <button
              type="button"
              onClick={onToggleCollapse}
              className={`hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-blue-100 transition hover:bg-white/10 hover:text-white lg:flex ${
                collapsed ? "" : "ml-auto"
              }`}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <ChevronRight size={18} aria-hidden="true" />
              ) : (
                <ChevronLeft size={18} aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-lg text-blue-100 lg:hidden"
              aria-label="Close navigation"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="sidebar-scroll mt-7 min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {!collapsed && (
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200/60">
              Main Menu
            </p>
          )}

          <nav className="space-y-1">
            {navigation.map((item) =>
              item.children ? (
                <div
                  key={item.path}
                  className="group"
                >
                  <button
                    type="button"
                    title={collapsed ? item.label : undefined}
                    aria-haspopup="true"
                    aria-expanded={openMenu === item.label}
                    onClick={() => {
                      if (collapsed) {
                        onSelect(item.path);
                        return;
                      }
                      if (openMenu !== item.label) onSelect(item.path);
                      setOpenMenuOverride((current) =>
                        (current ?? activeNavigationItem?.label) === item.label
                          ? ""
                          : item.label,
                      );
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl py-3 text-left text-sm font-medium ${
                      collapsed ? "justify-center px-0" : "px-3"
                    } ${
                      isActiveItem(item)
                        ? "bg-white text-[#123F70] shadow-lg"
                        : "text-blue-100"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                        isActiveItem(item)
                          ? "bg-[#EAF1FF] text-[#2455D6]"
                          : "bg-white/10 text-blue-100"
                      }`}
                    >
                      {(() => {
                        const Icon = item.icon;
                        return <Icon size={15} aria-hidden="true" />;
                      })()}
                    </span>
                    {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                    {!collapsed && item.label === "Document Request" && documentRequestCount > 0 && (
                    <span aria-label={`${documentRequestCount} document requests need attention`} className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#EF4444] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                      {documentRequestCount > 99 ? "99+" : documentRequestCount}
                    </span>
                    )}
                    {!collapsed && item.label === "Complaints" && complaintCount > 0 && (
                    <span aria-label={`${complaintCount} complaints need attention`} className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#EF4444] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                      {complaintCount > 99 ? "99+" : complaintCount}
                    </span>
                    )}
                    {!collapsed && item.label === "Chatbot" && pendingEscalationCount > 0 && (
                      <span aria-label={`${pendingEscalationCount} pending escalated questions`} className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#EF4444] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                        {pendingEscalationCount > 99 ? "99+" : pendingEscalationCount}
                      </span>
                    )}
                    {!collapsed && item.label === "Residents & Registry" && pendingVerificationCount > 0 && (
                      <span aria-label={`${pendingVerificationCount} accounts pending verification`} className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#EF4444] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                        {pendingVerificationCount > 99 ? "99+" : pendingVerificationCount}
                      </span>
                    )}
                    {!collapsed && <ChevronDown
                      size={15}
                      className={`transition-transform ${openMenu === item.label ? "rotate-180" : ""}`}
                      aria-hidden="true"
                    />}
                  </button>
                  <div
                    className={`ml-5 mt-1 space-y-1 border-l border-white/15 pl-3 ${
                      !collapsed && openMenu === item.label ? "block" : "hidden"
                    }`}
                  >
                    {item.children.map((child) => (
                      <button
                        key={child.path}
                        type="button"
                        onClick={() => onSelect(child.path)}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-semibold ${
                          getActiveChild(item, activePath)?.path === child.path
                            ? "bg-white/15 text-white"
                            : "text-blue-100/75"
                        }`}
                      >
                        <span>{child.label}</span>
                        {child.path === "/admin/chatbot/escalations" && pendingEscalationCount > 0 && (
                          <span aria-label={`${pendingEscalationCount} pending escalated questions`} className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#EF4444] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                            {pendingEscalationCount > 99 ? "99+" : pendingEscalationCount}
                          </span>
                        )}
                        {child.path === "/admin/residents/verification" && pendingVerificationCount > 0 && (
                          <span aria-label={`${pendingVerificationCount} accounts pending verification`} className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#EF4444] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                            {pendingVerificationCount > 99 ? "99+" : pendingVerificationCount}
                          </span>
                        )}
                        {child.path === "/admin/document-requests" && documentRequestCount > 0 && (
                          <span aria-label={`${documentRequestCount} document requests need attention`} className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#EF4444] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                            {documentRequestCount > 99 ? "99+" : documentRequestCount}
                          </span>
                        )}
                        {child.path === "/admin/complaints/resident-complaints" && complaintCount > 0 && (
                          <span aria-label={`${complaintCount} complaints need attention`} className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#EF4444] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                            {complaintCount > 99 ? "99+" : complaintCount}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => onSelect(item.path)}
                  title={collapsed ? item.label : undefined}
                  className={`group flex w-full items-center gap-3 rounded-xl py-3 text-left text-sm font-medium ${
                    collapsed ? "justify-center px-0" : "px-3"
                  } ${
                    activePath === item.path
                      ? "bg-white text-[#123F70] shadow-lg"
                      : "text-blue-100"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                      activePath === item.path
                        ? "bg-[#EAF1FF] text-[#2455D6]"
                        : "bg-white/10 text-blue-100"
                    }`}
                  >
                    {(() => {
                      const Icon = item.icon;
                      return <Icon size={15} aria-hidden="true" />;
                    })()}
                  </span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {!collapsed && activePath === item.path && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#EF4444]" />
                  )}
                </button>
              ),
            )}
          </nav>
        </div>

        <div className="mt-auto shrink-0 pt-6">
          <div
            className={`mb-4 rounded-xl bg-white/10 ${
              collapsed ? "flex justify-center p-2" : "p-3"
            }`}
            title={collapsed ? "Admin User — Barangay Administrator" : undefined}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-bold text-[#2455D6]">
                {userInitial()}
              </div>
              {!collapsed && <div className="min-w-0">
                <p className="truncate text-xs font-bold">Admin User</p>
                <p className="truncate text-[10px] text-blue-100/60">
                  Barangay Administrator
                </p>
              </div>}
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            title={collapsed ? "Logout" : undefined}
            className={`flex w-full items-center gap-3 rounded-xl py-3 text-left text-sm font-semibold text-red-100 ${
              collapsed ? "justify-center px-0" : "px-3"
            }`}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-400/10">
              <LogOut size={15} aria-hidden="true" />
            </span>
            {!collapsed && "Logout"}
          </button>
        </div>
      </aside>
    </>
  );

  function userInitial() {
    return "A";
  }
}

function AdminHeader({ token, activePanel, onMenu, onNavigate }) {
  const [currentDateTime, setCurrentDateTime] = useState(() => new Date());
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationCount = notifications.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
  const loadNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch("http://127.0.0.1:8000/api/admin/notifications", {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      });
      const payload = await response.json();
      if (response.ok) {
        const items = payload.items || [];
        setNotifications((current) => JSON.stringify(current) === JSON.stringify(items) ? current : items);
      }
    } catch {
      // Preserve the last successful counts while the server is temporarily unavailable.
    }
  }, [token]);

  useEffect(() => {
    const timer = window.setInterval(
      () => setCurrentDateTime(new Date()),
      60000,
    );
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(loadNotifications, 0);
    const refresh = () => {
      if (document.visibilityState === "visible") loadNotifications();
    };
    const timer = window.setInterval(refresh, 5000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [loadNotifications]);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-7 lg:px-9">
      <div className="flex items-center justify-between gap-5">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenu}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#2455D6] shadow-sm lg:hidden"
            aria-label="Open navigation"
          >
            <Menu size={18} aria-hidden="true" />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2455D6]">
              Admin workspace
            </p>
            <h1 className="mt-0.5 truncate text-xl font-bold tracking-tight text-[#172B4D] sm:text-2xl">
              {activePanel === "Dashboard" ? "Dashboard" : activePanel}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[#2455D6]"
            aria-label="Current date and time in Manila"
          >
            <CalendarDays
              size={14}
              className="shrink-0 sm:h-4 sm:w-4"
              aria-hidden="true"
            />
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
              <time
                dateTime={currentDateTime.toISOString()}
                className="mt-0.5 block text-[10px] font-semibold text-[#55708F]"
              >
                {currentDateTime.toLocaleTimeString("en-PH", {
                  timeZone: "Asia/Manila",
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                PHT
              </time>
            </div>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setNotificationsOpen((open) => !open)}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#2455D6] shadow-sm hover:border-[#2455D6]"
              aria-label={notificationCount ? `Notifications, ${notificationCount} items need attention` : "Notifications"}
              aria-expanded={notificationsOpen}
              aria-controls="admin-notifications-panel"
            >
              <Bell size={17} aria-hidden="true" />
              {notificationCount > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E52B32] px-1 text-[10px] font-bold text-white ring-2 ring-white">{notificationCount > 99 ? "99+" : notificationCount}</span>}
            </button>
            {notificationsOpen && (
              <section id="admin-notifications-panel" className="absolute right-0 z-50 mt-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-xl" aria-label="Admin notifications">
                <div className="border-b border-slate-100 px-4 py-3"><h2 className="text-sm font-bold text-[#172B4D]">Work requiring attention</h2><p className="mt-0.5 text-xs text-slate-500">Open items across admin queues</p></div>
                {notifications.length ? <ul className="max-h-[min(60vh,24rem)] overflow-y-auto py-1">{notifications.map((item) => (
                  <li key={item.type}><button type="button" onClick={() => { setNotificationsOpen(false); onNavigate(item.path); }} className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-[#F7F9FC]">
                    <span><span className="block text-xs font-bold text-[#172B4D]">{item.title}</span><span className="mt-1 block text-xs text-slate-500">{item.message}</span></span>
                    <span className="rounded-full bg-[#FFF0F0] px-2 py-0.5 text-[10px] font-bold text-[#E45757]">{item.count}</span>
                  </button></li>
                ))}</ul> : <p className="px-4 py-7 text-center text-xs text-slate-500">No outstanding admin tasks.</p>}
                <div className="border-t border-slate-100 px-4 py-2 text-[10px] text-slate-400">Updates automatically</div>
              </section>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}

export default AdminLayout;
