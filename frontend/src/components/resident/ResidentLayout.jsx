import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import ResidentNav from "./ResidentNav";
import { residentApi, secondaryButtonClass } from "../../services/residentApi";

function ResidentLayout({ children, view, onNavigate }) {
  const { user, token, logout } = useAuth();
  const [dashboard, setDashboard] = useState({
    stats: {},
    requests: [],
    complaints: [],
    notifications: [],
    unread_notifications: 0,
  });
  const [loading, setLoading] = useState(Boolean(token));
  const [loadError, setLoadError] = useState(
    token ? "" : "Your session is missing. Please sign in again.",
  );
  const firstName = user?.first_name || user?.name?.split(" ")[0] || "Resident";
  const verified = user?.verification_status === "verified";

  const refreshDashboard = async () =>
    setDashboard(await residentApi("/resident/dashboard", token));

  useEffect(() => {
    if (!token) return;

    residentApi("/resident/dashboard", token)
      .then(setDashboard)
      .catch((error) => setLoadError(error.message))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    /* Shared page background used by every resident view */
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#E3ECFA] via-[#EEF3FB] to-[#F6F1FD] text-[#172B4D]">
      <ResidentNav
        view={view}
        onNavigate={onNavigate}
        firstName={firstName}
        onLogout={logout}
        unreadCount={dashboard.unread_notifications || 0}
      />

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-5 pb-12 pt-8 sm:px-8 lg:px-12">
        {loading ? (
          <LoadingState />
        ) : loadError ? (
          <ErrorState
            message={loadError}
            onRetry={() => window.location.reload()}
          />
        ) : (
          children({
            user,
            token,
            dashboard,
            verified,
            firstName,
            refreshDashboard,
          })
        )}
      </main>

      <footer className="border-t border-white/80 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] justify-center px-5 py-5 text-center text-xs text-slate-500 sm:px-8 lg:px-12">
          <span>© 2026 TugonBarangay · Barangay Poblacion Oriental</span>
        </div>
      </footer>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="rounded-3xl border border-white/80 bg-white/80 p-8 shadow-[0_10px_30px_rgba(18,63,112,0.07)] backdrop-blur-sm">
      <div className="flex items-center gap-3 text-sm font-semibold text-[#41658A]">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#2455D6]/20 border-t-[#2455D6]" />
        Loading your resident workspace...
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-[0_10px_30px_rgba(18,63,112,0.07)]">
      <p className="text-sm font-bold text-red-800">
        We could not load your workspace.
      </p>
      <p className="mt-2 text-sm text-red-700">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className={`${secondaryButtonClass} mt-5 border-red-200 text-red-700 hover:border-red-400 hover:bg-white hover:text-red-800`}
      >
        Try again
      </button>
    </div>
  );
}

export default ResidentLayout;
