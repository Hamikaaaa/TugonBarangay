import AdminLayout from "../../components/admin/AdminLayout";
import AdminWorkspacePlaceholder from "../../components/admin/AdminWorkspacePlaceholder";

function Residents() {
  return (
    <AdminLayout title="Residents">
      <AdminWorkspacePlaceholder
        title="Residents"
        description="Manage resident records and verification workflows from this workspace."
      />
    </AdminLayout>
  );
}

export default Residents;
