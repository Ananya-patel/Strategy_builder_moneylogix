// frontend/src/StrategyBuilder.tsx
import { useState, useEffect, useCallback } from "react";
import { getPayoff, type OptionLeg, type PayoffResponse } from "./api";

const blankLeg: OptionLeg = { option_type: "call", position: "buy", strike: 24800, premium: 40, quantity: 1 };

interface Props {
  spot: number;
  initialLegs?: OptionLeg[];
  onPayoff: (r: PayoffResponse) => void;
}

export default function StrategyBuilder({ spot, initialLegs, onPayoff }: Props) {
  const [legs, setLegs] = useState<OptionLeg[]>(
    initialLegs && initialLegs.length > 0 ? initialLegs : [blankLeg]
  );
  const [err, setErr] = useState<string | null>(null);

  const update = (i: number, key: keyof OptionLeg, val: OptionLeg[keyof OptionLeg]) =>
    setLegs(ls => ls.map((l, idx) => (idx === i ? { ...l, [key]: val } : l)));
  const addLeg = () => setLegs(ls => [...ls, { ...blankLeg }]);
  const removeLeg = (i: number) => setLegs(ls => ls.filter((_, idx) => idx !== i));

  // live redraw with basic validation + debounce
  const recompute = useCallback(async () => {
    if (legs.length === 0) {
      setErr("Add at least one leg.");
      return;
    }
    if (legs.some(l => l.strike <= 0 || (l.quantity ?? 1) <= 0 || l.premium < 0)) {
      setErr("Strike & quantity must be positive; premium can't be negative.");
      return;
    }
    setErr(null);
    try {
      const res = await getPayoff(legs, spot);
      onPayoff(res);
    } catch {
      setErr("Couldn't reach the pricing engine — retrying.");
    }
  }, [legs, spot, onPayoff]);

  useEffect(() => {
    const t = setTimeout(recompute, 300);
    return () => clearTimeout(t);
  }, [recompute]);

  const inputCls =
    "bg-[#0e1116] border border-gray-800 rounded px-2 py-1 text-gray-300 text-xs focus:outline-none focus:border-emerald-600";

  return (
    <div className="mt-6 bg-gradient-to-b from-[#161c28] to-[#131722] border border-gray-800 rounded-xl p-6 shadow-lg shadow-black/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-200 tracking-wide">
          Strategy Builder <span className="text-gray-600 text-[10px] font-normal">· edit legs, chart redraws live</span>
        </h3>
        <button
          onClick={addLeg}
          className="text-xs px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
        >
          + Add leg
        </button>
      </div>

      <div className="grid grid-cols-6 gap-2 mb-2 text-[10px] uppercase tracking-wider text-gray-600 px-1">
        <span>Type</span>
        <span>Side</span>
        <span>Strike</span>
        <span>Premium</span>
        <span>Qty</span>
        <span></span>
      </div>

      {legs.map((leg, i) => (
        <div key={i} className="grid grid-cols-6 gap-2 mb-2 text-xs items-center">
          <select
            value={leg.option_type}
            onChange={e => update(i, "option_type", e.target.value as OptionLeg["option_type"])}
            className={inputCls}
          >
            <option value="call">Call</option>
            <option value="put">Put</option>
          </select>
          <select
            value={leg.position}
            onChange={e => update(i, "position", e.target.value as OptionLeg["position"])}
            className={inputCls}
          >
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
          <input type="number" value={leg.strike} onChange={e => update(i, "strike", +e.target.value)} className={inputCls} placeholder="Strike" />
          <input type="number" value={leg.premium} onChange={e => update(i, "premium", +e.target.value)} className={inputCls} placeholder="Premium" />
          <input type="number" value={leg.quantity ?? 1} onChange={e => update(i, "quantity", +e.target.value)} className={inputCls} placeholder="Qty" />
          <button
            onClick={() => removeLeg(i)}
            className="text-rose-400 hover:text-rose-300 text-sm justify-self-start px-2"
            title="Remove leg"
          >
            ✕
          </button>
        </div>
      ))}

      {err && <p className="text-xs text-amber-400 mt-2">{err}</p>}
    </div>
  );
}
