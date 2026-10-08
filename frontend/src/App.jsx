import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ResidentDashboard from "./pages/ResidentDashboard";
import Unauthorized from "./pages/Unauthorized";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicOnlyRoute from "./components/PublicOnlyRoute";
import { AuthProvider } from "./context/AuthContext";
import StaffHome from "./pages/staff/StaffHome";
import { StaffDocumentTypePage } from "./pages/staff/StaffDashboardProfessional";
import ComplaintManagement from "./pages/staff/ComplaintManagement";
import ComplaintReview from "./pages/staff/ComplaintReview";
import AdminDashboard from "./pages/AdminDashboard";
import Residents from "./pages/admin/Residents";
import DocumentTypes from "./pages/admin/DocumentTypes";
import DocumentRequestHistory from "./pages/admin/DocumentRequestHistory";
import Complaints from "./pages/admin/Complaints";
import Chatbot from "./pages/admin/Chatbot";
import Feedback from "./pages/admin/Feedback";
import Reports from "./pages/admin/Reports";
import StaffAccounts from "./pages/admin/StaffAccounts";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <Register />
              </PublicOnlyRoute>
            }
          />

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
                <StaffHome />
              </ProtectedRoute>
            }
          />

          <Route
            path="/staff/document-types/:documentType"
            element={
              <ProtectedRoute allowedRoles={["staff"]} allowedDesignations={["Document Request Officer"]}>
                <StaffDocumentTypePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/staff/complaints/:complaintId"
            element={
              <ProtectedRoute allowedRoles={["staff"]} allowedDesignations={["Complaint Management Officer"]}>
                <ComplaintReview />
              </ProtectedRoute>
            }
          />

          <Route
            path="/staff/complaints"
            element={
              <ProtectedRoute allowedRoles={["staff"]} allowedDesignations={["Complaint Management Officer"]}>
                <ComplaintManagement />
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
            path="/admin/staff-accounts"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <StaffAccounts />
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
            path="/admin/residents/dashboard"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <Residents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/residents/verification"
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
                <DocumentRequestHistory />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/document-types"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <DocumentTypes />
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
            path="/admin/complaints/categories/new"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <Complaints />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/complaints/resident-complaints"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <Complaints />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/complaints/categories"
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
            path="/admin/chatbot/dashboard"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <Chatbot />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/chatbot/questions"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <Chatbot />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/chatbot/escalations"
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
