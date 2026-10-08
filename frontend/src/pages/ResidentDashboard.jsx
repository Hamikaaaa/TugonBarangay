import { useState } from "react";
import ResidentLayout from "../components/resident/ResidentLayout";
import Overview from "./resident/Overview";
import Documents from "./resident/Documents";
import Complaints from "./resident/Complaints";
import BantayBot from "./resident/BantayBot";
import Notifications from "./resident/Notifications";
import Profile from "./resident/Profile";

function ResidentDashboard() {
  const [view, setView] = useState("dashboard");

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
            />
          )}
          {view === "documents" && (
            <Documents
              requests={dashboard.requests}
              token={token}
              onRefresh={refreshDashboard}
              user={user}
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
