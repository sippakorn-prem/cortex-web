import React from 'react';
import { ACTIVITY, STATS } from '../data/activity';
import type { ActivityItem } from '../data/types';

function Sparkline({ values, color = 'var(--cx-accent)' }: { values: number[]; color?: string }) {
  const W = 120, H = 36, PAD = 2;
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const xs = values.map((_, i) => PAD + (i / (values.length - 1)) * (W - PAD * 2));
  const ys = values.map((v) => H - PAD - ((v - min) / range) * (H - PAD * 2));
  const d = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');
  const area = d + ` L ${xs[xs.length - 1].toFixed(1)} ${H} L ${xs[0].toFixed(1)} ${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <path d={area} fill={color} opacity="0.15" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="2.2" fill={color} />
    </svg>
  );
}

function ActivityRow({ it }: { it: ActivityItem }) {
  const goto = (e: React.MouseEvent) => {
    e.preventDefault();
    if (it.link.startsWith('#')) window.location.hash = it.link.slice(1);
  };
  return (
    <a href={it.link} className="item" onClick={goto}>
      <span className="time">{it.t}</span>
      <span className={`dot ${it.type}`} />
      <div className="body">
        <div className="title">{it.title}</div>
        <div className="meta">
          <span className={`type ${it.type}`}>{it.type}</span>
          {it.agent && (
            <>
              <span style={{ color: 'var(--cx-fg-4)' }}>·</span>
              <span>{it.agent}</span>
            </>
          )}
          {it.tag && (
            <>
              <span style={{ color: 'var(--cx-fg-4)' }}>·</span>
              <span>{it.tag}</span>
            </>
          )}
        </div>
      </div>
      <span className="delta">{it.delta}</span>
    </a>
  );
}

export function HomeView({ stats = STATS }: { stats?: typeof STATS }) {
  const s = stats;
  const nav = (hash: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    window.location.hash = hash;
  };
  return (
    <div className="home">
      <section className="hero">
        <div className="eyebrow"><span className="n">01</span><span className="em">—</span>Home</div>
        <div className="row">
          <div>
            <h1>Cortex</h1>
            <div className="tag">
              An AI-native knowledge system.<br />
              Markdown vault, agents as teammates, every session leaves a trace.
            </div>
            <div className="stats-row">
              <div className="stat"><div className="n">{s.totals.notes}</div><div className="l">— total notes</div></div>
              <div className="stat"><div className="n">{s.totals.knowledge}</div><div className="l">— knowledge</div></div>
              <div className="stat"><div className="n">{s.totals.decisions}</div><div className="l">— decisions</div></div>
              <div className="stat"><div className="n">{s.totals.sessions}</div><div className="l">— sessions</div></div>
            </div>
            <div className="ctas">
              <a className="cta primary" href="#/graph" onClick={nav('#/graph')}>Open the graph →</a>
              <a className="cta" href="#/browse" onClick={nav('#/browse')}>Browse the vault</a>
              <a className="cta" href="#/ai-role" onClick={nav('#/ai-role')}>How AI uses it</a>
            </div>
          </div>
          <div className="glyph-xl" aria-hidden="true">流</div>
        </div>
      </section>

      <section className="section">
        <div className="head">
          <div className="eyebrow"><span className="n">02</span><span className="em">—</span>Recent activity</div>
          <h2>What the vault has done lately.</h2>
          <div className="right"><span className="live">live · auto-refresh</span></div>
        </div>
        <div className="activity">
          {ACTIVITY.map((it, i) => <ActivityRow key={i} it={it} />)}
        </div>
      </section>

      <section className="section">
        <div className="head">
          <div className="eyebrow"><span className="n">03</span><span className="em">—</span>Vault by the numbers</div>
          <h2>Grows by handfuls, not waves.</h2>
          <div className="right">
            <span style={{ marginRight: 18 }}>14-week window</span>
            <span>uptime {s.uptime}</span>
          </div>
        </div>
        <div className="stats-grid">
          <div>
            <div className="l">— notes total</div>
            <div className="n">{s.totals.notes}</div>
            <div className="delta">+{s.this_week.notes_added} this week</div>
            <div className="spark"><Sparkline values={s.growth} /></div>
          </div>
          <div>
            <div className="l">— sessions / wk</div>
            <div className="n">{s.sessions[s.sessions.length - 1]}</div>
            <div className="delta">+{s.this_week.sessions_logged} this week</div>
            <div className="spark"><Sparkline values={s.sessions} color="#ECE7DC" /></div>
          </div>
          <div>
            <div className="l">— promoted</div>
            <div className="n">{s.this_week.promoted}</div>
            <div className="delta">by /curator-apply</div>
            <div className="spark"><Sparkline values={[1, 0, 2, 1, 3, 2, 4, 2, 3, 5, 2, 4, 3, 3]} color="oklch(0.62 0.12 60)" /></div>
          </div>
          <div>
            <div className="l">— vault size</div>
            <div className="n">{s.vault_size}</div>
            <div className="delta">{s.deployed}</div>
            <div className="spark">
              <svg viewBox="0 0 120 36" preserveAspectRatio="none">
                <g fontFamily="Geist Mono, monospace" fontSize="9" fill="var(--cx-fg-3)" letterSpacing="0.04em">
                  <text x="2" y="14">git · main</text>
                  <text x="2" y="28">142 commits</text>
                </g>
              </svg>
            </div>
          </div>
        </div>
      </section>

      <section className="section last">
        <div className="head">
          <div className="eyebrow"><span className="n">04</span><span className="em">—</span>How it works</div>
          <h2>Three ideas, one vault.</h2>
        </div>
        <div className="explainer">
          <div className="card">
            <div className="n">— 01 / vault</div>
            <h3>Plain Markdown over Git.</h3>
            <p>
              Every fact, decision, and session log is a Markdown file in one
              Git repo. <code>10_Sessions/</code> is raw, <code>20_Decisions/</code> and{' '}
              <code>30_Knowledge/</code> are canonical. No SaaS, no lock-in.
            </p>
          </div>
          <div className="card">
            <div className="n">— 02 / agents</div>
            <h3>Two agents that disagree.</h3>
            <p>
              Claude Code writes. Codex reviews cold. They share <code>FOUNDATION.md</code>,
              not context. A separate Curator pass promotes session output into
              canonical knowledge — never inline, never auto.
            </p>
          </div>
          <div className="card">
            <div className="n">— 03 / mcp</div>
            <h3>One MCP, three tools.</h3>
            <p>
              An MCP server exposes <code>cortex_search</code>,{' '}
              <code>cortex_get_document</code>, and <code>cortex_explain_decision</code>.
              Every agent reaches for these before guessing.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
