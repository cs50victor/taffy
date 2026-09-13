# Taffy

<img src="Resources/Branding/Taffy.svg" alt="Taffy ribbon icon" width="96">

Immersive multimodal multiplexer for macOS. A personal, independent derivative of [cmux](https://github.com/manaflow-ai/cmux), maintained by [cs50victor](https://github.com/cs50victor).

## Install

Apple Silicon, macOS 14 or later:

```sh
brew install --cask cs50victor/tap/taffy
```

Launch Taffy from Applications. Its command-line tool is `taffy`.

This build is ad-hoc signed without an Apple Developer ID certificate or notarization. If macOS blocks the downloaded app, remove quarantine from this app only:

```sh
xattr -dr com.apple.quarantine /Applications/Taffy.app
```

Update with `brew upgrade --cask cs50victor/tap/taffy`. The upstream in-app updater is disabled. The Cloud tunnel extension and browser passkey entitlement require Apple provisioning and are excluded from this distribution. Upstream hosted Cloud services are not supplied by this project.

## Build

Install Xcode 26.x with its Metal toolchain, Zig 0.16.0, Rust/rustup and Bun. Initialize the pinned source dependencies and build:

```sh
git clone https://github.com/cs50victor/taffy.git
cd taffy
rustup toolchain install 1.88.0 --profile minimal --component clippy,rustfmt
./scripts/build-taffy.sh 0.1.1
```

The script creates `dist/taffy-0.1.1-macos-arm64.zip`. Set `DEVELOPER_DIR` to select an Xcode installation. Build products use the isolated `build-taffy` directory.

Release builds reuse compatible compiler and dependency caches. CI populates these caches after successful builds on `main`; pull requests can restore them on fresh runners. The first build for a new toolchain or an evicted cache still performs the normal compilation.

Taffy stores JSON settings at `~/.config/taffy/taffy.json` and its control socket at `~/.local/state/taffy/taffy.sock`. Existing Taffy configuration is migrated without deleting the old file. Internal cmux protocol identifiers and environment variables are retained for integration compatibility; the installed `taffy` launcher selects this fork's socket. Set `TAFFY_SOCKET_PATH` or pass `--socket` to select another Taffy instance.

## Source and license

Imported from cmux commit `faae269088287ea357342d69c6be9b55ac977681`. This GitHub repository has no fork parent. The pinned Ghostty and Bonsplit submodules and cmux-cua dependency remain public upstream dependencies.

[GPL-3.0-or-later](LICENSE), except where individual files or accompanying notices specify otherwise. Original copyright and third-party notices are retained. See [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md) and [the upstream README](docs/upstream-README.md).

See [the usage guide](docs/usage.md) for commands, settings, and updates.
