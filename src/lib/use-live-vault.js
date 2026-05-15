import { useEffect, useState } from 'react';
import { listRecentKnowledge } from './mcp';
import { fetchVaultIndex } from './cortex-api';
const CANONICAL = [
    { path: 'FOUNDATION.md', updated: '', title: 'FOUNDATION' },
    { path: 'NAMING_CONVENTIONS.md', updated: '', title: 'NAMING_CONVENTIONS' },
    { path: 'COMMIT_POLICY.md', updated: '', title: 'COMMIT_POLICY' },
    { path: 'OBSIDIAN.md', updated: '', title: 'OBSIDIAN' },
    { path: 'Home.md', updated: '', title: 'Home' },
];
function classify(path) {
    if (path.startsWith('10_Sessions/'))
        return 'sessions';
    if (path.startsWith('20_Decisions/'))
        return 'decisions';
    if (path.startsWith('30_Knowledge/'))
        return 'knowledge';
    return 'canonical';
}
export function useLiveVault() {
    const [state, setState] = useState({
        entries: CANONICAL.map((e) => ({ ...e, group: classify(e.path) })),
        loading: true,
        error: null,
    });
    useEffect(() => {
        let cancelled = false;
        fetchVaultIndex()
            .catch(() => listRecentKnowledge(50))
            .then((recent) => {
            if (cancelled)
                return;
            const dedup = new Map();
            for (const e of CANONICAL)
                dedup.set(e.path, { ...e, group: classify(e.path) });
            for (const e of recent) {
                dedup.set(e.path, {
                    ...e,
                    updated: e.updated || '',
                    group: classify(e.path),
                });
            }
            setState({
                entries: Array.from(dedup.values()),
                loading: false,
                error: null,
            });
        })
            .catch((err) => {
            if (cancelled)
                return;
            setState((s) => ({ ...s, loading: false, error: String(err.message || err) }));
        });
        return () => {
            cancelled = true;
        };
    }, []);
    return state;
}
