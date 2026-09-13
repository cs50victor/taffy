# Using Taffy

Taffy is an immersive multimodal multiplexer for macOS, combining terminals, split panes, workspaces, and an embedded browser.

## Install and update

Apple Silicon, macOS 14 or later:

```sh
brew install --cask cs50victor/tap/taffy
```

For an existing installation:

```sh
brew update
brew upgrade --cask cs50victor/tap/taffy
```

`brew update` refreshes package metadata; `brew upgrade` installs the new app. Taffy uses ad-hoc signatures without Apple notarization. If macOS blocks launch:

```sh
xattr -dr com.apple.quarantine /Applications/Taffy.app
```

## Workspaces, panes, and the CLI

Launch Taffy from Applications. Run its CLI inside a Taffy terminal:

```sh
taffy --version
taffy --help
taffy workspace create --name Build
taffy workspace list
taffy new-split right
taffy browser open https://example.com
```

The control socket defaults to `~/.local/state/taffy/taffy.sock`. By default, only processes started inside Taffy can connect. The Automation settings control access from external tools. Use `taffy browser --help` for browser automation and `taffy shortcuts` to edit keyboard shortcuts.

## Settings and keyboard shortcuts

The app's configuration file is `~/.config/taffy/taffy.json`:

```sh
taffy settings path
taffy settings open
taffy config doctor
taffy reload-config
```

On upgrade, Taffy copies its previous `~/.config/taffy/cmux.json` or `~/.config/taffy/settings.json` only when the new file is absent. Existing new configuration takes priority, and the old files remain intact. The original cmux application's settings are not imported.

Terminal rendering, fonts, colors, and shell behavior continue to use Ghostty's configuration at `~/.config/ghostty/config`.

The [configuration schema](../web/data/cmux.schema.json) documents supported fields. Its historical filename is retained for compatibility.

## Project configuration and custom commands

Taffy searches each project directory and its ancestors for `.taffy/taffy.json`, then `taffy.json`. Existing `.cmux/cmux.json` and `cmux.json` project files remain supported as fallbacks. Existing project files are not renamed.

Use the configuration schema for custom commands, hooks, workspace settings, and Dock controls. Internal CMUX environment variables and socket protocol identifiers remain compatible with existing integrations. The public app and command are Taffy and `taffy`.

## Help and source

Report issues in [Taffy's issue tracker](https://github.com/cs50victor/taffy/issues), and find downloads in [Releases](https://github.com/cs50victor/taffy/releases). Taffy does not provide the upstream paid Cloud, account, or iPhone services; their promotion buttons are hidden in this distribution.

Original authorship, dependency names, and license notices remain available in the app's Licenses window and this repository's license files.
