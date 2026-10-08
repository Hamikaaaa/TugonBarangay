import {
  Bell,
  Bot,
  CalendarDays,
  ChartNoAxesColumn,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareWarning,
  Star,
  Users,
  UserCog,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";

const navigation = [
  { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Staff Accounts", path: "/admin/staff-accounts", icon: UserCog },
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
    path: "/admin/document-requests",
    icon: ClipboardList,
    children: [
      { label: "Request History", path: "/admin/document-requests" },
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

function AdminLayout({ children, title }) {
  const { user, token, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const activeItem = navigation.find(
    (item) =>
      item.path === location.pathname ||
      (item.label === "Chatbot" && location.pathname === "/admin/chatbot") ||
      item.children?.some(
        (child) =>
          child.path === location.pathname ||
          (child.path !== item.path &&
            location.pathname.startsWith(`${child.path}/`)),
      ),
  );
  const activeChild = activeItem?.children?.find(
    (child) =>
      child.path === location.pathname ||
      (child.path !== activeItem.path &&
        location.pathname.startsWith(`${child.path}/`)),
  );
  const activePanel = activeChild?.label || activeItem?.label || title;

  const handleSelect = (path) => {
    navigate(path);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F5F7FB] text-[#172B4D]">
      <AdminSidebar
        activePath={location.pathname}
        onSelect={handleSelect}
        onLogout={logout}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="min-w-0 bg-[#F5F7FB] lg:pl-72">
        <AdminHeader
          user={user}
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

function AdminSidebar({ activePath, onSelect, onLogout, open, onClose }) {
  const [openMenu, setOpenMenu] = useState("");
  const isActiveItem = (item) =>
    (item.label === "Chatbot" && activePath === "/admin/chatbot") ||
    item.children.some(
      (child) =>
        child.path === activePath ||
        (child.path !== item.path &&
          activePath.startsWith(`${child.path}/`)),
    );

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
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(19rem,88vw)] flex-col overflow-y-auto bg-[#123F70] px-5 py-6 text-white shadow-2xl transition-transform duration-300 lg:w-72 lg:translate-x-0 lg:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-white/10 px-2 pb-5">
          <div className="flex items-center gap-3">
            <img
              src="/images/logo-white-version.png"
              alt="TugonBarangay"
              className="h-12 w-12 object-contain"
            />

            <div>
              <h1 className="text-lg font-bold tracking-tight">
                Tugon<span className="text-[#FF6B6B]">Barangay</span>
              </h1>
              <p className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.15em] text-blue-100/70">
                Admin Portal
              </p>
            </div>

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

        <div className="mt-7">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200/60">
            Main Menu
          </p>

          <nav className="space-y-1">
            {navigation.map((item) =>
              item.children ? (
                <div
                  key={item.path}
                  className="group"
                >
                  <button
                    type="button"
                    aria-haspopup="true"
                    aria-expanded={openMenu === item.label}
                    onClick={() => {
                      if (openMenu !== item.label) onSelect(item.path);
                      setOpenMenu((current) =>
                        current === item.label ? "" : item.label,
                      );
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium ${
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
                      <item.icon size={15} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    <ChevronDown
                      size={15}
                      className={`transition-transform ${openMenu === item.label ? "rotate-180" : ""}`}
                      aria-hidden="true"
                    />
                  </button>
                  <div
                    className={`ml-5 mt-1 space-y-1 border-l border-white/15 pl-3 ${
                      openMenu === item.label ? "block" : "hidden"
                    }`}
                  >
                    {item.children.map((child) => (
                      <button
                        key={child.path}
                        type="button"
                        onClick={() => onSelect(child.path)}
                        className={`flex w-full items-center rounded-lg px-3 py-2.5 text-left text-xs font-semibold ${
                          activePath === child.path ||
                          (child.path !== item.path &&
                            activePath.startsWith(`${child.path}/`))
                            ? "bg-white/15 text-white"
                            : "text-blue-100/75"
                        }`}
                      >
                        {child.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => onSelect(item.path)}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium ${
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
                    <item.icon size={15} aria-hidden="true" />
                  </span>
                  <span className="truncate">{item.label}</span>
                  {activePath === item.path && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#EF4444]" />
                  )}
                </button>
              ),
            )}
          </nav>
        </div>

        <div className="mt-auto pt-6">
          <div className="mb-4 rounded-xl bg-white/10 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-bold text-[#2455D6]">
                {userInitial()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold">Admin User</p>
                <p className="truncate text-[10px] text-blue-100/60">
                  Barangay Administrator
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-red-100"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-400/10">
              <LogOut size={15} aria-hidden="true" />
            </span>
            Logout
          </button>
        </div>
      </aside>
    </>
  );

  function userInitial() {
    return "A";
  }
}

function AdminHeader({ user, token, activePanel, onMenu, onNavigate }) {
  const [currentDateTime, setCurrentDateTime] = useState(() => new Date());
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationsError, setNotificationsError] = useState("");
  const notificationsRef = useRef(null);

  const loadNotifications = useCallback(async () => {
    if (!token) return;
    setNotificationsError("");
    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/admin/notifications",
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Unable to load admin notifications.");
      }
      setNotifications(payload.items || []);
      setNotificationCount(Number(payload.total) || 0);
    } catch (error) {
      setNotificationsError(error.message);
    } finally {
      setNotificationsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timer = window.setInterval(
      () => setCurrentDateTime(new Date()),
      1000,
    );
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const initialRefresh = window.setTimeout(loadNotifications, 0);
    const refresh = window.setInterval(loadNotifications, 60000);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(refresh);
    };
  }, [loadNotifications]);

  useEffect(() => {
    if (!notificationsOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!notificationsRef.current?.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [notificationsOpen]);

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
                  second: "2-digit",
                })}{" "}
                PHT
              </time>
            </div>
          </div>

          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={() => {
                const opening = !notificationsOpen;
                setNotificationsOpen(opening);
                if (opening) {
                  setNotificationsLoading(true);
                  loadNotifications();
                }
              }}
              className={`relative flex h-10 w-10 items-center justify-center rounded-xl border bg-white text-[#2455D6] shadow-sm transition ${
                notificationsOpen
                  ? "border-[#2455D6] ring-2 ring-[#2455D6]/10"
                  : "border-slate-200 hover:border-[#2455D6]"
              }`}
              aria-label={
                notificationCount
                  ? `Notifications, ${notificationCount} items need attention`
                  : "Notifications"
              }
              aria-expanded={notificationsOpen}
              aria-controls="admin-notifications-panel"
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              {notificationCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E52B32] px-1 text-[10px] font-bold text-white ring-2 ring-white">
                  {notificationCount > 99 ? "99+" : notificationCount}
                </span>
              )}
            </button>
            {notificationsOpen && (
              <section
                id="admin-notifications-panel"
                className="absolute right-0 z-50 mt-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-xl"
                aria-label="Admin notifications"
              >
                <div className="border-b border-slate-100 px-4 py-3">
                  <h2 className="text-sm font-bold text-[#172B4D]">
                    Work requiring attention
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Open items across admin queues
                  </p>
                </div>
                {notificationsError ? (
                  <div className="p-4">
                    <p role="alert" className="text-xs leading-5 text-red-700">
                      {notificationsError}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setNotificationsLoading(true);
                        loadNotifications();
                      }}
                      className="mt-2 text-xs font-bold text-[#2455D6] hover:underline"
                    >
                      Try again
                    </button>
                  </div>
                ) : notificationsLoading && !notifications.length ? (
                  <p className="px-4 py-6 text-center text-xs text-slate-500" role="status">
                    Checking admin queues...
                  </p>
                ) : notifications.length ? (
                  <ul className="max-h-[min(60vh,24rem)] overflow-y-auto py-1">
                    {notifications.map((item) => (
                      <li key={item.type}>
                        <button
                          type="button"
                          onClick={() => {
                            setNotificationsOpen(false);
                            onNavigate(item.path);
                          }}
                          className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-[#F7F9FC] focus:bg-[#F7F9FC] focus:outline-none"
                        >
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#2455D6]">
                            <Bell className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-[#172B4D]">
                                {item.title}
                              </span>
                              <span className="rounded-full bg-[#FFF0F0] px-2 py-0.5 text-[10px] font-bold text-[#E45757]">
                                {item.count}
                              </span>
                            </span>
                            <span className="mt-1 block text-xs leading-5 text-slate-500">
                              {item.message}
                            </span>
                            {item.created_at && (
                              <time
                                dateTime={item.created_at}
                                className="mt-1 block text-[10px] text-slate-400"
                              >
                                Latest: {formatNotificationTime(item.created_at)}
                              </time>
                            )}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 py-7 text-center text-xs leading-5 text-slate-500">
                    No outstanding admin tasks. New items will appear here.
                  </p>
                )}
                <div className="border-t border-slate-100 px-4 py-2">
                  <p className="text-[10px] text-slate-400">
                    Updates automatically every minute
                  </p>
                </div>
              </section>
            )}
          </div>

          <div className="hidden text-right sm:block">
            <p className="max-w-[150px] truncate text-sm font-bold text-[#172B4D]">
              {user?.name || "Administrator"}
            </p>
            <p className="mt-0.5 text-[10px] capitalize text-slate-400">
              {user?.role || "admin"}
            </p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#2455D6] via-[#7138E8] to-[#E52B32] text-sm font-bold text-white shadow-md">
            {user?.name?.charAt(0)?.toUpperCase() || "A"}
          </div>
        </div>
      </div>
    </header>
  );
}

function formatNotificationTime(value) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

export default AdminLayout;
