#!/usr/bin/env bash
# BHIT OS — Local Bootstrap (Final Clean)

set -euo pipefail
shopt -s nullglob 2>/dev/null || true

echo "🚀 Installing dependencies..."
npm install

echo "📄 Ensuring env template exists..."
if [ ! -f .env.local ]; then
  cat > .env.local <<EOF
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
EMAIL_SMTP_URL=
EOF
  echo "⚠️  Fill .env.local with Supabase project URL + anon key before running"
fi

echo "🧾 Running type/lint check..."
npm run dev:check || true

echo "✅ Local bootstrap complete."
echo "Next steps:"
echo "  1. Paste the SQL migration (see below) into Supabase SQL editor."
echo "  2. Run: npm run dev"
echo "  3. Open http://localhost:3000"

