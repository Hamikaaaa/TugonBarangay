import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ResidentDashboard from "./pages/ResidentDashboard";
import Unauthorized from "./pages/Unauthorized";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import StaffDashboard from "./pages/StaffDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Residents from "./pages/admin/Residents";
import DocumentRequests from "./pages/admin/DocumentRequests";
import Complaints from "./pages/admin/Complaints";
import Chatbot from "./pages/admin/Chatbot";
import Feedback from "./pages/admin/Feedback";
import Reports from "./pages/admin/Reports";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Resident Route */}
          <Route
            path="/resident/dashboard"
            element={
              <ProtectedRoute allowedRoles={["resident"]}>
                <ResidentDashboard />
              </ProtectedRoute>
            }
          />

          {/* Unauthorized */}
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Default */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          <Route
            path="/staff/dashboard"
            element={
              <ProtectedRoute allowedRoles={["staff"]}>
                <StaffDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/residents"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <Residents />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/document-requests"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <DocumentRequests />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/complaints"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <Complaints />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/chatbot"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <Chatbot />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/feedback"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <Feedback />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <Reports />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
