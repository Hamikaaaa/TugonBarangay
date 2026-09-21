import { useAuth } from "../context/AuthContext";

function ResidentDashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold">Resident Dashboard</h1>

      <p className="mt-4">Welcome, {user?.name}!</p>

      <p>Role: {user?.role}</p>

      {user?.verification_status !== "verified" && (
        <div className="mt-4 max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <strong>Verification {user?.verification_status}.</strong>{" "}
          {user?.verification_status === "rejected"
            ? user?.rejection_reason ||
              "Please contact the barangay office for assistance."
            : "You can log in, but document requests and other resident services remain unavailable until barangay personnel verify your account."}
        </div>
      )}

      <button
        onClick={logout}
        className="mt-6 rounded-lg bg-red-600 px-4 py-2 text-white"
      >
        Logout
      </button>
    </div>
  );
}

export default ResidentDashboard;
