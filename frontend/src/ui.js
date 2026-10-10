// Shared Tailwind class strings and small helpers used across pages.
// Colors are semantic tokens defined in index.css (light + dark).

export const inputClass =
    "block w-full rounded-lg border border-line bg-surface px-3 py-2 text-[0.9375rem] text-ink shadow-[0_1px_0_rgb(0_0_0/0.02)] placeholder:text-ink-3 transition-[border-color,box-shadow] duration-150 hover:border-line-strong focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15 disabled:opacity-60"

export const labelClass = "mb-1.5 block text-[0.8125rem] font-medium text-ink-2"

export const cardClass = "rounded-2xl border border-line bg-surface shadow-card"

export const eyebrowClass = "text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-3"

const buttonBase =
    "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20 disabled:pointer-events-none disabled:opacity-50"

export const buttonClass = {
    primary: `${buttonBase} bg-accent px-4 py-2.5 text-accent-ink shadow-card hover:bg-accent-hover`,
    secondary: `${buttonBase} border border-line bg-surface px-3 py-1.5 text-ink shadow-card hover:border-line-strong hover:bg-subtle`,
    ghost: `${buttonBase} px-2.5 py-1.5 text-ink-2 hover:bg-subtle hover:text-ink`,
    danger: `${buttonBase} px-2.5 py-1.5 text-ink-3 hover:bg-danger-soft hover:text-danger`,
    dangerSolid: `${buttonBase} bg-danger px-3 py-1.5 text-white hover:opacity-90`,
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
