// Inline message banner, replacing the old browser alert() popups.
function Notice({ message, kind = "error", onDismiss }) {
    if (!message) return null
    const styles =
        kind === "error"
            ? "border-red-500/50 bg-red-500/10 text-red-200"
            : "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
    return (
        <div role={kind === "error" ? "alert" : "status"} className={`mb-4 flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${styles}`}>
            <span>{message}</span>
            {onDismiss && (
                <button type="button" onClick={onDismiss} aria-label="Dismiss" className="shrink-0 text-lg leading-none opacity-70 hover:opacity-100">
                    ×
                </button>
            )}
        </div>
    )
}

export default Notice
