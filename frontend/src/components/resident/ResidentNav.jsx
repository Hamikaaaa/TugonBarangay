import { Bell, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { residentApi } from "../../services/residentApi";

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
  notifications = [],
  token,
  onNotificationsChanged,
}) {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [busyNotificationId, setBusyNotificationId] = useState(null);
  const [notificationError, setNotificationError] = useState("");
  const notificationsRef = useRef(null);
  const profileMenuRef = useRef(null);
  const navigate = (nextView) => {
    onNavigate(nextView);
    setProfileMenuOpen(false);
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    if (!notificationsOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!notificationsRef.current?.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setNotificationsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [notificationsOpen]);

  useEffect(() => {
    if (!profileMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setProfileMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileMenuOpen]);

  const markAllRead = async () => {
    setMarkingAll(true);
    setNotificationError("");
    try {
      await residentApi("/resident/notifications/read-all", token, {
        method: "PATCH",
      });
      await onNotificationsChanged();
    } catch (error) {
      setNotificationError(error.message);
    } finally {
      setMarkingAll(false);
    }
  };

  const openNotification = async (item) => {
    setNotificationError("");
    if (!item.read_at) {
      setBusyNotificationId(item.id);
      try {
        await residentApi(`/resident/notifications/${item.id}`, token, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ read: true }),
        });
        await onNotificationsChanged();
      } catch (error) {
        setNotificationError(error.message);
        setBusyNotificationId(null);
        return;
      }
      setBusyNotificationId(null);
    }
    setNotificationsOpen(false);
    navigate("notifications");
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
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={() => {
                setNotificationError("");
                setNotificationsOpen((open) => !open);
              }}
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-[#123F70] ring-1 ring-slate-200 transition hover:bg-white hover:ring-[#2455D6]"
              aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
              aria-expanded={notificationsOpen}
              aria-controls="resident-notifications-panel"
            >
              <Bell className="h-5 w-5" aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-[#E52B32] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <section
                id="resident-notifications-panel"
                className="absolute right-0 z-50 mt-3 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-xl"
                aria-label="Notifications"
              >
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <h2 className="text-lg font-bold text-[#172B4D]">
                    Notifications
                  </h2>
                  <button
                    type="button"
                    onClick={markAllRead}
                    disabled={unreadCount === 0 || markingAll}
                    className="text-xs font-semibold text-[#2455D6] hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
                  >
                    {markingAll ? "Updating..." : "Mark all as read"}
                  </button>
                </div>

                {notificationError && (
                  <p role="alert" className="bg-red-50 px-4 py-2 text-xs text-red-700">
                    {notificationError}
                  </p>
                )}

                {notifications.length ? (
                  <ul className="max-h-[min(60vh,24rem)] overflow-y-auto py-1">
                    {notifications.map((item) => {
                      const isUnread = !item.read_at;
                      const isBusy = busyNotificationId === item.id;
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => openNotification(item)}
                            disabled={isBusy || markingAll}
                            className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-[#F2F6FC] disabled:opacity-60 ${
                              isUnread ? "bg-blue-50/60" : ""
                            }`}
                          >
                            <span
                              className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                                isUnread ? "bg-[#2455D6]" : "bg-slate-200"
                              }`}
                              aria-label={isUnread ? "Unread" : "Read"}
                            />
                            <span className="min-w-0 flex-1">
                              <span className={`block truncate text-sm text-slate-800 ${isUnread ? "font-bold" : "font-semibold"}`}>
                                {item.title}
                              </span>
                              <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-slate-500">
                                {item.message}
                              </span>
                              <span className="mt-1 block text-[11px] text-slate-400">
                                {new Date(item.created_at).toLocaleString()}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="px-4 py-8 text-center text-sm text-slate-500">
                    You’re all caught up.
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setNotificationsOpen(false);
                    navigate("notifications");
                  }}
                  className="flex w-full items-center justify-center gap-1 border-t border-slate-100 px-4 py-3 text-sm font-bold text-[#2455D6] transition hover:bg-slate-50"
                >
                  See all notifications
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </section>
            )}
          </div>

          <div className="relative hidden sm:block" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setProfileMenuOpen((open) => !open)}
              className="flex items-center gap-2 rounded-full bg-white/70 py-1 pl-1 pr-4 ring-1 ring-slate-200 transition hover:bg-white hover:ring-[#2455D6]"
              aria-label="User menu"
              aria-expanded={profileMenuOpen}
            >
              <Avatar name={firstName} />
              <span className="max-w-28 truncate text-sm font-semibold text-[#172B4D]">
                {firstName}
              </span>
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    navigate("profile");
                  }}
                  className="flex w-full items-center justify-start px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  My profile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    onLogout();
                  }}
                  className="flex w-full items-center justify-start px-4 py-3 text-left text-sm font-semibold text-[#E52B32] transition hover:bg-red-50"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-[#123F70] ring-1 ring-slate-200 lg:hidden"
            aria-label="Open navigation"
          >
            {mobileMenuOpen ? (
              <span className="text-2xl leading-none">×</span>
            ) : (
              <span className="text-xl">☰</span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
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
                onClick={() => {
                  if (id === "profile") {
                    setMobileMenuOpen(false);
                    navigate("profile");
                    return;
                  }
                  navigate(id);
                }}
                mobile
              />
            ))}
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
