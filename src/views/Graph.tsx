import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GRAPH } from '../data/graph';
import { NOTES } from '../data/notes';
import type { GraphNode, NoteKind } from '../data/types';

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number | null;
  fy: number | null;
}

interface KindStyle { fill: string; stroke: string }
const KIND_COLORS: Record<NoteKind, KindStyle> = {
  decision:  { fill: 'oklch(0.30 0.07 60)', stroke: 'oklch(0.78 0.13 60)' },
  knowledge: { fill: '#0d0c0a',              stroke: '#ECE7DC' },
  session:   { fill: '#1c1b18',              stroke: '#7a7468' },
  principle: { fill: 'oklch(0.30 0.07 60)', stroke: 'oklch(0.85 0.15 60)' },
};

const EDGE_STYLE: Record<string, { stroke: string; width: number; dash: string }> = {
  cites:      { stroke: '#3a3631', width: 0.8, dash: '' },
  related:    { stroke: '#3a3631', width: 0.8, dash: '' },
  imports:    { stroke: 'oklch(0.55 0.10 60 / 0.7)', width: 1.0, dash: '' },
  derived:    { stroke: 'oklch(0.62 0.12 60 / 0.85)', width: 1.2, dash: '' },
  supersedes: { stroke: 'oklch(0.55 0.14 25 / 0.8)', width: 1.2, dash: '5 4' },
  src:        { stroke: '#26241f', width: 0.7, dash: '2 4' },
};

export function GraphView({ goToNote }: { goToNote: (id: string) => void }) {
  const { nodes: rawNodes, edges } = GRAPH;

  const simRef = useRef<{ nodes: SimNode[]; byId: Record<string, SimNode> } | null>(null);
  const [, setVersion] = useState(0);
  const tick = useCallback(() => setVersion((v) => (v + 1) % 1e9), []);

  const [tune, setTune] = useState({
    linkDistance: 90,
    repel: 1800,
    center: 0.02,
    labelThreshold: 0.55,
    showSessions: true,
  });

  const viewRef = useRef({ x: 0, y: 0, zoom: 1 });
  const [selected, setSelected] = useState<string | null>('ADR-015');
  const [hover, setHover] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<Record<NoteKind, boolean>>({
    decision: true, knowledge: true, session: true, principle: true,
  });

  useEffect(() => {
    const radii: Record<NoteKind, number> = { decision: 200, knowledge: 320, session: 460, principle: 140 };
    const counts: Partial<Record<NoteKind, number>> = {};
    for (const n of rawNodes) counts[n.kind] = (counts[n.kind] || 0) + 1;
    const seen: Partial<Record<NoteKind, number>> = {};
    const sim: SimNode[] = rawNodes.map((n) => {
      const k = n.kind;
      seen[k] = seen[k] || 0;
      const idx = seen[k]!++;
      const total = counts[k] || 1;
      const seed = [...n.id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0);
      const phase = ((seed >>> 4) & 0xff) / 0xff;
      const angle = ((idx + phase) / total) * Math.PI * 2;
      const r = (radii[k] || 280) * (0.85 + ((seed >>> 12) & 0xff) / 0xff * 0.3);
      return {
        ...n,
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r * 0.75,
        vx: 0, vy: 0, fx: null, fy: null,
      };
    });
    simRef.current = { nodes: sim, byId: Object.fromEntries(sim.map((n) => [n.id, n])) };
    setVersion((v) => v + 1);
  }, [rawNodes]);

  useEffect(() => {
    if (!simRef.current) return;
    let alpha = 1;
    let raf = 0;
    const step = () => {
      const sim = simRef.current!;
      const nodes = sim.nodes;
      const byId = sim.byId;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          let dx = b.x - a.x, dy = b.y - a.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 1) d2 = 1;
          const d = Math.sqrt(d2);
          const f = tune.repel / d2;
          const fx = (dx / d) * f, fy = (dy / d) * f;
          a.vx -= fx; a.vy -= fy;
          b.vx += fx; b.vy += fy;
        }
      }
      for (const [aId, bId] of edges) {
        const a = byId[aId], b = byId[bId];
        if (!a || !b) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const k = 0.06 * (d - tune.linkDistance) / d;
        const fx = dx * k, fy = dy * k;
        a.vx += fx; a.vy += fy;
        b.vx -= fx; b.vy -= fy;
      }
      for (const n of nodes) {
        n.vx -= n.x * tune.center;
        n.vy -= n.y * tune.center;
      }
      const damp = 0.45;
      for (const n of nodes) {
        if (n.fx !== null) { n.x = n.fx; n.y = n.fy!; n.vx = 0; n.vy = 0; continue; }
        n.vx *= damp; n.vy *= damp;
        const v = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
        if (v > 30) { n.vx = (n.vx / v) * 30; n.vy = (n.vy / v) * 30; }
        n.x += n.vx * alpha;
        n.y += n.vy * alpha;
      }
      alpha = Math.max(0, alpha - 0.005);
      tick();
      if (alpha > 0.01) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [tune.linkDistance, tune.repel, tune.center, edges, tick]);

  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ id: string; ox: number; oy: number; moved: boolean } | null>(null);
  const panRef = useRef<{ ox: number; oy: number } | null>(null);

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const v = viewRef.current;
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const cx = rect.width / 2, cy = rect.height / 2;
    return {
      x: (sx - rect.left - cx - v.x) / v.zoom,
      y: (sy - rect.top - cy - v.y) / v.zoom,
    };
  }, []);

  // Wheel zoom — bound as a native non-passive listener so preventDefault
  // works (React's synthetic wheel handlers are passive by default).
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const v = viewRef.current;
      const next = Math.min(3, Math.max(0.3, v.zoom * Math.exp(-e.deltaY * 0.0014)));
      const rect = svg.getBoundingClientRect();
      const cx = rect.width / 2, cy = rect.height / 2;
      const px = e.clientX - rect.left, py = e.clientY - rect.top;
      const wx = (px - cx - v.x) / v.zoom, wy = (py - cy - v.y) / v.zoom;
      v.zoom = next;
      v.x = (px - cx) - wx * v.zoom;
      v.y = (py - cy) - wy * v.zoom;
      tick();
    };
    svg.addEventListener('wheel', handler, { passive: false });
    return () => svg.removeEventListener('wheel', handler);
  }, [tick]);

  const onNodePointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    const node = simRef.current?.byId[id];
    if (!node) return;
    const start = screenToWorld(e.clientX, e.clientY);
    dragRef.current = { id, ox: node.x - start.x, oy: node.y - start.y, moved: false };
    setSelected(id);
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  const onPanPointerDown = (e: React.PointerEvent) => {
    if (dragRef.current) return;
    const v = viewRef.current;
    panRef.current = { ox: e.clientX - v.x, oy: e.clientY - v.y };
    svgRef.current?.classList.add('panning');
    svgRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (dragRef.current) {
      const node = simRef.current!.byId[dragRef.current.id];
      const p = screenToWorld(e.clientX, e.clientY);
      node.fx = p.x + dragRef.current.ox;
      node.fy = p.y + dragRef.current.oy;
      dragRef.current.moved = true;
      tick();
      return;
    }
    if (panRef.current) {
      const v = viewRef.current;
      v.x = e.clientX - panRef.current.ox;
      v.y = e.clientY - panRef.current.oy;
      tick();
    }
  };

  const onPointerUp = () => {
    if (dragRef.current) {
      if (!dragRef.current.moved) {
        const node = simRef.current!.byId[dragRef.current.id];
        node.fx = null; node.fy = null;
      }
      dragRef.current = null;
    }
    if (panRef.current) {
      panRef.current = null;
      svgRef.current?.classList.remove('panning');
    }
  };

  const sim = simRef.current;

  const neighbors = useMemo(() => {
    if (!selected) return null;
    const s = new Set<string>([selected]);
    for (const [a, b] of edges) {
      if (a === selected) s.add(b);
      if (b === selected) s.add(a);
    }
    return s;
  }, [selected, edges]);

  const searchMatches = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.trim().toLowerCase();
    const s = new Set<string>();
    for (const n of rawNodes) {
      const hay = `${n.id} ${n.label} ${(n.tags || []).join(' ')}`.toLowerCase();
      if (hay.includes(q)) s.add(n.id);
    }
    return s;
  }, [search, rawNodes]);

  const isDim = (id: string, kind: NoteKind) => {
    if (!kindFilter[kind]) return true;
    if (searchMatches) return !searchMatches.has(id);
    if (neighbors) return !neighbors.has(id);
    return false;
  };

  const isEdgeDim = (a: string, b: string) => {
    if (searchMatches) return !(searchMatches.has(a) || searchMatches.has(b));
    if (neighbors) return !(neighbors.has(a) && neighbors.has(b));
    return false;
  };

  const labelOpacity = (id: string) => {
    const z = viewRef.current.zoom;
    const isFocus = selected === id || hover === id;
    if (isFocus) return 1;
    if (z < tune.labelThreshold) return 0;
    return Math.min(1, (z - tune.labelThreshold) * 2.2);
  };

  const selectedNode = selected && sim ? sim.byId[selected] : null;
  const selectedDeg = selected ? edges.filter((e) => e[0] === selected || e[1] === selected).length : 0;
  const selectedNote = selected ? NOTES.find((n) => n.id === selected) : null;

  useEffect(() => {
    if (!sim) return;
    const t = setTimeout(() => {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const n of sim.nodes) {
        if (n.x < minX) minX = n.x; if (n.x > maxX) maxX = n.x;
        if (n.y < minY) minY = n.y; if (n.y > maxY) maxY = n.y;
      }
      const w = maxX - minX || 1, h = maxY - minY || 1;
      const svg = svgRef.current;
      if (!svg) return;
      const r = svg.getBoundingClientRect();
      const z = Math.min(r.width / (w + 200), r.height / (h + 200), 1.4);
      viewRef.current = { x: -(minX + maxX) / 2 * z, y: -(minY + maxY) / 2 * z, zoom: z };
      tick();
    }, 800);
    return () => clearTimeout(t);
  }, [sim, tick]);

  const view = viewRef.current;

  return (
    <div className="gr">
      <svg ref={svgRef}
        onPointerDown={onPanPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={(e) => { if (e.target === svgRef.current) setSelected(null); }}>
        <defs>
          <radialGradient id="halo-amber" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="oklch(0.78 0.14 60)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="oklch(0.55 0.10 60)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="halo-cream" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ECE7DC" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#ECE7DC" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="halo-focus" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="oklch(0.85 0.16 60)" stopOpacity="0.65" />
            <stop offset="100%" stopColor="oklch(0.55 0.10 60)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {sim && (() => {
          const svgRect = svgRef.current?.getBoundingClientRect();
          const cx = (svgRect?.width || 1240) / 2;
          const cy = (svgRect?.height || 720) / 2;
          return (
            <g transform={`translate(${cx + view.x} ${cy + view.y}) scale(${view.zoom})`}>
              {edges.map(([a, b, kind], i) => {
                const na = sim.byId[a], nb = sim.byId[b];
                if (!na || !nb) return null;
                const dim = isEdgeDim(a, b) || !kindFilter[na.kind] || !kindFilter[nb.kind];
                const st = EDGE_STYLE[kind] || EDGE_STYLE.cites;
                return (
                  <line key={i}
                    x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                    stroke={st.stroke}
                    strokeWidth={st.width / view.zoom}
                    strokeDasharray={st.dash}
                    opacity={dim ? 0.1 : 1}
                  />
                );
              })}
              {sim.nodes.map((n) => {
                const dim = isDim(n.id, n.kind);
                const isFocus = selected === n.id;
                const isHover = hover === n.id;
                const c = KIND_COLORS[n.kind] || KIND_COLORS.knowledge;
                const baseR = n.kind === 'session' ? 4 : n.kind === 'decision' ? 8 : 7;
                const r = (isFocus || isHover) ? baseR + 3 : baseR;
                const haloId = isFocus
                  ? 'halo-focus'
                  : n.kind === 'decision' ? 'halo-amber' : 'halo-cream';
                return (
                  <g key={n.id} className={`gr-node ${n.kind}`}
                    opacity={n.faded ? 0.4 : (dim ? 0.18 : 1)}
                    onPointerDown={(e) => onNodePointerDown(e, n.id)}
                    onMouseEnter={() => setHover(n.id)}
                    onMouseLeave={() => setHover(null)}
                    onDoubleClick={() => goToNote(n.id)}
                    style={{ cursor: 'pointer' }}>
                    <circle cx={n.x} cy={n.y} r={(isFocus || isHover) ? 26 : 16}
                      fill={`url(#${haloId})`} />
                    <circle cx={n.x} cy={n.y} r={r}
                      fill={c.fill}
                      stroke={c.stroke}
                      strokeWidth={(isFocus ? 2 : 1.2) / view.zoom}
                    />
                    {n.kind !== 'session' && (
                      <text x={n.x} y={n.y + r + 14 / view.zoom}
                        opacity={labelOpacity(n.id)}
                        fontSize={11 / view.zoom}
                        fill={isFocus ? '#ECE7DC' : '#908A7E'}>
                        {n.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })()}
      </svg>

      <div className="gr-controls">
        <div className="gr-search">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--cx-fg-3)" strokeWidth="1.4">
            <circle cx="5" cy="5" r="3.5" /><path d="M8 8l3 3" strokeLinecap="round" />
          </svg>
          <input
            placeholder="search nodes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {searchMatches && <span className="count">{searchMatches.size}</span>}
        </div>
        <div className="gr-chips">
          {(Object.entries(kindFilter) as [NoteKind, boolean][]).map(([k, on]) => (
            <span key={k}
              className={`gr-chip ${on ? 'on' : ''}`}
              onClick={() => setKindFilter((kf) => ({ ...kf, [k]: !kf[k] }))}>
              <span className="sw" style={{ background: KIND_COLORS[k].stroke }} />
              {k}
            </span>
          ))}
        </div>
      </div>

      <div className="gr-settings">
        <div className="label">— Forces</div>
        <div className="row">
          <div className="top"><span>Link distance</span><em>{tune.linkDistance}</em></div>
          <input type="range" min="40" max="220" step="2" value={tune.linkDistance}
            onChange={(e) => setTune((t) => ({ ...t, linkDistance: +e.target.value }))} />
        </div>
        <div className="row">
          <div className="top"><span>Repel</span><em>{tune.repel}</em></div>
          <input type="range" min="400" max="5000" step="50" value={tune.repel}
            onChange={(e) => setTune((t) => ({ ...t, repel: +e.target.value }))} />
        </div>
        <div className="row">
          <div className="top"><span>Center pull</span><em>{tune.center.toFixed(3)}</em></div>
          <input type="range" min="0" max="0.08" step="0.002" value={tune.center}
            onChange={(e) => setTune((t) => ({ ...t, center: +e.target.value }))} />
        </div>
        <div className="row">
          <div className="top"><span>Label threshold</span><em>{tune.labelThreshold.toFixed(2)}</em></div>
          <input type="range" min="0" max="1.5" step="0.05" value={tune.labelThreshold}
            onChange={(e) => setTune((t) => ({ ...t, labelThreshold: +e.target.value }))} />
        </div>
      </div>

      <div className="gr-legend">
        <div className="stat"><span>nodes</span><span className="n">{rawNodes.length}</span></div>
        <div className="stat"><span>edges</span><span className="n">{edges.length}</span></div>
        <div className="stat"><span>zoom</span><span className="n">{view.zoom.toFixed(2)}×</span></div>
        <div className="hint">
          <kbd>drag</kbd> pan · <kbd>wheel</kbd> zoom · <kbd>click</kbd> focus · <kbd>2×</kbd> open
        </div>
      </div>

      {selected && selectedNode && (
        <div className="gr-detail">
          <div className="id">{selected} · {selectedNode.kind.toUpperCase()}</div>
          <h4>{selectedNode.label}</h4>
          {selectedNote && selectedNote.lede && <p>{selectedNote.lede}</p>}
          <div className="stats">
            <div><span className="n">{selectedDeg}</span><span className="l">degree</span></div>
            <div><span className="n">{edges.filter((e) => e[1] === selected).length}</span><span className="l">in</span></div>
            <div><span className="n">{edges.filter((e) => e[0] === selected).length}</span><span className="l">out</span></div>
          </div>
          {selectedNote && (
            <button className="open" onClick={() => goToNote(selected)}>
              open in Knowledge →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
