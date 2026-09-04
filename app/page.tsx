'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  GitMerge,
  Mountain,
  Pencil,
  Play,
  RotateCcw,
  Sparkles,
  Trash2,
  Waves,
} from 'lucide-react';

type Feature = { x: number; y: number; amp: number; sigma: number };
type Point = { x: number; y: number; e: number };
type Stroke = { x: number; y: number }[];
type AfirRun = {
  id: number;
  points: Point[];
  startEq: number;
  endEq: number | null;
};
type LupRun = {
  id: number;
  sourceId: number;
  points: Point[];
  startEq: number;
  endEq: number;
  pt: Point;
};
type IrcRun = { ptId: number; branches: Point[][] };

const N = 80;
const palette = [
  '#081d37',
  '#0b3d5c',
  '#096b76',
  '#13a487',
  '#8bd36f',
  '#f4df68',
  '#f59a52',
  '#db4c55',
];
const preset: Feature[] = [
  { x: 0.24, y: 0.28, amp: -2.7, sigma: 0.11 },
  { x: 0.72, y: 0.67, amp: -2.35, sigma: 0.13 },
  { x: 0.25, y: 0.76, amp: -1.5, sigma: 0.1 },
  { x: 0.49, y: 0.47, amp: 2.15, sigma: 0.12 },
  { x: 0.82, y: 0.24, amp: 1.4, sigma: 0.1 },
];

function energy(x: number, y: number, fs: Feature[]) {
  let e = 0.24 * (x - 0.5) ** 2 + 0.18 * (y - 0.5) ** 2;
  for (const f of fs)
    e +=
      f.amp * Math.exp(-((x - f.x) ** 2 + (y - f.y) ** 2) / (2 * f.sigma ** 2));
  return e;
}
function gradient(x: number, y: number, fs: Feature[]) {
  const h = 0.0025;
  return {
    x: (energy(x + h, y, fs) - energy(x - h, y, fs)) / (2 * h),
    y: (energy(x, y + h, fs) - energy(x, y - h, fs)) / (2 * h),
  };
}
function color(t: number) {
  const z = Math.max(0, Math.min(0.999, t)) * (palette.length - 1),
    i = Math.floor(z),
    q = z - i,
    a = palette[i].match(/\w\w/g)!.map((v) => parseInt(v, 16)),
    b = palette[i + 1].match(/\w\w/g)!.map((v) => parseInt(v, 16));
  return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * q)).join(',')})`;
}
function detectMinima(fs: Feature[]) {
  const vals = Array.from({ length: N }, (_, j) =>
      Array.from({ length: N }, (_, i) =>
        energy((i + 0.5) / N, (j + 0.5) / N, fs),
      ),
    ),
    raw: Point[] = [];
  for (let j = 2; j < N - 2; j++)
    for (let i = 2; i < N - 2; i++) {
      const v = vals[j][i];
      let ok = true;
      for (let y = -1; y <= 1; y++)
        for (let x = -1; x <= 1; x++)
          if ((x || y) && vals[j + y][i + x] <= v) ok = false;
      if (ok) raw.push({ x: (i + 0.5) / N, y: (j + 0.5) / N, e: v });
    }
  return raw
    .sort((a, b) => a.e - b.e)
    .filter((p, i, a) =>
      a.slice(0, i).every((q) => Math.hypot(p.x - q.x, p.y - q.y) > 0.08),
    )
    .slice(0, 9);
}
function resample(path: Point[], count: number, fs: Feature[]) {
  if (path.length < 2) return path;
  const d = [0];
  for (let i = 1; i < path.length; i++)
    d.push(
      d[i - 1] +
        Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y),
    );
  const total = d.at(-1) || 1,
    out: Point[] = [];
  for (let k = 0; k < count; k++) {
    const target = (total * k) / (count - 1);
    let i = 1;
    while (i < d.length - 1 && d[i] < target) i++;
    const span = d[i] - d[i - 1] || 1,
      t = (target - d[i - 1]) / span,
      x = path[i - 1].x + (path[i].x - path[i - 1].x) * t,
      y = path[i - 1].y + (path[i].y - path[i - 1].y) * t;
    out.push({ x, y, e: energy(x, y, fs) });
  }
  return out;
}
function simulateAfir(
  startEq: number,
  angle: number,
  momentum: number,
  artificialForce: number,
  minima: Point[],
  fs: Feature[],
  id: number,
): AfirRun {
  const s = minima[startEq];
  let x = s.x,
    y = s.y,
    vx = Math.cos(angle) * momentum,
    vy = Math.sin(angle) * momentum;
  const points: Point[] = [{ ...s }],
    dt = 0.004,
    forceX = Math.cos(angle) * artificialForce,
    forceY = Math.sin(angle) * artificialForce;
  let endEq: number | null = null,
    slow = 0;
  for (let k = 0; k < 900; k++) {
    const g = gradient(x, y, fs);
    vx = (vx + (-g.x * 0.65 + forceX) * dt) * 0.996;
    vy = (vy + (-g.y * 0.65 + forceY) * dt) * 0.996;
    const speed = Math.hypot(vx, vy);
    if (speed > 3.2) {
      vx *= 3.2 / speed;
      vy *= 3.2 / speed;
    }
    x += vx * dt;
    y += vy * dt;
    if (x <= 0.005 || x >= 0.995 || y <= 0.005 || y >= 0.995) {
      x = Math.max(0.005, Math.min(0.995, x));
      y = Math.max(0.005, Math.min(0.995, y));
      points.push({ x, y, e: energy(x, y, fs) });
      break;
    }
    if (k % 2 === 0) points.push({ x, y, e: energy(x, y, fs) });
    if (k > 25) {
      const hit = minima.findIndex(
        (p, i) => i !== startEq && Math.hypot(p.x - x, p.y - y) < 0.035,
      );
      if (hit >= 0) {
        endEq = hit;
        points.push({ ...minima[hit] });
        break;
      }
    }
    if (speed < 0.012) slow++;
    else slow = 0;
    if (k > 70 && slow > 24) {
      points.push({ x, y, e: energy(x, y, fs) });
      break;
    }
  }
  return { id, points, startEq, endEq };
}
function relaxLup(
  run: AfirRun,
  minima: Point[],
  fs: Feature[],
  id: number,
): LupRun | null {
  if (run.endEq === null) return null;
  let path = resample(run.points, 46, fs);
  path[0] = { ...minima[run.startEq] };
  path[path.length - 1] = { ...minima[run.endEq] };
  for (let iter = 0; iter < 170; iter++) {
    const next = path.map((p) => ({ ...p }));
    for (let i = 1; i < path.length - 1; i++) {
      const p = path[i],
        prev = path[i - 1],
        after = path[i + 1],
        tx = after.x - prev.x,
        ty = after.y - prev.y,
        tn = Math.hypot(tx, ty) || 1,
        ux = tx / tn,
        uy = ty / tn,
        g = gradient(p.x, p.y, fs),
        dot = g.x * ux + g.y * uy,
        gpx = g.x - dot * ux,
        gpy = g.y - dot * uy,
        lapx = (prev.x + after.x) / 2 - p.x,
        lapy = (prev.y + after.y) / 2 - p.y;
      next[i].x = Math.max(
        0.006,
        Math.min(0.994, p.x - gpx * 0.0022 + lapx * 0.16),
      );
      next[i].y = Math.max(
        0.006,
        Math.min(0.994, p.y - gpy * 0.0022 + lapy * 0.16),
      );
      next[i].e = energy(next[i].x, next[i].y, fs);
    }
    path = iter % 8 === 7 ? resample(next, 46, fs) : next;
  }
  const pt = path.reduce((m, p) => (p.e > m.e ? p : m), path[0]);
  return {
    id,
    sourceId: run.id,
    points: path,
    startEq: run.startEq,
    endEq: run.endEq,
    pt,
  };
}
function descend(
  seed: { x: number; y: number },
  minima: Point[],
  fs: Feature[],
) {
  let p = { x: seed.x, y: seed.y },
    lastE = energy(p.x, p.y, fs),
    stalled = 0;
  const out: Point[] = [];
  for (let k = 0; k < 420; k++) {
    out.push({ ...p, e: lastE });
    const hit = minima.findIndex(
      (q) => Math.hypot(q.x - p.x, q.y - p.y) < 0.018,
    );
    if (k > 10 && hit >= 0) {
      out.push({ ...minima[hit] });
      break;
    }
    const g = gradient(p.x, p.y, fs),
      gn = Math.hypot(g.x, g.y);
    if (gn < 0.002) {
      stalled++;
      if (stalled > 12) break;
    } else stalled = 0;
    const step = Math.min(0.007, 0.002 + 0.0008 * gn),
      nx = Math.max(0.003, Math.min(0.997, p.x - (g.x / (gn || 1)) * step)),
      ny = Math.max(0.003, Math.min(0.997, p.y - (g.y / (gn || 1)) * step)),
      ne = energy(nx, ny, fs);
    if (ne > lastE + 0.0001) break;
    p = { x: nx, y: ny };
    lastE = ne;
  }
  return out;
}
function makeIrc(lup: LupRun, minima: Point[], fs: Feature[]): IrcRun {
  const i = lup.points.indexOf(lup.pt),
    a = lup.points[Math.max(0, i - 1)],
    b = lup.points[Math.min(lup.points.length - 1, i + 1)],
    dx = b.x - a.x,
    dy = b.y - a.y,
    n = Math.hypot(dx, dy) || 1,
    eps = 0.009;
  return {
    ptId: lup.id,
    branches: [
      descend(
        { x: lup.pt.x - (dx / n) * eps, y: lup.pt.y - (dy / n) * eps },
        minima,
        fs,
      ),
      descend(
        { x: lup.pt.x + (dx / n) * eps, y: lup.pt.y + (dy / n) * eps },
        minima,
        fs,
      ),
    ],
  };
}

export default function Home() {
  const canvas = useRef<HTMLCanvasElement>(null),
    drawing = useRef(false);
  const [features, setFeatures] = useState(preset),
    [kind, setKind] = useState<'valley' | 'hill'>('valley'),
    [height, setHeight] = useState(2),
    [width, setWidth] = useState(0.105),
    [momentum, setMomentum] = useState(1.45),
    [afirForce, setAfirForce] = useState(8);
  const [contours, setContours] = useState(true),
    [showEQ, setShowEQ] = useState(true),
    [penMode, setPenMode] = useState(false),
    [strokes, setStrokes] = useState<Stroke[]>([]);
  const minima = useMemo(() => detectMinima(features), [features]),
    [selectedEq, setSelectedEq] = useState<number[]>([0]),
    [afirRuns, setAfirRuns] = useState<AfirRun[]>([]),
    [lupRuns, setLupRuns] = useState<LupRun[]>([]),
    [selectedPt, setSelectedPt] = useState<number | null>(null),
    [ircRuns, setIrcRuns] = useState<IrcRun[]>([]);
  const seq = useRef(1),
    batch = useRef(0);

  useEffect(() => {
    setAfirRuns([]);
    setLupRuns([]);
    setIrcRuns([]);
    setSelectedPt(null);
    setSelectedEq((s) => s.filter((i) => minima[i]).slice(0, 2));
  }, [features, minima.length]);
  const launchAfir = () => {
    if (selectedEq.length !== 1) return;
    const count = 12,
      offset = ((batch.current++ % 6) * Math.PI) / 36,
      newRuns = Array.from({ length: count }, (_, i) =>
        simulateAfir(
          selectedEq[0],
          offset + (i * Math.PI * 2) / count,
          momentum,
          afirForce,
          minima,
          features,
          seq.current++,
        ),
      );
    setAfirRuns((r) => [...r, ...newRuns]);
    setLupRuns([]);
    setIrcRuns([]);
    setSelectedPt(null);
  };
  const runLup = () => {
    const made = afirRuns
      .map((r) => relaxLup(r, minima, features, seq.current++))
      .filter((r): r is LupRun => !!r);
    setLupRuns(made);
    setIrcRuns([]);
    setSelectedPt(null);
  };
  const toggleIrc = () => {
    if (selectedPt === null) return;
    const exists = ircRuns.some((r) => r.ptId === selectedPt);
    if (exists) setIrcRuns((r) => r.filter((v) => v.ptId !== selectedPt));
    else {
      const lup = lupRuns.find((r) => r.id === selectedPt);
      if (lup) setIrcRuns((r) => [...r, makeIrc(lup, minima, features)]);
    }
  };
  const clearPaths = () => {
    setAfirRuns([]);
    setLupRuns([]);
    setIrcRuns([]);
    setSelectedPt(null);
  };

  const draw = useCallback(() => {
    const c = canvas.current;
    if (!c) return;
    const dpr = devicePixelRatio || 1,
      w = c.clientWidth,
      h = c.clientHeight;
    c.width = w * dpr;
    c.height = h * dpr;
    const ctx = c.getContext('2d')!;
    ctx.scale(dpr, dpr);
    const S = 100,
      vals: number[][] = [];
    let lo = Infinity,
      hi = -Infinity;
    for (let j = 0; j < S; j++) {
      vals[j] = [];
      for (let i = 0; i < S; i++) {
        const v = energy(i / (S - 1), j / (S - 1), features);
        vals[j][i] = v;
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
    }
    const cw = w / S,
      ch = h / S;
    for (let j = 0; j < S; j++)
      for (let i = 0; i < S; i++) {
        ctx.fillStyle = color((vals[j][i] - lo) / (hi - lo));
        ctx.fillRect(i * cw, j * ch, cw + 1, ch + 1);
      }
    if (contours) {
      ctx.lineWidth = 0.75;
      ctx.strokeStyle = 'rgba(255,255,255,.46)';
      for (let l = 1; l < 13; l++) {
        const level = lo + ((hi - lo) * l) / 13;
        ctx.beginPath();
        for (let j = 0; j < S - 1; j++)
          for (let i = 0; i < S - 1; i++) {
            const v = vals[j][i];
            if ((v - level) * (vals[j][i + 1] - level) < 0) {
              const x = (i + (level - v) / (vals[j][i + 1] - v)) * cw;
              ctx.moveTo(x, j * ch);
              ctx.lineTo(x, (j + 1) * ch);
            }
            if ((v - level) * (vals[j + 1][i] - level) < 0) {
              const y = (j + (level - v) / (vals[j + 1][i] - v)) * ch;
              ctx.moveTo(i * cw, y);
              ctx.lineTo((i + 1) * cw, y);
            }
          }
        ctx.stroke();
      }
    }
    const line = (
      pts: { x: number; y: number }[],
      stroke: string,
      dash: number[] = [],
      lw = 2,
    ) => {
      if (pts.length < 2) return;
      ctx.beginPath();
      pts.forEach((p, i) =>
        i ? ctx.lineTo(p.x * w, p.y * h) : ctx.moveTo(p.x * w, p.y * h),
      );
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lw;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash(dash);
      ctx.stroke();
      ctx.setLineDash([]);
    };
    strokes.forEach((s) => line(s, '#fff', [], 3.5));
    afirRuns.forEach((r) => {
      line(
        r.points,
        r.endEq === null ? 'rgba(255,107,138,.52)' : '#ff6b8a',
        [2, 4],
        1.8,
      );
      const p = r.points.at(-1)!;
      ctx.fillStyle = r.endEq === null ? '#ffb1c1' : '#ff6b8a';
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
    lupRuns.forEach((r, i) => {
      line(r.points, ['#f6c85f', '#ffa85a', '#f4e36c'][i % 3], [], 2.8);
      const p = r.pt,
        active = selectedPt === r.id;
      ctx.fillStyle = active ? '#fff5a8' : '#fff';
      ctx.strokeStyle = active ? '#e34b55' : '#17202a';
      ctx.lineWidth = active ? 3 : 2;
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, active ? 8 : 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#17202a';
      ctx.font = '700 10px sans-serif';
      ctx.fillText(`PT${i + 1}`, p.x * w + 9, p.y * h - 8);
    });
    ircRuns.forEach((r) =>
      r.branches.forEach((b) => line(b, '#d9f6ff', [], 3)),
    );
    if (showEQ)
      minima.forEach((p, i) => {
        const active = selectedEq.includes(i);
        ctx.fillStyle = active ? '#fff' : '#0a2535';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, active ? 7 : 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = '700 10px sans-serif';
        ctx.fillText(`EQ${i + 1}`, p.x * w + 9, p.y * h + 4);
      });
  }, [
    features,
    contours,
    strokes,
    afirRuns,
    lupRuns,
    ircRuns,
    showEQ,
    minima,
    selectedEq,
    selectedPt,
  ]);
  useEffect(() => {
    draw();
    const ro = new ResizeObserver(draw);
    if (canvas.current) ro.observe(canvas.current);
    return () => ro.disconnect();
  }, [draw]);
  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) / r.width,
      y: (e.clientY - r.top) / r.height,
    };
  };
  const pointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!penMode) return;
    drawing.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    setStrokes((s) => [...s, [pos(e)]]);
  };
  const pointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!penMode || !drawing.current) return;
    const p = pos(e);
    setStrokes((s) =>
      s.map((line, i) => (i === s.length - 1 ? [...line, p] : line)),
    );
  };
  const click = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (penMode) return;
    const r = e.currentTarget.getBoundingClientRect(),
      x = (e.clientX - r.left) / r.width,
      y = (e.clientY - r.top) / r.height,
      pt = lupRuns.find((v) => Math.hypot(v.pt.x - x, v.pt.y - y) < 0.035);
    if (pt) {
      setSelectedPt(pt.id);
      return;
    }
    const near = minima.findIndex((p) => Math.hypot(p.x - x, p.y - y) < 0.035);
    if (near >= 0) {
      setSelectedEq((s) =>
        s.includes(near) ? s.filter((v) => v !== near) : [...s.slice(-1), near],
      );
      return;
    }
    setFeatures((f) => [
      ...f,
      { x, y, amp: (kind === 'valley' ? -1 : 1) * height, sigma: width },
    ]);
  };
  const reset = () => {
    setFeatures(preset);
    setSelectedEq([0]);
    setStrokes([]);
    clearPaths();
  };
  const reached = afirRuns.filter((r) => r.endEq !== null).length,
    ircVisible =
      selectedPt !== null && ircRuns.some((r) => r.ptId === selectedPt);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <Waves size={20} />
          </span>
          <div>
            <h1>PES Playground</h1>
            <p>Potential energy surface explorer</p>
          </div>
        </div>
        <div className="status">
          <span />
          LIVE SURFACE
        </div>
      </header>
      <section className="workspace">
        <aside className="panel controls">
          <div className="section-head">
            <span>01</span>
            <div>
              <h2>地形をつくる</h2>
              <p>キャンバスをクリック</p>
            </div>
          </div>
          <label className="label">配置するポテンシャル</label>
          <div className="segment">
            <button
              className={kind === 'valley' ? 'active' : ''}
              onClick={() => setKind('valley')}
            >
              ⌄ 谷
            </button>
            <button
              className={kind === 'hill' ? 'active' : ''}
              onClick={() => setKind('hill')}
            >
              <Mountain size={15} /> 山
            </button>
          </div>
          <label className="range-label">
            <span>高さ / 深さ</span>
            <b>{height.toFixed(1)}</b>
          </label>
          <input
            type="range"
            min=".3"
            max="4"
            step=".1"
            value={height}
            onChange={(e) => setHeight(+e.target.value)}
          />
          <label className="range-label">
            <span>広がり σ</span>
            <b>{width.toFixed(2)}</b>
          </label>
          <input
            type="range"
            min=".04"
            max=".2"
            step=".005"
            value={width}
            onChange={(e) => setWidth(+e.target.value)}
          />
          <label className="range-label">
            <span>AFIR momentum</span>
            <b>{momentum.toFixed(2)}</b>
          </label>
          <input
            type="range"
            min=".4"
            max="2.5"
            step=".05"
            value={momentum}
            onChange={(e) => setMomentum(+e.target.value)}
          />
          <label className="range-label">
            <span>AFIR artificial force</span>
            <b>{afirForce.toFixed(1)}</b>
          </label>
          <input
            type="range"
            min="0"
            max="30"
            step="0.5"
            value={afirForce}
            onChange={(e) => setAfirForce(+e.target.value)}
          />
          <div className="hint">
            <Sparkles size={16} />
            <p>
              Momentumは初速、artificial forceは投射方向へ継続的に押す力です。力を上げるほど障壁を越えやすくなります。
            </p>
          </div>
          <button className="reset" onClick={reset}>
            <RotateCcw size={15} /> 初期状態に戻す
          </button>
        </aside>
        <section className="surface-card">
          <div className="surface-head">
            <div>
              <span className="eyebrow">ENERGY LANDSCAPE</span>
              <h2>2D Potential Energy Surface</h2>
            </div>
            <div className="toggles">
              <button
                className={'tool-button ' + (penMode ? 'active' : '')}
                aria-pressed={penMode}
                onClick={() => setPenMode((v) => !v)}
              >
                <Pencil size={14} /> ペン
              </button>
              {strokes.length > 0 && (
                <button
                  className="tool-button"
                  onClick={() => setStrokes([])}
                  title="手描き線を消去"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <label>
                <input
                  type="checkbox"
                  checked={contours}
                  onChange={(e) => setContours(e.target.checked)}
                />{' '}
                等高線
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={showEQ}
                  onChange={(e) => setShowEQ(e.target.checked)}
                />{' '}
                EQ
              </label>
            </div>
          </div>
          <div className={'canvas-wrap ' + (penMode ? 'pen-active' : '')}>
            <canvas
              ref={canvas}
              onClick={click}
              onPointerDown={pointerDown}
              onPointerMove={pointerMove}
              onPointerUp={() => (drawing.current = false)}
              onPointerCancel={() => (drawing.current = false)}
            />
            <div className="axis y">Reaction coordinate 2</div>
            <div className="axis x">Reaction coordinate 1</div>
            <div className="legend">
              <span>LOW</span>
              <i />
              <span>HIGH</span>
            </div>
          </div>
          <div className="surface-foot">
            <span>{afirRuns.length} AFIR paths</span>
            <span>{reached} reached EQ</span>
            <span>{lupRuns.length} LUP paths</span>
          </div>
        </section>
        <aside className="panel analysis">
          <div className="section-head">
            <span>02</span>
            <div>
              <h2>経路を探索する</h2>
              <p>EQ → AFIR → LUP → IRC</p>
            </div>
          </div>
          <div className="eq-list">
            {minima.map((p, i) => (
              <button
                key={i}
                className={'eq ' + (selectedEq.includes(i) ? 'active' : '')}
                onClick={() =>
                  setSelectedEq((s) =>
                    s.includes(i)
                      ? s.filter((v) => v !== i)
                      : [...s.slice(-1), i],
                  )
                }
              >
                <i>EQ{i + 1}</i>
                <span>E = {p.e.toFixed(2)}</span>
              </button>
            ))}
          </div>
          <p className="selection-help">
            AFIRはEQを1点、経路比較は最大2点選択できます。
          </p>
          <div className="action-grid">
            <button
              className="method-button afir"
              disabled={selectedEq.length !== 1}
              onClick={launchAfir}
            >
              <Play size={15} />
              <span>
                <b>AFIR</b>
                <small>12方向・F={afirForce.toFixed(1)}</small>
              </span>
            </button>
            <button
              className="method-button lup"
              disabled={reached === 0}
              onClick={runLup}
            >
              <GitMerge size={15} />
              <span>
                <b>LUP</b>
                <small>経路を峠へ緩和</small>
              </span>
            </button>
          </div>
          {selectedPt !== null && (
            <button
              className={'irc-button ' + (ircVisible ? 'active' : '')}
              onClick={toggleIrc}
            >
              <GitMerge size={15} />
              <span>
                <b>IRC</b>
                <small>
                  {ircVisible ? '表示中・押してOFF' : '選択PTから勾配降下'}
                </small>
              </span>
            </button>
          )}
          <button
            className="clear-paths"
            disabled={!afirRuns.length && !lupRuns.length}
            onClick={clearPaths}
          >
            <Trash2 size={14} /> 計算経路をすべてクリア
          </button>
          <div className="run-stats">
            <span>
              AFIR <b>{afirRuns.length}</b>
            </span>
            <span>
              到達 <b>{reached}</b>
            </span>
            <span>
              PT <b>{lupRuns.length}</b>
            </span>
          </div>
          <div className="pt-card">
            <span>SELECTED PATH TOP</span>
            <b>
              {selectedPt === null
                ? '—'
                : lupRuns.find((r) => r.id === selectedPt)?.pt.e.toFixed(2)}
            </b>
            <small>PTをクリックしてIRCへ</small>
          </div>
          <p className="note">
            ※
            2D教育モデルです。AFIRは減衰付きNewton運動、LUPは端点固定の経路緩和、IRCは負の勾配流で近傍EQへ降下します。
          </p>
        </aside>
      </section>
    </main>
  );
}
