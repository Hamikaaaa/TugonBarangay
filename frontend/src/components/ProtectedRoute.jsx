import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children, allowedRoles, allowedDesignations }) {
  const { user, token } = useAuth();

  useEffect(() => {
    const handlePageShow = (event) => {
      if (
        event.persisted &&
        !localStorage.getItem("token") &&
        !sessionStorage.getItem("token")
      ) {
        window.location.replace("/unauthorized");
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  // Not logged in
  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but doesn't have permission
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (allowedDesignations && !allowedDesignations.includes(user.designation)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

export default ProtectedRoute;
