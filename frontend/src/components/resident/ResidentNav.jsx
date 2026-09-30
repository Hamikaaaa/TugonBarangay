import { Bell } from "lucide-react";
import { useState } from "react";

const navItems = [
  ["dashboard", "Overview"],
  ["documents", "Documents"],
  ["complaints", "Complaints"],
  ["bantaybot", "BantayBot"],
];

function ResidentNav({
  view,
  onNavigate,
  firstName,
  onLogout,
  unreadCount = 0,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = (nextView) => {
    onNavigate(nextView);
    setMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/80 bg-white/75 shadow-[0_8px_24px_rgba(18,63,112,0.06)] backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between gap-5 px-5 sm:px-8 lg:px-12">
        {/* Brand */}
        <button
          type="button"
          onClick={() => navigate("dashboard")}
          className="flex items-center gap-1"
        >
          <img
            src="/images/logo-blue-version.png"
            alt="TugonBarangay"
            className="h-11 w-11 object-contain"
          />
          <span className="hidden text-[17px] font-bold tracking-tight text-[#123F70] sm:block">
            Tugon<span className="text-[#E52B32]">Barangay</span>
          </span>
        </button>

        {/* Pill navigation */}
        <nav
          className="hidden items-center gap-1 rounded-full bg-white/70 p-1 ring-1 ring-slate-200 lg:flex"
          aria-label="Resident navigation"
        >
          {navItems.map(([id, label]) => (
            <NavButton
              key={id}
              label={label}
              active={view === id}
              onClick={() => navigate(id)}
            />
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("notifications")}
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-[#123F70] ring-1 ring-slate-200 transition hover:bg-white hover:ring-[#2455D6]"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-[#E52B32] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate("profile")}
            className="hidden items-center gap-2 rounded-full bg-white/70 py-1 pl-1 pr-4 ring-1 ring-slate-200 transition hover:bg-white hover:ring-[#2455D6] sm:flex"
          >
            <Avatar name={firstName} />
            <span className="max-w-28 truncate text-sm font-semibold text-[#172B4D]">
              {firstName}
            </span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-red-50 hover:text-[#E52B32] sm:block"
          >
            Sign out
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-[#123F70] ring-1 ring-slate-200 lg:hidden"
            aria-label="Open navigation"
          >
            {menuOpen ? (
              <span className="text-2xl leading-none">×</span>
            ) : (
              <span className="text-xl">☰</span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav
          className="border-t border-white/80 bg-white/90 px-5 py-3 backdrop-blur-xl lg:hidden"
          aria-label="Resident navigation"
        >
          <div className="mx-auto grid max-w-[1440px] gap-1 sm:grid-cols-2">
            {[
              ...navItems,
              ["notifications", "Notifications"],
              ["profile", "My Profile"],
            ].map(([id, label]) => (
              <NavButton
                key={id}
                label={label}
                active={view === id}
                onClick={() => navigate(id)}
                mobile
              />
            ))}
            <button
              type="button"
              onClick={onLogout}
              className="w-full rounded-full px-4 py-2.5 text-left text-sm font-semibold text-[#E52B32] transition hover:bg-red-50"
            >
              Sign out
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}

function NavButton({ label, active, onClick, mobile = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        mobile ? "w-full text-left" : ""
      } ${
        active
          ? "bg-[#123F70] text-white shadow-sm"
          : "text-slate-500 hover:bg-[#2455D6]/10 hover:text-[#123F70]"
      }`}
    >
      {label}
    </button>
  );
}

function Avatar({ name, large = false }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-linear-to-br from-[#123F70] to-[#2455D6] font-bold text-white ${
        large ? "h-16 w-16 text-xl" : "h-9 w-9 text-xs"
      }`}
    >
      {name?.charAt(0)?.toUpperCase() || "R"}
    </div>
  );
}

export { Avatar };
export default ResidentNav;
