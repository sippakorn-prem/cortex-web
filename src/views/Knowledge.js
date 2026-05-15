import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { marked } from 'marked';
import { getDocument, searchVault } from '../lib/mcp';
import { useLiveVault } from '../lib/use-live-vault';
const GROUP_LABELS = {
    canonical: 'Canonical',
    sessions: '10_Sessions',
    decisions: '20_Decisions',
    knowledge: '30_Knowledge',
};
function preprocessWikilinks(md) {
    return md.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, id, label) => {
        const safeId = id.trim();
        return `<a class="wikilink" data-id="${safeId}">${(label || safeId).trim()}</a>`;
    });
}
// Strip an Obsidian-style YAML frontmatter block off the top of a doc and
// return both halves. Marked would render the leading `---` as a horizontal
// rule otherwise.
function splitFrontmatter(body) {
    const m = body.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!m)
        return { fm: {}, rest: body };
    const fm = {};
    for (const line of m[1].split('\n')) {
        const idx = line.indexOf(':');
        if (idx === -1)
            continue;
        fm[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
    return { fm, rest: m[2] };
}
function fileName(path) {
    return path.split('/').pop() || path;
}
function titleFor(path, fm, fallback) {
    return fm.title || fallback || fileName(path).replace(/\.md$/, '');
}
export function KnowledgeView({ path, onSelectPath, hideTree }) {
    const vault = useLiveVault();
    const [filter, setFilter] = useState('');
    const [hits, setHits] = useState([]);
    const [searching, setSearching] = useState(false);
    const [doc, setDoc] = useState(null);
    const [docLoading, setDocLoading] = useState(false);
    const [docError, setDocError] = useState(null);
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
        if (!path)
            return;
        setDocLoading(true);
        setDocError(null);
        let cancelled = false;
        getDocument(path)
            .then((d) => {
            if (cancelled)
                return;
            setDoc(d);
        })
            .catch((err) => {
            if (cancelled)
                return;
            setDocError(String(err.message || err));
            setDoc(null);
        })
            .finally(() => {
            if (!cancelled)
                setDocLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [path]);
    const { fm, rest } = useMemo(() => splitFrontmatter(doc?.body || ''), [doc]);
    const { html, outline } = useMemo(() => {
        if (!rest)
            return { html: '', outline: [] };
        const pre = preprocessWikilinks(rest);
        const html = marked.parse(pre);
        const outline = [];
        const re = /<h([23])[^>]*>([^<]+)<\/h\1>/g;
        let m;
        while ((m = re.exec(html))) {
            const text = m[2].trim();
            const slug = text.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');
            outline.push({ level: m[1], text, slug });
        }
        return { html, outline };
    }, [rest]);
    const docRef = useRef(null);
    useEffect(() => {
        if (!docRef.current)
            return;
        docRef.current.querySelectorAll('h2, h3').forEach((h) => {
            const slug = (h.textContent || '').toLowerCase().replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');
            h.id = slug;
        });
        docRef.current.querySelectorAll('a.wikilink').forEach((a) => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                const target = a.dataset.id;
                // Try to resolve a wikilink to a known vault path.
                const guess = guessPath(target, vault.entries);
                if (guess)
                    onSelectPath(guess);
            });
        });
        // Rewrite relative Obsidian-style links ([Foo](Foo.md)) to navigate.
        docRef.current.querySelectorAll('a').forEach((a) => {
            if (a.classList.contains('wikilink'))
                return;
            const href = a.getAttribute('href') || '';
            if (!href || /^(https?:|mailto:|#)/.test(href))
                return;
            a.addEventListener('click', (e) => {
                e.preventDefault();
                const decoded = decodeURIComponent(href.replace(/^\.\//, ''));
                onSelectPath(decoded.split('#')[0]);
            });
        });
    }, [html, onSelectPath, vault.entries]);
    const grouped = useMemo(() => {
        const out = {
            canonical: [], sessions: [], decisions: [], knowledge: [],
        };
        for (const e of vault.entries)
            out[e.group].push(e);
        return out;
    }, [vault.entries]);
    const showSearchResults = filter.trim().length > 0;
    return (_jsxs("div", { className: "kn", children: [!hideTree && (_jsxs("aside", { className: "tree-pane", children: [_jsxs("div", { className: "head", children: [_jsx("span", { className: "l", children: "\u2014 Vault" }), _jsx("span", { style: { marginLeft: 'auto', fontFamily: 'var(--cx-mono)', fontSize: 10, color: 'var(--cx-fg-3)' }, children: vault.loading ? 'loading…' : `${vault.entries.length} indexed` })] }), _jsxs("div", { className: "search", children: [_jsxs("svg", { width: "12", height: "12", viewBox: "0 0 12 12", fill: "none", stroke: "var(--cx-fg-3)", strokeWidth: "1.4", children: [_jsx("circle", { cx: "5", cy: "5", r: "3.5" }), _jsx("path", { d: "M8 8l3 3", strokeLinecap: "round" })] }), _jsx("input", { value: filter, onChange: (e) => setFilter(e.target.value), placeholder: "search vault\u2026" }), searching && (_jsx("span", { style: { fontFamily: 'var(--cx-mono)', fontSize: 10, color: 'var(--cx-fg-3)' }, children: "\u2026" }))] }), vault.error && (_jsxs("div", { style: { padding: '0 14px 12px', fontFamily: 'var(--cx-mono)', fontSize: 11, color: 'var(--cx-del)' }, children: ["MCP error: ", vault.error] })), _jsx("div", { className: "list", children: showSearchResults ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "kn-row group-label", children: ["\u2014 Search \u00B7 ", hits.length] }), hits.length === 0 && !searching && (_jsx("div", { style: { padding: '4px 16px', fontSize: 12, color: 'var(--cx-fg-3)' }, children: "\u2014 no matches \u2014" })), hits.map((h, i) => (_jsxs("div", { className: `kn-row file ${doc?.path === h.path ? 'active' : ''}`, style: { paddingLeft: 16, alignItems: 'flex-start', flexDirection: 'column', gap: 2 }, onClick: () => onSelectPath(h.path), children: [_jsx("span", { className: "name", style: { fontSize: 11.5 }, children: fileName(h.path) }), h.heading && (_jsxs("span", { style: { fontFamily: 'var(--cx-mono)', fontSize: 10, color: 'var(--cx-fg-3)' }, children: ["\u203A ", h.heading] })), h.snippet && (_jsxs("span", { style: { fontSize: 11, color: 'var(--cx-fg-2)', lineHeight: 1.4, paddingLeft: 0 }, children: [h.snippet.slice(0, 110), h.snippet.length > 110 ? '…' : ''] }))] }, i)))] })) : (Object.keys(GROUP_LABELS).map((gk) => {
                            const items = grouped[gk];
                            if (!items.length)
                                return null;
                            return (_jsxs("div", { children: [_jsxs("div", { className: "kn-row group-label", children: ["\u2014 ", GROUP_LABELS[gk]] }), items.map((n) => (_jsxs("div", { className: `kn-row file ${doc?.path === n.path ? 'active' : ''}`, style: { paddingLeft: 16 }, onClick: () => onSelectPath(n.path), children: [_jsx("span", { className: "ico", children: _jsxs("svg", { width: "11", height: "11", viewBox: "0 0 12 12", fill: "none", stroke: "currentColor", strokeWidth: "1.3", children: [_jsx("path", { d: "M3 1.5h4.5L9.5 3.5v7h-6.5z" }), _jsx("path", { d: "M7.5 1.5v2h2" })] }) }), _jsx("span", { className: "name", children: fileName(n.path) })] }, n.path)))] }, gk));
                        })) })] })), _jsxs("main", { className: "doc-pane", children: [_jsxs("div", { className: "doc-head", children: [_jsx("span", { className: "path", children: path }), _jsx("div", { className: "actions", children: _jsx("span", { style: { fontFamily: 'var(--cx-mono)', fontSize: 10.5, color: 'var(--cx-fg-3)' }, children: docLoading ? '— loading' : doc ? '— live · cortex-mcp' : '' }) })] }), docError && (_jsx("article", { className: "doc", children: _jsxs("div", { style: { color: 'var(--cx-del)', fontFamily: 'var(--cx-mono)', fontSize: 13 }, children: ["Failed to load ", _jsx("code", { children: path }), ": ", docError] }) })), !docError && doc && (_jsxs("article", { className: "doc", ref: docRef, children: [_jsx("h1", { children: titleFor(path, fm) }), fm.lede && _jsx("div", { className: "lede", children: fm.lede }), Object.keys(fm).length > 0 && (_jsx("div", { className: "fm", children: Object.entries(fm).map(([k, v]) => (_jsxs(React.Fragment, { children: [_jsx("span", { className: "k", children: k }), _jsx("span", { className: `v ${k === 'status' && (v === 'canonical' || v === 'accepted') ? 'good' : ''} ${k === 'tags' ? 'accent' : ''}`, children: v })] }, k))) })), _jsx("div", { dangerouslySetInnerHTML: { __html: html } })] }))] }), _jsxs("aside", { className: "meta-pane", children: [_jsxs("div", { children: [_jsx("div", { className: "label", children: "\u2014 Outline" }), _jsxs("div", { className: "outline", children: [outline.length === 0 && _jsx("span", { style: { color: 'var(--cx-fg-3)', fontSize: 12 }, children: "\u2014 no headings \u2014" }), outline.map((o, i) => (_jsx("a", { className: `h${o.level}`, onClick: (e) => {
                                            e.preventDefault();
                                            const el = document.getElementById(o.slug);
                                            if (el && docRef.current?.parentElement) {
                                                docRef.current.parentElement.scrollTo({ top: el.offsetTop - 20, behavior: 'smooth' });
                                            }
                                        }, children: o.text }, i)))] })] }), _jsxs("div", { children: [_jsx("div", { className: "label", children: "\u2014 Source" }), _jsx("div", { style: { fontFamily: 'var(--cx-mono)', fontSize: 11, color: 'var(--cx-fg-2)', lineHeight: 1.7, wordBreak: 'break-all' }, children: doc?.path || path })] })] })] }));
}
// Wikilinks reference titles or filenames. Try to map them back to a known
// vault path by matching filename stem or title.
function guessPath(target, entries) {
    const t = target.trim();
    const norm = t.toLowerCase();
    // Direct path match.
    const direct = entries.find((e) => e.path === t || e.path.toLowerCase() === norm);
    if (direct)
        return direct.path;
    // Filename match.
    const file = entries.find((e) => {
        const stem = fileName(e.path).replace(/\.md$/, '').toLowerCase();
        return stem === norm || stem === norm.replace(/\.md$/, '');
    });
    if (file)
        return file.path;
    // Title match.
    const byTitle = entries.find((e) => e.title.toLowerCase() === norm);
    if (byTitle)
        return byTitle.path;
    // Last resort — assume target is a path-relative ref.
    if (t.endsWith('.md') || /^[A-Z0-9_]+$/.test(t))
        return t.endsWith('.md') ? t : `${t}.md`;
    return null;
}
