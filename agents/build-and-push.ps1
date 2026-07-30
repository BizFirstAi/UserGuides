<#
.SYNOPSIS
  Local replacement for the GitHub Actions docs-deploy workflow.
  Run this before every push that touches docs/.

.DESCRIPTION
  1. Runs scripts/build-docs.mjs (What's New page, coverage dashboard,
     docs-repo + OpenGraph meta injection, shared.js distribution,
     sidebar nav markers, blog index, RSS feed, sitemap, broken-link
     check, Pagefind search index).
  2. Stages docs/, commits, and pushes.

  GitHub Pages serves docs/ directly from the main branch (no Actions
  build step), so a plain push after this script is all that's needed
  to go live.

.PARAMETER Message
  Commit message. Defaults to "Update docs" with a timestamp.

.PARAMETER SkipPagefind
  Skip rebuilding the Pagefind search index (faster iteration).

.PARAMETER SkipBlog
  Skip fetching/indexing the external blog feed.

.PARAMETER NoPush
  Build and commit locally but don't push. Useful for reviewing the
  diff first with `git show`.

.EXAMPLE
  .\agents\build-and-push.ps1

.EXAMPLE
  .\agents\build-and-push.ps1 -Message "Add Centrifuge node guide" -SkipPagefind

.EXAMPLE
  .\agents\build-and-push.ps1 -NoPush
#>
param(
    [string]$Message = "Update docs ($(Get-Date -Format 'yyyy-MM-dd HH:mm'))",
    [switch]$SkipPagefind,
    [switch]$SkipBlog,
    [switch]$NoPush
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

function Fail($msg) {
    Write-Host "`n[build-and-push] $msg" -ForegroundColor Red
    exit 1
}

Write-Host "[build-and-push] Repo: $RepoRoot" -ForegroundColor Cyan

# --- 1. Build ---------------------------------------------------------
$buildArgs = @()
if ($SkipPagefind) { $buildArgs += "--skip-pagefind" }
if ($SkipBlog)      { $buildArgs += "--skip-blog" }

Write-Host "`n[build-and-push] Running scripts/build-docs.mjs $($buildArgs -join ' ')" -ForegroundColor Cyan
node scripts/build-docs.mjs @buildArgs
if ($LASTEXITCODE -ne 0) {
    Fail "build-docs.mjs failed (likely broken internal links - see output above). Fix and re-run before committing."
}

# --- 2. Stage + commit -------------------------------------------------
git add docs

$staged = git diff --cached --name-only
if (-not $staged) {
    Write-Host "`n[build-and-push] No changes to commit - docs/ already up to date." -ForegroundColor Yellow
    exit 0
}

$fileCount = ($staged | Measure-Object).Count
Write-Host "`n[build-and-push] Staging $fileCount changed file(s) under docs/" -ForegroundColor Cyan

git commit -m $Message
if ($LASTEXITCODE -ne 0) {
    Fail "git commit failed."
}

# --- 3. Push ------------------------------------------------------------
if ($NoPush) {
    Write-Host "`n[build-and-push] -NoPush set - committed locally, not pushed. Run 'git push' when ready." -ForegroundColor Yellow
    exit 0
}

Write-Host "`n[build-and-push] Pushing..." -ForegroundColor Cyan
git push
if ($LASTEXITCODE -ne 0) {
    Fail "git push failed. Your commit is local - resolve (e.g. git pull --rebase) and push manually."
}

Write-Host "`n[build-and-push] Done. GitHub Pages serves docs/ directly from main, so this is live as soon as the push lands." -ForegroundColor Green
