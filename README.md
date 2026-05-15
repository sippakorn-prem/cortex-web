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

Browser-side MCP client lives at `src/lib/mcp.ts`. Set:

```bash
# .env
VITE_CORTEX_MCP_URL=https://cortex-mcp.sippakorn.page/mcp   # optional
VITE_CORTEX_MCP_TOKEN=<token>                                # required for live
```

Security note: `VITE_*` env is bundled into the client. The token is a
public, read-only credential — never put a write-capable token here. The MCP
server enforces CORS + scope at the edge.

### Live data coverage

| Tab | Source | Notes |
|---|---|---|
| Home | sample | server has no activity/stats endpoint |
| Graph | sample | server has no graph endpoint |
| Decisions | sample | rationale chain needs edge data the server doesn't expose |
| AI Role | static | self-documenting |
| **Browse** | **live MCP** | tree, doc body, search wired via `cortex_list_recent_knowledge`, `cortex_get_document`, `cortex_search` |

Tree shows canonical files + `30_Knowledge/` (server's `cortex_list_recent_knowledge` is scoped to that folder). Other folders are surfaced via the search bar — type a query and the results list takes over the left pane.

Topbar shows `mcp healthy` + `live · cortex-mcp` on the Browse tab when the token is set and `/health` is `ok`.

## Source

Design ported from a Claude Design handoff bundle. CSS verbatim
(`src/styles/{tokens,app,app-pages}.css`); JSX → TSX with proper imports,
typed data, web component for image slot. Original `data.js` / `data-extra.js`
split into `src/data/{notes,graph,roles,activity,mcp-tools,rationale}.ts`.
