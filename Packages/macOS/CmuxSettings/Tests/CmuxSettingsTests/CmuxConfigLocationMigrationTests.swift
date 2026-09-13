import Foundation
import Testing
@testable import CmuxSettings

@Suite("Taffy configuration migration")
struct CmuxConfigLocationMigrationTests {
    private func makeHome() throws -> URL {
        let home = FileManager.default.temporaryDirectory
            .appendingPathComponent("taffy-config-migration-\(UUID().uuidString)", isDirectory: true)
        try FileManager.default.createDirectory(
            at: home.appending(path: ".config/taffy"),
            withIntermediateDirectories: true
        )
        return home
    }

    @Test func copiesPreviousTaffyConfigWithoutChangingItsContentsOrPermissions() throws {
        let home = try makeHome()
        defer { try? FileManager.default.removeItem(at: home) }
        let locations = CmuxConfigLocation(home: home)
        let original = Data("// Keep comments\n{\"app\": {\"appearance\": \"dark\"}}\n".utf8)
        try original.write(to: locations.previousConfigFile)
        try FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: locations.previousConfigFile.path)

        #expect(try locations.migrateLegacyUserConfigIfNeeded())
        #expect(try Data(contentsOf: locations.userConfigFile) == original)
        #expect(try Data(contentsOf: locations.previousConfigFile) == original)
        let attributes = try FileManager.default.attributesOfItem(atPath: locations.userConfigFile.path)
        #expect((attributes[.posixPermissions] as? NSNumber)?.intValue == 0o600)
        #expect(try !locations.migrateLegacyUserConfigIfNeeded())
    }

    @Test func existingNewConfigWinsEvenWhenBothLegacyNamesExist() throws {
        let home = try makeHome()
        defer { try? FileManager.default.removeItem(at: home) }
        let locations = CmuxConfigLocation(home: home)
        let current = Data("{\"current\": true}".utf8)
        try current.write(to: locations.userConfigFile)
        try Data("previous".utf8).write(to: locations.previousConfigFile)
        try Data("legacy".utf8).write(to: locations.legacyFallbackFile)

        #expect(try !locations.migrateLegacyUserConfigIfNeeded())
        #expect(try Data(contentsOf: locations.userConfigFile) == current)
        #expect(try String(contentsOf: locations.previousConfigFile, encoding: .utf8) == "previous")
        #expect(try String(contentsOf: locations.legacyFallbackFile, encoding: .utf8) == "legacy")
    }

    @Test func previousFilenameTakesPrecedenceOverSettingsFallback() throws {
        let home = try makeHome()
        defer { try? FileManager.default.removeItem(at: home) }
        let locations = CmuxConfigLocation(home: home)
        try Data("previous".utf8).write(to: locations.previousConfigFile)
        try Data("legacy".utf8).write(to: locations.legacyFallbackFile)

        #expect(try locations.migrateLegacyUserConfigIfNeeded())
        #expect(try String(contentsOf: locations.userConfigFile, encoding: .utf8) == "previous")
        #expect(try String(contentsOf: locations.legacyFallbackFile, encoding: .utf8) == "legacy")
    }

    @Test func settingsFallbackMigratesWhenPreviousFilenameIsAbsent() throws {
        let home = try makeHome()
        defer { try? FileManager.default.removeItem(at: home) }
        let locations = CmuxConfigLocation(home: home)
        let legacy = Data("{\"shortcuts\": {}}".utf8)
        try legacy.write(to: locations.legacyFallbackFile)

        #expect(try locations.migrateLegacyUserConfigIfNeeded())
        #expect(try Data(contentsOf: locations.userConfigFile) == legacy)
        #expect(try Data(contentsOf: locations.legacyFallbackFile) == legacy)
    }

    @Test func upstreamCmuxConfigIsNeverImported() throws {
        let home = try makeHome()
        defer { try? FileManager.default.removeItem(at: home) }
        let upstreamDirectory = home.appending(path: ".config/cmux")
        try FileManager.default.createDirectory(at: upstreamDirectory, withIntermediateDirectories: true)
        let original = Data("{\"upstream\": true}".utf8)
        for filename in ["cmux.json", "settings.json"] {
            try original.write(to: upstreamDirectory.appending(path: filename))
        }
        let locations = CmuxConfigLocation(home: home)

        #expect(try !locations.migrateLegacyUserConfigIfNeeded())
        #expect(!FileManager.default.fileExists(atPath: locations.userConfigFile.path))
        #expect(try Data(contentsOf: upstreamDirectory.appending(path: "cmux.json")) == original)
    }

    @Test func relativeSymlinkConfigKeepsItsTarget() throws {
        let home = try makeHome()
        defer { try? FileManager.default.removeItem(at: home) }
        let locations = CmuxConfigLocation(home: home)
        let target = locations.previousConfigFile.deletingLastPathComponent().appending(path: "dotfiles.json")
        let original = Data("{\"dotfiles\": true}".utf8)
        try original.write(to: target)
        try FileManager.default.createSymbolicLink(atPath: locations.previousConfigFile.path, withDestinationPath: "dotfiles.json")

        #expect(try locations.migrateLegacyUserConfigIfNeeded())
        #expect(try FileManager.default.destinationOfSymbolicLink(atPath: locations.userConfigFile.path) == "dotfiles.json")
        #expect(try Data(contentsOf: locations.userConfigFile) == original)
        #expect(try FileManager.default.destinationOfSymbolicLink(atPath: locations.previousConfigFile.path) == "dotfiles.json")
    }

    @Test func existingDanglingDestinationSymlinkIsNotReplaced() throws {
        let home = try makeHome()
        defer { try? FileManager.default.removeItem(at: home) }
        let locations = CmuxConfigLocation(home: home)
        try Data("previous".utf8).write(to: locations.previousConfigFile)
        try FileManager.default.createSymbolicLink(atPath: locations.userConfigFile.path, withDestinationPath: "not-created.json")

        #expect(try !locations.migrateLegacyUserConfigIfNeeded())
        #expect(try FileManager.default.destinationOfSymbolicLink(atPath: locations.userConfigFile.path) == "not-created.json")
        #expect(try String(contentsOf: locations.previousConfigFile, encoding: .utf8) == "previous")
    }

}
