import Foundation

/// Conventional on-disk locations for the Taffy JSON config.
public struct CmuxConfigLocation: Sendable, Hashable {
    /// The primary config file: `<home>/.config/taffy/taffy.json`.
    public let userConfigFile: URL

    /// The previous Taffy config file: `<home>/.config/taffy/cmux.json`.
    public let previousConfigFile: URL

    /// The legacy Taffy fallback: `<home>/.config/taffy/settings.json`.
    public let legacyFallbackFile: URL

    /// Creates a location bundle anchored at the given home directory.
    ///
    /// - Parameter home: The user's home directory, or a temporary directory in tests.
    public init(home: URL = FileManager.default.homeDirectoryForCurrentUser) {
        self.userConfigFile = home.appending(path: ".config/taffy/taffy.json")
        self.previousConfigFile = home.appending(path: ".config/taffy/cmux.json")
        self.legacyFallbackFile = home.appending(path: ".config/taffy/settings.json")
    }

    /// Copies an existing Taffy config to its current name without replacing either file.
    ///
    /// Call before initializing config readers or creating a default config. The
    /// previous filename takes precedence over the legacy fallback. Upstream cmux
    /// configuration is never imported.
    ///
    /// - Parameter fileManager: The file manager used to inspect and copy the files.
    /// - Returns: Whether a previous config was copied.
    /// - Throws: A filesystem error when an existing config cannot be copied.
    @discardableResult
    public func migrateLegacyUserConfigIfNeeded(fileManager: FileManager = .default) throws -> Bool {
        guard !fileManager.fileExists(atPath: userConfigFile.path) else { return false }
        guard let source = [previousConfigFile, legacyFallbackFile].first(where: {
            fileManager.fileExists(atPath: $0.path)
        }) else { return false }
        do {
            // FileManager refuses to replace a destination created by another process.
            try fileManager.copyItem(at: source, to: userConfigFile)
            return true
        } catch CocoaError.fileWriteFileExists {
            return false
        }
    }
}
