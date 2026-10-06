import { useState } from "react";
import { LayoutDashboard, Menu, MessageSquareWarning, FileText, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

function StaffLayout({ title, navigationItems, activePath, onNavigate, children }) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
              <p className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.15em] text-blue-100/70">Staff Portal</p>
            </div>
            <button type="button" onClick={() => setSidebarOpen(false)} className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-blue-100 hover:bg-white/10 lg:hidden" aria-label="Close navigation">
              <X size={18} />
            </button>
          </div>
        </div>

        <nav className="mt-7" aria-label="Staff workspace">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200/60">Workspace</p>
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const active = activePath === item.path;
              const Icon = item.value ? FileText : item.label === "Complaints" ? MessageSquareWarning : LayoutDashboard;
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => {
                    onNavigate(item.path);
                    setSidebarOpen(false);
                  }}
                  aria-current={active ? "page" : undefined}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${active ? "bg-white text-[#123F70] shadow-lg" : "text-blue-100 hover:bg-white/10"}`}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${active ? "bg-[#EAF1FF] text-[#2455D6]" : "bg-white/10 text-blue-100"}`}>
                    <Icon size={15} />
                  </span>
                  <span className="truncate">{item.label}</span>
                  {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#EF4444]" />}
                </button>
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
                <p className="truncate text-[10px] text-blue-100/60">{user?.designation || "Staff"}</p>
              </div>
            </div>
          </div>
          <button type="button" onClick={logout} className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-red-100 transition hover:bg-red-500/10">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-400/10"><X size={15} /></span>
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
            <div className="hidden text-right sm:block">
              <p className="max-w-[220px] truncate text-sm font-bold text-[#172B4D]">{user?.name || "Staff"}</p>
              <p className="mt-0.5 text-[10px] text-slate-400">{user?.designation || "Staff"}</p>
            </div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

export default StaffLayout;
