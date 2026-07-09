import { AreaChart, Area, XAxis, YAxis, ReferenceLine, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import type { PayoffResponse } from "./api";

interface Props {
  data: PayoffResponse;
  currentSpot: number;
}

// Pins the gradient color-flip exactly at P&L = 0 regardless of curve shape.
function offsetZero(payoff: number[]) {
  const max = Math.max(...payoff);
  const min = Math.min(...payoff);
  if (max <= 0) return 0;   // all loss
  if (min >= 0) return 1;   // all profit
  return max / (max - min); // fraction of height that is profit
}

export default function PayoffChart({ data, currentSpot }: Props) {
  const chartData = data.spot_prices.map((s, i) => ({
    spot: s,
    payoff: data.payoff[i],
  }));
  const off = offsetZero(data.payoff);

  return (
    <div className="mt-6 bg-gradient-to-b from-[#161c28] to-[#131722] border border-gray-800 rounded-xl p-6 shadow-lg shadow-black/20">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-gray-200 tracking-wide">Payoff Diagram</h3>
        <span className="text-[10px] font-mono text-gray-600 uppercase tracking-wider">at expiry</span>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="payoffGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset={0}   stopColor="#10b981" stopOpacity={0.6} />
              <stop offset={off} stopColor="#10b981" stopOpacity={0.05} />
              <stop offset={off} stopColor="#f43f5e" stopOpacity={0.05} />
              <stop offset={1}   stopColor="#f43f5e" stopOpacity={0.6} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2530" vertical={false} />
          <XAxis dataKey="spot" stroke="#4b5563" fontSize={10} tickLine={false} />
          <YAxis stroke="#4b5563" fontSize={10} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ background: "#1a1f2a", border: "1px solid #2a2f3a", borderRadius: 10, fontSize: 12 }}
            labelStyle={{ color: "#9ca3af" }}
            itemStyle={{ color: "#10b981" }}
          />
          <ReferenceLine y={0} stroke="#374151" strokeWidth={1} />
          <ReferenceLine
            x={currentSpot}
            stroke="#10b981"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{ value: "Spot", fill: "#10b981", fontSize: 10, position: "insideTopRight" }}
          />
          {data.breakevens.map((be, i) => (
            <ReferenceLine
              key={i}
              x={be}
              stroke="#f59e0b"
              strokeDasharray="2 2"
              label={{ value: "BE", fill: "#f59e0b", fontSize: 10, position: "insideBottomRight" }}
            />
          ))}
          <Area
            type="monotone"
            dataKey="payoff"
            stroke="#e2e8f0"
            strokeWidth={2.5}
            fill="url(#payoffGradient)"
            dot={false}
            activeDot={{ r: 4, fill: "#10b981", stroke: "#0e1116", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-4 gap-3 pt-5 mt-4 border-t border-gray-800/60">
        <div className="bg-[#0e1116] rounded-lg px-3 py-2.5 border border-gray-800/60">
          <div className="text-[10px] uppercase tracking-wider text-gray-600 mb-1">Max Profit</div>
          <div className="font-mono text-base text-emerald-400 font-semibold">{data.max_profit}</div>
        </div>
        <div className="bg-[#0e1116] rounded-lg px-3 py-2.5 border border-gray-800/60">
          <div className="text-[10px] uppercase tracking-wider text-gray-600 mb-1">Max Loss</div>
          <div className="font-mono text-base text-rose-400 font-semibold">{data.max_loss}</div>
        </div>
        <div className="bg-[#0e1116] rounded-lg px-3 py-2.5 border border-gray-800/60">
          <div className="text-[10px] uppercase tracking-wider text-gray-600 mb-1">Net Delta</div>
          <div className="font-mono text-base text-gray-200 font-semibold">{data.net_delta}</div>
        </div>
        <div className="bg-[#0e1116] rounded-lg px-3 py-2.5 border border-gray-800/60">
          <div className="text-[10px] uppercase tracking-wider text-gray-600 mb-1">Net Theta</div>
          <div className="font-mono text-base text-gray-200 font-semibold">{data.net_theta}</div>
        </div>
      </div>

      <div className="mt-5 pt-5 border-t border-gray-800/60">
        <div className="text-[10px] uppercase tracking-wider text-gray-600 mb-3">Per-Leg Greeks</div>
        <div className="space-y-1.5">
          {data.leg_greeks.map((g, i) => (
            <div
              key={i}
              className="flex items-center justify-between text-xs font-mono bg-[#0e1116] rounded-lg px-3 py-2 border border-gray-800/40"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                    g.position === "buy"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-rose-500/10 text-rose-400"
                  }`}
                >
                  {g.position}
                </span>
                <span className="text-gray-300">{g.strike}</span>
                <span className="text-gray-600 uppercase text-[10px]">{g.option_type}</span>
              </div>
              <span className="text-gray-500">
                Δ <span className="text-gray-300">{g.delta}</span> · Θ{" "}
                <span className="text-gray-300">{g.theta}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
