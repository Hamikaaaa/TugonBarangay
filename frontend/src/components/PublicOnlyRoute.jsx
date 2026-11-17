import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const roleHome = {
  admin: "/admin/dashboard",
  staff: "/staff/dashboard",
  resident: "/resident/dashboard",
};

function PublicOnlyRoute({ children }) {
  const { user, token } = useAuth();

  useEffect(() => {
    const handlePageShow = (event) => {
      if (
        event.persisted &&
        (localStorage.getItem("token") || sessionStorage.getItem("token"))
      ) {
        window.location.replace("/unauthorized");
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  if (!user || !token) return children;

  return <Navigate to={roleHome[user.role] || "/unauthorized"} replace />;
}

export default PublicOnlyRoute;
