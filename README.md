# Cortex Web

Personal knowledge-base portfolio site at `cortex.sippakorn.page`. Front-end
for the Cortex MCP vault (Markdown, agents, decisions, sessions).

## Stack

- Vite + React 18 + TypeScript
- Hash routing (`#/home`, `#/graph`, `#/decisions/<id>`, `#/ai-role`, `#/browse`, `#/doc/<id>`)
- `marked` for Markdown rendering
- Custom `<image-slot>` web component (localStorage-backed) for role photos

## Pages

| # | Route | View |
|---|-------|------|
| 01 | `#/` | Home — hero, activity feed, stats, explainer |
| 02 | `#/graph` | Obsidian-style force-directed graph (drag · zoom · pan · filter · search) |
| 03 | `#/decisions/<id>` | List + detail with rationale chain SVG |
| 04 | `#/ai-role` | MCP architecture diagram, tool cards, session-log flow, role cards |
| 05 | `#/browse/<id>` | Knowledge browser — tree + Markdown + outline + backlinks |
| — | `#/doc/<id>` | Focused doc detail (tree hidden) |

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # → dist/
npm run preview
```

## Configure MCP (runtime)

Browser-side REST and MCP clients live at `src/lib/cortex-api.ts` and
`src/lib/mcp.ts`. Set:

```bash
# .env
VITE_CORTEX_API_URL=https://cortex-mcp.sippakorn.page       # optional
VITE_CORTEX_API_TOKEN=<token>                               # optional
VITE_CORTEX_MCP_URL=https://cortex-mcp.sippakorn.page/mcp   # optional
VITE_CORTEX_MCP_TOKEN=<token>                                # required for MCP doc/search
```

Security note: `VITE_*` env is bundled into the client. The token is a
public, read-only credential — never put a write-capable token here. If REST
auth requires a real secret, proxy it server-side instead of exposing it in
Vite env.

### Live data coverage

| Tab | Source | Notes |
|---|---|---|
| Home | live REST + sample fallback | stats from `GET /api/stats`; activity is still sample |
| Graph | live REST + sample fallback | nodes/edges from `GET /api/graph` |
| Decisions | sample | rationale chain needs edge data the server doesn't expose |
| AI Role | static | self-documenting |
| **Browse** | **live REST + MCP** | tree from `GET /api/index`; doc body/search still use `cortex_get_document`, `cortex_search` |

Tree shows the live vault index grouped by canonical, sessions, decisions, and
knowledge when the REST API is reachable. It falls back to MCP recent knowledge
plus canonical files if REST is unavailable.

Topbar shows `api live` + `live · cortex-api` once graph, stats, and index have
loaded from REST. Otherwise it keeps the sample fallback visible.

## Source

Design ported from a Claude Design handoff bundle. CSS verbatim
(`src/styles/{tokens,app,app-pages}.css`); JSX → TSX with proper imports,
typed data, web component for image slot. Original `data.js` / `data-extra.js`
split into `src/data/{notes,graph,roles,activity,mcp-tools,rationale}.ts`.
