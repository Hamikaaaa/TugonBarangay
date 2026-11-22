import { useLayoutEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ResidentLayout from "../components/resident/ResidentLayout";
import Overview from "./resident/Overview";
import Documents from "./resident/Documents";
import Complaints from "./resident/Complaints";
import BantayBot from "./resident/BantayBot";
import Notifications from "./resident/Notifications";
import Profile from "./resident/Profile";

function ResidentDashboard() {
  const [searchParams] = useSearchParams();
  const [view, setView] = useState(() => {
    const requestedView = searchParams.get("view");
    return ["documents", "complaints", "bantaybot"].includes(requestedView) ? requestedView : "dashboard";
  });

  useLayoutEffect(() => {
    // Switching from the long mobile dashboard can leave the new view scrolled
    // past its content, which looks like a blank page. Start each view at its top.
    window.scrollTo(0, 0);
  }, [view]);

  return (
    <ResidentLayout view={view} onNavigate={setView}>
      {({ user, token, dashboard, verified, firstName, refreshDashboard }) => (
        <>
          {view === "dashboard" && (
            <Overview
              firstName={firstName}
              verified={verified}
              dashboard={dashboard}
              onNavigate={setView}
              user={user}
              token={token}
            />
          )}
          {view === "documents" && (
            <Documents
              requests={dashboard.requests}
              token={token}
              onRefresh={refreshDashboard}
              user={user}
              verified={verified}
              activeComplaintCount={dashboard.open_complaints || 0}
            />
          )}
          {view === "complaints" && (
            <Complaints
              token={token}
              complaints={dashboard.complaints}
              onRefresh={refreshDashboard}
              verified={verified}
              userId={user.id}
            />
          )}
          {view === "bantaybot" && (
            <BantayBot token={token} userId={user.id} />
          )}
          {view === "notifications" && (
            <Notifications
              token={token}
              unreadCount={dashboard.unread_notifications || 0}
              onRefresh={refreshDashboard}
            />
          )}
          {view === "profile" && (
            <Profile user={user} verified={verified} token={token} />
          )}
        </>
      )}
    </ResidentLayout>
  );
}

export default ResidentDashboard;
