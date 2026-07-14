"use client";

import { useRef, useState } from "react";

type CatalogExcelToolsProps = {
  onUploaded?: () => void;
};

export default function CatalogExcelTools({ onUploaded }: CatalogExcelToolsProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const uploadPrices = async (file: File) => {
    setUploading(true);
    setMessage("");
    setIsError(false);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/catalog/import-prices", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setIsError(true);
        const extra =
          data.result?.notFound?.length > 0
            ? ` Nepoznate šifre: ${data.result.notFound.slice(0, 5).join(", ")}${data.result.notFound.length > 5 ? "…" : ""}`
            : "";
        setMessage(`${data.error || data.message || "Upload nije uspeo."}${extra}`);
        return;
      }

      setMessage(data.message || "Cene su ažurirane.");
      if (fileRef.current) fileRef.current.value = "";
      onUploaded?.();
    } catch {
      setIsError(true);
      setMessage("Greška pri slanju fajla.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a href="/api/admin/catalog/export" className="admin-btn admin-btn-secondary">
        Download Katalog (Excel)
      </a>

      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadPrices(file);
        }}
      />

      <button
        type="button"
        className="admin-btn admin-btn-secondary disabled:opacity-60"
        disabled={uploading}
        onClick={() => fileRef.current?.click()}
      >
        {uploading ? "Upload..." : "Upload Cene (Excel)"}
      </button>

      {message && (
        <span className={`text-sm ${isError ? "text-red-700" : "text-green-700"}`}>{message}</span>
      )}
    </div>
  );
}