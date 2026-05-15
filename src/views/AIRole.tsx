import React from 'react';
import { MCP_TOOLS } from '../data/mcp-tools';
import { RolesView } from './Roles';

function ArchDiagram() {
  return (
    <svg viewBox="0 0 1200 460" preserveAspectRatio="xMidYMid meet">
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="var(--cx-fg-3)" />
        </marker>
        <marker id="arr-acc" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="oklch(0.72 0.12 60)" />
        </marker>
        <linearGradient id="mcp-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.30 0.07 60 / 0.18)" />
          <stop offset="100%" stopColor="oklch(0.20 0.04 60 / 0.05)" />
        </linearGradient>
      </defs>

      <g>
        <text x={60} y={28} fontFamily="Geist Mono, monospace" fontSize="10.5"
          letterSpacing="0.12em" fill="var(--cx-fg-3)" style={{ textTransform: 'uppercase' }}>— Agents</text>
        {[
          { y: 60,  name: 'Claude Code', sub: 'writer · sonnet-4.5', glyph: '書', dot: 'var(--cx-add)' },
          { y: 180, name: 'Codex',       sub: 'reviewer · gpt-5.1',   glyph: '監', dot: 'var(--cx-add)' },
          { y: 300, name: 'Curator',     sub: 'opus-4.1 · scheduled', glyph: '整', dot: 'oklch(0.72 0.12 60)' },
        ].map((a, i) => (
          <g key={i}>
            <rect x={60} y={a.y} width={200} height={90} rx={3}
              fill="var(--cx-bg-1)" stroke="var(--cx-border-2)" />
            <circle cx={86} cy={a.y + 18} r={4} fill={a.dot} />
            <text x={96} y={a.y + 22} fontFamily="Geist Mono, monospace" fontSize="10"
              letterSpacing="0.08em" fill="var(--cx-fg-3)" style={{ textTransform: 'uppercase' }}>agent</text>
            <text x={80} y={a.y + 50} fontFamily="Instrument Serif, serif" fontSize="22"
              fill="var(--cx-fg)" letterSpacing="-0.3px">{a.name}</text>
            <text x={80} y={a.y + 72} fontFamily="Geist Mono, monospace" fontSize="11"
              fill="var(--cx-fg-2)">{a.sub}</text>
            <text x={244} y={a.y + 80}
              fontFamily="Hiragino Mincho ProN, Yu Mincho, serif"
              fontSize="20" textAnchor="end"
              fill="oklch(0.72 0.12 60)" opacity="0.7">{a.glyph}</text>
          </g>
        ))}
      </g>

      {[105, 225, 345].map((y, i) => (
        <line key={i} x1={260} y1={y} x2={335} y2={y}
          stroke="var(--cx-fg-3)" strokeWidth="1" markerEnd="url(#arr)" />
      ))}
      <text x={295} y={88} textAnchor="middle"
        fontFamily="Geist Mono, monospace" fontSize="10"
        fill="var(--cx-fg-3)" letterSpacing="0.04em">tool call</text>

      <g>
        <text x={340} y={28} fontFamily="Geist Mono, monospace" fontSize="10.5"
          letterSpacing="0.12em" fill="var(--cx-fg-3)" style={{ textTransform: 'uppercase' }}>— MCP server</text>
        <rect x={340} y={40} width={520} height={400} rx={4}
          fill="url(#mcp-bg)" stroke="oklch(0.45 0.10 60 / 0.45)" />
        <text x={360} y={66} fontFamily="Instrument Serif, serif" fontSize="20"
          fill="var(--cx-fg)" letterSpacing="-0.3px">cortex-mcp</text>
        <text x={360} y={86} fontFamily="Geist Mono, monospace" fontSize="11"
          fill="var(--cx-fg-2)">Railway · Bangkok</text>
        <circle cx={840} cy={60} r={4} fill="var(--cx-add)" />
        <text x={832} y={64} fontFamily="Geist Mono, monospace" fontSize="10"
          textAnchor="end" fill="var(--cx-fg-2)" letterSpacing="0.04em">healthy</text>
        {[
          { y: 110, n: '01', name: 'cortex_search',           sig: '(query, type?, limit?)' },
          { y: 200, n: '02', name: 'cortex_get_document',     sig: '(id, include?)' },
          { y: 290, n: '03', name: 'cortex_explain_decision', sig: '(id, depth?)' },
        ].map((t, i) => (
          <g key={i}>
            <rect x={360} y={t.y} width={480} height={70} rx={3}
              fill="var(--cx-bg-1)" stroke="var(--cx-border-2)" />
            <text x={376} y={t.y + 24} fontFamily="Geist Mono, monospace" fontSize="11"
              fill="oklch(0.78 0.12 60)" letterSpacing="0.06em">— {t.n} / tool</text>
            <text x={376} y={t.y + 46} fontFamily="Geist Mono, monospace" fontSize="16"
              fill="var(--cx-fg)">{t.name}</text>
            <text x={376} y={t.y + 62} fontFamily="Geist Mono, monospace" fontSize="11"
              fill="var(--cx-fg-2)">{t.sig}</text>
          </g>
        ))}
        <text x={600} y={400} fontFamily="Geist Mono, monospace" fontSize="11"
          fill="var(--cx-fg-3)" textAnchor="middle" letterSpacing="0.04em">
          markdown vault adapter · git-aware
        </text>
      </g>

      <g>
        <line x1={860} y1={230} x2={935} y2={230}
          stroke="oklch(0.72 0.12 60)" strokeWidth="1.2" markerEnd="url(#arr-acc)" />
        <text x={898} y={216} textAnchor="middle"
          fontFamily="Geist Mono, monospace" fontSize="10"
          fill="oklch(0.78 0.12 60)" letterSpacing="0.04em">read/write</text>
      </g>

      <g>
        <text x={940} y={28} fontFamily="Geist Mono, monospace" fontSize="10.5"
          letterSpacing="0.12em" fill="var(--cx-fg-3)" style={{ textTransform: 'uppercase' }}>— Vault</text>
        <rect x={940} y={40} width={240} height={400} rx={3}
          fill="var(--cx-bg-1)" stroke="var(--cx-border-2)" />
        <text x={956} y={66} fontFamily="Instrument Serif, serif" fontSize="20"
          fill="var(--cx-fg)" letterSpacing="-0.3px">cortex/</text>
        <text x={956} y={86} fontFamily="Geist Mono, monospace" fontSize="11"
          fill="var(--cx-fg-2)">142 notes · Git</text>
        {[
          { y: 120, k: 'FOUNDATION.md',     c: 'oklch(0.78 0.12 60)' },
          { y: 142, k: 'NAMING.md',         c: 'var(--cx-fg-1)' },
          { y: 164, k: 'COMMIT_POLICY.md',  c: 'var(--cx-fg-1)' },
          { y: 200, k: '10_Sessions/',      c: 'var(--cx-fg-1)', count: '38' },
          { y: 240, k: '20_Decisions/',     c: 'oklch(0.78 0.12 60)', count: '24' },
          { y: 280, k: '30_Knowledge/',     c: '#ECE7DC', count: '71' },
          { y: 320, k: '.claude/',          c: 'var(--cx-fg-3)' },
          { y: 360, k: 'scripts/hooks/',    c: 'var(--cx-fg-3)' },
          { y: 400, k: '.git/',             c: 'var(--cx-fg-3)' },
        ].map((row, i) => (
          <g key={i}>
            <text x={956} y={row.y} fontFamily="Geist Mono, monospace" fontSize="12" fill={row.c}>{row.k}</text>
            {row.count && (
              <text x={1164} y={row.y} textAnchor="end"
                fontFamily="Geist Mono, monospace" fontSize="11"
                fill="var(--cx-fg-3)">{row.count}</text>
            )}
          </g>
        ))}
      </g>
    </svg>
  );
}

function FlowDiagram() {
  return (
    <svg viewBox="0 0 1200 220" preserveAspectRatio="xMidYMid meet">
      <defs>
        <marker id="flarr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="var(--cx-fg-3)" />
        </marker>
        <marker id="flarr-acc" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="oklch(0.72 0.12 60)" />
        </marker>
      </defs>
      {[
        { x: 20,   n: '01', name: 'Agent works',      sub: 'session start' },
        { x: 260,  n: '02', name: 'Flags insight',    sub: 'mid-task pause' },
        { x: 500,  n: '03', name: 'Proposes note',    sub: 'no auto-write' },
        { x: 740,  n: '04', name: 'Human accepts',    sub: 'review · approve' },
        { x: 980,  n: '05', name: 'Curator promotes', sub: 'session → canonical', highlight: true },
      ].map((s, i) => (
        <g key={i}>
          <rect x={s.x} y={70} width={200} height={80} rx={3}
            fill="var(--cx-bg-1)"
            stroke={s.highlight ? 'oklch(0.45 0.10 60 / 0.5)' : 'var(--cx-border-2)'} />
          <text x={s.x + 16} y={94}
            fontFamily="Geist Mono, monospace" fontSize="10"
            fill={s.highlight ? 'oklch(0.78 0.12 60)' : 'var(--cx-fg-3)'}
            letterSpacing="0.06em">{`— ${s.n}`}</text>
          <text x={s.x + 16} y={120}
            fontFamily="Instrument Serif, serif" fontSize="18"
            fill="var(--cx-fg)" letterSpacing="-0.2px">{s.name}</text>
          <text x={s.x + 16} y={140}
            fontFamily="Geist Mono, monospace" fontSize="10.5"
            fill="var(--cx-fg-2)">{s.sub}</text>
        </g>
      ))}
      {[[220, 260], [460, 500], [700, 740], [940, 980]].map(([x1, x2], i) => (
        <line key={i} x1={x1} y1={110} x2={x2} y2={110}
          stroke={i === 3 ? 'oklch(0.72 0.12 60)' : 'var(--cx-fg-3)'}
          strokeWidth={i === 3 ? 1.4 : 1}
          markerEnd={`url(#${i === 3 ? 'flarr-acc' : 'flarr'})`} />
      ))}
      <g fontFamily="Geist Mono, monospace" fontSize="10"
         fill="var(--cx-fg-3)" textAnchor="middle" letterSpacing="0.04em">
        <text x={240} y={102}>raw → log</text>
        <text x={480} y={102}>flag</text>
        <text x={720} y={102}>review</text>
        <text x={960} y={102} fill="oklch(0.78 0.12 60)">promote</text>
      </g>
      <line x1={120}  y1={170} x2={120}  y2={188} stroke="var(--cx-fg-3)" strokeWidth="0.8" strokeDasharray="2 3" />
      <line x1={1080} y1={170} x2={1080} y2={188} stroke="oklch(0.72 0.12 60)" strokeWidth="1" strokeDasharray="2 3" />
      <text x={120} y={204} fontFamily="Geist Mono, monospace" fontSize="11"
        fill="var(--cx-fg-3)" textAnchor="middle">10_Sessions/</text>
      <text x={1080} y={204} fontFamily="Geist Mono, monospace" fontSize="11"
        fill="oklch(0.78 0.12 60)" textAnchor="middle">30_Knowledge/ · 20_Decisions/</text>
    </svg>
  );
}

export function AIRoleView({ goToNote }: { goToNote: (id: string) => void }) {
  return (
    <div className="ai">
      <section className="hero">
        <div className="eyebrow"><span className="n">04</span><span className="em">—</span>AI Role</div>
        <h1>How AI uses Cortex.</h1>
        <div className="lede">
          Every agent reaches the same vault through the same three tools.
          What follows is the contract.
        </div>
      </section>

      <section className="section">
        <div className="head">
          <div className="eyebrow"><span className="n">01</span><span className="em">—</span>Architecture</div>
          <h2>Agents talk to one server. The server reads one vault.</h2>
        </div>
        <div className="arch-frame">
          <div className="corner-l">— architecture</div>
          <div className="corner-r">cortex-mcp · v0.4</div>
          <ArchDiagram />
        </div>
      </section>

      <section className="section">
        <div className="head">
          <div className="eyebrow"><span className="n">02</span><span className="em">—</span>MCP tools</div>
          <h2>Three tools, in priority order.</h2>
        </div>
        <div className="tools-grid">
          {MCP_TOOLS.map((t) => (
            <article key={t.id} className="tool-card">
              <div className="head">
                <span className="pri">— 0{t.priority}</span>
                <span className="name">{t.id}</span>
              </div>
              <div className="when">{t.when}</div>
              <p className="purpose">{t.purpose}</p>
              <div className="sig">{t.signature}</div>
              <div className="example">
                <div className="l">— in</div>
                <div className="l">— out</div>
                <pre>{t.example_in}</pre>
                <pre>{t.example_out}</pre>
              </div>
              <div className="used-by">
                <span className="lbl">— used by</span>
                {t.used_by.map((u) => <span key={u} className="who">{u}</span>)}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="head">
          <div className="eyebrow"><span className="n">03</span><span className="em">—</span>Session log flow</div>
          <h2>How a session becomes canonical knowledge.</h2>
        </div>
        <div className="flow-frame">
          <FlowDiagram />
        </div>
      </section>

      <section className="section" style={{ borderBottom: 'none', paddingBottom: 0 }}>
        <div className="head">
          <div className="eyebrow"><span className="n">04</span><span className="em">—</span>The five roles</div>
          <h2>Each agent has a written-down contract.</h2>
        </div>
      </section>
      <div style={{ marginTop: -8 }}>
        <RolesView goToNote={goToNote} hideHeader />
      </div>
    </div>
  );
}
