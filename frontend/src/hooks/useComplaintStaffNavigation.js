import { useMemo } from "react";
import { FileText, ShieldAlert } from "lucide-react";

export default function useComplaintStaffNavigation() {
  return useMemo(() => [
    { label: "Dashboard", path: "/staff/dashboard", group: "Overview" },
    { label: "Blotter", path: "/staff/blotter", icon: ShieldAlert, group: "Blotter" },
    { label: "Summons", path: "/staff/blotter/summon", icon: FileText, group: "Summons" },
    { label: "Summon Entries", path: "/staff/blotter/summons", icon: FileText, group: "Summons" },
    { label: "Pending", path: "/staff/complaints?status=pending", group: "Complaints" },
    { label: "In Progress", path: "/staff/complaints?status=in_progress", group: "Complaints" },
    { label: "Resolved", path: "/staff/complaints?status=resolved", group: "Complaints" },
    { label: "Rejected", path: "/staff/complaints?status=rejected", group: "Complaints" },
    { label: "Closed", path: "/staff/complaints?status=closed", group: "Complaints" },
  ], []);
}
