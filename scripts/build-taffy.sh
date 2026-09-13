#!/bin/bash
set -euo pipefail

if [[ ${1:-} == --help || $# -ne 1 ]]; then
  echo "Usage: scripts/build-taffy.sh <version>"
  echo "Build and package the Apple Silicon Release app without an Apple developer account."
  exit 0
fi

VERSION="$1"
if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "error: version must have the form 0.1.0" >&2
  exit 1
fi
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
BUILD_DIR="${TAFFY_BUILD_DIR:-$ROOT/build-taffy}"
APP="$BUILD_DIR/Build/Products/Release/Taffy.app"
export PATH="${HOME}/.cargo/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
export CARGO_TARGET_AARCH64_APPLE_DARWIN_LINKER="$(xcrun --find clang)"
unset LIBRARY_PATH LDFLAGS

xcrun metal --version
git submodule update --init --depth 1 ghostty vendor/bonsplit
./scripts/ensure-ghosttykit.sh

xcodebuild -project cmux.xcodeproj -scheme cmux -configuration Release \
  -destination 'generic/platform=macOS' -derivedDataPath "$BUILD_DIR" \
  -clonedSourcePackagesDirPath "$ROOT/.spm-cache" \
  ARCHS=arm64 ONLY_ACTIVE_ARCH=YES \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO \
  MARKETING_VERSION="$VERSION" build

install -m 755 scripts/taffy-cli.sh "$APP/Contents/Resources/bin/taffy"
CMUX_TIMESTAMP=none ./scripts/sign-cmux-bundle.sh "$APP" Resources/taffy.entitlements -
"$APP/Contents/Resources/bin/cmux" --version
"$APP/Contents/Resources/bin/ghostty" +version
mkdir -p dist
ditto -c -k --sequesterRsrc --keepParent "$APP" "dist/taffy-$VERSION-macos-arm64.zip"
(cd dist && shasum -a 256 "taffy-$VERSION-macos-arm64.zip" > "taffy-$VERSION-macos-arm64.zip.sha256")
echo "Release archive: $ROOT/dist/taffy-$VERSION-macos-arm64.zip"
