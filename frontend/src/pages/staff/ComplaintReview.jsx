import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ComplaintQueue from "./ComplaintQueue";
import StaffLayout from "./StaffLayout";

function ComplaintReview() {
  const { complaintId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const status = location.state?.status;

  if (user?.designation !== "Complaint Management Officer") {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <StaffLayout
      title="Complaint Details"
      navigationItems={[
        { label: "Dashboard", path: "/staff/dashboard" },
        { label: "Pending", path: "/staff/complaints?status=pending" },
        { label: "In Progress", path: "/staff/complaints?status=in_progress" },
        { label: "Resolved", path: "/staff/complaints?status=resolved" },
        { label: "Rejected", path: "/staff/complaints?status=rejected" },
        { label: "Closed", path: "/staff/complaints?status=closed" },
      ]}
      activePath={status ? `/staff/complaints?status=${status}` : ""}
      onNavigate={navigate}
    >
      <ComplaintQueue key={complaintId} complaintId={complaintId} />
    </StaffLayout>
  );
}

export default ComplaintReview;