import { Suspense } from "react";
import AdminLoginForm from "@/components/admin/AdminLoginForm";
import "@/app/admin/admin.css";

export const metadata = {
  title: "Prijava",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Učitavanje...</div>}>
      <AdminLoginForm />
    </Suspense>
  );
}