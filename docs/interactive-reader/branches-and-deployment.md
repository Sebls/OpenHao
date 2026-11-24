# Branches and GitHub Pages Deployment

This repository separates application code from published study material across branches so `main` stays clean while `gh-pages` carries the library data needed for static hosting.

## Branch overview

| Branch | Objective | What it must contain | What it must exclude |
| --- | --- | --- | --- |
| `main` | Primary development branch for the reader app, preparation tools, schemas, tests, and documentation. | `src/`, `docs/`, `skills/`, `schemas/`, `tests/`, `tools/`, `package.json`, `vite.config.ts`, `.github/workflows/deploy-pages.yml`, and `.gitignore` ignoring `data/`. | `data/` (no PDFs, prepared revisions, staging, or review files), `dist/`, `node_modules/`, `.venv/`. |
| `gh-pages` | GitHub Pages deployment branch that builds and publishes the static reader with the prepared library. | Everything from `main` **plus** `data/library/` and `data/pdfs/`, with `.gitignore` configured as `data/*`, `!data/library/`, `!data/pdfs/`. | `data/other-files/`, `data/staging/`, `data/evidence/`, `data/reviews/`, `dist/`, `node_modules/`, `.venv/`. |

*(Older branches such as `codex/typescript-modular-reader` and `codex/hanzi-writing-practice` are historical feature branches.)*

## How GitHub Pages deployment works

1. In GitHub **Settings → Pages**, **Build and deployment → Source** must be set to **GitHub Actions** (not *Deploy from a branch*).
2. Pushing to `gh-pages` triggers [.github/workflows/deploy-pages.yml](../../.github/workflows/deploy-pages.yml).
3. The workflow runs `VITE_BASE_PATH=/OpenHao/ npm run build:pages`, which:
   - Typechecks and builds the React client with `/OpenHao/` as `BASE_URL`.
   - Runs [src/content/exportStatic.ts](../../src/content/exportStatic.ts) to export `dist/api/catalog.json`, `dist/api/document/<id>/<rev>.json`, `dist/pdf/<id>/<rev>.pdf`, `dist/pdfjs/`, `dist/hanzi-data/`, `.nojekyll`, and `404.html`.
4. GitHub Actions uploads `dist/` and deploys it to `https://sebls.github.io/OpenHao/`.

## Updating `gh-pages` safely

Because `data/` is ignored on `main` and tracked on `gh-pages`, switching directly between `main` and `gh-pages` in the same working tree will remove untracked `data/library` and `data/pdfs` when switching back to `main`.

To update `gh-pages` without disturbing your local `data/` directory, use a temporary git worktree:

```sh
git worktree add tmp/gh-pages-worktree gh-pages
git -C tmp/gh-pages-worktree merge main
cp -R data/library/* tmp/gh-pages-worktree/data/library/
cp -R data/pdfs/* tmp/gh-pages-worktree/data/pdfs/
find tmp/gh-pages-worktree/data -name ".DS_Store" -delete
git -C tmp/gh-pages-worktree add data/library data/pdfs
git -C tmp/gh-pages-worktree commit -m "Update library data and app"
git -C tmp/gh-pages-worktree push origin gh-pages
git worktree remove tmp/gh-pages-worktree
```
