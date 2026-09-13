public import GhosttyKit

/// Shared entry points for the Ghostty runtime's C API.
// lint:allow namespace-type: runtime bindings have no instance state.
public struct GhosttyRuntimeCInterop {
    private init() {}

    /// Clears the active selection on a runtime surface.
    ///
    /// Mirrors `ghostty_surface_clear_selection` from the cmux libghostty
    /// fork. The surface pointer must be a live `ghostty_surface_t`; passing a
    /// freed pointer is undefined behavior, exactly as with any other ghostty
    /// C call.
    ///
    /// - Parameter surface: The live runtime surface to clear.
    /// - Returns: Whether the runtime cleared a selection.
    @discardableResult
    public static func clearSelection(_ surface: ghostty_surface_t) -> Bool {
        ghostty_surface_clear_selection(surface)
    }

}
