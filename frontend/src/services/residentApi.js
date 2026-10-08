const API_URL = "http://127.0.0.1:8000/api";

import { primaryButtonClass } from "../utils/buttonStyles";
export { primaryButtonClass };

export const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-[#2455D6] hover:bg-slate-50 hover:text-[#2455D6] disabled:cursor-not-allowed disabled:opacity-50";

export const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2455D6] focus:bg-white focus:ring-4 focus:ring-[#2455D6]/10";

export async function residentApi(path, token, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: options.signal || controller.signal,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(
        "The server took too long to respond. Please try again.",
        {
          cause: error,
        },
      );
    }
    throw new Error("Unable to connect to the resident service.", {
      cause: error,
    });
  } finally {
    clearTimeout(timeout);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const validationMessage = data.errors
      ? Object.values(data.errors).flat()[0]
      : null;
    throw new Error(
      validationMessage ||
        data.message ||
        "Something went wrong. Please try again.",
    );
  }

  return data;
}

export async function downloadResidentFile(path, token, fallbackName) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: {
        Accept: "application/octet-stream",
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    throw new Error("Unable to download the attached file.", { cause: error });
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Unable to download the attached file.");
  }

  const disposition = response.headers.get("Content-Disposition") || "";
  const filename =
    disposition.match(/filename="?([^";]+)"?/i)?.[1] || fallbackName;
  const objectUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
