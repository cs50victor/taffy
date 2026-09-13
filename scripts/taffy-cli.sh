#!/bin/bash
set -euo pipefail

SCRIPT="$0"
while [[ -L "$SCRIPT" ]]; do
  LINK="$(readlink "$SCRIPT")"
  if [[ "$LINK" == /* ]]; then
    SCRIPT="$LINK"
  else
    SCRIPT="$(dirname "$SCRIPT")/$LINK"
  fi
done
BIN_DIR="$(cd "$(dirname "$SCRIPT")" && pwd)"
TAFFY_SOCKET="${TAFFY_SOCKET_PATH:-$HOME/.local/state/taffy/taffy.sock}"
if [[ "${CMUX_SOCKET_PATH:-}" != "$TAFFY_SOCKET" ]]; then
  unset CMUX_WORKSPACE_ID CMUX_SURFACE_ID CMUX_TAB_ID CMUX_PANEL_ID CMUX_SOCKET CMUX_SOCKET_PASSWORD
fi
export CMUX_SOCKET_PATH="$TAFFY_SOCKET"
export CMUX_BUNDLE_ID=com.cs50victor.taffy
export CMUX_BUNDLED_CLI_PATH="$BIN_DIR/cmux"
exec "$BIN_DIR/cmux" "$@"
