import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";

const navigation = [
  { label: "Dashboard", path: "/admin/dashboard", icon: "⌂" },
  { label: "Residents", path: "/admin/residents", icon: "♟" },
  {
    label: "Document Request",
    icon: "▤",
    children: [
      {
        label: "Request Monitoring",
        path: "/admin/document-requests",
        icon: "↗",
      },
      {
        label: "Document Types",
        path: "/admin/document-types",
        icon: "⚙",
      },
      {
        label: "Reports & Statistics",
        path: "/admin/reports",
        icon: "▥",
      },
    ],
  },
  { label: "Complaints", path: "/admin/complaints", icon: "!" },
  { label: "Chatbot", path: "/admin/chatbot", icon: "✦" },
  { label: "Feedback", path: "/admin/feedback", icon: "★" },
];

function AdminLayout({ children, title }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [documentRequestOpen, setDocumentRequestOpen] = useState(() =>
    location.pathname.startsWith("/admin/document-requests") ||
    location.pathname.startsWith("/admin/document-types") ||
    location.pathname === "/admin/reports",
  );
  const activeItem = navigation
    .flatMap((item) => item.children || [item])
    .find((item) => item.path === location.pathname);
  const documentRequestItem = navigation.find((item) => item.children);
  const documentRequestActive = documentRequestItem.children.some(
    (child) => child.path === location.pathname,
  );
  const activePanel = activeItem?.label || title;

  const handleSelect = (path) => {
    navigate(path);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F5F7FB] text-[#172B4D]">
      <AdminSidebar
        activePath={location.pathname}
        onSelect={handleSelect}
        documentRequestOpen={documentRequestOpen}
        documentRequestActive={documentRequestActive}
        onToggleDocumentRequest={() =>
          setDocumentRequestOpen((isOpen) => !isOpen)
        }
        onLogout={logout}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="min-w-0 bg-[#F5F7FB] lg:pl-72">
        <AdminHeader
          user={user}
          activePanel={activePanel}
          onMenu={() => setSidebarOpen(true)}
        />

        <div className="mx-auto w-full max-w-[1600px] px-5 pb-10 sm:px-7 lg:px-9">
          {children}
        </div>
      </main>
    </div>
  );
}

function AdminSidebar({
  activePath,
  onSelect,
  documentRequestOpen,
  documentRequestActive,
  onToggleDocumentRequest,
  onLogout,
  open,
  onClose,
}) {
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
              className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-lg text-blue-100 hover:bg-white/10 lg:hidden"
              aria-label="Close navigation"
            >
              ×
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
                <div key={item.label}>
                  <button
                    type="button"
                    onClick={onToggleDocumentRequest}
                    aria-expanded={documentRequestOpen}
                    className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-all duration-200 ${
                      documentRequestActive
                        ? "bg-white/10 text-white"
                        : "text-blue-100 hover:bg-white/10"
                    }`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-xs font-bold text-blue-100">
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                    <span className="ml-auto text-xs" aria-hidden="true">
                      {documentRequestOpen ? "⌄" : "›"}
                    </span>
                  </button>

                  {documentRequestOpen && (
                    <div className="mt-1 space-y-1">
                      {item.children.map((child) => (
                        <button
                          key={child.path}
                          type="button"
                          onClick={() => onSelect(child.path)}
                          aria-current={activePath === child.path ? "page" : undefined}
                          className={`group flex w-full items-center gap-3 rounded-xl py-2.5 pl-6 pr-3 text-left text-xs font-medium transition-all duration-200 ${
                            activePath === child.path
                              ? "bg-white text-[#123F70] shadow-lg"
                              : "text-blue-100 hover:bg-white/10"
                          }`}
                        >
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                              activePath === child.path
                                ? "bg-[#EAF1FF] text-[#2455D6]"
                                : "bg-white/10 text-blue-100"
                            }`}
                          >
                            {child.icon}
                          </span>
                          <span className="truncate">{child.label}</span>
                          {activePath === child.path && (
                            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#EF4444]" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => onSelect(item.path)}
                  aria-current={activePath === item.path ? "page" : undefined}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-all duration-200 ${
                    activePath === item.path
                      ? "bg-white text-[#123F70] shadow-lg"
                      : "text-blue-100 hover:bg-white/10"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                      activePath === item.path
                        ? "bg-[#EAF1FF] text-[#2455D6]"
                        : "bg-white/10 text-blue-100"
                    }`}
                  >
                    {item.icon}
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
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-red-100 transition hover:bg-red-500/10"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-400/10">
              ↪
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

function AdminHeader({ user, activePanel, onMenu }) {
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
            ☰
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
          <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 xl:flex">
            <span className="text-sm text-slate-400">⌕</span>
            <input
              type="text"
              placeholder="Search..."
              className="w-32 bg-transparent text-xs outline-none placeholder:text-slate-400"
            />
            <span className="rounded bg-white px-1.5 py-0.5 text-[9px] text-slate-400 shadow-sm">
              Ctrl K
            </span>
          </div>

          <button
            type="button"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#2455D6] shadow-sm transition hover:border-[#2455D6]"
            aria-label="Notifications"
          >
            🔔
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#EF4444]" />
          </button>

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

export default AdminLayout;
