import React, { useEffect, useMemo, useRef, useState } from 'react';
import { marked } from 'marked';
import { getDocument, searchVault, type SearchHit } from '../lib/mcp';
import { useLiveVault, type VaultEntry, type VaultGroupKey } from '../lib/use-live-vault';

const GROUP_LABELS: Record<VaultGroupKey, string> = {
  canonical: 'Canonical',
  sessions: '10_Sessions',
  decisions: '20_Decisions',
  knowledge: '30_Knowledge',
};

function preprocessWikilinks(md: string) {
  return md.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, id, label) => {
    const safeId = id.trim();
    return `<a class="wikilink" data-id="${safeId}">${(label || safeId).trim()}</a>`;
  });
}

// Strip an Obsidian-style YAML frontmatter block off the top of a doc and
// return both halves. Marked would render the leading `---` as a horizontal
// rule otherwise.
function splitFrontmatter(body: string): { fm: Record<string, string>; rest: string } {
  const m = body.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { fm: {}, rest: body };
  const fm: Record<string, string> = {};
  for (const line of m[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    fm[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return { fm, rest: m[2] };
}

function fileName(path: string): string {
  return path.split('/').pop() || path;
}

function titleFor(path: string, fm: Record<string, string>, fallback?: string): string {
  return fm.title || fallback || fileName(path).replace(/\.md$/, '');
}

interface KnowledgeProps {
  path: string;
  onSelectPath: (path: string) => void;
  hideTree?: boolean;
}

export function KnowledgeView({ path, onSelectPath, hideTree }: KnowledgeProps) {
  const vault = useLiveVault();
  const [filter, setFilter] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [doc, setDoc] = useState<{ path: string; body: string } | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  // Debounced server-side search.
  useEffect(() => {
    const q = filter.trim();
    if (!q) {
      setHits([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const id = setTimeout(() => {
      searchVault(q, 12)
        .then((h) => setHits(h))
        .catch(() => setHits([]))
        .finally(() => setSearching(false));
    }, 220);
    return () => clearTimeout(id);
  }, [filter]);

  // Fetch document body when path changes.
  useEffect(() => {
    if (!path) return;
    setDocLoading(true);
    setDocError(null);
    let cancelled = false;
    getDocument(path)
      .then((d) => {
        if (cancelled) return;
        setDoc(d);
      })
      .catch((err) => {
        if (cancelled) return;
        setDocError(String(err.message || err));
        setDoc(null);
      })
      .finally(() => {
        if (!cancelled) setDocLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  const { fm, rest } = useMemo(() => splitFrontmatter(doc?.body || ''), [doc]);

  const { html, outline } = useMemo(() => {
    if (!rest) return { html: '', outline: [] as { level: string; text: string; slug: string }[] };
    const pre = preprocessWikilinks(rest);
    const html = marked.parse(pre) as string;
    const outline: { level: string; text: string; slug: string }[] = [];
    const re = /<h([23])[^>]*>([^<]+)<\/h\1>/g;
    let m;
    while ((m = re.exec(html))) {
      const text = m[2].trim();
      const slug = text.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');
      outline.push({ level: m[1], text, slug });
    }
    return { html, outline };
  }, [rest]);

  const docRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!docRef.current) return;
    docRef.current.querySelectorAll('h2, h3').forEach((h) => {
      const slug = (h.textContent || '').toLowerCase().replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');
      h.id = slug;
    });
    docRef.current.querySelectorAll<HTMLAnchorElement>('a.wikilink').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const target = a.dataset.id!;
        // Try to resolve a wikilink to a known vault path.
        const guess = guessPath(target, vault.entries);
        if (guess) onSelectPath(guess);
      });
    });
    // Rewrite relative Obsidian-style links ([Foo](Foo.md)) to navigate.
    docRef.current.querySelectorAll<HTMLAnchorElement>('a').forEach((a) => {
      if (a.classList.contains('wikilink')) return;
      const href = a.getAttribute('href') || '';
      if (!href || /^(https?:|mailto:|#)/.test(href)) return;
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const decoded = decodeURIComponent(href.replace(/^\.\//, ''));
        onSelectPath(decoded.split('#')[0]);
      });
    });
  }, [html, onSelectPath, vault.entries]);

  const grouped = useMemo(() => {
    const out: Record<VaultGroupKey, VaultEntry[]> = {
      canonical: [], sessions: [], decisions: [], knowledge: [],
    };
    for (const e of vault.entries) out[e.group].push(e);
    return out;
  }, [vault.entries]);

  const showSearchResults = filter.trim().length > 0;

  return (
    <div className="kn">
      {!hideTree && (
        <aside className="tree-pane">
          <div className="head">
            <span className="l">— Vault</span>
            <span style={{ marginLeft: 'auto', fontFamily: 'var(--cx-mono)', fontSize: 10, color: 'var(--cx-fg-3)' }}>
              {vault.loading ? 'loading…' : `${vault.entries.length} indexed`}
            </span>
          </div>
          <div className="search">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--cx-fg-3)" strokeWidth="1.4">
              <circle cx="5" cy="5" r="3.5" /><path d="M8 8l3 3" strokeLinecap="round" />
            </svg>
            <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="search vault…" />
            {searching && (
              <span style={{ fontFamily: 'var(--cx-mono)', fontSize: 10, color: 'var(--cx-fg-3)' }}>…</span>
            )}
          </div>

          {vault.error && (
            <div style={{ padding: '0 14px 12px', fontFamily: 'var(--cx-mono)', fontSize: 11, color: 'var(--cx-del)' }}>
              MCP error: {vault.error}
            </div>
          )}

          <div className="list">
            {showSearchResults ? (
              <>
                <div className="kn-row group-label">— Search · {hits.length}</div>
                {hits.length === 0 && !searching && (
                  <div style={{ padding: '4px 16px', fontSize: 12, color: 'var(--cx-fg-3)' }}>— no matches —</div>
                )}
                {hits.map((h, i) => (
                  <div key={i}
                    className={`kn-row file ${doc?.path === h.path ? 'active' : ''}`}
                    style={{ paddingLeft: 16, alignItems: 'flex-start', flexDirection: 'column', gap: 2 }}
                    onClick={() => onSelectPath(h.path)}>
                    <span className="name" style={{ fontSize: 11.5 }}>{fileName(h.path)}</span>
                    {h.heading && (
                      <span style={{ fontFamily: 'var(--cx-mono)', fontSize: 10, color: 'var(--cx-fg-3)' }}>
                        › {h.heading}
                      </span>
                    )}
                    {h.snippet && (
                      <span style={{ fontSize: 11, color: 'var(--cx-fg-2)', lineHeight: 1.4, paddingLeft: 0 }}>
                        {h.snippet.slice(0, 110)}{h.snippet.length > 110 ? '…' : ''}
                      </span>
                    )}
                  </div>
                ))}
              </>
            ) : (
              (Object.keys(GROUP_LABELS) as VaultGroupKey[]).map((gk) => {
                const items = grouped[gk];
                if (!items.length) return null;
                return (
                  <div key={gk}>
                    <div className="kn-row group-label">— {GROUP_LABELS[gk]}</div>
                    {items.map((n) => (
                      <div key={n.path}
                        className={`kn-row file ${doc?.path === n.path ? 'active' : ''}`}
                        style={{ paddingLeft: 16 }}
                        onClick={() => onSelectPath(n.path)}>
                        <span className="ico">
                          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3">
                            <path d="M3 1.5h4.5L9.5 3.5v7h-6.5z" /><path d="M7.5 1.5v2h2" />
                          </svg>
                        </span>
                        <span className="name">{fileName(n.path)}</span>
                      </div>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </aside>
      )}

      <main className="doc-pane">
        <div className="doc-head">
          <span className="path">{path}</span>
          <div className="actions">
            <span style={{ fontFamily: 'var(--cx-mono)', fontSize: 10.5, color: 'var(--cx-fg-3)' }}>
              {docLoading ? '— loading' : doc ? '— live · cortex-mcp' : ''}
            </span>
          </div>
        </div>
        {docError && (
          <article className="doc">
            <div style={{ color: 'var(--cx-del)', fontFamily: 'var(--cx-mono)', fontSize: 13 }}>
              Failed to load <code>{path}</code>: {docError}
            </div>
          </article>
        )}
        {!docError && doc && (
          <article className="doc" ref={docRef}>
            <h1>{titleFor(path, fm)}</h1>
            {fm.lede && <div className="lede">{fm.lede}</div>}
            {Object.keys(fm).length > 0 && (
              <div className="fm">
                {Object.entries(fm).map(([k, v]) => (
                  <React.Fragment key={k}>
                    <span className="k">{k}</span>
                    <span className={`v ${k === 'status' && (v === 'canonical' || v === 'accepted') ? 'good' : ''} ${k === 'tags' ? 'accent' : ''}`}>{v}</span>
                  </React.Fragment>
                ))}
              </div>
            )}
            <div dangerouslySetInnerHTML={{ __html: html }} />
          </article>
        )}
      </main>

      <aside className="meta-pane">
        <div>
          <div className="label">— Outline</div>
          <div className="outline">
            {outline.length === 0 && <span style={{ color: 'var(--cx-fg-3)', fontSize: 12 }}>— no headings —</span>}
            {outline.map((o, i) => (
              <a key={i} className={`h${o.level}`}
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById(o.slug);
                  if (el && docRef.current?.parentElement) {
                    docRef.current.parentElement.scrollTo({ top: el.offsetTop - 20, behavior: 'smooth' });
                  }
                }}>
                {o.text}
              </a>
            ))}
          </div>
        </div>

        <div>
          <div className="label">— Source</div>
          <div style={{ fontFamily: 'var(--cx-mono)', fontSize: 11, color: 'var(--cx-fg-2)', lineHeight: 1.7, wordBreak: 'break-all' }}>
            {doc?.path || path}
          </div>
        </div>
      </aside>
    </div>
  );
}

// Wikilinks reference titles or filenames. Try to map them back to a known
// vault path by matching filename stem or title.
function guessPath(target: string, entries: VaultEntry[]): string | null {
  const t = target.trim();
  const norm = t.toLowerCase();
  // Direct path match.
  const direct = entries.find((e) => e.path === t || e.path.toLowerCase() === norm);
  if (direct) return direct.path;
  // Filename match.
  const file = entries.find((e) => {
    const stem = fileName(e.path).replace(/\.md$/, '').toLowerCase();
    return stem === norm || stem === norm.replace(/\.md$/, '');
  });
  if (file) return file.path;
  // Title match.
  const byTitle = entries.find((e) => e.title.toLowerCase() === norm);
  if (byTitle) return byTitle.path;
  // Last resort — assume target is a path-relative ref.
  if (t.endsWith('.md') || /^[A-Z0-9_]+$/.test(t)) return t.endsWith('.md') ? t : `${t}.md`;
  return null;
}
