import { useAuth } from "../context/AuthContext";

function ResidentDashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold">Resident Dashboard</h1>

      <p className="mt-4">Welcome, {user?.name}!</p>

      <p>Role: {user?.role}</p>

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
