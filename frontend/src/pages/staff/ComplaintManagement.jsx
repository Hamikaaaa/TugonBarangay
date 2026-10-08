import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ComplaintQueue from "./ComplaintQueue";
import StaffLayout from "./StaffLayout";

function ComplaintManagement() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isDashboard = location.pathname === "/staff/dashboard";
  const statusFilter = new URLSearchParams(location.search).get("status") || "all";

  if (user?.designation !== "Complaint Management Officer") {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <StaffLayout
      title={isDashboard
        ? "Complaint Dashboard"
        : statusFilter === "pending" ? "Pending Complaints"
          : statusFilter === "in_progress" ? "In Progress Complaints"
            : statusFilter === "resolved" ? "Resolved Complaints"
              : statusFilter === "rejected" ? "Rejected Complaints"
                : statusFilter === "closed" ? "Closed Complaints"
                  : "Complaints"}
      navigationItems={[
        { label: "Dashboard", path: "/staff/dashboard" },
        { label: "Pending", path: "/staff/complaints?status=pending" },
        { label: "In Progress", path: "/staff/complaints?status=in_progress" },
        { label: "Resolved", path: "/staff/complaints?status=resolved" },
        { label: "Rejected", path: "/staff/complaints?status=rejected" },
        { label: "Closed", path: "/staff/complaints?status=closed" },
      ]}
      activePath={`${location.pathname}${location.search}`}
      onNavigate={navigate}
    >
      <ComplaintQueue
        key={`${location.pathname}${location.search}`}
        initialStatus={statusFilter}
        isDashboard={isDashboard}
      />
    </StaffLayout>
  );
}

export default ComplaintManagement;
