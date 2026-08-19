function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-red-600">Access Denied</h1>

        <p className="mt-3 text-gray-600">
          You do not have permission to access this page.
        </p>

        <a
          href="/"
          className="inline-block mt-6 bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          Back to Login
        </a>
      </div>
    </div>
  );
}

export default Unauthorized;
