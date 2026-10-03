class Taffy < Formula
  desc "Visual agent conversation with diagrams, drawings, and Manim videos"
  homepage "https://github.com/cs50victor/taffy"
  license "GPL-3.0-or-later"
  head "https://github.com/cs50victor/taffy.git", branch: "feat/visual-web-cli"

  depends_on "bun" => :build
  depends_on "manim"

  def install
    system "bun", "install", "--frozen-lockfile"
    system "bun", "run", "build"
    bin.install "dist/taffy"
    pkgshare.install "LICENSE", "THIRD_PARTY_LICENSES.md"
  end

  def caveats
    <<~EOS
      Install and sign in to the Codex CLI before starting Taffy.
      Run: taffy /path/to/project
      Open the private browser link printed by the command.
      This preview uses tldraw under its development license.
    EOS
  end

  test do
    assert_match "Usage: taffy", shell_output("#{bin}/taffy --help")
    assert_match "0.2.0", shell_output("#{bin}/taffy --version")
  end
end
