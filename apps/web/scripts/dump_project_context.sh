#!/bin/bash
# Purpose: Create a SINGLE, copy/paste-ready snapshot of your BHIT Work OS repo state
# (tree, recent commits, key env hints, and ALL modified/staged files’ contents),
# plus a ZIP bundle, so you can upload one file here and I can build without guesswork.
#
# Assumptions:
# - Run from the repo root.
# - We DO NOT include real secrets by default. Pass --include-secrets to add .env.local.
# - We prioritize apps/web/**, but include any changed files anywhere.
#
# Output:
#   ./bhit-dumps/bhit-context-YYYYmmdd-HHMMSS.txt   (single text blob for chat paste)
#   ./bhit-dumps/bhit-context-YYYYmmdd-HHMMSS.zip   (everything zipped)
#
# Usage:
#   bash scripts/dump_project_context.sh
#   bash scripts/dump_project_context.sh --include-secrets   # (optional) include .env.local
#
# Safe, bomb-proof design:
# - set -euo pipefail
# - checks for required tools; falls back when 'tree' is missing
# - never crashes if a section is empty (e.g., no modified files)
# - redacts secrets unless explicitly requested

set -euo pipefail

INCLUDE_SECRETS="false"
if [[ "${1:-}" == "--include-secrets" ]]; then
  INCLUDE_SECRETS="true"
fi

timestamp() { date +"%Y%m%d-%H%M%S"; }
TS="$(timestamp)"

OUTDIR="bhit-dumps"
mkdir -p "$OUTDIR"
TXT_OUT="$OUTDIR/bhit-context-$TS.txt"
ZIP_OUT="$OUTDIR/bhit-context-$TS.zip"

# Helpers
have_cmd() { command -v "$1" >/dev/null 2>&1; }

section() {
  local title="$1"
  printf "\n\n===== %s =====\n" "$title" >> "$TXT_OUT"
}

append_file() {
  local label="$1"; shift
  local file="$1"
  if [[ -f "$file" ]]; then
    printf "\n--- %s (%s) ---\n" "$label" "$file" >> "$TXT_OUT"
    cat "$file" >> "$TXT_OUT" || true
  fi
}

append_files_glob() {
  local label="$1"; shift
  local pattern="$1"
  local matched="false"
  shopt -s nullglob
  for f in $pattern; do
    matched="true"
    printf "\n--- %s (%s) ---\n" "$label" "$f" >> "$TXT_OUT"
    cat "$f" >> "$TXT_OUT" || true
  done
  shopt -u nullglob
  [[ "$matched" == "true" ]] || printf "\n(no files matched %s)\n" "$pattern" >> "$TXT_OUT"
}

echo "Creating $TXT_OUT …"

# 0) System & Node/NPM
section "SYSTEM INFO"
printf "uname -a: " >> "$TXT_OUT"; uname -a >> "$TXT_OUT" || true
if have_cmd node; then printf "node -v: " >> "$TXT_OUT"; node -v >> "$TXT_OUT"; fi
if have_cmd npm; then printf "npm -v: " >> "$TXT_OUT"; npm -v >> "$TXT_OUT"; fi
if have_cmd pnpm; then printf "pnpm -v: " >> "$TXT_OUT"; pnpm -v >> "$TXT_OUT"; fi
if have_cmd yarn; then printf "yarn -v: " >> "$TXT_OUT"; yarn -v >> "$TXT_OUT"; fi

# 1) Git status / branches / remotes / last commits
section "GIT STATUS"
if have_cmd git && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Current branch:" >> "$TXT_OUT"
  git rev-parse --abbrev-ref HEAD >> "$TXT_OUT" || true

  echo -e "\nRemotes:" >> "$TXT_OUT"
  git remote -v >> "$TXT_OUT" || true

  echo -e "\nStatus (short):" >> "$TXT_OUT"
  git status -s >> "$TXT_OUT" || true

  echo -e "\nLast 10 commits:" >> "$TXT_OUT"
  git log --oneline -10 >> "$TXT_OUT" || true

  echo -e "\nStashes:" >> "$TXT_OUT"
  git stash list >> "$TXT_OUT" || true
else
  echo "(Not a git repo or git not available)" >> "$TXT_OUT"
fi

# 2) Project tree (focus on apps/web)
section "PROJECT TREE (apps/web and top-level)"
if have_cmd tree; then
  echo "Top-level tree (excluding node_modules/.next/dist):" >> "$TXT_OUT"
  tree -a -I "node_modules|.next|dist|.git|$OUTDIR" . >> "$TXT_OUT" || true

  echo -e "\napps/web tree (excluding node_modules/.next/dist):" >> "$TXT_OUT"
  if [[ -d "apps/web" ]]; then
    (cd apps/web && tree -a -I "node_modules|.next|dist" .) >> "$TXT_OUT" || true
  else
    echo "(apps/web not found)" >> "$TXT_OUT"
  fi
else
  echo "(tree not installed; using find fallback)" >> "$TXT_OUT"
  echo -e "\nTop-level (find):" >> "$TXT_OUT"
  find . -maxdepth 3 -not -path "*/node_modules/*" -not -path "*/.next/*" -not -path "*/dist/*" -not -path "*/.git/*" -not -path "*/$OUTDIR/*" >> "$TXT_OUT" || true

  echo -e "\napps/web (find):" >> "$TXT_OUT"
  if [[ -d "apps/web" ]]; then
    (cd apps/web && find . -maxdepth 5 -not -path "*/node_modules/*" -not -path "*/.next/*" -not -path "*/dist/*") >> "$TXT_OUT" || true
  else
    echo "(apps/web not found)" >> "$TXT_OUT"
  fi
fi

# 3) Key manifests & config
section "KEY MANIFESTS & CONFIG"
append_file "package.json (root if present)" "package.json"
append_file "apps/web/package.json" "apps/web/package.json"
append_file "apps/web/tsconfig.json" "apps/web/tsconfig.json"
append_file "apps/web/next-env.d.ts" "apps/web/next-env.d.ts"
append_file "apps/web/next.config.js" "apps/web/next.config.js"
append_file "apps/web/next.config.mjs" "apps/web/next.config.mjs"
append_file "apps/web/.env.example" "apps/web/.env.example"
append_file "apps/web/README.md" "apps/web/README.md"
append_file "apps/web/docs/BHIT-WORKOS-PLAYBOOK.md" "apps/web/docs/BHIT-WORKOS-PLAYBOOK.md"

# 4) Env files (safe by default)
section "ENV FILES (safe defaults)"
if [[ "$INCLUDE_SECRETS" == "true" ]]; then
  echo "(Including .env.local — WARNING: contains secrets)" >> "$TXT_OUT"
  append_file ".env.local" "apps/web/.env.local"
else
  echo "By default we DO NOT include apps/web/.env.local secrets." >> "$TXT_OUT"
  echo "To include: re-run with --include-secrets" >> "$TXT_OUT"
  append_file ".env.example (apps/web)" "apps/web/.env.example"
fi

# 5) Supabase SQL migrations (master + others)
section "SUPABASE SQL MIGRATIONS"
if compgen -G "supabase-sql/*.sql" > /dev/null; then
  for sql in supabase-sql/*.sql; do
    append_file "SQL" "$sql"
  done
fi
if compgen -G "apps/web/supabase-sql/*.sql" > /dev/null; then
  for sql in apps/web/supabase-sql/*.sql; do
    append_file "SQL" "$sql"
  done
fi

# 6) HIGH-VALUE app files (as per Super-Seed directory contract)
section "CORE APP FILES (Super-Seed contract)"
declare -a core_files=(
  "apps/web/components/NavBar.tsx"
  "apps/web/components/modals/ShareAndStartModal.tsx"
  "apps/web/components/tabs/TasksTab.tsx"
  "apps/web/components/tabs/NotesTab.tsx"
  "apps/web/components/tabs/PhotosTab.tsx"
  "apps/web/components/tabs/FloorPlanTab.tsx"
  "apps/web/components/tabs/DocumentsTab.tsx"
  "apps/web/components/tabs/ProductsTab.tsx"
  "apps/web/hooks/useRequireAuth.ts"
  "apps/web/lib/supabaseClient.ts"
  "apps/web/lib/roles.ts"
  "apps/web/lib/theme.ts"
  "apps/web/locales/en.json"
  "apps/web/locales/es.json"
  "apps/web/locales/pt.json"
  "apps/web/locales/ro.json"
  "apps/web/pages/_app.tsx"
  "apps/web/pages/index.tsx"
  "apps/web/pages/login.tsx"
  "apps/web/pages/dashboard.tsx"
  "apps/web/pages/jobs/index.tsx"
  "apps/web/pages/job/[id]/index.tsx"
  "apps/web/pages/job/[id]/floorplan.tsx"
  "apps/web/pages/job/[id]/documents.tsx"
  "apps/web/pages/job/[id]/products.tsx"
  "apps/web/pages/today/index.tsx"
  "apps/web/pages/today/guest.tsx"
  "apps/web/pages/close-day/[jobId].tsx"
  "apps/web/pages/clients/index.tsx"
  "apps/web/pages/settings/index.tsx"
  "apps/web/middleware.ts"
  "apps/web/middleware.disabled.ts"
)
for f in "${core_files[@]}"; do
  if [[ -f "$f" ]]; then
    append_file "CORE" "$f"
  fi
done

# 7) Modified & staged files (full contents)
section "MODIFIED/STAGED FILES (full contents)"
if have_cmd git && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  CHANGED_FILES="$(git diff --name-only; git diff --cached --name-only | sort -u)"
  if [[ -n "${CHANGED_FILES//$'\n'/}" ]]; then
    echo "Changed files since HEAD:" >> "$TXT_OUT"
    echo "$CHANGED_FILES" | sort -u >> "$TXT_OUT"
    while IFS= read -r f; do
      [[ -n "$f" && -f "$f" ]] || continue
      printf "\n--- CHANGED: %s ---\n" "$f" >> "$TXT_OUT"
      cat "$f" >> "$TXT_OUT" || true
    done <<< "$(echo "$CHANGED_FILES" | sort -u)"
  else
    echo "(No modified/staged files)" >> "$TXT_OUT"
  fi
else
  echo "(Skipped; not a git repo)" >> "$TXT_OUT"
fi

# 8) Optional extras (package-lock/pnpm-lock, tsconfig base, eslint)
section "LOCKFILES & LINT CONFIG"
append_file "package-lock.json (root)" "package-lock.json"
append_file "apps/web/package-lock.json" "apps/web/package-lock.json"
append_file "pnpm-lock.yaml (root)" "pnpm-lock.yaml"
append_file "yarn.lock (root)" "yarn.lock"
append_file ".eslintrc.json" ".eslintrc.json"
append_file ".eslintrc.js" ".eslintrc.js"
append_file "apps/web/.eslintrc.json" "apps/web/.eslintrc.json"
append_file "apps/web/.eslintrc.js" "apps/web/.eslintrc.js"
append_file "tsconfig.json (root)" "tsconfig.json"
append_file "apps/web/tsconfig.json" "apps/web/tsconfig.json"

# 9) Final note & zip bundle
echo "Wrote $TXT_OUT"

TMPDIR_ZIP="bhit-dump-$TS"
mkdir -p "$TMPDIR_ZIP"
cp "$TXT_OUT" "$TMPDIR_ZIP"/

for f in "${core_files[@]}"; do
  if [[ -f "$f" ]]; then
    mkdir -p "$TMPDIR_ZIP/$(dirname "$f")"
    cp "$f" "$TMPDIR_ZIP/$f"
  fi
done

if compgen -G "supabase-sql/*.sql" > /dev/null; then
  mkdir -p "$TMPDIR_ZIP/supabase-sql"
  cp supabase-sql/*.sql "$TMPDIR_ZIP/supabase-sql/" || true
fi
if compgen -G "apps/web/supabase-sql/*.sql" > /dev/null; then
  mkdir -p "$TMPDIR_ZIP/apps/web/supabase-sql"
  cp apps/web/supabase-sql/*.sql "$TMPDIR_ZIP/apps/web/supabase-sql/" || true
fi

if [[ -f "apps/web/.env.example" ]]; then
  mkdir -p "$TMPDIR_ZIP/apps/web"
  cp "apps/web/.env.example" "$TMPDIR_ZIP/apps/web/.env.example"
fi
if [[ "$INCLUDE_SECRETS" == "true" && -f "apps/web/.env.local" ]]; then
  mkdir -p "$TMPDIR_ZIP/apps/web"
  cp "apps/web/.env.local" "$TMPDIR_ZIP/apps/web/.env.local"
fi

for lf in "package-lock.json" "pnpm-lock.yaml" "yarn.lock"; do
  if [[ -f "$lf" ]]; then cp "$lf" "$TMPDIR_ZIP/$lf"; fi
done

if have_cmd zip; then
  (cd "$TMPDIR_ZIP" && zip -r "../$ZIP_OUT" . >/dev/null)
  rm -rf "$TMPDIR_ZIP"
  echo "Also wrote $ZIP_OUT"
else
  echo "(zip not installed; leaving unzipped directory $TMPDIR_ZIP)"
fi

echo "Done."
