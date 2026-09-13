import Testing
@testable import CmuxSettings

@Test func markerFilesAreVariantAware() {
    #expect(SocketPathMarkerFiles.variant(
        bundleIdentifier: "com.cs50victor.taffy",
        environment: [:]
    ) == .stable)
    #expect(SocketPathMarkerFiles.variant(
        bundleIdentifier: "com.cs50victor.taffy.nightly",
        environment: [:]
    ) == .nightly(slug: nil))
    #expect(SocketPathMarkerFiles.variant(
        bundleIdentifier: "com.cs50victor.taffy.debug.agent",
        environment: [:]
    ) == .dev(slug: "agent"))
    #expect(SocketPathMarkerFiles.variant(
        bundleIdentifier: "com.cs50victor.taffy.debug",
        environment: ["CMUX_TAG": "Issue 3542"]
    ) == .dev(slug: "issue-3542"))
    #expect(SocketPathMarkerFiles.variant(
        bundleIdentifier: "com.cs50victor.taffy.debug",
        environment: ["CMUX_TAG": "café"]
    ) == .dev(slug: "caf"))
}

@Test func defaultSocketPathsStayVariantScoped() {
    #expect(SocketPathMarkerFiles.defaultSocketPath(
        bundleIdentifier: "com.cs50victor.taffy",
        environment: [:],
        isDebugBuild: false,
        stableSocketPath: "/stable/cmux.sock"
    ) == "/stable/cmux.sock")
    #expect(SocketPathMarkerFiles.defaultSocketPath(
        bundleIdentifier: "com.cs50victor.taffy.nightly",
        environment: [:],
        isDebugBuild: false,
        stableSocketPath: "/stable/cmux.sock"
    ) == "/tmp/taffy-nightly.sock")
    #expect(SocketPathMarkerFiles.defaultSocketPath(
        bundleIdentifier: "com.cs50victor.taffy.staging.my-feature",
        environment: [:],
        isDebugBuild: false,
        stableSocketPath: "/stable/cmux.sock"
    ) == "/tmp/taffy-staging-my-feature.sock")
    #expect(SocketPathMarkerFiles.defaultSocketPath(
        bundleIdentifier: "com.cs50victor.taffy.debug",
        environment: ["CMUX_TAG": "Issue 3542"],
        isDebugBuild: false,
        stableSocketPath: "/stable/cmux.sock"
    ) == "/tmp/taffy-debug-issue-3542.sock")
}
