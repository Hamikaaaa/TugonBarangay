import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ComplaintQueue from "./ComplaintQueue";
import StaffLayout from "./StaffLayout";

function ComplaintManagement() {
  const { user } = useAuth();

  if (user?.designation !== "Complaint Management Officer") {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <StaffLayout
      title="Complaint Management"
      navigationItems={[{ label: "Complaints", path: "/staff/complaints" }]}
      activePath="/staff/complaints"
      onNavigate={() => {}}
    >
      <ComplaintQueue />
    </StaffLayout>
  );
}

export default ComplaintManagement;
