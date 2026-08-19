import { useAuth } from "../context/AuthContext";

function StaffDashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold">Staff Dashboard</h1>

        <p className="mt-2 text-gray-600">Welcome, {user?.name}!</p>

        <p className="mt-2">
          Role: <strong>{user?.role}</strong>
        </p>

        <button
          onClick={logout}
          className="mt-6 bg-red-600 text-white px-4 py-2 rounded-lg"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

export default StaffDashboard;
