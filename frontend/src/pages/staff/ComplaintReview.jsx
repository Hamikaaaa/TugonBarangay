import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ComplaintQueue from "./ComplaintQueue";
import StaffLayout from "./StaffLayout";
import useComplaintStaffNavigation from "../../hooks/useComplaintStaffNavigation";

function ComplaintReview() {
  const { complaintId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const status = location.state?.status;
  const navigationItems = useComplaintStaffNavigation();

  if (user?.designation !== "Complaint Management Officer") {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <StaffLayout
      title="Complaint Details"
      navigationItems={navigationItems}
      activePath={status ? `/staff/complaints?status=${status}` : ""}
      onNavigate={navigate}
    >
      <ComplaintQueue key={complaintId} complaintId={complaintId} />
    </StaffLayout>
  );
}

export default ComplaintReview;
