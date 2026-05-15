import { NOTES } from './notes';
import { GRAPH } from './graph';
function computeRationale() {
    const out = {};
    const nodeById = Object.fromEntries(GRAPH.nodes.map((n) => [n.id, n]));
    for (const n of NOTES) {
        if (n.kind !== 'decision')
            continue;
        const r = {
            cites: [],
            sources: [],
            supersedes: null,
            derivedFrom: [],
            derivedTo: [],
        };
        for (const [a, b, kind] of GRAPH.edges) {
            if (a === n.id && kind === 'cites')
                r.cites.push(nodeById[b]);
            if (a === n.id && kind === 'src')
                r.sources.push(nodeById[b]);
            if (a === n.id && kind === 'supersedes')
                r.supersedes = nodeById[b];
            if (a === n.id && kind === 'derived')
                r.derivedTo.push(nodeById[b]);
            if (b === n.id && kind === 'derived')
                r.derivedFrom.push(nodeById[a]);
        }
        out[n.id] = r;
    }
    return out;
}
export const RATIONALE = computeRationale();
