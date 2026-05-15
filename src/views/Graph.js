import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GRAPH } from '../data/graph';
import { NOTES } from '../data/notes';
const OBSIDIAN_TUNE = {
    linkDistance: 86,
    repel: 1900,
    center: 0.024,
    labelThreshold: 2.2,
    showSessions: true,
};
const KIND_COLORS = {
    decision: { fill: '#b7b9c0', stroke: '#d5d7dc' },
    knowledge: { fill: '#a7a9af', stroke: '#d0d2d7' },
    session: { fill: '#55585d', stroke: '#6b6e74' },
    principle: { fill: '#8f9299', stroke: '#c4c6cc' },
};
const EDGE_STYLE = {
    cites: { stroke: '#4b4d52', width: 0.72, dash: '' },
    related: { stroke: '#43454a', width: 0.65, dash: '' },
    imports: { stroke: '#5b5e64', width: 0.8, dash: '' },
    derived: { stroke: '#62656c', width: 0.86, dash: '' },
    supersedes: { stroke: '#666a72', width: 0.86, dash: '4 4' },
    src: { stroke: '#3d3f44', width: 0.58, dash: '2 4' },
};
export function GraphView({ goToNote, graph = GRAPH, index = [], }) {
    const { nodes: rawNodes, edges } = graph;
    const simRef = useRef(null);
    const [, setVersion] = useState(0);
    const tick = useCallback(() => setVersion((v) => (v + 1) % 1e9), []);
    const [tune, setTune] = useState(OBSIDIAN_TUNE);
    const viewRef = useRef({ x: 0, y: 0, zoom: 1 });
    const [selected, setSelected] = useState(null);
    const [hover, setHover] = useState(null);
    const [search, setSearch] = useState('');
    const [kindFilter, setKindFilter] = useState({
        decision: true, knowledge: true, session: true, principle: true,
    });
    useEffect(() => {
        if (!rawNodes.length)
            return;
        if (selected && rawNodes.every((n) => n.id !== selected)) {
            setSelected(null);
        }
    }, [rawNodes, selected]);
    useEffect(() => {
        const radii = { decision: 170, knowledge: 245, session: 330, principle: 135 };
        const counts = {};
        for (const n of rawNodes)
            counts[n.kind] = (counts[n.kind] || 0) + 1;
        const seen = {};
        const sim = rawNodes.map((n) => {
            const k = n.kind;
            seen[k] = seen[k] || 0;
            const idx = seen[k]++;
            const total = counts[k] || 1;
            const seed = [...n.id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0);
            const phase = ((seed >>> 4) & 0xff) / 0xff;
            const angle = ((idx + phase) / total) * Math.PI * 2;
            const r = (radii[k] || 170) * (0.85 + ((seed >>> 12) & 0xff) / 0xff * 0.3);
            return {
                ...n,
                x: Math.cos(angle) * r * 0.78,
                y: Math.sin(angle) * r * 1.14,
                vx: 0, vy: 0, fx: null, fy: null,
            };
        });
        simRef.current = { nodes: sim, byId: Object.fromEntries(sim.map((n) => [n.id, n])) };
        setVersion((v) => v + 1);
    }, [rawNodes]);
    useEffect(() => {
        if (!simRef.current)
            return;
        let alpha = 1;
        let raf = 0;
        const linkPairs = Array.from(new Map(edges.map(([a, b]) => {
            const key = a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`;
            return [key, [a, b]];
        })).values());
        const step = () => {
            const sim = simRef.current;
            const nodes = sim.nodes;
            const byId = sim.byId;
            for (let i = 0; i < nodes.length; i++) {
                const a = nodes[i];
                for (let j = i + 1; j < nodes.length; j++) {
                    const b = nodes[j];
                    let dx = b.x - a.x, dy = b.y - a.y;
                    let d2 = dx * dx + dy * dy;
                    if (d2 < 1)
                        d2 = 1;
                    const d = Math.sqrt(d2);
                    const f = (tune.repel * alpha) / d2;
                    const fx = (dx / d) * f, fy = (dy / d) * f;
                    a.vx -= fx;
                    a.vy -= fy;
                    b.vx += fx;
                    b.vy += fy;
                }
            }
            for (const [aId, bId] of linkPairs) {
                const a = byId[aId], b = byId[bId];
                if (!a || !b)
                    continue;
                const dx = b.x - a.x, dy = b.y - a.y;
                const d = Math.sqrt(dx * dx + dy * dy) || 1;
                const k = 0.035 * alpha * (d - tune.linkDistance) / d;
                const fx = dx * k, fy = dy * k;
                a.vx += fx;
                a.vy += fy;
                b.vx -= fx;
                b.vy -= fy;
            }
            for (const n of nodes) {
                n.vx -= n.x * tune.center * alpha;
                n.vy -= n.y * tune.center * alpha;
                n.vx += (Math.random() - 0.5) * 0.002 * alpha;
                n.vy += (Math.random() - 0.5) * 0.002 * alpha;
            }
            const damp = 0.62;
            for (const n of nodes) {
                if (n.fx !== null) {
                    n.x = n.fx;
                    n.y = n.fy;
                    n.vx = 0;
                    n.vy = 0;
                    continue;
                }
                n.vx *= damp;
                n.vy *= damp;
                const v = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
                if (v > 30) {
                    n.vx = (n.vx / v) * 30;
                    n.vy = (n.vy / v) * 30;
                }
                n.x += n.vx * alpha;
                n.y += n.vy * alpha;
            }
            alpha = Math.max(0, alpha - 0.0035);
            tick();
            if (alpha > 0.01)
                raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [tune.linkDistance, tune.repel, tune.center, edges, tick]);
    const svgRef = useRef(null);
    const dragRef = useRef(null);
    const panRef = useRef(null);
    const screenToWorld = useCallback((sx, sy) => {
        const v = viewRef.current;
        const svg = svgRef.current;
        if (!svg)
            return { x: 0, y: 0 };
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
        if (!svg)
            return;
        const handler = (e) => {
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
    const onNodePointerDown = (e, id) => {
        e.stopPropagation();
        const node = simRef.current?.byId[id];
        if (!node)
            return;
        const start = screenToWorld(e.clientX, e.clientY);
        dragRef.current = { id, ox: node.x - start.x, oy: node.y - start.y, moved: false };
        setSelected(id);
        e.currentTarget.setPointerCapture(e.pointerId);
    };
    const onPanPointerDown = (e) => {
        if (dragRef.current)
            return;
        const v = viewRef.current;
        panRef.current = { ox: e.clientX - v.x, oy: e.clientY - v.y };
        svgRef.current?.classList.add('panning');
        svgRef.current?.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e) => {
        if (dragRef.current) {
            const node = simRef.current.byId[dragRef.current.id];
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
                const node = simRef.current.byId[dragRef.current.id];
                node.fx = null;
                node.fy = null;
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
        if (!selected)
            return null;
        const s = new Set([selected]);
        for (const [a, b] of edges) {
            if (a === selected)
                s.add(b);
            if (b === selected)
                s.add(a);
        }
        return s;
    }, [selected, edges]);
    const searchMatches = useMemo(() => {
        if (!search.trim())
            return null;
        const q = search.trim().toLowerCase();
        const s = new Set();
        for (const n of rawNodes) {
            const hay = `${n.id} ${n.label} ${(n.tags || []).join(' ')}`.toLowerCase();
            if (hay.includes(q))
                s.add(n.id);
        }
        return s;
    }, [search, rawNodes]);
    const degreeById = useMemo(() => {
        const out = {};
        for (const n of rawNodes)
            out[n.id] = 0;
        for (const [a, b] of edges) {
            out[a] = (out[a] || 0) + 1;
            out[b] = (out[b] || 0) + 1;
        }
        return out;
    }, [edges, rawNodes]);
    const isDim = (id, kind) => {
        if (!kindFilter[kind])
            return true;
        if (searchMatches)
            return !searchMatches.has(id);
        if (neighbors)
            return !neighbors.has(id);
        return false;
    };
    const isEdgeDim = (a, b) => {
        if (searchMatches)
            return !(searchMatches.has(a) || searchMatches.has(b));
        if (neighbors)
            return !(neighbors.has(a) && neighbors.has(b));
        return false;
    };
    const labelOpacity = (id) => {
        const z = viewRef.current.zoom;
        const isFocus = selected === id || hover === id;
        if (isFocus)
            return 1;
        if (searchMatches?.has(id))
            return 0.95;
        if (z < tune.labelThreshold)
            return 0;
        return Math.min(0.55, (z - tune.labelThreshold) * 0.75);
    };
    const selectedNode = selected && sim ? sim.byId[selected] : null;
    const selectedDeg = selected ? edges.filter((e) => e[0] === selected || e[1] === selected).length : 0;
    const selectedNote = selected
        ? NOTES.find((n) => n.id === selected) ||
            index.find((n) => n.id === selected || n.path === selected || n.path === selectedNode?.path)
        : null;
    const openNode = (id) => {
        const node = rawNodes.find((n) => n.id === id);
        goToNote(node?.path || id);
    };
    useEffect(() => {
        if (!sim)
            return;
        const t = setTimeout(() => {
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (const n of sim.nodes) {
                if (n.x < minX)
                    minX = n.x;
                if (n.x > maxX)
                    maxX = n.x;
                if (n.y < minY)
                    minY = n.y;
                if (n.y > maxY)
                    maxY = n.y;
            }
            const w = maxX - minX || 1, h = maxY - minY || 1;
            const svg = svgRef.current;
            if (!svg)
                return;
            const r = svg.getBoundingClientRect();
            const z = Math.min(r.width / (w + 200), r.height / (h + 200), 1.4);
            viewRef.current = { x: -(minX + maxX) / 2 * z, y: -(minY + maxY) / 2 * z, zoom: z };
            tick();
        }, 800);
        return () => clearTimeout(t);
    }, [sim, tick]);
    const view = viewRef.current;
    return (_jsxs("div", { className: "gr", children: [_jsxs("svg", { ref: svgRef, onPointerDown: onPanPointerDown, onPointerMove: onPointerMove, onPointerUp: onPointerUp, onPointerCancel: onPointerUp, onClick: (e) => { if (e.target === svgRef.current)
                    setSelected(null); }, children: [_jsx("defs", { children: _jsxs("radialGradient", { id: "halo-focus", cx: "50%", cy: "50%", r: "50%", children: [_jsx("stop", { offset: "0%", stopColor: "#f1f3f7", stopOpacity: "0.34" }), _jsx("stop", { offset: "100%", stopColor: "#f1f3f7", stopOpacity: "0" })] }) }), sim && (() => {
                        const svgRect = svgRef.current?.getBoundingClientRect();
                        const cx = (svgRect?.width || 1240) / 2;
                        const cy = (svgRect?.height || 720) / 2;
                        return (_jsxs("g", { transform: `translate(${cx + view.x} ${cy + view.y}) scale(${view.zoom})`, children: [edges.map(([a, b, kind], i) => {
                                    const na = sim.byId[a], nb = sim.byId[b];
                                    if (!na || !nb)
                                        return null;
                                    const dim = isEdgeDim(a, b) || !kindFilter[na.kind] || !kindFilter[nb.kind];
                                    const st = EDGE_STYLE[kind] || EDGE_STYLE.cites;
                                    return (_jsx("line", { x1: na.x, y1: na.y, x2: nb.x, y2: nb.y, stroke: st.stroke, strokeWidth: st.width / view.zoom, strokeDasharray: st.dash, opacity: dim ? 0.08 : 0.58 }, i));
                                }), sim.nodes.map((n) => {
                                    const dim = isDim(n.id, n.kind);
                                    const isFocus = selected === n.id;
                                    const isHover = hover === n.id;
                                    const c = KIND_COLORS[n.kind] || KIND_COLORS.knowledge;
                                    const baseR = Math.min(9.5, 2.8 + Math.sqrt(degreeById[n.id] || 1) * 0.88);
                                    const r = (isFocus || isHover) ? baseR + 2.8 : baseR;
                                    const textOpacity = labelOpacity(n.id);
                                    return (_jsxs("g", { className: `gr-node ${n.kind}`, opacity: n.faded ? 0.28 : (dim ? 0.16 : 0.92), onPointerDown: (e) => onNodePointerDown(e, n.id), onMouseEnter: () => setHover(n.id), onMouseLeave: () => setHover(null), onDoubleClick: () => openNode(n.id), style: { cursor: 'pointer' }, children: [(isFocus || isHover) && (_jsx("circle", { cx: n.x, cy: n.y, r: 26, fill: "url(#halo-focus)" })), _jsx("circle", { cx: n.x, cy: n.y, r: r, fill: c.fill, stroke: c.stroke, strokeWidth: (isFocus ? 1.8 : 0.8) / view.zoom }), textOpacity > 0.03 && (_jsx("text", { x: n.x, y: n.y + r + 12 / view.zoom, opacity: textOpacity, fontSize: 10 / view.zoom, fill: isFocus || isHover ? '#eef0f4' : '#a8abb1', children: n.label }))] }, n.id));
                                })] }));
                    })()] }), _jsxs("div", { className: "gr-controls", children: [_jsxs("div", { className: "gr-search", children: [_jsxs("svg", { width: "12", height: "12", viewBox: "0 0 12 12", fill: "none", stroke: "var(--cx-fg-3)", strokeWidth: "1.4", children: [_jsx("circle", { cx: "5", cy: "5", r: "3.5" }), _jsx("path", { d: "M8 8l3 3", strokeLinecap: "round" })] }), _jsx("input", { placeholder: "search nodes\u2026", value: search, onChange: (e) => setSearch(e.target.value) }), searchMatches && _jsx("span", { className: "count", children: searchMatches.size })] }), _jsx("div", { className: "gr-chips", children: Object.entries(kindFilter).map(([k, on]) => (_jsxs("span", { className: `gr-chip ${on ? 'on' : ''}`, onClick: () => setKindFilter((kf) => ({ ...kf, [k]: !kf[k] })), children: [_jsx("span", { className: "sw", style: { background: KIND_COLORS[k].stroke } }), k] }, k))) })] }), _jsxs("div", { className: "gr-settings", children: [_jsx("div", { className: "label", children: "\u2014 Forces" }), _jsxs("div", { className: "row", children: [_jsxs("div", { className: "top", children: [_jsx("span", { children: "Link distance" }), _jsx("em", { children: tune.linkDistance })] }), _jsx("input", { type: "range", min: "32", max: "180", step: "2", value: tune.linkDistance, onChange: (e) => setTune((t) => ({ ...t, linkDistance: +e.target.value })) })] }), _jsxs("div", { className: "row", children: [_jsxs("div", { className: "top", children: [_jsx("span", { children: "Repel" }), _jsx("em", { children: tune.repel })] }), _jsx("input", { type: "range", min: "400", max: "3200", step: "50", value: tune.repel, onChange: (e) => setTune((t) => ({ ...t, repel: +e.target.value })) })] }), _jsxs("div", { className: "row", children: [_jsxs("div", { className: "top", children: [_jsx("span", { children: "Center pull" }), _jsx("em", { children: tune.center.toFixed(3) })] }), _jsx("input", { type: "range", min: "0", max: "0.12", step: "0.002", value: tune.center, onChange: (e) => setTune((t) => ({ ...t, center: +e.target.value })) })] }), _jsxs("div", { className: "row", children: [_jsxs("div", { className: "top", children: [_jsx("span", { children: "Label threshold" }), _jsx("em", { children: tune.labelThreshold.toFixed(2) })] }), _jsx("input", { type: "range", min: "0", max: "1.5", step: "0.05", value: tune.labelThreshold, onChange: (e) => setTune((t) => ({ ...t, labelThreshold: +e.target.value })) })] }), _jsx("button", { className: "preset", onClick: () => setTune(OBSIDIAN_TUNE), children: "Obsidian preset" })] }), _jsxs("div", { className: "gr-legend", children: [_jsxs("div", { className: "stat", children: [_jsx("span", { children: "nodes" }), _jsx("span", { className: "n", children: rawNodes.length })] }), _jsxs("div", { className: "stat", children: [_jsx("span", { children: "edges" }), _jsx("span", { className: "n", children: edges.length })] }), _jsxs("div", { className: "stat", children: [_jsx("span", { children: "zoom" }), _jsxs("span", { className: "n", children: [view.zoom.toFixed(2), "\u00D7"] })] }), _jsxs("div", { className: "hint", children: [_jsx("kbd", { children: "drag" }), " pan \u00B7 ", _jsx("kbd", { children: "wheel" }), " zoom \u00B7 ", _jsx("kbd", { children: "click" }), " focus \u00B7 ", _jsx("kbd", { children: "2\u00D7" }), " open"] })] }), selected && selectedNode && (_jsxs("div", { className: "gr-detail", children: [_jsxs("div", { className: "id", children: [selected, " \u00B7 ", selectedNode.kind.toUpperCase()] }), _jsx("h4", { children: selectedNode.label }), selectedNote && selectedNote.lede && _jsx("p", { children: selectedNote.lede }), _jsxs("div", { className: "stats", children: [_jsxs("div", { children: [_jsx("span", { className: "n", children: selectedDeg }), _jsx("span", { className: "l", children: "degree" })] }), _jsxs("div", { children: [_jsx("span", { className: "n", children: edges.filter((e) => e[1] === selected).length }), _jsx("span", { className: "l", children: "in" })] }), _jsxs("div", { children: [_jsx("span", { className: "n", children: edges.filter((e) => e[0] === selected).length }), _jsx("span", { className: "l", children: "out" })] })] }), selectedNote && (_jsx("button", { className: "open", onClick: () => openNode(selected), children: "open in Knowledge \u2192" }))] }))] }));
}
