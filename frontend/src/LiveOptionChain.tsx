import { useEffect, useState } from "react";

interface ChainRow {
  strike: number;
  call: { ltp: number; iv: number; oi: number; volume: number };
  put: { ltp: number; iv: number; oi: number; volume: number };
}

interface ChainPayload {
  symbol: string;
  spot: number;
  timestamp: string;
  chain: ChainRow[];
}

type Status = "connecting" | "live" | "reconnecting";

export default function LiveOptionChain({ symbol = "NIFTY" }: { symbol?: string }) {
  const [data, setData] = useState<ChainPayload | null>(null);
  const [status, setStatus] = useState<Status>("connecting");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8000/ws/options-chain/${symbol}`);

    ws.onopen = () => setStatus("live");
    ws.onclose = () => setStatus("reconnecting");
    ws.onerror = () => setStatus("reconnecting");
    ws.onmessage = (event) => {
      setData(JSON.parse(event.data));
      setLastUpdate(new Date());
    };

    return () => ws.close();
  }, [symbol]);

  const live = status === "live";

  return (
    <div className="mt-6 bg-gradient-to-b from-[#161c28] to-[#131722] border border-gray-800 rounded-xl p-6 shadow-lg shadow-black/20">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-gray-200 tracking-wide">
          Live Option Chain <span className="text-gray-600">·</span>{" "}
          <span className="text-emerald-400">{symbol}</span>
        </h3>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-[10px] font-mono text-gray-600">
              upd {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <div className="flex items-center gap-2 bg-[#0e1116] px-3 py-1.5 rounded-full border border-gray-800/60">
            <span className="relative flex h-2 w-2">
              {live && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  live ? "bg-emerald-400" : status === "reconnecting" ? "bg-amber-400" : "bg-gray-600"
                }`}
              />
            </span>
            <span className="text-xs font-mono text-gray-400">
              {live
                ? `LIVE · ${data?.spot.toFixed(2) ?? "—"}`
                : status === "reconnecting"
                ? "RECONNECTING…"
                : "Connecting…"}
            </span>
          </div>
        </div>
      </div>

      {data && (
        <div className="overflow-x-auto rounded-lg border border-gray-800/40">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-gray-600 bg-[#0e1116] text-[10px] uppercase tracking-wider">
                <th className="text-right py-2.5 px-3 font-medium">Call LTP</th>
                <th className="text-right py-2.5 px-3 font-medium">Call IV</th>
                <th className="text-right py-2.5 px-3 font-medium">Call OI</th>
                <th className="text-center py-2.5 px-4 font-semibold text-gray-400">Strike</th>
                <th className="text-left py-2.5 px-3 font-medium">Put OI</th>
                <th className="text-left py-2.5 px-3 font-medium">Put IV</th>
                <th className="text-left py-2.5 px-3 font-medium">Put LTP</th>
              </tr>
            </thead>
            <tbody>
              {data.chain.map((row) => {
                const isATM = Math.abs(row.strike - data.spot) < 30;
                return (
                  <tr
                    key={row.strike}
                    className={`border-t border-gray-800/40 transition-colors ${
                      isATM
                        ? "bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-emerald-500/10"
                        : "hover:bg-gray-900/40"
                    }`}
                  >
                    <td className="text-right py-2 px-3 text-gray-300">{row.call.ltp.toFixed(2)}</td>
                    <td className="text-right py-2 px-3 text-gray-600">{row.call.iv.toFixed(1)}</td>
                    <td className="text-right py-2 px-3 text-gray-600">{row.call.oi.toLocaleString()}</td>
                    <td
                      className={`text-center py-2 px-4 font-semibold ${
                        isATM ? "text-emerald-400" : "text-gray-300"
                      }`}
                    >
                      {row.strike}
                    </td>
                    <td className="text-left py-2 px-3 text-gray-600">{row.put.oi.toLocaleString()}</td>
                    <td className="text-left py-2 px-3 text-gray-600">{row.put.iv.toFixed(1)}</td>
                    <td className="text-left py-2 px-3 text-gray-300">{row.put.ltp.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
