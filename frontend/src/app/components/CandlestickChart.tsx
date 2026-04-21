import { useMemo, useState } from 'react';

interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Props {
  data: Candle[];
  height?: number;
}

/**
 * Pure-SVG candlestick chart. Each candle has:
 *   · vertical wick spanning [low, high]
 *   · body rectangle spanning [open, close]
 *   · green if close ≥ open, red otherwise
 *
 * Recharts has no native candlestick primitive, so we draw directly.
 */
export function CandlestickChart({ data, height = 400 }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);

  // Layout constants
  const PAD_LEFT = 56;
  const PAD_RIGHT = 12;
  const PAD_TOP = 16;
  const PAD_BOTTOM = 36;

  // Price range for y-axis, with 5% padding
  const { minPrice, maxPrice } = useMemo(() => {
    if (!data.length) return { minPrice: 0, maxPrice: 1 };
    let lo = Infinity;
    let hi = -Infinity;
    for (const c of data) {
      if (c.low < lo) lo = c.low;
      if (c.high > hi) hi = c.high;
    }
    const span = hi - lo || 1;
    return { minPrice: lo - span * 0.05, maxPrice: hi + span * 0.05 };
  }, [data]);

  // We use a viewBox-scaled SVG so width auto-fits the container
  const viewW = 1000;
  const viewH = height;
  const plotW = viewW - PAD_LEFT - PAD_RIGHT;
  const plotH = viewH - PAD_TOP - PAD_BOTTOM;

  const priceToY = (p: number) =>
    PAD_TOP + ((maxPrice - p) / (maxPrice - minPrice)) * plotH;

  const n = data.length;
  const slot = n > 0 ? plotW / n : 0;
  const bodyW = Math.max(2, slot * 0.6);

  // Y-axis tick marks (5 divisions)
  const yTicks = useMemo(() => {
    const ticks = [];
    for (let i = 0; i <= 5; i++) {
      const v = minPrice + ((maxPrice - minPrice) / 5) * i;
      ticks.push(v);
    }
    return ticks;
  }, [minPrice, maxPrice]);

  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center bg-[#0a0e1a] rounded border border-[#1e2538] text-[#7d8aa3] font-mono text-sm"
        style={{ height }}
      >
        NO CANDLE DATA
      </div>
    );
  }

  const hover = hovered !== null ? data[hovered] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${viewW} ${viewH}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
      >
        {/* Background grid */}
        {yTicks.map((v, i) => (
          <g key={i}>
            <line
              x1={PAD_LEFT}
              x2={viewW - PAD_RIGHT}
              y1={priceToY(v)}
              y2={priceToY(v)}
              stroke="#1e2538"
              strokeDasharray="3 3"
            />
            <text
              x={PAD_LEFT - 8}
              y={priceToY(v) + 4}
              textAnchor="end"
              fill="#7d8aa3"
              fontSize="11"
              fontFamily="monospace"
            >
              {v.toFixed(2)}
            </text>
          </g>
        ))}

        {/* Candles */}
        {data.map((c, i) => {
          const cx = PAD_LEFT + slot * i + slot / 2;
          const bullish = c.close >= c.open;
          const color = bullish ? '#2ed573' : '#ff4757';
          const bodyTop = priceToY(Math.max(c.open, c.close));
          const bodyBot = priceToY(Math.min(c.open, c.close));
          const bodyH = Math.max(1, bodyBot - bodyTop);
          return (
            <g
              key={i}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* invisible hover target */}
              <rect
                x={cx - slot / 2}
                y={PAD_TOP}
                width={slot}
                height={plotH}
                fill="transparent"
              />
              {/* wick */}
              <line
                x1={cx}
                x2={cx}
                y1={priceToY(c.high)}
                y2={priceToY(c.low)}
                stroke={color}
                strokeWidth={1}
              />
              {/* body */}
              <rect
                x={cx - bodyW / 2}
                y={bodyTop}
                width={bodyW}
                height={bodyH}
                fill={bullish ? color : color}
                opacity={bullish ? 0.9 : 1}
                stroke={color}
              />
            </g>
          );
        })}

        {/* X-axis labels: sample ~8 dates */}
        {data.map((c, i) => {
          const step = Math.max(1, Math.floor(n / 8));
          if (i % step !== 0) return null;
          const cx = PAD_LEFT + slot * i + slot / 2;
          return (
            <text
              key={i}
              x={cx}
              y={viewH - 14}
              textAnchor="middle"
              fill="#7d8aa3"
              fontSize="10"
              fontFamily="monospace"
            >
              {c.date.slice(5)}
            </text>
          );
        })}

        {/* Hover crosshair */}
        {hovered !== null && (
          <line
            x1={PAD_LEFT + slot * hovered + slot / 2}
            x2={PAD_LEFT + slot * hovered + slot / 2}
            y1={PAD_TOP}
            y2={viewH - PAD_BOTTOM}
            stroke="#00d4ff"
            strokeDasharray="2 3"
            opacity={0.5}
          />
        )}
      </svg>

      {/* Hover tooltip */}
      {hover && (
        <div className="absolute top-2 right-2 bg-[#0f1420] border border-[#00d4ff]/50 p-3 rounded shadow-lg text-xs font-mono pointer-events-none">
          <p className="text-[#7d8aa3] mb-1">{hover.date}</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
            <span className="text-[#7d8aa3]">OPEN</span>
            <span className="text-[#e4e8f0] text-right">{hover.open.toFixed(2)}</span>
            <span className="text-[#7d8aa3]">HIGH</span>
            <span className="text-[#2ed573] text-right">{hover.high.toFixed(2)}</span>
            <span className="text-[#7d8aa3]">LOW</span>
            <span className="text-[#ff4757] text-right">{hover.low.toFixed(2)}</span>
            <span className="text-[#7d8aa3]">CLOSE</span>
            <span
              className={
                hover.close >= hover.open
                  ? 'text-[#2ed573] text-right'
                  : 'text-[#ff4757] text-right'
              }
            >
              {hover.close.toFixed(2)}
            </span>
            <span className="text-[#7d8aa3]">VOL</span>
            <span className="text-[#e4e8f0] text-right">{hover.volume.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}
