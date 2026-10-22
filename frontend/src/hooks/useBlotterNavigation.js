import { useMemo } from "react";
import { ShieldAlert } from "lucide-react";

export const BLOTTER_PATH = "/staff/blotter";

/**
 * Sidebar entry that routes staff straight to the barangay blotter records.
 */
export default function useBlotterNavigation() {
  return useMemo(
    () => ({
      label: "Blotter",
      path: BLOTTER_PATH,
      icon: ShieldAlert,
      collapsible: false,
    }),
    [],
  );
}
