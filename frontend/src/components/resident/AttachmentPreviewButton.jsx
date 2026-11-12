import { useEffect, useState } from "react";
import { Eye, X } from "lucide-react";

const API_URL = "http://127.0.0.1:8000/api";

function AttachmentPreviewButton({ file, fileName, token, endpoint }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
  }, [preview]);

  const openPreview = async () => {
    setError("");
    if (file) {
      setPreview({
        url: URL.createObjectURL(file),
        type: file.type,
        name: fileName,
      });
      return;
    }
    if (!endpoint || !token || loading) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        headers: {
          Accept: "application/octet-stream",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || "Unable to view this attachment.");
      }
      const blob = await response.blob();
      setPreview({
        url: URL.createObjectURL(blob),
        type: blob.type,
        name: fileName,
      });
    } catch (previewError) {
      setError(previewError.message || "Unable to view this attachment.");
    } finally {
      setLoading(false);
    }
  };

  const isImage = preview?.type?.startsWith("image/") || /\.(jpe?g|png)$/i.test(preview?.name || "");

  return (
    <>
      <button
        type="button"
        onClick={openPreview}
        disabled={loading}
        className="inline-flex items-center gap-1 font-semibold text-[#2455D6] hover:underline disabled:opacity-50"
      >
        <Eye className="h-4 w-4" aria-hidden="true" />
        {loading ? "Loading..." : "View attachment"}
      </button>
      {error && <p role="alert" className="mt-1 text-xs text-red-700">{error}</p>}
      {preview && (
        <div
          className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/70 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPreview(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={`Attachment preview: ${preview.name}`}
            className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <p className="min-w-0 truncate text-sm font-bold text-slate-800">{preview.name}</p>
              <button
                type="button"
                onClick={() => setPreview(null)}
                aria-label="Close attachment preview"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-3">
              {isImage ? (
                <img src={preview.url} alt={preview.name} className="mx-auto max-h-[75vh] max-w-full object-contain" />
              ) : (
                <iframe title={preview.name} src={preview.url} className="h-[75vh] w-full rounded-lg bg-white" />
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export default AttachmentPreviewButton;
