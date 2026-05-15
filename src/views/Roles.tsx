import React from 'react';
import { ROLES } from '../data/roles';

export function RolesView({
  goToNote,
  hideHeader,
}: {
  goToNote: (id: string) => void;
  hideHeader?: boolean;
}) {
  return (
    <div className="rl">
      {!hideHeader && (
        <div className="header">
          <div className="eyebrow"><span className="n">03</span><span className="em">—</span>Roles</div>
          <h1>Define your AI team.</h1>
          <div className="lede">
            Each role is a written-down contract: what it reads, what it may write,
            and how it should behave. Every role inherits FOUNDATION.md.
          </div>
          <div className="toolbar">
            <button className="new">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M5.5 1.5v8M1.5 5.5h8" strokeLinecap="round" />
              </svg>
              new role
            </button>
            <span style={{ width: 1, height: 18, background: 'var(--cx-border-2)' }} />
            <span className="stat">
              <span className="dot" />
              {ROLES.filter((r) => r.status === 'active').length} active
            </span>
            <span style={{ color: 'var(--cx-fg-4)' }}>·</span>
            <span className="stat">
              <span className="dot" style={{ background: 'var(--cx-fg-3)' }} />
              {ROLES.filter((r) => r.status === 'draft').length} draft
            </span>
            <span style={{ color: 'var(--cx-fg-4)' }}>·</span>
            <span>imports FOUNDATION.md</span>
          </div>
        </div>
      )}

      <div className="grid">
        {ROLES.map((r) => (
          <article key={r.id} className={`rl-card ${r.status === 'draft' ? 'draft' : ''}`}>
            <div className="head">
              <div className="head-photo">
                <image-slot
                  id={`role-${r.id}`}
                  shape="circle"
                  style={{ width: '72px', height: '72px' }}
                  placeholder="drop photo"
                />
                <div className="glyph-badge">{r.glyph}</div>
              </div>
              <div className="info">
                <div className="name">{r.name}</div>
                <div className="one-liner">{r.one_liner}</div>
              </div>
              <div className={`status ${r.status}`}>{r.status}</div>
            </div>

            <div className="meta-row">
              <span className="k">model</span><span className="v accent">{r.model}</span>
              <span className="k">runtime</span><span className="v">{r.runtime}</span>
              <span className="k">writes</span><span className="v">{r.folders.join(', ')}</span>
              <span className="k">denied</span><span className="v">{r.deny.join(', ')}</span>
            </div>

            <div className="section">
              <div className="label">— System prompt</div>
              <div className="prompt">{r.prompt}</div>
            </div>

            <div className="section">
              <div className="label">— Tools</div>
              <div className="pills">
                {r.tools.map((t) => (
                  <span key={t} className={`pill ${t.includes('edit') || t === 'bash' ? 'allow' : ''}`}>{t}</span>
                ))}
              </div>
            </div>

            <div className="section">
              <div className="label">— References</div>
              <div className="pills">
                {r.refs.map((id) => (
                  <span key={id} className="pill" style={{ cursor: 'pointer' }}
                    onClick={() => goToNote(id)}>
                    [[{id}]]
                  </span>
                ))}
              </div>
            </div>

            <div className="footer">
              <button className="btn">edit</button>
              <button className="btn">duplicate</button>
              <button className="btn">disable</button>
              <span className="updated">updated {r.updated}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
