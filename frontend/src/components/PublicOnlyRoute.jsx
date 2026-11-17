import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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

  return <Navigate to="/unauthorized" replace />;
}

export default PublicOnlyRoute;
