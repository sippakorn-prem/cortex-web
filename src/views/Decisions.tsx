import React, { useEffect, useMemo, useRef, useState, Fragment } from 'react';
import { marked } from 'marked';
import { NOTES } from '../data/notes';
import { RATIONALE } from '../data/rationale';
import type { Note } from '../data/types';

function RationaleChain({ decisionId, onNavigate }: { decisionId: string; onNavigate: (id: string) => void }) {
  const rationale = RATIONALE[decisionId];
  const note = NOTES.find((n) => n.id === decisionId);
  if (!rationale || !note) return <div className="empty">— no rationale —</div>;

  const W = 880, H = 320;
  const CX = W / 2, CY = H / 2;

  const cites = rationale.cites.slice(0, 4);
  const sources = rationale.sources.slice(0, 4);
  const supersedes = rationale.supersedes;
  const derivedTo = rationale.derivedTo.slice(0, 2);

  const spread = (n: number, totalW: number, off: number) => {
    if (n === 0) return [] as { x: number; y: number }[];
    if (n === 1) return [{ x: CX, y: off }];
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

  const Node = ({
    x, y, kind, label, id, big, faded, dashed,
  }: {
    x: number; y: number; kind: string; label?: string; id?: string;
    big?: boolean; faded?: boolean; dashed?: boolean;
  }) => {
    const c =
      kind === 'decision'
        ? { fill: 'oklch(0.30 0.07 60)', stroke: 'oklch(0.78 0.13 60)', text: 'oklch(0.85 0.14 60)' }
        : kind === 'knowledge'
        ? { fill: '#0d0c0a', stroke: '#ECE7DC', text: '#ECE7DC' }
        : { fill: '#1c1b18', stroke: '#7a7468', text: '#908A7E' };
    const r = big ? 14 : kind === 'session' ? 6 : 10;
    return (
      <g style={{ cursor: id ? 'pointer' : 'default' }} opacity={faded ? 0.5 : 1}
         onClick={() => id && onNavigate(id)}>
        <circle cx={x} cy={y} r={big ? 38 : 20}
          fill={kind === 'decision' ? 'url(#rc-amber)' : kind === 'knowledge' ? 'url(#rc-cream)' : 'transparent'} />
        <circle cx={x} cy={y} r={r}
          fill={c.fill} stroke={c.stroke} strokeWidth={big ? 2 : 1.2}
          strokeDasharray={dashed ? '4 3' : ''} />
        {big && <circle cx={x} cy={y} r="4.5" fill="oklch(0.85 0.14 60)" />}
        {label && (
          <>
            <text x={x} y={y - r - 9}
              fontFamily="Geist Mono, monospace" fontSize="10"
              fill={c.text} textAnchor="middle"
              letterSpacing="0.05em" style={{ textTransform: 'uppercase' }}>
              {id}
            </text>
            <text x={x} y={y + r + 14}
              fontFamily="Geist, sans-serif" fontSize="11"
              fill={faded ? 'var(--cx-fg-3)' : 'var(--cx-fg-2)'} textAnchor="middle">
              {label.length > 28 ? label.slice(0, 26) + '…' : label}
            </text>
          </>
        )}
      </g>
    );
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="rc-amber" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.85 0.16 60)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="oklch(0.55 0.10 60)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="rc-cream" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ECE7DC" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#ECE7DC" stopOpacity="0" />
        </radialGradient>
      </defs>
      {citePos.map((p, i) => (
        <line key={`c${i}`} x1={CX} y1={CY} x2={p.x} y2={p.y} stroke="#3a3631" strokeWidth="1" />
      ))}
      {sourcePos.map((p, i) => (
        <line key={`s${i}`} x1={CX} y1={CY} x2={p.x} y2={p.y}
          stroke="#26241f" strokeWidth="0.9" strokeDasharray="2 4" />
      ))}
      {supersedes && (
        <line x1={CX} y1={CY} x2={superPos.x} y2={superPos.y}
          stroke="oklch(0.55 0.14 25 / 0.85)" strokeWidth="1.4" strokeDasharray="5 4" />
      )}
      {derivPos.map((p, i) => (
        <line key={`d${i}`} x1={CX} y1={CY} x2={p.x} y2={p.y}
          stroke="oklch(0.62 0.12 60 / 0.85)" strokeWidth="1.4" />
      ))}
      {cites.map((c, i) => <Node key={`cn${i}`} {...citePos[i]} kind="knowledge" label={c.label} id={c.id} />)}
      {sources.map((s, i) => <Node key={`sn${i}`} {...sourcePos[i]} kind="session" label={s.label} id={s.id} />)}
      {supersedes && <Node {...superPos} kind="decision" label={supersedes.label} id={supersedes.id} faded dashed />}
      {derivedTo.map((d, i) => <Node key={`dn${i}`} {...derivPos[i]} kind="decision" label={d.label} id={d.id} />)}
      <Node x={CX} y={CY} kind="decision" big label={note.title} id={note.id} />
      <g fontFamily="Geist Mono, monospace" fontSize="9.5" fill="var(--cx-fg-3)"
         letterSpacing="0.12em" style={{ textTransform: 'uppercase' }}>
        <text x={CX} y={20} textAnchor="middle">— cites —</text>
        <text x={CX} y={H - 8} textAnchor="middle">— sourced from —</text>
        {supersedes && <text x={superPos.x} y={superPos.y - 50} textAnchor="middle">— supersedes —</text>}
        {derivedTo.length > 0 && <text x={derivPos[0].x} y={derivPos[0].y - 50} textAnchor="middle">— derived —</text>}
      </g>
    </svg>
  );
}

function DecBody({ note, onNavigate }: { note: Note; onNavigate: (id: string) => void }) {
  const docRef = useRef<HTMLDivElement>(null);
  const html = useMemo(() => {
    const pre = note.body.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, id, label) => {
      return `<a class="wikilink" data-id="${id.trim()}">${(label || id).trim()}</a>`;
    });
    return marked.parse(pre) as string;
  }, [note]);

  useEffect(() => {
    if (!docRef.current) return;
    docRef.current.querySelectorAll<HTMLAnchorElement>('a.wikilink').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const id = a.dataset.id!;
        const found = NOTES.find(
          (n) => n.id === id || n.title === id || n.path.replace(/\.md$/, '').split('/').pop() === id
        );
        if (found) {
          if (found.kind === 'decision') onNavigate(found.id);
          else window.location.hash = `#/doc/${found.id}`;
        }
      });
    });
  }, [html, onNavigate]);

  return (
    <div className="body-doc">
      {note.fm && (
        <div className="fm">
          {Object.entries(note.fm).map(([k, v]) => (
            <Fragment key={k}>
              <span className="k">{k}</span>
              <span className={`v ${k === 'status' && (v === 'accepted' || v === 'canonical') ? 'good' : ''}`}>{String(v)}</span>
            </Fragment>
          ))}
        </div>
      )}
      <div ref={docRef} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

export function DecisionsView({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
  goToNote: (id: string) => void;
}) {
  const decisions = useMemo(() => NOTES.filter((n) => n.kind === 'decision'), []);
  const note = useMemo(() => decisions.find((d) => d.id === selectedId) || decisions[0], [selectedId, decisions]);
  const [filter, setFilter] = useState<'all' | 'accepted' | 'superseded'>('all');

  const filtered = decisions.filter((d) => {
    if (filter === 'all') return true;
    if (filter === 'accepted') return d.fm?.status === 'accepted';
    if (filter === 'superseded') return d.fm?.supersedes && d.fm.supersedes !== '—';
    return true;
  });

  return (
    <div className="dec">
      <aside className="list-pane">
        <div className="head">
          <div className="eyebrow">— 03 — Decisions</div>
          <h2>Decisions.</h2>
          <div className="chips">
            <span className={`chip ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}>all · {decisions.length}</span>
            <span className={`chip ${filter === 'accepted' ? 'on' : ''}`} onClick={() => setFilter('accepted')}>accepted</span>
            <span className={`chip ${filter === 'superseded' ? 'on' : ''}`} onClick={() => setFilter('superseded')}>w/ supersedes</span>
          </div>
        </div>
        <div className="list">
          {filtered.map((d) => (
            <div key={d.id}
              className={`dec-item ${note && note.id === d.id ? 'active' : ''}`}
              onClick={() => onSelect(d.id)}>
              <div className="row1">
                <span className="id">{d.id}</span>
                <span className="date">{d.fm?.decided || d.updated}</span>
              </div>
              <div className="title">{d.title}</div>
              <div className="row3">
                <span className={`status ${d.fm?.status === 'accepted' ? 'accepted' : 'draft'}`}>
                  {d.fm?.status || 'draft'}
                </span>
                {d.fm?.confidence && <span className="conf">·  {d.fm.confidence} conf.</span>}
              </div>
            </div>
          ))}
        </div>
      </aside>

      <main className="detail-pane">
        {note && (
          <>
            <div className="head">
              <div className="id">
                <span>{note.id}</span>
                <span className="status">{note.fm?.status || 'draft'}</span>
                <span style={{ color: 'var(--cx-fg-4)' }}>·</span>
                <span style={{ color: 'var(--cx-fg-3)' }}>{note.path}</span>
              </div>
              <h1>{note.title}</h1>
              <div className="lede">{note.lede}</div>
            </div>

            <div className="rationale">
              <div className="label">
                <span>— Rationale chain</span>
                <span className="em">/</span>
                <span>what this decision is built on, and what's built on it.</span>
              </div>
              <div className="canvas">
                <RationaleChain decisionId={note.id} onNavigate={(id) => {
                  const f = NOTES.find((n) => n.id === id);
                  if (f && f.kind === 'decision') onSelect(id);
                  else if (f) window.location.hash = `#/doc/${id}`;
                }} />
              </div>
              <div className="key">
                <span className="it"><svg width="20" height="2"><line x1="0" y1="1" x2="20" y2="1" stroke="#3a3631" strokeWidth="1" /></svg> cites knowledge</span>
                <span className="it"><svg width="20" height="2"><line x1="0" y1="1" x2="20" y2="1" stroke="#26241f" strokeWidth="0.9" strokeDasharray="2 4" /></svg> sourced from session</span>
                <span className="it"><svg width="20" height="2"><line x1="0" y1="1" x2="20" y2="1" stroke="oklch(0.55 0.14 25)" strokeWidth="1.4" strokeDasharray="5 4" /></svg> supersedes</span>
                <span className="it"><svg width="20" height="2"><line x1="0" y1="1" x2="20" y2="1" stroke="oklch(0.62 0.12 60)" strokeWidth="1.4" /></svg> derived to</span>
              </div>
            </div>

            <DecBody note={note} onNavigate={onSelect} />
          </>
        )}
      </main>
    </div>
  );
}
