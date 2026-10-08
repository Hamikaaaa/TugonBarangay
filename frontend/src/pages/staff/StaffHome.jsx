import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ComplaintManagement from "./ComplaintManagement";
import StaffDashboardProfessional from "./StaffDashboardProfessional";

function StaffHome() {
  const { user } = useAuth();

  if (user?.designation === "Complaint Management Officer") {
    return <ComplaintManagement />;
  }

  if (user?.designation !== "Document Request Officer") {
    return <Navigate to="/unauthorized" replace />;
  }

  return <StaffDashboardProfessional />;
}

export default StaffHome;
