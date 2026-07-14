"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function AdminLoginForm() {
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ password }),
    });

    setLoading(false);

    if (!res.ok) {
      setError("Pogrešna lozinka");
      return;
    }

    const next = searchParams.get("next") || "/admin";
    window.location.assign(next);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#eaeded] px-4 py-8">
      <form onSubmit={handleSubmit} className="admin-card w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-[#131921]">CMS prijava</h1>
        <p className="mt-2 text-sm text-gray-600">Upravljanje sadržajem bojleri.com</p>

        <div className="mt-6">
          <label htmlFor="password" className="admin-label">
            Lozinka
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="admin-input"
            autoComplete="current-password"
            required
          />
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="admin-btn admin-btn-primary mt-6 w-full disabled:opacity-60"
        >
          {loading ? "Prijava..." : "Prijavi se"}
        </button>
      </form>
      <p className="mt-6 text-center text-xs text-gray-500">
        CMS izradio{" "}
        <Link
          href="https://www.rezident.rs"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-[#131921] hover:text-[#ff9900]"
        >
          Rezident
        </Link>
        {" · "}
        <Link
          href="https://www.rezident.rs"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[#ff9900] hover:underline"
        >
          www.rezident.rs
        </Link>
      </p>
    </div>
  );
}