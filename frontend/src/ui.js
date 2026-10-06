// Shared Tailwind class strings and small helpers used across pages.
// Pulling repeated utility strings into plain constants is the idiomatic
// way to avoid duplication with Tailwind in React.

export const inputClass =
    "w-full rounded-lg border border-cyan-500/30 bg-black/40 px-3 py-2.5 text-[0.95rem] text-cyan-100 placeholder:text-slate-500 transition-colors focus:border-cyan-400 focus:outline-none focus:ring-[3px] focus:ring-cyan-400/30"

export const labelClass =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400"

export const panelClass =
    "rounded-2xl border border-cyan-500/30 bg-black/50 p-6 shadow-[0_0_30px_rgba(34,211,238,0.12)] backdrop-blur-md"

export const sectionTitleClass =
    "mb-3 text-sm font-semibold uppercase tracking-widest text-cyan-300"

const buttonBase =
    "rounded-lg border px-3 py-2 text-sm font-semibold uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50"

export const buttonClass = {
    primary: `${buttonBase} border-purple-400 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 hover:shadow-[0_0_15px_rgba(168,85,247,0.5)]`,
    secondary: `${buttonBase} border-cyan-400 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 hover:shadow-[0_0_15px_rgba(34,211,238,0.5)]`,
    danger: `${buttonBase} border-red-500/40 text-red-300 hover:border-red-400 hover:bg-red-500/10 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)]`,
    success: `${buttonBase} border-emerald-400/60 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)]`,
}

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })

export function formatMoney(value) {
    if (value === null || value === undefined || value === "") return "-"
    return currency.format(Number(value))
}

export function formatHours(value) {
    if (value === null || value === undefined || value === "") return "-"
    const n = Number(value)
    return `${Number.isInteger(n) ? n : n.toFixed(2).replace(/0$/, "")} hrs`
}

// Dates from the API are plain "YYYY-MM-DD"; parse as local so they don't
// shift a day in US timezones.
export function formatDate(value) {
    if (!value) return "-"
    const [y, m, d] = value.split("-").map(Number)
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// Turn an axios error into a readable sentence, including Django REST
// Framework's field-level validation messages.
export function errorMessage(err, fallback = "Something went wrong.") {
    const data = err?.response?.data
    if (!err?.response) return "Can't reach the server. Is the backend running?"
    if (typeof data === "string") return fallback
    if (data?.detail) return data.detail
    if (data && typeof data === "object") {
        const parts = Object.entries(data).map(([field, msgs]) => {
            const text = Array.isArray(msgs) ? msgs.join(" ") : String(msgs)
            return field === "non_field_errors" ? text : `${field.replaceAll("_", " ")}: ${text}`
        })
        if (parts.length) return parts.join(" ")
    }
    return fallback
}
