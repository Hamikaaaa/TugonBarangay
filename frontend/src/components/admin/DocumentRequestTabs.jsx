import { ClipboardList, FileCog } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

function DocumentRequestTabs() {
  const location = useLocation();
  const navigate = useNavigate();
  const isDocumentTypes = location.pathname === "/admin/document-types";

  return (
    <nav
      aria-label="Document request sections"
      className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"
    >
      <button
        type="button"
        onClick={() => navigate("/admin/document-requests")}
        aria-current={!isDocumentTypes ? "page" : undefined}
        className={tabClass(!isDocumentTypes)}
      >
        <ClipboardList className="h-4 w-4" aria-hidden="true" />
        Request History
      </button>
      <button
        type="button"
        onClick={() => navigate("/admin/document-types")}
        aria-current={isDocumentTypes ? "page" : undefined}
        className={tabClass(isDocumentTypes)}
      >
        <FileCog className="h-4 w-4" aria-hidden="true" />
        Document Types
      </button>
    </nav>
  );
}

function tabClass(active) {
  return `inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
    active
      ? "border-[#D9E6FF] bg-[#EEF4FF] text-[#2455D6]"
      : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"
  }`;
}

export default DocumentRequestTabs;
