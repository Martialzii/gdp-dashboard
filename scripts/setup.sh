#!/bin/sh
set -eu

ROOT=$(CDPATH= cd "$(dirname "$0")/.." && pwd)

if [ "$#" -gt 1 ]; then
  echo "Usage: $0 [typescript|go|both]" >&2
  exit 2
fi

choice=${1-}
if [ -z "$choice" ]; then
  printf 'Choose dashboard implementation to set up:\n  1) TypeScript / JavaScript\n  2) Go\n  3) Both\nSelection [1-3]: '
  IFS= read -r selection
  case "$selection" in
    1) choice=typescript ;;
    2) choice=go ;;
    3) choice=both ;;
    *) echo "Choose 1, 2, or 3." >&2; exit 2 ;;
  esac
fi

case "$choice" in
  1|ts|typescript) choice=typescript ;;
  2|go) choice=go ;;
  3|both) choice=both ;;
  *) echo "Choice must be typescript, go, or both." >&2; exit 2 ;;
esac

setup_typescript() {
  if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
    echo "TypeScript setup requires Node.js 18+ and npm. Install them from https://nodejs.org/ and retry." >&2
    return 1
  fi
  node -e 'if (Number(process.versions.node.split(".")[0]) < 18) process.exit(1)' || {
    echo "TypeScript setup requires Node.js 18 or newer." >&2
    return 1
  }
  npm --prefix "$ROOT/typescript-dashboard" ci || return 1
  npm --prefix "$ROOT/typescript-dashboard" run build || return 1
}

setup_go() {
  if ! command -v go >/dev/null 2>&1; then
    echo "Go setup requires Go 1.21+. Install it from https://go.dev/dl/ and retry." >&2
    return 1
  fi
  go version | awk '
    { version = $3; sub(/^go/, "", version); split(version, parts, ".") }
    parts[1] > 1 || (parts[1] == 1 && parts[2] >= 21) { valid = 1 }
    END { exit !valid }
  ' || {
    echo "Go setup requires Go 1.21 or newer." >&2
    return 1
  }
  mkdir -p "$ROOT/bin" || return 1
  (cd "$ROOT" && go build -o "$ROOT/bin/gdp-dashboard" ./go-dashboard) || return 1
}

case "$choice" in
  typescript) setup_typescript ;;
  go) setup_go ;;
  both) setup_typescript && setup_go ;;
esac

printf '\nSetup complete. Start the selected dashboard with:\n'
case "$choice" in
  typescript|both)
    printf '  cd typescript-dashboard && npm start  (http://localhost:3000)\n'
    ;;
esac
case "$choice" in
  go|both)
    printf '  ./bin/gdp-dashboard  (http://localhost:8080)\n'
    ;;
esac
