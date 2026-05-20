export function RouteFallback() {
  return (
    <main className="terminal-shell min-h-screen overflow-hidden bg-[#08040a] font-mono text-cyber-ice">
      <div className="terminal-aurora" />
      <div className="terminal-grid" />
      <div className="terminal-noise" />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <div className="terminal-frame px-5 py-4 text-xs uppercase tracking-[0.28em] text-cyber-cyan">
          Loading route...
        </div>
      </div>
    </main>
  )
}
