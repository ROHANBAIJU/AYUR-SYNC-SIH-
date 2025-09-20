"use client";

import { useEffect, useState } from "react";
import { getAdminStats } from "@/lib/api";

export default function AdminStatsPage() {
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stats = await getAdminStats();
        setData(stats);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch admin stats");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="p-6 space-y-4" style={{ backgroundColor: "#FAF3E0", minHeight: "100vh" }}>
      <h1 className="text-2xl font-bold text-teal-800">Admin Stats</h1>
      {loading && <p>Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}
      {data && (
        <pre className="mt-3 p-3 bg-white rounded text-sm overflow-auto max-h-96 border border-amber-200">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
