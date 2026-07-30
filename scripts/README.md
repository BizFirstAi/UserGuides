# Docs build scripts


GitHub Pages serves `docs/` directly from the `main` branch — there is
no Actions build step. Anything these scripts generate must be
committed and pushed like any other file.

## Before every push that touches `docs/`

From the repo root, run the agent script instead of calling
`build-docs.mjs` by hand:

```powershell
.\agents\build-and-push.ps1
```

This builds, stages `docs/`, commits, and pushes in one step. See
`agents/build-and-push.ps1` (`-Message`, `-SkipPagefind`, `-SkipBlog`,
`-NoPush`) for options, or run `Get-Help .\agents\build-and-push.ps1
-Full`.

## Running the build alone

```bash
node scripts/build-docs.mjs
```

Regenerates, in order:

1. **What's New page** (`docs/whats-new/`) — from `git log` of files
   added under `docs/WebSites`.
2. **Coverage dashboard** (`docs/coverage/`) — page counts per product
   area under `docs/WebSites`.
3. **`docs-repo` meta tag** — injected into every page (feeds the
   feedback widget's GitHub Issue links).
4. **OpenGraph / Twitter card tags** — injected into every page.
5. **`shared.js` distribution** — copied to every directory containing
   `shared.css`, `<script>` tag injected into pages that reference it.
6. **Sidebar nav markers** — `data-pagefind-ignore` so nav links don't
   pollute search results.
7. **Blog index** (`docs/blog-search.json`) — fetched from
   `blog.bizfirstai.com/feed`.
8. **RSS feed** (`docs/feed.xml`).
9. **Sitemap** (`docs/sitemap.xml`).
10. **Broken internal link check** — scans every `<a href>` and fails
    the build (non-zero exit) if a linked local file doesn't exist. Fix
    the reported links before committing.
11. **Pagefind search index** (`docs/pagefind/`) — via `npx pagefind`.

Flags:

- `--skip-pagefind` — skip step 11 (it's the slowest; useful for quick
  iteration on content).
- `--skip-blog` — skip step 7 (avoids a network call).

## Why this exists

This is a local port of what `.github/workflows/deploy.yml` used to do
in CI. That workflow is now `workflow_dispatch`-only (manual) — it
stopped auto-running on push because GitHub Actions runs were being
blocked by an account-level billing restriction, which silently
stopped the site from updating. Since Pages now serves `docs/`
directly from the branch, running this script locally before pushing
is both required (nothing else generates these files) and sufficient
(no CI step needed to go live).
