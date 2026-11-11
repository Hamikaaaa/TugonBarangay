export function formatDocumentRequestId(id) {
  return `DOC-${String(id ?? "").padStart(5, "0")}`;
}
