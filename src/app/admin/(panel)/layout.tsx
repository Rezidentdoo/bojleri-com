import AdminNav from "@/components/admin/AdminNav";
import { RezidentAdminFooter } from "@/components/admin/RezidentPromo";

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <AdminNav />
      <div className="mx-auto max-w-6xl px-4 py-8">
        {children}
        <RezidentAdminFooter />
      </div>
    </div>
  );
}