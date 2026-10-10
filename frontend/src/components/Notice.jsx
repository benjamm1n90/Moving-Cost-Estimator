import { CircleAlert, CircleCheck, X } from "lucide-react"

// Inline message banner (replaces the old browser alert() popups).
function Notice({ message, kind = "error", onDismiss }) {
    if (!message) return null
    const isError = kind === "error"
    const Icon = isError ? CircleAlert : CircleCheck
    return (
        <div
            role={isError ? "alert" : "status"}
            className={`animate-fade-in mb-5 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
                isError ? "border-danger/25 bg-danger-soft text-danger" : "border-success/25 bg-success-soft text-success"
            }`}
        >
            <Icon size={18} className="mt-px shrink-0" />
            <span className="flex-1 text-ink">{message}</span>
            {onDismiss && (
                <button type="button" onClick={onDismiss} aria-label="Dismiss" className="-m-1 rounded-md p-1 opacity-60 transition-opacity hover:opacity-100">
                    <X size={16} />
                </button>
            )}
        </div>
    )
}

export default Notice
