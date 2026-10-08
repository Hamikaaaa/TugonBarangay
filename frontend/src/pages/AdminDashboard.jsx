import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  ChartNoAxesColumn,
  CircleCheck,
  ClipboardList,
  FileText,
  Home,
  LogOut,
  Menu,
  MessageSquareWarning,
  Search,
  Star,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { primaryButtonClass } from "../utils/buttonStyles";
import AdminLayout from "../components/admin/AdminLayout";

const API_URL = "http://127.0.0.1:8000/api";

const navigation = [
  "Dashboard",
  "Residents",
  "Document Request",
  "Complaints",
  "Chatbot",
  "Feedback",
  "Reports and Analytics",
];

function AdminDashboard() {
  const { token } = useAuth();

  const [pendingResidents, setPendingResidents] = useState([]);
  const [notice, setNotice] = useState("");

  const loadPendingResidents = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/admin/pending-residents`, {
        headers: authHeaders(token),
      });

      if (response.ok) {
        setPendingResidents(await response.json());
      }
    } catch (error) {
      console.error("Failed to load pending residents:", error);
    }
  };

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    fetch(`${API_URL}/admin/pending-residents`, {
      headers: authHeaders(token),
    })
      .then(async (response) => {
        if (response.ok && !cancelled) {
          setPendingResidents(await response.json());
        }
      })
      .catch((error) => {
        console.error("Failed to load pending residents:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const reviewResident = async (resident, action) => {
    let reason = "";

    if (action === "reject") {
      reason =
        window.prompt(
          "Reason for rejecting this registration:",
          "Details do not match the barangay registry.",
        ) || "";

      if (!reason) return;
    }

    try {
      const response = await fetch(
        `${API_URL}/admin/residents/${resident.id}/${action}`,
        {
          method: "PATCH",
          headers: {
            ...authHeaders(token),
            "Content-Type": "application/json",
          },
          body: action === "reject" ? JSON.stringify({ reason }) : undefined,
        },
      );

      if (response.ok) {
        setNotice(
          action === "verify"
            ? "Resident verified successfully."
            : "Resident rejected with a recorded reason.",
        );

        loadPendingResidents();

        setTimeout(() => {
          setNotice("");
        }, 4000);
      }
    } catch (error) {
      console.error("Review error:", error);
    }
  };

  return (
    <AdminLayout title="Dashboard">
      {notice && <Notice message={notice} />}

      <RightPanel
        activePanel="Dashboard"
        pendingResidents={pendingResidents}
        onReview={reviewResident}
      />
    </AdminLayout>
  );
}

/* =========================================================
   AUTH HEADERS
========================================================= */

function authHeaders(token) {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

/* =========================================================
   SIDEBAR
========================================================= */

export function AdminSidebar({
  activePanel,
  onSelect,
  onLogout,
  open,
  onClose,
}) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <button
          type="button"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-[#071B3D]/60 lg:hidden"
          aria-label="Close navigation"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(19rem,88vw)] flex-col overflow-y-auto bg-[#123F70] px-5 py-6 text-white shadow-2xl transition-transform duration-300
  lg:w-72 lg:translate-x-0 lg:shadow-none ${
    open ? "translate-x-0" : "-translate-x-full"
  }`}
      >
        {/* LOGO */}
        <div className="border-b border-white/10 px-2 pb-5">
          <div className="flex items-center gap-3">
            <img
              src="/images/logo-white-version.png"
              alt="TugonBarangay"
              className="h-12 w-12 object-contain"
            />

            <div>
              <h1 className="text-lg font-bold tracking-tight">
                Tugon
                <span className="text-[#FF6B6B]">Barangay</span>
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

        {/* MENU */}
        <div className="mt-7">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200/60">
            Main Menu
          </p>

          <nav className="space-y-1">
            {navigation.map((item, index) => (
              <button
                key={item}
                type="button"
                onClick={() => onSelect(item)}
                className={`
                  group flex w-full items-center gap-3
                  rounded-xl px-3 py-3
                  text-left text-sm font-medium
                  transition-all duration-200
                  ${
                    activePanel === item
                      ? "bg-white text-[#123F70] shadow-lg"
                      : "text-blue-100 hover:bg-white/10"
                  }
                `}
              >
                {/* Icon */}
                <span
                  className={`
                    flex h-8 w-8 shrink-0
                    items-center justify-center
                    rounded-lg text-xs font-bold
                    ${
                      activePanel === item
                        ? "bg-[#EAF1FF] text-[#2455D6]"
                        : "bg-white/10 text-blue-100"
                    }
                  `}
                >
                  {getNavigationIcon(index)}
                </span>

                <span className="truncate">{item}</span>

                {activePanel === item && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#EF4444]" />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* SIDEBAR BOTTOM */}
        <div className="mt-auto pt-6">
          {/* Admin profile */}
          <div className="mb-4 rounded-xl bg-white/10 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-bold text-[#2455D6]">
                A
              </div>

              <div className="min-w-0">
                <p className="truncate text-xs font-bold">Admin User</p>

                <p className="truncate text-[10px] text-blue-100/60">
                  Barangay Administrator
                </p>
              </div>
            </div>
          </div>

          {/* Logout */}
          <button
            type="button"
            onClick={onLogout}
            className="
              flex w-full items-center gap-3
              rounded-xl px-3 py-3
              text-left text-sm font-semibold
              text-red-100
              transition
              hover:bg-red-500/10
            "
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-400/10">
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </span>
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}

/* =========================================================
   NAVIGATION ICONS
========================================================= */

function getNavigationIcon(index) {
  const icons = [
    Home,
    UsersRound,
    ClipboardList,
    MessageSquareWarning,
    Activity,
    Star,
    ChartNoAxesColumn,
  ];
  const Icon = icons[index];
  return Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null;
}

/* =========================================================
   HEADER
========================================================= */

export function AdminHeader({ user, activePanel, onMenu }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-7 lg:px-9">
      <div className="flex items-center justify-between gap-5">
        {/* LEFT */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenu}
            className="
              flex h-10 w-10 shrink-0
              items-center justify-center
              rounded-xl border border-slate-200
              bg-white text-[#2455D6]
              shadow-sm
              lg:hidden
            "
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
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

        {/* RIGHT */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 xl:flex">
            <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />

            <input
              type="text"
              placeholder="Search..."
              className="w-32 bg-transparent text-xs outline-none placeholder:text-slate-400"
            />

            <span className="rounded bg-white px-1.5 py-0.5 text-[9px] text-slate-400 shadow-sm">
              Ctrl K
            </span>
          </div>

          {/* Notification */}
          <button
            type="button"
            className="
              relative flex h-10 w-10
              items-center justify-center
              rounded-xl border border-slate-200
              bg-white text-[#2455D6]
              shadow-sm
              transition hover:border-[#2455D6]
            "
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#EF4444]" />
          </button>

          {/* User */}
          <div className="hidden text-right sm:block">
            <p className="max-w-[150px] truncate text-sm font-bold text-[#172B4D]">
              {user?.name || "Administrator"}
            </p>

            <p className="mt-0.5 text-[10px] capitalize text-slate-400">
              {user?.role || "admin"}
            </p>
          </div>

          {/* Avatar */}
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#2455D6] via-[#7138E8] to-[#E52B32] text-sm font-bold text-white shadow-md">
            {user?.name?.charAt(0)?.toUpperCase() || "A"}
          </div>
        </div>
      </div>
    </header>
  );
}

/* =========================================================
   RIGHT PANEL
========================================================= */

function RightPanel({ activePanel, pendingResidents, onReview }) {
  return (
    <div className="w-full">
      {activePanel === "Dashboard" || activePanel === "Residents" ? (
        <ResidentOverview
          pendingResidents={pendingResidents}
          onReview={onReview}
        />
      ) : (
        <WorkspacePlaceholder title={activePanel} />
      )}
    </div>
  );
}

/* =========================================================
   DASHBOARD
========================================================= */

function ResidentOverview({ pendingResidents, onReview }) {
  return (
    <section className="pt-6">
      {/* Welcome Banner */}
      <WelcomeBanner pendingCount={pendingResidents.length} />

      {/* Statistics */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={UsersRound}
          label="Pending Verification"
          value={pendingResidents.length}
          detail="Residents awaiting review"
          accent="blue"
        />

        <StatCard
          icon={ClipboardList}
          label="Resident Services"
          value="Active"
          detail="Online services available"
          accent="purple"
        />

        <StatCard
          icon={CircleCheck}
          label="System Status"
          value="Online"
          detail="All systems operational"
          accent="green"
        />

        <StatCard
          icon={AlertTriangle}
          label="Review Priority"
          value={pendingResidents.length > 0 ? "High" : "Clear"}
          detail="Registration queue"
          accent="red"
        />
      </div>

      {/* Main content */}
      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_330px]">
        <RegistrationQueue residents={pendingResidents} onReview={onReview} />

        <ActivityPanel pendingCount={pendingResidents.length} />
      </div>

      {/* Quick Actions */}
      <QuickActions />
    </section>
  );
}

/* =========================================================
   WELCOME BANNER
========================================================= */

function WelcomeBanner({ pendingCount }) {
  return (
    <section
      className="
        relative overflow-hidden
        rounded-2xl
        bg-gradient-to-r
        from-[#123F70]
        via-[#2455D6]
        to-[#7138E8]
        px-6 py-7
        text-white
        shadow-[0_18px_40px_rgba(36,85,214,0.22)]
        sm:px-8 sm:py-8
      "
    >
      {/* Background decoration */}
      <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full border-[35px] border-white/10" />

      <div className="absolute -bottom-32 right-28 h-60 w-60 rounded-full border-[25px] border-[#EF4444]/20" />

      <div className="absolute right-12 top-12 h-3 w-3 rounded-full bg-white/30" />

      <div className="relative z-10 max-w-2xl">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-50">
            Barangay Administration
          </span>

          <span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-semibold text-white/80">
            Admin Workspace
          </span>
        </div>

        <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
          Welcome back, Administrator
        </h2>

        <p className="mt-2 max-w-xl text-sm leading-6 text-blue-50/80">
          Manage resident registrations, monitor barangay services, and keep
          your community workflows moving.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <div className="rounded-xl bg-white/10 px-4 py-2.5 backdrop-blur-sm">
            <p className="text-[10px] uppercase tracking-wider text-blue-100/70">
              Pending review
            </p>

            <p className="mt-0.5 text-sm font-bold">
              {pendingCount} resident
              {pendingCount !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="rounded-xl bg-white/10 px-4 py-2.5 backdrop-blur-sm">
            <p className="text-[10px] uppercase tracking-wider text-blue-100/70">
              System
            </p>

            <p className="mt-0.5 text-sm font-bold">Operational</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({ icon: Icon, label, value, detail, accent }) {
  const styles = {
    blue: {
      icon: "bg-[#EAF1FF] text-[#2455D6]",
      text: "text-[#2455D6]",
    },
    purple: {
      icon: "bg-purple-50 text-[#7138E8]",
      text: "text-[#7138E8]",
    },
    green: {
      icon: "bg-emerald-50 text-emerald-600",
      text: "text-emerald-600",
    },
    red: {
      icon: "bg-red-50 text-[#EF4444]",
      text: "text-[#EF4444]",
    },
  };

  return (
    <div
      className="
        rounded-2xl
        border border-slate-200
        bg-white
        p-5
        shadow-[0_8px_25px_rgba(18,49,82,0.05)]
        transition
        hover:-translate-y-0.5
        hover:shadow-[0_14px_30px_rgba(18,49,82,0.08)]
      "
    >
      <div className="flex items-start justify-between">
        <div
          className={`
            flex h-10 w-10
            items-center justify-center
            rounded-xl
            text-sm
            ${styles[accent].icon}
          `}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>

        <span
          className={`
            rounded-full
            bg-slate-50
            px-2 py-1
            text-[9px]
            font-bold
            ${styles[accent].text}
          `}
        >
          Live
        </span>
      </div>

      <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold tracking-tight text-[#172B4D]">
        {value}
      </p>

      <p className="mt-1 text-[11px] text-slate-400">{detail}</p>
    </div>
  );
}

/* =========================================================
   REGISTRATION QUEUE
========================================================= */

function RegistrationQueue({ residents, onReview }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_25px_rgba(18,49,82,0.05)]">
      {/* Header */}
      <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EAF1FF] text-[#2455D6]">
                <UsersRound className="h-4 w-4" aria-hidden="true" />
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2455D6]">
                  Verification Queue
                </p>

                <h2 className="mt-0.5 text-lg font-bold text-[#172B4D]">
                  Resident Registrations
                </h2>
              </div>
            </div>

            <p className="mt-2 text-xs text-slate-400">
              Review matched barangay registry records before granting resident
              services.
            </p>
          </div>

          <span className="w-fit rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-[#EF4444]">
            {residents.length} pending
          </span>
        </div>
      </div>

      {/* Table header */}
      {residents.length > 0 && (
        <div className="hidden grid-cols-[1.3fr_1.2fr_1fr_120px] gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-3 text-[9px] font-bold uppercase tracking-wider text-slate-400 md:grid">
          <span>Resident</span>
          <span>Contact</span>
          <span>Location</span>
          <span>Actions</span>
        </div>
      )}

      {/* Residents */}
      <div className="divide-y divide-slate-100">
        {residents.length === 0 ? (
          <div className="px-5 py-12 text-center sm:px-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-xl text-emerald-600">
              <CircleCheck className="h-6 w-6" aria-hidden="true" />
            </div>

            <p className="mt-4 text-sm font-bold text-[#172B4D]">
              Verification queue is clear
            </p>

            <p className="mt-1 text-xs text-slate-400">
              No resident registrations are waiting for review.
            </p>
          </div>
        ) : (
          residents.map((resident) => (
            <ResidentRow
              key={resident.id}
              resident={resident}
              onReview={onReview}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* =========================================================
   RESIDENT ROW
========================================================= */

function ResidentRow({ resident, onReview }) {
  return (
    <div
      className="
        grid gap-4
        px-5 py-4
        transition
        hover:bg-[#F8FAFF]
        md:grid-cols-[1.3fr_1.2fr_1fr_120px]
        md:items-center
        sm:px-6
      "
    >
      {/* Resident */}
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-[#172B4D]">
          {resident.name}
        </p>

        <span className="mt-1 inline-flex rounded-full bg-[#EAF1FF] px-2 py-0.5 text-[9px] font-bold text-[#2455D6]">
          Pending verification
        </span>
      </div>

      {/* Contact */}
      <div className="min-w-0">
        <p className="truncate text-xs text-slate-600">
          {resident.email || "No email"}
        </p>

        <p className="mt-1 truncate text-[10px] text-slate-400">
          {resident.mobile_number || "No mobile number"}
        </p>
      </div>

      {/* Location */}
      <div>
        <p className="text-xs font-medium text-slate-600">
          {resident.purok || "No purok"}
        </p>

        <p className="mt-1 text-[10px] text-slate-400">Barangay resident</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onReview(resident, "reject")}
          className="
            flex-1 rounded-lg
            border border-red-200
            bg-white px-3 py-2
            text-[10px] font-bold
            text-[#EF4444]
            transition
            hover:bg-red-50
          "
        >
          Reject
        </button>

        <button
          type="button"
          onClick={() => onReview(resident, "verify")}
          className={`${primaryButtonClass} flex-1`}
        >
          Verify
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   ACTIVITY PANEL
========================================================= */

function ActivityPanel({ pendingCount }) {
  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_25px_rgba(18,49,82,0.05)] sm:p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2455D6]">
            Live Activity
          </p>

          <h2 className="mt-1 text-lg font-bold text-[#172B4D]">
            Workspace Updates
          </h2>
        </div>

        <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Live
        </span>
      </div>

      <div className="mt-6 space-y-5">
        <ActivityItem
          icon={UsersRound}
          color="blue"
          title="Registration queue synced"
          detail={`${pendingCount} resident(s) waiting for review`}
        />

        <ActivityItem
          icon={CircleCheck}
          color="green"
          title="Resident services online"
          detail="Verified residents can access available services"
        />

        <ActivityItem
          icon={AlertTriangle}
          color="red"
          title="Verification policy active"
          detail="Pending residents remain restricted"
        />

        <ActivityItem
          icon={ClipboardList}
          color="purple"
          title="Document service ready"
          detail="Requests can be monitored from the workspace"
        />
      </div>

      <button
        type="button"
        className="
          mt-6 w-full
          rounded-xl
          border border-[#2455D6]/20
          bg-[#EAF1FF]
          px-4 py-3
          text-xs font-bold
          text-[#2455D6]
          transition
          hover:bg-[#DCE8FF]
        "
      >
        <span>View Activity Center</span>
        <ArrowRight className="ml-2 inline h-4 w-4" aria-hidden="true" />
      </button>
    </aside>
  );
}

/* =========================================================
   ACTIVITY ITEM
========================================================= */

function ActivityItem({ icon: Icon, color, title, detail }) {
  const styles = {
    blue: "bg-[#EAF1FF] text-[#2455D6]",
    green: "bg-emerald-50 text-emerald-600",
    red: "bg-red-50 text-[#EF4444]",
    purple: "bg-purple-50 text-[#7138E8]",
  };

  return (
    <div className="flex gap-3">
      <div
        className={`
          flex h-8 w-8 shrink-0
          items-center justify-center
          rounded-lg
          text-xs
          ${styles[color]}
        `}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-bold text-[#172B4D]">{title}</p>

        <p className="mt-1 text-[10px] leading-5 text-slate-400">{detail}</p>
      </div>
    </div>
  );
}

/* =========================================================
   QUICK ACTIONS
========================================================= */

function QuickActions() {
  const actions = [
    {
      title: "Review Residents",
      detail: "Open verification queue",
      icon: UsersRound,
      gradient: "from-[#123F70] to-[#2455D6]",
    },
    {
      title: "Document Requests",
      detail: "Monitor service activity",
      icon: ClipboardList,
      gradient: "from-[#2455D6] to-[#7138E8]",
    },
    {
      title: "View Reports",
      detail: "Check barangay analytics",
      icon: ChartNoAxesColumn,
      gradient: "from-[#7138E8] to-[#EF4444]",
    },
  ];

  return (
    <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_25px_rgba(18,49,82,0.05)] sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2455D6]">
            Quick Actions
          </p>

          <h2 className="mt-1 text-lg font-bold text-[#172B4D]">
            Common Admin Tasks
          </h2>
        </div>

        <span className="hidden text-[10px] text-slate-400 sm:block">
          Frequently used tools
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {actions.map((action) => (
          <button
            key={action.title}
            type="button"
            className={`
              group relative overflow-hidden
              rounded-xl
              bg-gradient-to-r ${action.gradient}
              p-5
              text-left text-white
              transition
              hover:-translate-y-0.5
              hover:shadow-lg
            `}
          >
            <div className="absolute -right-5 -top-8 h-24 w-24 rounded-full bg-white/10" />

            <div className="relative">
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
                  <action.icon className="h-4 w-4" aria-hidden="true" />
                </span>

                <span className="transition group-hover:translate-x-1">
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </span>
              </div>

              <p className="mt-5 text-sm font-bold">{action.title}</p>

              <p className="mt-1 text-[10px] text-white/70">{action.detail}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

/* =========================================================
   PLACEHOLDER
========================================================= */

function WorkspacePlaceholder({ title }) {
  return (
    <section className="pt-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_8px_25px_rgba(18,49,82,0.05)] sm:p-10">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF1FF] text-[#2455D6]">
          <FileText className="h-5 w-5" aria-hidden="true" />
        </div>

        <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#2455D6]">
          Admin Workspace
        </p>

        <h2 className="mt-2 text-2xl font-bold text-[#172B4D]">{title}</h2>

        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
          This workspace is ready for barangay records, service workflows, and
          administrative data.
        </p>
      </div>
    </section>
  );
}

/* =========================================================
   NOTICE
========================================================= */

function Notice({ message }) {
  return (
    <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 shadow-sm">
      <div className="flex items-center gap-2">
        <CircleCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
        {message}
      </div>
    </div>
  );
}

export default AdminDashboard;
