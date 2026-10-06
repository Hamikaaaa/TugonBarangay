import AdminLayout from "../../components/admin/AdminLayout";
import ComplaintQueue from "../staff/ComplaintQueue";

function Complaints() {
  return (
    <AdminLayout title="Complaints">
      <ComplaintQueue isAdmin />
    </AdminLayout>
  );
}

export default Complaints;
