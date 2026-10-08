import { ArrowLeft } from "lucide-react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ComplaintQueue from "./ComplaintQueue";
import StaffLayout from "./StaffLayout";

function ComplaintReview() {
  const { complaintId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

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
      ]}
      activePath=""
      onNavigate={navigate}
    >
      <div className="mx-auto w-full max-w-[1600px] px-4 pt-5 sm:px-7 lg:px-9">
        <button
          type="button"
          onClick={() => navigate("/staff/complaints")}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#2455D6] hover:text-[#1948B8]"
        >
          <ArrowLeft size={16} />
          Back to complaints
        </button>
      </div>
      <ComplaintQueue key={complaintId} complaintId={complaintId} />
    </StaffLayout>
  );
}

export default ComplaintReview;