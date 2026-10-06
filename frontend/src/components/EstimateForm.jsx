import { useEffect, useId, useState } from "react"
import api from "../api"
import Breakdown from "./Breakdown"
import { EMPTY_FORM, formToPayload } from "../estimates"
import { buttonClass, formatHours, formatMoney, inputClass, labelClass, sectionTitleClass } from "../ui"

/**
 * The full move-details form, used for both creating and editing.
 * Shows a live quote (from /api/estimates/preview/) as you type.
 */
function EstimateForm({ initial = EMPTY_FORM, options, submitLabel = "Save Estimate", onSubmit, onCancel, busy = false }) {
    const [form, setForm] = useState(initial)
    const [preview, setPreview] = useState(null)
    const [previewError, setPreviewError] = useState("")
    const [showBreakdown, setShowBreakdown] = useState(false)
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
                    if (!cancelled) setPreviewError("The quote couldn't be calculated - check the numbers entered.")
                })
        }, 350)
        return () => {
            cancelled = true
            clearTimeout(timer)
        }
    }, [form, hasSize])

    const handleSubmit = (e) => {
        e.preventDefault()
        onSubmit(formToPayload(form), () => setForm(EMPTY_FORM))
    }

    const parking = options?.parking ?? [{ value: "driveway", label: "Driveway / at the door" }]
    const packing = options?.packing ?? [{ value: "none", label: "No packing" }]
    const specialItems = options?.special_items ?? []

    return (
        <form onSubmit={handleSubmit} className="space-y-6" aria-label={submitLabel}>
            <fieldset>
                <legend className={sectionTitleClass}>Customer</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Customer name" htmlFor={fid("customer_name")}>
                        <input id={fid("customer_name")} name="customer_name" className={inputClass} value={form.customer_name} onChange={onChange} required />
                    </Field>
                    <Field label="Move date" htmlFor={fid("move_date")}>
                        <input id={fid("move_date")} name="move_date" type="date" className={`${inputClass} [color-scheme:dark]`} value={form.move_date} onChange={onChange} />
                    </Field>
                </div>
            </fieldset>

            <fieldset>
                <legend className={sectionTitleClass}>Size of the move</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Square footage" htmlFor={fid("square_footage")}>
                        <input id={fid("square_footage")} name="square_footage" type="number" min="1" className={inputClass} value={form.square_footage} onChange={onChange} required />
                    </Field>
                    <Field label="Pound estimate" htmlFor={fid("pound_estimate")} hint="Leave blank to estimate from square footage">
                        <input id={fid("pound_estimate")} name="pound_estimate" type="number" min="0" placeholder="Auto" className={inputClass} value={form.pound_estimate} onChange={onChange} />
                    </Field>
                    <Field label="Crew size" htmlFor={fid("crew_size")} hint="Leave blank for a recommended crew">
                        <input id={fid("crew_size")} name="crew_size" type="number" min="1" placeholder="Auto" className={inputClass} value={form.crew_size} onChange={onChange} />
                    </Field>
                    <Field label="Packing" htmlFor={fid("packing")}>
                        <select id={fid("packing")} name="packing" className={inputClass} value={form.packing} onChange={onChange}>
                            {packing.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </Field>
                </div>
            </fieldset>

            <div className="grid gap-6 sm:grid-cols-2">
                <AccessFields prefix="origin" uid={uid} title="Pickup access" form={form} onChange={onChange} parking={parking} />
                <AccessFields prefix="dest" uid={uid} title="Drop-off access" form={form} onChange={onChange} parking={parking} />
            </div>

            <fieldset>
                <legend className={sectionTitleClass}>Travel & extras</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Drive time between locations (min)" htmlFor={fid("drive_minutes")}>
                        <input id={fid("drive_minutes")} name="drive_minutes" type="number" min="0" placeholder="0" className={inputClass} value={form.drive_minutes} onChange={onChange} />
                    </Field>
                    <Field label="Furniture to disassemble / reassemble" htmlFor={fid("assembly_items")} hint="Beds, tables, desks, etc.">
                        <input id={fid("assembly_items")} name="assembly_items" type="number" min="0" placeholder="0" className={inputClass} value={form.assembly_items} onChange={onChange} />
                    </Field>
                </div>
            </fieldset>

            {specialItems.length > 0 && (
                <fieldset>
                    <legend className={sectionTitleClass}>Special items</legend>
                    <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
                        {specialItems.map((item) => (
                            <label key={item.value} className="flex items-center justify-between gap-3 rounded-lg border border-cyan-500/15 bg-black/30 px-3 py-2 text-sm text-slate-300">
                                <span>
                                    {item.label}
                                    {item.fee > 0 && <span className="block text-xs text-slate-500">+{formatMoney(item.fee)} each</span>}
                                </span>
                                <input
                                    type="number"
                                    min="0"
                                    aria-label={item.label}
                                    placeholder="0"
                                    className={`${inputClass} w-20 py-1.5 text-center`}
                                    value={form.special_items?.[item.value] ?? ""}
                                    onChange={(e) => setSpecial(item.value, e.target.value)}
                                />
                            </label>
                        ))}
                    </div>
                </fieldset>
            )}

            <QuotePanel preview={hasSize ? preview : null} error={previewError} showBreakdown={showBreakdown} onToggle={() => setShowBreakdown((s) => !s)} />

            <div className="flex flex-col gap-2 sm:flex-row">
                <button type="submit" disabled={busy} className={`${buttonClass.primary} flex-1 p-3`}>
                    {busy ? "Saving..." : submitLabel}
                </button>
                {onCancel && (
                    <button type="button" onClick={onCancel} className={`${buttonClass.danger} sm:w-40`}>
                        Cancel
                    </button>
                )}
            </div>
        </form>
    )
}

function Field({ label, htmlFor, hint, children }) {
    return (
        <div>
            <label htmlFor={htmlFor} className={labelClass}>{label}</label>
            {children}
            {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
    )
}

function AccessFields({ prefix, uid, title, form, onChange, parking }) {
    const id = (f) => `${prefix}_${f}` // field name
    const domId = (f) => `${uid}-${id(f)}`
    return (
        <fieldset className="rounded-xl border border-cyan-500/15 bg-black/20 p-4">
            <legend className={`${sectionTitleClass} px-1`}>{title}</legend>
            <div className="grid grid-cols-2 gap-3">
                <Field label="Flights of stairs" htmlFor={domId("stairs")}>
                    <input id={domId("stairs")} name={id("stairs")} type="number" min="0" placeholder="0" className={inputClass} value={form[id("stairs")]} onChange={onChange} />
                </Field>
                <Field label="Carry distance (ft)" htmlFor={domId("long_carry_ft")}>
                    <input id={domId("long_carry_ft")} name={id("long_carry_ft")} type="number" min="0" placeholder="0" className={inputClass} value={form[id("long_carry_ft")]} onChange={onChange} />
                </Field>
                <div className="col-span-2">
                    <Field label="Parking / truck access" htmlFor={domId("parking")}>
                        <select id={domId("parking")} name={id("parking")} className={inputClass} value={form[id("parking")]} onChange={onChange}>
                            {parking.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </Field>
                </div>
                <label className="col-span-2 flex items-center gap-2 text-sm text-slate-300">
                    <input type="checkbox" name={id("elevator")} checked={form[id("elevator")]} onChange={onChange} className="h-4 w-4 accent-cyan-400" />
                    Elevator (used instead of stairs)
                </label>
            </div>
        </fieldset>
    )
}

function QuotePanel({ preview, error, showBreakdown, onToggle }) {
    return (
        <div className="rounded-xl border border-purple-400/40 bg-purple-500/5 p-4" aria-live="polite">
            {!preview ? (
                <p className="text-sm text-slate-400">{error || "Enter the square footage to see a live quote."}</p>
            ) : (
                <>
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <div className="text-xs uppercase tracking-wider text-slate-400">Live quote</div>
                            <div data-testid="live-quote" className="text-3xl font-bold text-purple-300 [text-shadow:0_0_12px_rgba(192,132,252,0.6)]">
                                {formatMoney(preview.total)}
                            </div>
                            <div className="text-xs text-slate-400">
                                Range {formatMoney(preview.low)} - {formatMoney(preview.high)}
                            </div>
                        </div>
                        <div className="text-right text-sm text-slate-300">
                            <div>{formatHours(preview.billable_hours)} billable</div>
                            <div>{preview.crew} movers · {preview.weight.toLocaleString()} lbs</div>
                        </div>
                    </div>
                    {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
                    <button type="button" onClick={onToggle} className="mt-3 text-xs font-semibold uppercase tracking-wider text-cyan-300 hover:text-cyan-100">
                        {showBreakdown ? "Hide breakdown ▲" : "Show breakdown ▼"}
                    </button>
                    {showBreakdown && <div className="mt-3"><Breakdown breakdown={preview} /></div>}
                </>
            )}
        </div>
    )
}

export default EstimateForm
