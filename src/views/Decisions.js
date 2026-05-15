import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState, Fragment } from 'react';
import { marked } from 'marked';
import { NOTES } from '../data/notes';
import { RATIONALE } from '../data/rationale';
function RationaleChain({ decisionId, onNavigate }) {
    const rationale = RATIONALE[decisionId];
    const note = NOTES.find((n) => n.id === decisionId);
    if (!rationale || !note)
        return _jsx("div", { className: "empty", children: "\u2014 no rationale \u2014" });
    const W = 880, H = 320;
    const CX = W / 2, CY = H / 2;
    const cites = rationale.cites.slice(0, 4);
    const sources = rationale.sources.slice(0, 4);
    const supersedes = rationale.supersedes;
    const derivedTo = rationale.derivedTo.slice(0, 2);
    const spread = (n, totalW, off) => {
        if (n === 0)
            return [];
        if (n === 1)
            return [{ x: CX, y: off }];
        const step = totalW / (n - 1);
        return Array.from({ length: n }, (_, i) => ({ x: CX - totalW / 2 + i * step, y: off }));
    };
    const citePos = spread(cites.length, 520, 50);
    const sourcePos = spread(sources.length, 520, H - 50);
    const superPos = { x: 80, y: CY };
    const derivPos = derivedTo.length
        ? spread(derivedTo.length, 0, CY).map((_, i) => ({
            x: W - 80,
            y: CY - (derivedTo.length - 1) * 40 / 2 + i * 40,
        }))
        : [];
    const Node = ({ x, y, kind, label, id, big, faded, dashed, }) => {
        const c = kind === 'decision'
            ? { fill: 'oklch(0.30 0.07 60)', stroke: 'oklch(0.78 0.13 60)', text: 'oklch(0.85 0.14 60)' }
            : kind === 'knowledge'
                ? { fill: '#0d0c0a', stroke: '#ECE7DC', text: '#ECE7DC' }
                : { fill: '#1c1b18', stroke: '#7a7468', text: '#908A7E' };
        const r = big ? 14 : kind === 'session' ? 6 : 10;
        return (_jsxs("g", { style: { cursor: id ? 'pointer' : 'default' }, opacity: faded ? 0.5 : 1, onClick: () => id && onNavigate(id), children: [_jsx("circle", { cx: x, cy: y, r: big ? 38 : 20, fill: kind === 'decision' ? 'url(#rc-amber)' : kind === 'knowledge' ? 'url(#rc-cream)' : 'transparent' }), _jsx("circle", { cx: x, cy: y, r: r, fill: c.fill, stroke: c.stroke, strokeWidth: big ? 2 : 1.2, strokeDasharray: dashed ? '4 3' : '' }), big && _jsx("circle", { cx: x, cy: y, r: "4.5", fill: "oklch(0.85 0.14 60)" }), label && (_jsxs(_Fragment, { children: [_jsx("text", { x: x, y: y - r - 9, fontFamily: "Geist Mono, monospace", fontSize: "10", fill: c.text, textAnchor: "middle", letterSpacing: "0.05em", style: { textTransform: 'uppercase' }, children: id }), _jsx("text", { x: x, y: y + r + 14, fontFamily: "Geist, sans-serif", fontSize: "11", fill: faded ? 'var(--cx-fg-3)' : 'var(--cx-fg-2)', textAnchor: "middle", children: label.length > 28 ? label.slice(0, 26) + '…' : label })] }))] }));
    };
    return (_jsxs("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "xMidYMid meet", children: [_jsxs("defs", { children: [_jsxs("radialGradient", { id: "rc-amber", cx: "50%", cy: "50%", r: "50%", children: [_jsx("stop", { offset: "0%", stopColor: "oklch(0.85 0.16 60)", stopOpacity: "0.55" }), _jsx("stop", { offset: "100%", stopColor: "oklch(0.55 0.10 60)", stopOpacity: "0" })] }), _jsxs("radialGradient", { id: "rc-cream", cx: "50%", cy: "50%", r: "50%", children: [_jsx("stop", { offset: "0%", stopColor: "#ECE7DC", stopOpacity: "0.18" }), _jsx("stop", { offset: "100%", stopColor: "#ECE7DC", stopOpacity: "0" })] })] }), citePos.map((p, i) => (_jsx("line", { x1: CX, y1: CY, x2: p.x, y2: p.y, stroke: "#3a3631", strokeWidth: "1" }, `c${i}`))), sourcePos.map((p, i) => (_jsx("line", { x1: CX, y1: CY, x2: p.x, y2: p.y, stroke: "#26241f", strokeWidth: "0.9", strokeDasharray: "2 4" }, `s${i}`))), supersedes && (_jsx("line", { x1: CX, y1: CY, x2: superPos.x, y2: superPos.y, stroke: "oklch(0.55 0.14 25 / 0.85)", strokeWidth: "1.4", strokeDasharray: "5 4" })), derivPos.map((p, i) => (_jsx("line", { x1: CX, y1: CY, x2: p.x, y2: p.y, stroke: "oklch(0.62 0.12 60 / 0.85)", strokeWidth: "1.4" }, `d${i}`))), cites.map((c, i) => _jsx(Node, { ...citePos[i], kind: "knowledge", label: c.label, id: c.id }, `cn${i}`)), sources.map((s, i) => _jsx(Node, { ...sourcePos[i], kind: "session", label: s.label, id: s.id }, `sn${i}`)), supersedes && _jsx(Node, { ...superPos, kind: "decision", label: supersedes.label, id: supersedes.id, faded: true, dashed: true }), derivedTo.map((d, i) => _jsx(Node, { ...derivPos[i], kind: "decision", label: d.label, id: d.id }, `dn${i}`)), _jsx(Node, { x: CX, y: CY, kind: "decision", big: true, label: note.title, id: note.id }), _jsxs("g", { fontFamily: "Geist Mono, monospace", fontSize: "9.5", fill: "var(--cx-fg-3)", letterSpacing: "0.12em", style: { textTransform: 'uppercase' }, children: [_jsx("text", { x: CX, y: 20, textAnchor: "middle", children: "\u2014 cites \u2014" }), _jsx("text", { x: CX, y: H - 8, textAnchor: "middle", children: "\u2014 sourced from \u2014" }), supersedes && _jsx("text", { x: superPos.x, y: superPos.y - 50, textAnchor: "middle", children: "\u2014 supersedes \u2014" }), derivedTo.length > 0 && _jsx("text", { x: derivPos[0].x, y: derivPos[0].y - 50, textAnchor: "middle", children: "\u2014 derived \u2014" })] })] }));
}
function DecBody({ note, onNavigate }) {
    const docRef = useRef(null);
    const html = useMemo(() => {
        const pre = note.body.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, id, label) => {
            return `<a class="wikilink" data-id="${id.trim()}">${(label || id).trim()}</a>`;
        });
        return marked.parse(pre);
    }, [note]);
    useEffect(() => {
        if (!docRef.current)
            return;
        docRef.current.querySelectorAll('a.wikilink').forEach((a) => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                const id = a.dataset.id;
                const found = NOTES.find((n) => n.id === id || n.title === id || n.path.replace(/\.md$/, '').split('/').pop() === id);
                if (found) {
                    if (found.kind === 'decision')
                        onNavigate(found.id);
                    else
                        window.location.hash = `#/doc/${found.id}`;
                }
            });
        });
    }, [html, onNavigate]);
    return (_jsxs("div", { className: "body-doc", children: [note.fm && (_jsx("div", { className: "fm", children: Object.entries(note.fm).map(([k, v]) => (_jsxs(Fragment, { children: [_jsx("span", { className: "k", children: k }), _jsx("span", { className: `v ${k === 'status' && (v === 'accepted' || v === 'canonical') ? 'good' : ''}`, children: String(v) })] }, k))) })), _jsx("div", { ref: docRef, dangerouslySetInnerHTML: { __html: html } })] }));
}
export function DecisionsView({ selectedId, onSelect, }) {
    const decisions = useMemo(() => NOTES.filter((n) => n.kind === 'decision'), []);
    const note = useMemo(() => decisions.find((d) => d.id === selectedId) || decisions[0], [selectedId, decisions]);
    const [filter, setFilter] = useState('all');
    const filtered = decisions.filter((d) => {
        if (filter === 'all')
            return true;
        if (filter === 'accepted')
            return d.fm?.status === 'accepted';
        if (filter === 'superseded')
            return d.fm?.supersedes && d.fm.supersedes !== '—';
        return true;
    });
    return (_jsxs("div", { className: "dec", children: [_jsxs("aside", { className: "list-pane", children: [_jsxs("div", { className: "head", children: [_jsx("div", { className: "eyebrow", children: "\u2014 03 \u2014 Decisions" }), _jsx("h2", { children: "Decisions." }), _jsxs("div", { className: "chips", children: [_jsxs("span", { className: `chip ${filter === 'all' ? 'on' : ''}`, onClick: () => setFilter('all'), children: ["all \u00B7 ", decisions.length] }), _jsx("span", { className: `chip ${filter === 'accepted' ? 'on' : ''}`, onClick: () => setFilter('accepted'), children: "accepted" }), _jsx("span", { className: `chip ${filter === 'superseded' ? 'on' : ''}`, onClick: () => setFilter('superseded'), children: "w/ supersedes" })] })] }), _jsx("div", { className: "list", children: filtered.map((d) => (_jsxs("div", { className: `dec-item ${note && note.id === d.id ? 'active' : ''}`, onClick: () => onSelect(d.id), children: [_jsxs("div", { className: "row1", children: [_jsx("span", { className: "id", children: d.id }), _jsx("span", { className: "date", children: d.fm?.decided || d.updated })] }), _jsx("div", { className: "title", children: d.title }), _jsxs("div", { className: "row3", children: [_jsx("span", { className: `status ${d.fm?.status === 'accepted' ? 'accepted' : 'draft'}`, children: d.fm?.status || 'draft' }), d.fm?.confidence && _jsxs("span", { className: "conf", children: ["\u00B7  ", d.fm.confidence, " conf."] })] })] }, d.id))) })] }), _jsx("main", { className: "detail-pane", children: note && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "head", children: [_jsxs("div", { className: "id", children: [_jsx("span", { children: note.id }), _jsx("span", { className: "status", children: note.fm?.status || 'draft' }), _jsx("span", { style: { color: 'var(--cx-fg-4)' }, children: "\u00B7" }), _jsx("span", { style: { color: 'var(--cx-fg-3)' }, children: note.path })] }), _jsx("h1", { children: note.title }), _jsx("div", { className: "lede", children: note.lede })] }), _jsxs("div", { className: "rationale", children: [_jsxs("div", { className: "label", children: [_jsx("span", { children: "\u2014 Rationale chain" }), _jsx("span", { className: "em", children: "/" }), _jsx("span", { children: "what this decision is built on, and what's built on it." })] }), _jsx("div", { className: "canvas", children: _jsx(RationaleChain, { decisionId: note.id, onNavigate: (id) => {
                                            const f = NOTES.find((n) => n.id === id);
                                            if (f && f.kind === 'decision')
                                                onSelect(id);
                                            else if (f)
                                                window.location.hash = `#/doc/${id}`;
                                        } }) }), _jsxs("div", { className: "key", children: [_jsxs("span", { className: "it", children: [_jsx("svg", { width: "20", height: "2", children: _jsx("line", { x1: "0", y1: "1", x2: "20", y2: "1", stroke: "#3a3631", strokeWidth: "1" }) }), " cites knowledge"] }), _jsxs("span", { className: "it", children: [_jsx("svg", { width: "20", height: "2", children: _jsx("line", { x1: "0", y1: "1", x2: "20", y2: "1", stroke: "#26241f", strokeWidth: "0.9", strokeDasharray: "2 4" }) }), " sourced from session"] }), _jsxs("span", { className: "it", children: [_jsx("svg", { width: "20", height: "2", children: _jsx("line", { x1: "0", y1: "1", x2: "20", y2: "1", stroke: "oklch(0.55 0.14 25)", strokeWidth: "1.4", strokeDasharray: "5 4" }) }), " supersedes"] }), _jsxs("span", { className: "it", children: [_jsx("svg", { width: "20", height: "2", children: _jsx("line", { x1: "0", y1: "1", x2: "20", y2: "1", stroke: "oklch(0.62 0.12 60)", strokeWidth: "1.4" }) }), " derived to"] })] })] }), _jsx(DecBody, { note: note, onNavigate: onSelect })] })) })] }));
}
