import { Minus, Plus } from "lucide-react"
import { labelClass } from "../ui"

// Small form building blocks shared by the estimate and completion forms.

export function Field({ label, htmlFor, hint, children, className = "" }) {
    return (
        <div className={className}>
            <label htmlFor={htmlFor} className={labelClass}>{label}</label>
            {children}
            {hint && <p className="mt-1.5 text-xs text-ink-3">{hint}</p>}
        </div>
    )
}

/** Input with a unit suffix ("ft", "min", "lbs") inside the box. */
export function UnitInput({ unit, className = "", inputClassName, ...props }) {
    return (
        <div className={`relative ${className}`}>
            <input {...props} className={`${inputClassName} ${unit ? "pr-12" : ""}`} />
            {unit && (
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-ink-3">{unit}</span>
            )}
        </div>
    )
}

/** Pill-style single choice. Uses real radio inputs for accessibility. */
export function Segmented({ name, value, options, onChange, label, columns }) {
    return (
        <fieldset>
            {label && <legend className={labelClass}>{label}</legend>}
            <div
                className={`grid gap-1 rounded-xl border border-line bg-subtle p-1 ${columns ?? "grid-flow-col auto-cols-fr"}`}
                role="radiogroup"
            >
                {options.map((o) => {
                    const checked = value === o.value
                    return (
                        <label
                            key={o.value}
                            className={`relative flex cursor-pointer items-center justify-center rounded-lg px-2.5 py-1.5 text-center text-[0.8125rem] font-medium leading-tight transition-all duration-150 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-accent/20 ${
                                checked ? "bg-surface text-ink shadow-card ring-1 ring-line" : "text-ink-2 hover:text-ink"
                            }`}
                        >
                            <input
                                type="radio"
                                name={name}
                                value={o.value}
                                checked={checked}
                                onChange={() => onChange(o.value)}
                                className="sr-only"
                            />
                            {o.short ?? o.label}
                        </label>
                    )
                })}
            </div>
        </fieldset>
    )
}

/** iOS-style switch backed by a checkbox. */
export function Toggle({ name, checked, onChange, label, description }) {
    return (
        <label className="flex cursor-pointer items-center justify-between gap-4">
            <span>
                <span className="block text-sm font-medium text-ink">{label}</span>
                {description && <span className="block text-xs text-ink-3">{description}</span>}
            </span>
            <span className="relative inline-flex shrink-0">
                <input type="checkbox" name={name} checked={checked} onChange={onChange} className="peer sr-only" />
                <span className="h-6 w-10 rounded-full bg-line-strong transition-colors duration-200 peer-checked:bg-accent peer-focus-visible:ring-4 peer-focus-visible:ring-accent/20" />
                <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 peer-checked:translate-x-4" />
            </span>
        </label>
    )
}

/** Compact - 0 + counter. */
export function Stepper({ value, onChange, label, min = 0 }) {
    const n = Number(value) || 0
    const btn =
        "flex h-8 w-8 items-center justify-center rounded-md text-ink-2 transition-colors hover:bg-subtle hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
    return (
        <div className="inline-flex w-fit items-center rounded-lg border border-line bg-surface p-0.5 shadow-card">
            <button type="button" className={btn} onClick={() => onChange(String(Math.max(min, n - 1)))} disabled={n <= min} aria-label={`Fewer ${label}`}>
                <Minus size={14} strokeWidth={2.25} />
            </button>
            <input
                type="number"
                min={min}
                inputMode="numeric"
                aria-label={label}
                placeholder="0"
                value={value ?? ""}
                onChange={(e) => onChange(e.target.value)}
                className={`w-9 bg-transparent text-center text-sm font-semibold tabular-nums outline-none placeholder:text-ink-3 ${n > 0 ? "text-ink" : "text-ink-3"}`}
            />
            <button type="button" className={btn} onClick={() => onChange(String(n + 1))} aria-label={`More ${label}`}>
                <Plus size={14} strokeWidth={2.25} />
            </button>
        </div>
    )
}

/** The app's mark: an isometric box. */
export function Logo({ size = 28 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
            <rect width="32" height="32" rx="8" className="fill-accent" />
            <path d="M9 13.5 16 9.5l7 4v9l-7 4-7-4z M9 13.5l7 4 7-4 M16 17.5v9" fill="none" className="stroke-accent-ink" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
    )
}
