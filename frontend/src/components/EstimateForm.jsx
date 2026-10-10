import { useEffect, useId, useState } from "react"
import { CalendarDays, Flag, MapPin, Package, Sparkles, Truck, User } from "lucide-react"
import api from "../api"
import Breakdown from "./Breakdown"
import { Field, Segmented, Stepper, Toggle, UnitInput } from "./controls"
import { EMPTY_FORM, formToPayload } from "../estimates"
import { buttonClass, cardClass, eyebrowClass, formatHours, formatMoney, inputClass } from "../ui"

// Short labels for the segmented controls. Anything added to pricing.py
// that isn't listed here just shows its full label.
const SHORT_LABELS = {
    none: "None",
    partial: "Partial",
    full: "Full",
    dock: "Dock",
    driveway: "Driveway",
    street: "Street",
    far: "Far / none",
}
const withShort = (opts) => opts.map((o) => ({ ...o, short: SHORT_LABELS[o.value] ?? o.label }))

/**
 * The full move-details form, used for both creating and editing.
 * layout="split": form on the left, sticky live quote on the right (create page)
 * layout="stacked": single column with the quote underneath (inline edit)
 */
function EstimateForm({ initial = EMPTY_FORM, options, submitLabel = "Save Estimate", onSubmit, onCancel, busy = false, layout = "stacked" }) {
    const [form, setForm] = useState(initial)
    const [preview, setPreview] = useState(null)
    const [previewError, setPreviewError] = useState("")
    // Unique per form, so the create form and an edit form can be on the
    // page together without clashing element IDs.
    const uid = useId()
    const fid = (name) => `${uid}-${name}`

    const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))
    const onChange = (e) => {
        const { name, type, value, checked } = e.target
        set(name, type === "checkbox" ? checked : value)
    }
    const setSpecial = (key, value) =>
        setForm((prev) => ({ ...prev, special_items: { ...prev.special_items, [key]: value } }))

    const hasSize = Number(form.square_footage) > 0

    // Live quote: re-price shortly after the user stops typing.
    useEffect(() => {
        if (!hasSize) return
        let cancelled = false
        const timer = setTimeout(() => {
            api.post("/api/estimates/preview/", formToPayload(form))
                .then((res) => {
                    if (!cancelled) {
                        setPreview(res.data)
                        setPreviewError("")
                    }
                })
                .catch(() => {
                    if (!cancelled) setPreviewError("The quote couldn't be calculated. Check the numbers entered.")
                })
        }, 300)
        return () => {
            cancelled = true
            clearTimeout(timer)
        }
    }, [form, hasSize])

    const handleSubmit = (e) => {
        e.preventDefault()
        onSubmit(formToPayload(form), () => {
            setForm(EMPTY_FORM)
            setPreview(null)
        })
    }

    const parking = withShort(options?.parking ?? [{ value: "driveway", label: "Driveway / at the door" }])
    const packing = withShort(options?.packing ?? [{ value: "none", label: "No packing" }])
    const specialItems = options?.special_items ?? []
    const split = layout === "split"
    const packingLabel = packing.find((p) => p.value === form.packing)?.label

    const sections = (
        <div className="space-y-5">
            <Section icon={User} title="Customer" split={split}>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Customer name" htmlFor={fid("customer_name")}>
                        <input id={fid("customer_name")} name="customer_name" autoComplete="off" placeholder="e.g. Sarah Chen" className={inputClass} value={form.customer_name} onChange={onChange} required />
                    </Field>
                    <Field label="Move date" htmlFor={fid("move_date")}>
                        <input id={fid("move_date")} name="move_date" type="date" className={inputClass} value={form.move_date} onChange={onChange} />
                    </Field>
                </div>
            </Section>

            <Section icon={Package} title="Size of the move" description="Weight and crew are worked out for you, or enter your own." split={split}>
                <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Square footage" htmlFor={fid("square_footage")}>
                        <UnitInput unit="sq ft" id={fid("square_footage")} name="square_footage" type="number" min="1" inputMode="numeric" placeholder="1,800" inputClassName={inputClass} value={form.square_footage} onChange={onChange} required />
                    </Field>
                    <Field label="Pound estimate" htmlFor={fid("pound_estimate")} hint="Optional">
                        <UnitInput unit="lbs" id={fid("pound_estimate")} name="pound_estimate" type="number" min="0" inputMode="numeric" placeholder="Auto" inputClassName={inputClass} value={form.pound_estimate} onChange={onChange} />
                    </Field>
                    <Field label="Crew size" htmlFor={fid("crew_size")} hint="Optional">
                        <UnitInput unit="movers" id={fid("crew_size")} name="crew_size" type="number" min="1" inputMode="numeric" placeholder="Auto" inputClassName={inputClass} value={form.crew_size} onChange={onChange} />
                    </Field>
                </div>
                <div className="mt-5">
                    <Segmented label="Packing" name={fid("packing")} value={form.packing} options={packing} onChange={(v) => set("packing", v)} />
                    {packingLabel && <p className="mt-1.5 text-xs text-ink-3">{packingLabel}</p>}
                </div>
            </Section>

            <div className="grid gap-5 md:grid-cols-2">
                <AccessSection prefix="origin" icon={MapPin} title="Pickup" uid={uid} form={form} set={set} onChange={onChange} parking={parking} split={split} />
                <AccessSection prefix="dest" icon={Flag} title="Drop-off" uid={uid} form={form} set={set} onChange={onChange} parking={parking} split={split} />
            </div>

            <Section icon={Truck} title="Travel & extras" split={split}>
                <div className="grid items-end gap-4 sm:grid-cols-2">
                    <Field label="Drive time between locations" htmlFor={fid("drive_minutes")}>
                        <UnitInput unit="min" id={fid("drive_minutes")} name="drive_minutes" type="number" min="0" inputMode="numeric" placeholder="0" inputClassName={inputClass} value={form.drive_minutes} onChange={onChange} />
                    </Field>
                    <div>
                        <span className="mb-1.5 block text-[0.8125rem] font-medium text-ink-2">Furniture to disassemble / reassemble</span>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-xs text-ink-3">Beds, tables, desks…</span>
                            <Stepper label="Furniture to disassemble / reassemble" value={form.assembly_items} onChange={(v) => set("assembly_items", v)} />
                        </div>
                    </div>
                </div>
            </Section>

            {specialItems.length > 0 && (
                <Section icon={Sparkles} title="Special items" description="Extra time and handling fees are added for each." split={split}>
                    <ul className="grid gap-x-6 sm:grid-cols-2">
                        {specialItems.map((item) => (
                            <li key={item.value} className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-b-0 sm:[&:nth-last-child(2):nth-child(odd)]:border-b-0">
                                <span className="min-w-0">
                                    <span className="block text-sm text-ink">{item.label}</span>
                                    <span className="block text-xs text-ink-3">
                                        {item.fee > 0 ? `+${formatMoney(item.fee)}` : "No fee"} · {item.minutes} min
                                    </span>
                                </span>
                                <Stepper label={item.label} value={form.special_items?.[item.value] ?? ""} onChange={(v) => setSpecial(item.value, v)} />
                            </li>
                        ))}
                    </ul>
                </Section>
            )}
        </div>
    )

    const actions = (
        <div className="flex flex-col gap-2">
            <button type="submit" disabled={busy} className={`${buttonClass.primary} w-full py-3`}>
                {busy ? "Saving…" : submitLabel}
            </button>
            {onCancel && (
                <button type="button" onClick={onCancel} className={`${buttonClass.ghost} w-full`}>
                    Cancel
                </button>
            )}
        </div>
    )

    return (
        <form onSubmit={handleSubmit} aria-label={submitLabel} className={split ? "grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]" : "space-y-5"}>
            {sections}
            <aside className={split ? "lg:sticky lg:top-24" : ""}>
                <QuotePanel preview={hasSize ? preview : null} error={previewError} compact={!split}>
                    {actions}
                </QuotePanel>
            </aside>
        </form>
    )
}

function Section({ icon: Icon, title, description, children, split }) {
    return (
        <section className={split ? `${cardClass} p-5 sm:p-6` : "rounded-xl border border-line p-4 sm:p-5"}>
            <header className="mb-4 flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-text">
                    <Icon size={15} strokeWidth={2} />
                </span>
                <div>
                    <h3 className="text-[0.9375rem] font-semibold text-ink">{title}</h3>
                    {description && <p className="text-xs text-ink-3">{description}</p>}
                </div>
            </header>
            {children}
        </section>
    )
}

function AccessSection({ prefix, icon, title, uid, form, set, onChange, parking, split }) {
    const name = (f) => `${prefix}_${f}` // form field name
    const domId = (f) => `${uid}-${name(f)}`
    const elevator = form[name("elevator")]
    return (
        <Section icon={icon} title={title} description="Access at this end of the move" split={split}>
            <div className="space-y-4">
                <div className="grid grid-cols-2 items-end gap-3">
                    <div>
                        <span className={`mb-1.5 block text-[0.8125rem] font-medium ${elevator ? "text-ink-3" : "text-ink-2"}`}>Flights of stairs</span>
                        <Stepper label="Flights of stairs" value={form[name("stairs")]} onChange={(v) => set(name("stairs"), v)} />
                    </div>
                    <Field label="Carry distance" htmlFor={domId("long_carry_ft")}>
                        <UnitInput unit="ft" id={domId("long_carry_ft")} name={name("long_carry_ft")} type="number" min="0" inputMode="numeric" placeholder="0" inputClassName={inputClass} value={form[name("long_carry_ft")]} onChange={onChange} />
                    </Field>
                </div>
                <Segmented label="Truck parking" name={domId("parking")} value={form[name("parking")]} options={parking} columns="grid-cols-2" onChange={(v) => set(name("parking"), v)} />
                <div className="border-t border-line pt-4">
                    <Toggle name={name("elevator")} checked={elevator} onChange={onChange} label="Elevator" description="Used instead of stairs" />
                </div>
            </div>
        </Section>
    )
}

function QuotePanel({ preview, error, compact, children }) {
    const [showBreakdown, setShowBreakdown] = useState(false)
    return (
        <div className={`${cardClass} overflow-hidden`} aria-live="polite">
            <div className="p-5 sm:p-6">
                <div className={eyebrowClass}>Live quote</div>
                {!preview ? (
                    <div className="py-6 text-center">
                        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-subtle text-ink-3">
                            <CalendarDays size={18} />
                        </div>
                        <p className="text-sm text-ink-2">{error || "Enter the square footage to see a live quote."}</p>
                    </div>
                ) : (
                    <div className="animate-fade-in">
                        <div data-testid="live-quote" className="mt-1 font-display text-5xl leading-none tracking-tight text-ink tabular-nums">
                            {formatMoney(preview.total)}
                        </div>
                        <div className="mt-2 text-sm text-ink-3">
                            Range {formatMoney(preview.low)} – {formatMoney(preview.high)}
                        </div>
                        <dl className="mt-5 grid grid-cols-3 divide-x divide-line rounded-xl border border-line bg-subtle/60 text-center">
                            <MiniStat label="Hours" value={preview.billable_hours} />
                            <MiniStat label="Movers" value={preview.crew} />
                            <MiniStat label="Lbs" value={preview.weight.toLocaleString()} />
                        </dl>
                        {error && <p className="mt-3 text-xs text-danger">{error}</p>}
                        <button type="button" onClick={() => setShowBreakdown((s) => !s)} className="mt-4 text-sm font-medium text-accent-text hover:underline underline-offset-4">
                            {showBreakdown ? "Hide breakdown" : "Show breakdown"}
                        </button>
                        {showBreakdown && (
                            <div className="mt-4 border-t border-line pt-4">
                                <Breakdown breakdown={preview} compact={!compact} />
                            </div>
                        )}
                        {!showBreakdown && preview.minimum_applied && (
                            <p className="mt-2 text-xs text-ink-3">{formatHours(preview.billable_hours)} minimum applied.</p>
                        )}
                    </div>
                )}
            </div>
            <div className="border-t border-line bg-subtle/50 p-4 sm:px-6">{children}</div>
        </div>
    )
}

function MiniStat({ label, value }) {
    return (
        <div className="flex flex-col-reverse px-2 py-2.5">
            <dt className="text-[0.6875rem] uppercase tracking-wider text-ink-3">{label}</dt>
            <dd className="text-base font-semibold text-ink tabular-nums">{value}</dd>
        </div>
    )
}

export default EstimateForm
