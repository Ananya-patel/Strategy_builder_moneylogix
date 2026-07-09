import { useEffect, useState } from "react";
import { getMyStrategies, type SavedStrategySummary } from "./api";

export default function SavedStrategies({ refreshKey }: { refreshKey: number }) {
  const [strategies, setStrategies] = useState<SavedStrategySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyStrategies()
      .then(setStrategies)
      .catch(() => setStrategies([]))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  return (
    <div className="mt-6 bg-gradient-to-b from-[#161c28] to-[#131722] border border-gray-800 rounded-xl p-6 shadow-lg shadow-black/20">
      <h3 className="text-sm font-semibold text-gray-200 tracking-wide mb-4">Saved Strategies</h3>

      {loading && <div className="text-xs text-gray-600">Loading…</div>}

      {!loading && strategies.length === 0 && (
        <div className="text-xs text-gray-600">No strategies saved yet.</div>
      )}

      <div className="space-y-2">
        {strategies.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between bg-[#0e1116] rounded-lg px-4 py-3 border border-gray-800/50"
          >
            <div>
              <div className="text-sm text-gray-200 font-medium">{s.name}</div>
              <div className="text-xs text-gray-600 font-mono mt-0.5">
                {s.underlying_symbol} · {new Date(s.created_at).toLocaleString()}
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 uppercase">
              {s.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
