#!/bin/sh
set -eu

cat > /usr/share/nginx/html/env.js <<EOF
window.__CYBERTIFY_ENV__ = {
  VITE_SPOTIFY_CLIENT_ID: "${VITE_SPOTIFY_CLIENT_ID:-}",
  VITE_SPOTIFY_REDIRECT_URI: "${VITE_SPOTIFY_REDIRECT_URI:-}"
};
EOF

exec nginx -g "daemon off;"
