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
DIST_DIR="${TAFFY_DIST_DIR:-$ROOT/dist}"
APP="$BUILD_DIR/Build/Products/Release/Taffy.app"
export PATH="${HOME}/.cargo/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
export CARGO_TARGET_AARCH64_APPLE_DARWIN_LINKER="$(xcrun --find clang)"
export CMUX_DIFF_SIDECAR_BUILD_DIR="$BUILD_DIR/NativeCache/diff-sidecar"
unset LIBRARY_PATH LDFLAGS

xcrun metal --version
git submodule update --init --depth 1 ghostty vendor/bonsplit
./scripts/ensure-ghosttykit.sh

xcodebuild -project cmux.xcodeproj -scheme cmux -configuration Release \
  -destination 'generic/platform=macOS' -derivedDataPath "$BUILD_DIR" \
  -clonedSourcePackagesDirPath "$ROOT/.spm-cache" \
  -onlyUsePackageVersionsFromResolvedFile -skipPackageUpdates \
  ARCHS=arm64 ONLY_ACTIVE_ARCH=YES \
  COMPILATION_CACHE_ENABLE_CACHING="${TAFFY_COMPILATION_CACHE:-YES}" \
  COMPILATION_CACHE_CAS_PATH="$BUILD_DIR/CompilationCache.noindex" \
  COMPILATION_CACHE_KEEP_CAS_DIRECTORY=YES \
  COMPILATION_CACHE_LIMIT_SIZE=3221225472 \
  COMPILATION_CACHE_ENABLE_DIAGNOSTIC_REMARKS=YES \
  SWIFT_ENABLE_EXPLICIT_MODULES=YES COMPILER_INDEX_STORE_ENABLE=NO \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO \
  MARKETING_VERSION="$VERSION" -showBuildTimingSummary build

# Remove the old helper left behind by an incremental build of version 0.1.0.
rm -rf "$APP/Contents/Library/cmux Computer Use.app"

install -m 755 scripts/taffy-cli.sh "$APP/Contents/Resources/bin/taffy"
CMUX_TIMESTAMP=none ./scripts/sign-cmux-bundle.sh "$APP" Resources/taffy.entitlements -
"$APP/Contents/Resources/bin/cmux" --version
"$APP/Contents/Resources/bin/ghostty" +version
mkdir -p "$DIST_DIR"
ditto -c -k --sequesterRsrc --keepParent "$APP" "$DIST_DIR/taffy-$VERSION-macos-arm64.zip"
(cd "$DIST_DIR" && shasum -a 256 "taffy-$VERSION-macos-arm64.zip" > "taffy-$VERSION-macos-arm64.zip.sha256")
echo "Release archive: $DIST_DIR/taffy-$VERSION-macos-arm64.zip"
