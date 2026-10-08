import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, CirclePlus, ClipboardList, LayoutDashboard, Menu, Power, Search, Tags, X } from "lucide-react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import { useAuth } from "../../context/AuthContext";
import ComplaintQueue from "../staff/ComplaintQueue";

const API_URL = "http://127.0.0.1:8000/api";

function Complaints() {
  const { token } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sectionSidebarOpen, setSectionSidebarOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryPage, setCategoryPage] = useState(1);

  const loadCategories = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/admin/complaint-categories`, {
        headers: authHeaders(token),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Unable to load complaint categories.");
      setCategories(payload.data || []);
      setError("");
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCategories();
  }, [loadCategories]);

  const toggleCategory = async (category) => {
    if (!token || updatingId !== null) return;
    setUpdatingId(category.id);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`${API_URL}/admin/complaint-categories/${category.id}`, {
        method: "PATCH",
        headers: { ...authHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !category.enabled }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Unable to update the complaint category.");
      setNotice(payload.message || "Complaint category updated.");
      await loadCategories();
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredCategories = categories.filter((category) => {
    const query = categorySearch.trim().toLowerCase();
    return !query || `${category.name} ${category.description || ""}`.toLowerCase().includes(query);
  });
  const categoriesPerPage = 7;
  const pageCount = Math.max(1, Math.ceil(filteredCategories.length / categoriesPerPage));
  const currentPage = Math.min(categoryPage, pageCount);
  const pageCategories = filteredCategories.slice(
    (currentPage - 1) * categoriesPerPage,
    currentPage * categoriesPerPage,
  );

  return (
    <AdminLayout title="Complaints">
      <div className="mx-auto w-full max-w-[1600px] py-6">
        <div className="mb-5 flex items-center gap-3 border-b border-slate-200 pb-4">
          <button
            type="button"
            onClick={() => setSectionSidebarOpen((open) => !open)}
            aria-label={sectionSidebarOpen ? "Close complaint navigation" : "Open complaint navigation"}
            aria-expanded={sectionSidebarOpen}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#2455D6] hover:bg-slate-50"
          >
            {sectionSidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2455D6]">Complaints</p>
            <h1 className="mt-1 text-xl font-bold text-[#132A4A]">
              {activeSection === "dashboard" ? "Dashboard" : activeSection === "resident-complaints" ? "Resident Complaints" : "Category Management"}
            </h1>
          </div>
        </div>

        <div className={`grid gap-6 ${sectionSidebarOpen ? "md:grid-cols-[220px_minmax(0,1fr)]" : "grid-cols-1"}`}>
          {sectionSidebarOpen && (
            <aside className="h-fit border-r border-slate-200 pr-4">
              <nav aria-label="Complaint administration" className="space-y-1">
                {[
                  { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
                  { id: "resident-complaints", label: "Resident Complaints", Icon: ClipboardList },
                  { id: "categories", label: "Category Management", Icon: Tags },
                ].map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveSection(id)}
                    aria-current={activeSection === id ? "page" : undefined}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold transition ${activeSection === id ? "bg-[#EAF1FF] text-[#2455D6]" : "text-slate-600 hover:bg-slate-50 hover:text-[#172B4D]"}`}
                  >
                    <Icon size={16} />
                    <span>{label}</span>
                  </button>
                ))}
              </nav>
            </aside>
          )}

          <main className="min-w-0">
            {activeSection === "dashboard" && <ComplaintQueue isAdmin isDashboard analyticsOnly />}

            {activeSection === "resident-complaints" && <ComplaintQueue isAdmin />}

            {activeSection === "categories" && (
              <>
                <section className="mb-7">
                  <p className="text-sm text-slate-500">{categories.length} categories configured</p>
                </section>

                {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
                {notice && <p role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{notice}</p>}

                <div className="mb-7 grid gap-3 border-y border-slate-200 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <label className="relative block">
                    <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      value={categorySearch}
                      onChange={(event) => {
                        setCategorySearch(event.target.value);
                        setCategoryPage(1);
                      }}
                      aria-label="Search complaint categories"
                      placeholder="Search categories"
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#2455D6]"
                    />
                  </label>
                  <Link to="/admin/complaints/categories/new" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#2455D6] px-4 text-sm font-bold text-white hover:bg-[#1948B8]">
                    <CirclePlus size={16} />
                    Add category
                  </Link>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full min-w-[620px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                        <th className="px-5 py-3.5">Category</th>
                        <th className="px-5 py-3.5">Description</th>
                        <th className="px-5 py-3.5">Availability</th>
                        <th className="px-5 py-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loading ? (
                        <tr><td colSpan="4" className="p-10 text-center text-sm text-slate-500">Loading categories...</td></tr>
                      ) : categories.length === 0 ? (
                        <tr><td colSpan="4" className="p-10 text-center text-sm text-slate-500">No categories configured.</td></tr>
                      ) : filteredCategories.length === 0 ? (
                        <tr><td colSpan="4" className="p-10 text-center text-sm text-slate-500">No matching categories.</td></tr>
                      ) : pageCategories.map((category) => (
                        <tr key={category.id}>
                          <td className="px-5 py-4 text-sm font-semibold text-[#172B4D]">{category.name}</td>
                          <td className="px-5 py-4 text-sm text-slate-600">{category.description || "-"}</td>
                          <td className="px-5 py-4">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${category.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                              {category.enabled ? "Enabled" : "Disabled"}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button type="button" onClick={() => toggleCategory(category)} disabled={updatingId !== null} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-[#2455D6] hover:text-[#2455D6] disabled:opacity-50">
                              <Power size={14} />
                              {updatingId === category.id ? "Saving..." : category.enabled ? "Disable" : "Enable"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!loading && pageCount > 1 && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-slate-500">
                      Showing {(currentPage - 1) * categoriesPerPage + 1}-{Math.min(currentPage * categoriesPerPage, filteredCategories.length)} of {filteredCategories.length} categories
                    </p>
                    <nav aria-label="Category pages" className="flex items-center gap-1">
                      <button type="button" onClick={() => setCategoryPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1} aria-label="Previous category page" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40">
                        <ChevronLeft size={16} />
                      </button>
                      {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => (
                        <button key={page} type="button" onClick={() => setCategoryPage(page)} aria-current={currentPage === page ? "page" : undefined} className={`h-9 min-w-9 rounded-lg border px-2 text-xs font-semibold ${currentPage === page ? "border-[#2455D6] bg-[#2455D6] text-white" : "border-slate-200 text-slate-600 hover:border-[#2455D6]"}`}>
                          {page}
                        </button>
                      ))}
                      <button type="button" onClick={() => setCategoryPage((page) => Math.min(pageCount, page + 1))} disabled={currentPage === pageCount} aria-label="Next category page" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40">
                        <ChevronRight size={16} />
                      </button>
                    </nav>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </AdminLayout>
  );
}

function authHeaders(token) {
  return { Accept: "application/json", Authorization: `Bearer ${token}` };
}

export default Complaints;
