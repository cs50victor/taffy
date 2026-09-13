import Foundation

extension CMUXCLI {
    static let settingsDocsURL = "https://github.com/cs50victor/taffy/blob/main/docs/usage.md"
    static let settingsSchemaURL = "https://raw.githubusercontent.com/cs50victor/taffy/main/web/data/cmux.schema.json"
    static let primarySettingsDisplayPath = "~/.config/taffy/taffy.json"
    static let legacySettingsDisplayPath = "~/.config/taffy/cmux.json"
    static let fallbackSettingsDisplayPath = "~/Library/Application Support/com.cs50victor.taffy/settings.json"
    static let ghosttyConfigDisplayPath = "~/.config/ghostty/config"

    private struct DocsResource {
        let label: String
        let url: String
    }

    private struct DocsReference {
        let topic: String
        let aliases: [String]
        let summary: String
        let webURL: String
        let rawResources: [DocsResource]
        let commands: [String]
    }

    private static let docsReferences: [DocsReference] = [
        DocsReference(
            topic: "settings",
            aliases: ["configuration", "config", "cmux-json", "settings-json", "settingsjson", "schema"],
            summary: "cmux-owned settings, taffy.json locations, schema, and reload flow.",
            webURL: settingsDocsURL,
            rawResources: [
                DocsResource(label: "settings schema", url: settingsSchemaURL),
                DocsResource(label: "taffy skill", url: "https://raw.githubusercontent.com/cs50victor/taffy/main/skills/cmux/SKILL.md"),
            ],
            commands: [
                "taffy settings path",
                "taffy settings cmux-json",
                "taffy config doctor",
                "taffy reload-config",
            ]
        ),
        DocsReference(
            topic: "managed-policies",
            aliases: ["mdm", "managed", "policy", "policies", "enterprise", "managed-device-policies"],
            summary: "MDM-enforceable managed policies: disable the embedded browser, iOS remote control, and Cloud on managed Macs.",
            webURL: "https://github.com/cs50victor/taffy/blob/main/docs/usage.md",
            rawResources: [
                DocsResource(label: "managed device policies", url: "https://raw.githubusercontent.com/cs50victor/taffy/main/docs/managed-device-policies.md"),
            ],
            commands: [
                "taffy browser status --json",
            ]
        ),
        DocsReference(
            topic: "shortcuts",
            aliases: ["keyboard", "keybindings", "keys"],
            summary: "cmux-owned keyboard shortcuts and two-step chord syntax.",
            webURL: "https://github.com/cs50victor/taffy/blob/main/docs/usage.md",
            rawResources: [
                DocsResource(label: "shortcut data", url: "https://raw.githubusercontent.com/cs50victor/taffy/main/web/data/cmux-shortcuts.ts"),
                DocsResource(label: "settings schema", url: settingsSchemaURL),
            ],
            commands: [
                "taffy shortcuts",
                "taffy settings shortcuts",
                "taffy docs settings",
            ]
        ),
        DocsReference(
            topic: "api",
            aliases: ["cli", "socket", "automation", "handles"],
            summary: "CLI/socket API, handle model, windows, workspaces, panes, and surfaces.",
            webURL: "https://github.com/cs50victor/taffy/blob/main/docs/usage.md",
            rawResources: [
                DocsResource(label: "CLI contract", url: "https://raw.githubusercontent.com/cs50victor/taffy/main/docs/cli-contract.md"),
                DocsResource(label: "taffy skill", url: "https://raw.githubusercontent.com/cs50victor/taffy/main/skills/cmux/SKILL.md"),
            ],
            commands: [
                "taffy identify --json",
                "taffy tree --all",
            ]
        ),
        DocsReference(
            topic: "browser",
            aliases: ["browser-automation", "webview"],
            summary: "Browser panel automation commands and snapshot-driven web interaction.",
            webURL: "https://github.com/cs50victor/taffy/blob/main/docs/usage.md",
            rawResources: [
                DocsResource(label: "browser skill", url: "https://raw.githubusercontent.com/cs50victor/taffy/main/skills/cmux-browser/SKILL.md"),
                DocsResource(label: "browser commands", url: "https://raw.githubusercontent.com/cs50victor/taffy/main/skills/cmux-browser/references/commands.md"),
            ],
            commands: [
                "taffy browser --help",
                "taffy browser snapshot",
            ]
        ),
        DocsReference(
            topic: "agents",
            aliases: ["integrations", "agent-integrations"],
            summary: "Agent hook integrations, Feed approvals, notifications, and session restore.",
            webURL: "https://github.com/cs50victor/taffy/blob/main/docs/usage.md",
            rawResources: [
                DocsResource(label: "agent hook docs", url: "https://raw.githubusercontent.com/cs50victor/taffy/main/docs/agent-hooks.md"),
                DocsResource(label: "feed docs", url: "https://raw.githubusercontent.com/cs50victor/taffy/main/docs/feed.md"),
                DocsResource(label: "notifications docs", url: "https://raw.githubusercontent.com/cs50victor/taffy/main/docs/notifications.md"),
            ],
            commands: [
                "taffy hooks setup",
                "taffy hooks setup <agent>",
                "taffy hooks hermes-agent install",
                "taffy hooks hermes-agent uninstall",
                "taffy hooks <agent> uninstall",
            ]
        ),
        DocsReference(
            topic: "dock",
            aliases: ["doc", "controls", "right-sidebar", "dock-json"],
            summary: "Custom right-sidebar terminal controls from .cmux/dock.json or ~/.config/cmux/dock.json.",
            webURL: "https://github.com/cs50victor/taffy/blob/main/docs/usage.md",
            rawResources: [
                DocsResource(label: "dock docs", url: "https://raw.githubusercontent.com/cs50victor/taffy/main/docs/dock.md"),
                DocsResource(label: "dock web copy", url: "https://raw.githubusercontent.com/cs50victor/taffy/main/web/messages/en.json"),
            ],
            commands: [
                "taffy docs dock",
                "taffy docs dock --json",
                "python3 -m json.tool .cmux/dock.json",
            ]
        ),
        DocsReference(
            topic: "sidebars",
            aliases: ["sidebar", "custom-sidebar", "custom-sidebars", "vibe-sidebar"],
            summary: "Vibe-code a custom sidebar: a runtime-interpreted SwiftUI-style file in ~/.config/cmux/sidebars/ (beta).",
            webURL: "https://github.com/cs50victor/taffy/blob/main/docs/usage.md",
            rawResources: [
                DocsResource(label: "custom sidebar authoring guide", url: "https://raw.githubusercontent.com/cs50victor/taffy/main/docs/custom-sidebars.md"),
            ],
            commands: [
                "mkdir -p ~/.config/cmux/sidebars",
                "cat > ~/.config/cmux/sidebars/mine.swift   # write a SwiftUI-style view, then right-click the sidebar button to pick it",
                "taffy docs api   # discover taffy() action methods/params",
            ]
        ),
    ]

    func runDocsCommand(commandArgs: [String], jsonOutput: Bool) throws {
        let parsedArgs = docsSettingsArguments(commandArgs)
        let wantsJSON = jsonOutput || parsedArgs.head.contains("--json")
        let args = parsedArgs.arguments

        if hasHelpRequest(beforeSeparator: parsedArgs.head) {
            print(docsUsage())
            return
        }

        guard let topic = args.first?.lowercased() else {
            if wantsJSON {
                print(jsonString(["topics": Self.docsReferences.map { docsPayload($0) }]))
            } else {
                printDocsIndex()
            }
            return
        }

        guard args.count == 1 else {
            throw CLIError(message: "Usage: taffy docs [settings|shortcuts|api|browser|agents|dock|managed-policies]")
        }

        if topic == "list" || topic == "all" {
            if wantsJSON {
                print(jsonString(["topics": Self.docsReferences.map { docsPayload($0) }]))
            } else {
                printDocsIndex()
            }
            return
        }

        guard let reference = docsReference(for: topic) else {
            throw CLIError(message: "Unknown docs topic '\(topic)'. Run 'taffy docs' for topics.")
        }

        if wantsJSON {
            print(jsonString(docsPayload(reference)))
        } else {
            printDocsReference(reference)
        }
    }

    func docsUsage() -> String {
        return """
        Usage: taffy docs [settings|shortcuts|api|browser|agents|dock|managed-policies]

        Print the canonical docs URL, raw GitHub resources, and useful commands for a taffy topic.
        This command does not require a running taffy app or socket.

        Agents:
          Use `taffy docs settings` before editing ~/.config/taffy/taffy.json.
          Use `taffy docs dock` before creating or editing .cmux/dock.json.
          Back up any existing taffy.json file to a timestamped .bak copy before editing so the user can revert.
          Fetch raw resources with the printed curl commands when you need the latest schema.
        """
    }

    private func docsReference(for topic: String) -> DocsReference? {
        let normalized = topic.replacingOccurrences(of: "_", with: "-")
        return Self.docsReferences.first { reference in
            reference.topic == normalized || reference.aliases.contains(normalized)
        }
    }

    private func docsPayload(_ reference: DocsReference) -> [String: Any] {
        var payload: [String: Any] = [
            "topic": reference.topic,
            "aliases": reference.aliases,
            "summary": reference.summary,
            "web_url": reference.webURL,
            "raw_resources": reference.rawResources.map { resource in
                [
                    "label": resource.label,
                    "url": resource.url,
                    "fetch": "curl -fsSL \(resource.url)",
                ]
            },
            "commands": reference.commands,
        ]
        if reference.topic == "settings" {
            payload["settings_files"] = [
                "primary": Self.primarySettingsDisplayPath,
                "legacy": Self.legacySettingsDisplayPath,
                "fallback": Self.fallbackSettingsDisplayPath,
            ]
            payload["ghostty_config"] = [
                "path": Self.ghosttyConfigDisplayPath,
                "note": "Not Taffy-owned, but taffy reads it. Use for terminal transparency (background-opacity), blur, font, theme, etc.",
            ]
            payload["backup"] = "Back up any existing taffy.json file to a timestamped .bak copy before editing so the user can revert."
            payload["reload_command"] = "taffy reload-config"
            payload["reload_scope"] = "Reloads Ghostty config + taffy.json and refreshes terminals in place. No app restart needed."
        }
        return payload
    }

    private func printDocsIndex() {
        print("taffy docs")
        print()
        print("Topics:")
        for reference in Self.docsReferences {
            print("  \(reference.topic.padding(toLength: 10, withPad: " ", startingAt: 0)) \(reference.summary)")
        }
        print()
        print("Run `taffy docs <topic>` for URLs, raw resources, and next commands.")
    }

    private func printDocsReference(_ reference: DocsReference) {
        print("\(reference.topic): \(reference.summary)")
        print()
        print("Web:")
        print("  \(reference.webURL)")
        if !reference.rawResources.isEmpty {
            print()
            print("Raw resources:")
            for resource in reference.rawResources {
                print("  \(resource.label): \(resource.url)")
            }
            print()
            print("Fetch:")
            for resource in reference.rawResources {
                print("  curl -fsSL \(resource.url)")
            }
        }
        if !reference.commands.isEmpty {
            print()
            print("Useful commands:")
            for command in reference.commands {
                print("  \(command)")
            }
        }
        if reference.topic == "settings" {
            print()
            print("Config files:")
            print("  primary: \(Self.primarySettingsDisplayPath)")
            print("  legacy config: \(Self.legacySettingsDisplayPath)")
            print("  legacy app support: \(Self.fallbackSettingsDisplayPath)")
            print()
            print("Related (not Taffy-owned, but taffy reads it for terminal behavior):")
            print("  \(Self.ghosttyConfigDisplayPath)")
            print("  Use this for terminal transparency (background-opacity), blur, font, theme, etc.")
            print()
            print("Before editing taffy.json:")
            print("  Back up any existing taffy.json file to a timestamped .bak copy so the user can revert.")
            print()
            print("Reload after editing taffy.json or Ghostty config:")
            print("  taffy reload-config   (reloads BOTH and refreshes terminals; no app restart needed)")
        }
    }

    func runSettings(
        commandArgs: [String],
        socketPath: String,
        explicitPassword: String?,
        jsonOutput: Bool
    ) throws {
        let parsedArgs = docsSettingsArguments(commandArgs)
        let wantsJSON = jsonOutput || parsedArgs.head.contains("--json")
        let args = parsedArgs.arguments
        let subcommand = args.first?.lowercased() ?? "open"

        if hasHelpRequest(beforeSeparator: parsedArgs.head) {
            print(settingsUsage())
            return
        }

        switch subcommand {
        case "path", "paths":
            guard args.count == 1 else {
                throw CLIError(message: "Usage: taffy settings path")
            }
            printSettingsPaths(jsonOutput: wantsJSON)
            return
        case "docs", "documentation":
            guard args.count == 1 else {
                throw CLIError(message: "Usage: taffy settings docs")
            }
            if wantsJSON, let reference = docsReference(for: "settings") {
                print(jsonString(docsPayload(reference)))
            } else if let reference = docsReference(for: "settings") {
                printDocsReference(reference)
            }
            return
        case "open":
            let targetRaw: String?
            if args.count > 2 {
                throw CLIError(message: "Usage: taffy settings open [target]")
            } else if let rawTarget = args.dropFirst().first {
                guard let target = settingsTargetRawValue(for: rawTarget) else {
                    throw CLIError(message: "Unknown settings target '\(rawTarget)'. Run 'taffy settings --help'.")
                }
                targetRaw = target
            } else {
                targetRaw = nil
            }
            try openSettingsTarget(
                targetRaw,
                socketPath: socketPath,
                explicitPassword: explicitPassword,
                jsonOutput: wantsJSON
            )
            return
        default:
            guard let targetRaw = settingsTargetRawValue(for: subcommand) else {
                throw CLIError(message: "Unknown settings subcommand '\(subcommand)'. Run 'taffy settings --help'.")
            }
            guard args.count == 1 else {
                throw CLIError(message: "Usage: taffy settings [open [target]|path|docs|<target>]")
            }
            try openSettingsTarget(
                targetRaw,
                socketPath: socketPath,
                explicitPassword: explicitPassword,
                jsonOutput: wantsJSON
            )
        }
    }

    func settingsCommandDoesNotNeedSocket(_ commandArgs: [String]) -> Bool {
        let parsedArgs = docsSettingsArguments(commandArgs)
        let subcommand = parsedArgs.arguments.first?.lowercased() ?? "open"
        return hasHelpRequest(beforeSeparator: parsedArgs.head) ||
            ["path", "paths", "docs", "documentation"].contains(subcommand)
    }

    func settingsUsage() -> String {
        return """
        Usage: taffy settings [open [target]|path|docs|<target>]

        Open taffy Settings, print taffy.json paths, or show settings documentation.

        Subcommands:
          open [target]       Open Settings, optionally to a target section.
          path                Print taffy.json paths, docs URL, and schema URL.
          docs                Print the same output as `taffy docs settings`.

        Targets:
          account, app, terminal, networking, sidebar-appearance,
          custom-sidebars, automation, browser, browser-import,
          global-hotkey, keyboard-shortcuts, shortcuts, workspace-colors,
          cmux-json, json, reset

        Config file:
          \(Self.primarySettingsDisplayPath)
          legacy config: \(Self.legacySettingsDisplayPath)
          legacy app support: \(Self.fallbackSettingsDisplayPath)

        Related (not Taffy-owned, but taffy reads it for terminal behavior):
          \(Self.ghosttyConfigDisplayPath)

        Before editing taffy.json:
          Back up any existing taffy.json file to a timestamped .bak copy so the user can revert.

        Reload after editing taffy.json or Ghostty config:
          taffy reload-config   (reloads BOTH and refreshes terminals; no app restart needed)
        """
    }

    private func settingsTargetRawValue(for rawValue: String) -> String? {
        let normalized = rawValue
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .lowercased()
            .replacingOccurrences(of: "_", with: "-")

        switch normalized {
        case "account":
            return "account"
        case "app", "general":
            return "app"
        case "terminal":
            return "terminal"
        case "sidebar", "sidebar-appearance", "sidebarappearance":
            return "sidebarAppearance"
        case "custom-sidebars", "customsidebars":
            return "customSidebars"
        case "automation":
            return "automation"
        case "browser":
            return "browser"
        case "networking", "network", "iroh":
            return "networking"
        case "browser-import", "browserimport", "import-browser-data":
            return "browserImport"
        case "global-hotkey", "globalhotkey", "hotkey":
            return "globalHotkey"
        case "keyboard-shortcuts", "keyboardshortcuts", "shortcuts", "keys", "keybindings":
            return "keyboardShortcuts"
        case "workspace-colors", "workspacecolors", "colors":
            return "workspaceColors"
        case "cmux-json", "cmuxjson", "settings-json", "settingsjson", "json", "file", "settings-file":
            return "settingsJSON"
        case "reset":
            return "reset"
        default:
            return nil
        }
    }

    private func openSettingsTarget(
        _ targetRaw: String?,
        socketPath: String,
        explicitPassword: String?,
        jsonOutput: Bool
    ) throws {
        let client = try connectClient(
            socketPath: socketPath,
            explicitPassword: explicitPassword,
            launchIfNeeded: true
        )
        defer { client.close() }

        var params: [String: Any] = ["activate": true]
        if let targetRaw {
            params["target"] = targetRaw
        }

        let response = try client.sendV2(method: "settings.open", params: params)
        if jsonOutput {
            print(jsonString(response))
        } else {
            let target = (response["target"] as? String) ?? targetRaw ?? "general"
            print("OK target=\(target)")
        }
    }

    func runShortcuts(
        commandArgs: [String],
        socketPath: String,
        explicitPassword: String?,
        jsonOutput: Bool
    ) throws {
        let remaining = commandArgs.filter { $0 != "--" }
        if let unknown = remaining.first {
            throw CLIError(message: "shortcuts: unknown flag '\(unknown)'")
        }

        let client = try connectClient(
            socketPath: socketPath,
            explicitPassword: explicitPassword,
            launchIfNeeded: true
        )
        defer { client.close() }

        let response = try client.sendV2(method: "settings.open", params: [
            "target": "keyboardShortcuts",
            "activate": true,
        ])
        if jsonOutput {
            print(jsonString(response))
        } else {
            print("OK")
        }
    }

    func docsSettingsArguments(_ commandArgs: [String]) -> (head: [String], arguments: [String]) {
        let separatorIndex = commandArgs.firstIndex(of: "--")
        let head = separatorIndex.map { Array(commandArgs[..<$0]) } ?? commandArgs
        let tail = separatorIndex.map { Array(commandArgs[commandArgs.index(after: $0)...]) } ?? []
        let headArguments = head.filter { $0 != "--json" }
        return (head, headArguments + tail)
    }

    func hasHelpRequest(beforeSeparator args: [String]) -> Bool {
        let positionalArgs = args.filter { $0 != "--json" }
        return args.contains("--help") || args.contains("-h") || positionalArgs.first?.lowercased() == "help"
    }
}
