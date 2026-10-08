import { useCallback, useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, CirclePlus, LoaderCircle, Pencil, Power, Search, Trash2, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import { useAuth } from "../../context/AuthContext";
import AddComplaintCategory from "./AddComplaintCategory";
import ComplaintQueue from "../staff/ComplaintQueue";

const API_URL = "http://127.0.0.1:8000/api";

function Complaints() {
  const location = useLocation();
  const { token } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [addingCategory, setAddingCategory] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState({ name: "", description: "" });
  const [categoryEditError, setCategoryEditError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryPage, setCategoryPage] = useState(1);
  const activeSection = location.pathname.includes("/categories")
    ? "categories"
    : location.pathname.endsWith("/resident-complaints")
      ? "resident-complaints"
      : "dashboard";

  const loadCategories = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/complaint-categories`, {
        headers: authHeaders(token),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Unable to load complaint categories.");
      if (!Array.isArray(payload.data)) {
        throw new Error("The server returned an invalid complaint category list.");
      }
      setCategories(payload.data);
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

  const beginEditingCategory = (category) => {
    setEditingCategory(category);
    setCategoryDraft({
      name: category.name,
      description: category.description || "",
    });
    setCategoryEditError("");
    setError("");
    setNotice("");
  };

  const saveCategory = async (event) => {
    event.preventDefault();
    if (!token || !editingCategory || updatingId !== null) return;
    setUpdatingId(editingCategory.id);
    setCategoryEditError("");
    setNotice("");

    try {
      const response = await fetch(`${API_URL}/admin/complaint-categories/${editingCategory.id}`, {
        method: "PATCH",
        headers: { ...authHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify({
          name: categoryDraft.name.trim(),
          description: categoryDraft.description.trim() || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        const validationError = payload.errors
          ? Object.values(payload.errors).flat()[0]
          : null;
        throw new Error(validationError || payload.message || "Unable to update the complaint category.");
      }
      setNotice(payload.message || "Complaint category updated.");
      setEditingCategory(null);
      await loadCategories();
    } catch (updateError) {
      setCategoryEditError(updateError.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteCategory = async (category) => {
    if (!token || deletingId !== null) return;
    if (!window.confirm(`Delete "${category.name}"? This cannot be undone.`)) return;

    setDeletingId(category.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API_URL}/admin/complaint-categories/${category.id}`, {
        method: "DELETE",
        headers: authHeaders(token),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Unable to delete the complaint category.");
      setNotice(payload.message || "Complaint category deleted.");
      await loadCategories();
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeletingId(null);
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

  const sectionContent = {
    dashboard: {
      title: "Complaint dashboard",
      description: "Review complaint trends, monitor case status, and oversee resident reports.",
    },
    "resident-complaints": {
      title: "Resident complaints",
      description: "Search, review, and track complaints submitted by residents.",
    },
    categories: {
      title: "Complaint categories",
      description: "Manage the complaint categories available to residents when filing a report.",
    },
  }[activeSection];

  return (
    <AdminLayout title="Complaints">
      <section className="space-y-6 pt-6">
        <AdminPageHeader
          eyebrow="Complaint oversight"
          title={sectionContent.title}
          description={sectionContent.description}
        >
          {activeSection === "categories" && (
            <button
              type="button"
              onClick={() => setAddingCategory(true)}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#2455D6] shadow-lg transition hover:-translate-y-0.5 hover:bg-[#EEF4FF] hover:shadow-xl"
            >
              <CirclePlus size={16} />
              Add category
            </button>
          )}
        </AdminPageHeader>

        <nav
          aria-label="Complaint sections"
          className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"
        >
          <ComplaintTab to="/admin/complaints" active={activeSection === "dashboard"}>
            Dashboard
          </ComplaintTab>
          <ComplaintTab to="/admin/complaints/resident-complaints" active={activeSection === "resident-complaints"}>
            Resident complaints
          </ComplaintTab>
          <ComplaintTab to="/admin/complaints/categories" active={activeSection === "categories"}>
            Category management
          </ComplaintTab>
        </nav>

        <main className="min-w-0">
          {activeSection === "dashboard" && (
            <ComplaintQueue isAdmin isDashboard analyticsOnly hideAdminHeader />
          )}

          {activeSection === "resident-complaints" && <ComplaintQueue isAdmin listOnly />}

          {activeSection === "categories" && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-[#172B4D]">Configured categories</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {categories.length} {categories.length === 1 ? "category" : "categories"} configured
                  </p>
                </div>
              </div>

              {error && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
              {notice && <p role="status" className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-4 sm:p-5">
                  <label className="relative block max-w-md">
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
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-[#2455D6] focus:ring-2 focus:ring-[#2455D6]/10"
                    />
                  </label>
                </div>
                <table className="w-full min-w-[620px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                      <th className="px-5 py-3.5">Category</th>
                      <th className="px-5 py-3.5">Description</th>
                      <th className="px-5 py-3.5">Availability</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
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
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => beginEditingCategory(category)}
                                disabled={updatingId !== null || deletingId !== null}
                                className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-[#2455D6] hover:bg-[#EEF4FF] hover:text-[#2455D6] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Pencil size={14} aria-hidden="true" />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleCategory(category)}
                                disabled={updatingId !== null || deletingId !== null}
                                className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-[#2455D6] hover:bg-[#EEF4FF] hover:text-[#2455D6] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {updatingId === category.id ? (
                                  <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />
                                ) : (
                                  <Power size={14} aria-hidden="true" />
                                )}
                                {updatingId === category.id ? "Saving..." : category.enabled ? "Disable" : "Enable"}
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteCategory(category)}
                                disabled={updatingId !== null || deletingId !== null}
                                className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {deletingId === category.id ? (
                                  <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />
                                ) : (
                                  <Trash2 size={14} aria-hidden="true" />
                                )}
                                {deletingId === category.id ? "Deleting..." : "Delete"}
                              </button>
                            </div>
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

              {editingCategory && (
                <div
                  className="fixed inset-0 z-[110] flex items-center justify-center bg-[#071B3D]/55 p-4 backdrop-blur-sm"
                  onMouseDown={(event) => {
                    if (event.target === event.currentTarget && updatingId === null) {
                      setEditingCategory(null);
                    }
                  }}
                >
                  <form
                    onSubmit={saveCategory}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="edit-category-title"
                    className="w-full max-w-lg space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 id="edit-category-title" className="text-lg font-bold text-[#172B4D]">
                          Edit complaint category
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                          Changes apply to new submissions. Existing complaints keep their recorded category.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingCategory(null)}
                        disabled={updatingId !== null}
                        aria-label="Close edit category"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                    </div>
                    <label className="block text-sm font-semibold text-slate-700">
                      Category name
                      <input
                        required
                        maxLength={255}
                        value={categoryDraft.name}
                        onChange={(event) => setCategoryDraft((current) => ({ ...current, name: event.target.value }))}
                        className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-[#2455D6]/10"
                      />
                    </label>
                    <label className="block text-sm font-semibold text-slate-700">
                      Description
                      <textarea
                        maxLength={1000}
                        rows={4}
                        value={categoryDraft.description}
                        onChange={(event) => setCategoryDraft((current) => ({ ...current, description: event.target.value }))}
                        className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-[#2455D6]/10"
                      />
                    </label>
                    {categoryEditError && (
                      <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {categoryEditError}
                      </p>
                    )}
                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        onClick={() => setEditingCategory(null)}
                        disabled={updatingId !== null}
                        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={updatingId !== null}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#2455D6] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#1948B8] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {updatingId !== null ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}
                        {updatingId !== null ? "Saving..." : "Save changes"}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </>
          )}
        </main>
      </section>
      {addingCategory && (
        <AddComplaintCategory
          onClose={() => setAddingCategory(false)}
          onCreated={async () => {
            setAddingCategory(false);
            setNotice("Complaint category created.");
            await loadCategories();
          }}
        />
      )}
    </AdminLayout>
  );
}

function ComplaintTab({ to, active, children }) {
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
        active
          ? "border-[#D9E6FF] bg-[#EEF4FF] text-[#2455D6]"
          : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"
      }`}
    >
      {children}
    </Link>
  );
}

function authHeaders(token) {
  return { Accept: "application/json", Authorization: `Bearer ${token}` };
}

export default Complaints;
