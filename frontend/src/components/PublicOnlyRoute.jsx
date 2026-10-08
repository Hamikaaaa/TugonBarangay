import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const roleHome = {
  admin: "/admin/dashboard",
  staff: "/staff/dashboard",
  resident: "/resident/dashboard",
};

function PublicOnlyRoute({ children }) {
  const { user } = useAuth();

  if (!user) return children;

  return <Navigate to={roleHome[user.role] || "/unauthorized"} replace />;
}

export default PublicOnlyRoute;
