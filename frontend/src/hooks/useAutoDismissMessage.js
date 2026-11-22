import { useEffect } from "react";

export default function useAutoDismissMessage(message, clearMessage, enabled = true, delay = 5000) {
  useEffect(() => {
    if (!enabled || !message) return undefined;
    const timeoutId = window.setTimeout(() => clearMessage(""), delay);
    return () => window.clearTimeout(timeoutId);
  }, [clearMessage, delay, enabled, message]);
}
