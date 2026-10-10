import { useState } from "react"
import { Field, UnitInput } from "./controls"
import { buttonClass, inputClass } from "../ui"

function today() {
    const d = new Date()
    const pad = (n) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Records what actually happened on the job.
function CompletionForm({ estimate, onSubmit, onCancel, busy = false }) {
    const existing = estimate.completion
    const [form, setForm] = useState({
        completed_date: existing?.completed_date ?? estimate.move_date ?? today(),
        actual_hours: existing?.actual_hours ?? "",
        actual_crew_size: existing?.actual_crew_size ?? estimate.breakdown?.crew ?? estimate.crew_size ?? "",
        final_price: existing?.final_price ?? "",
    })
    const onChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

    const handleSubmit = (e) => {
        e.preventDefault()
        onSubmit({
            completed_date: form.completed_date,
            actual_hours: form.actual_hours,
            actual_crew_size: Number(form.actual_crew_size),
            final_price: form.final_price === "" ? null : form.final_price,
        })
    }

    const id = (f) => `${f}-${estimate.id}`
    return (
        <form onSubmit={handleSubmit} aria-label="Move results" className="space-y-4">
            <div>
                <h4 className="text-[0.9375rem] font-semibold text-ink">{existing ? "Edit move results" : "Record how the move went"}</h4>
                <p className="text-xs text-ink-3">Comparing actual hours to the estimate is how you'll know where to tune your pricing.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-4">
                <Field label="Completed on" htmlFor={id("completed_date")}>
                    <input id={id("completed_date")} name="completed_date" type="date" required className={inputClass} value={form.completed_date} onChange={onChange} />
                </Field>
                <Field label="Actual hours" htmlFor={id("actual_hours")}>
                    <UnitInput unit="hrs" id={id("actual_hours")} name="actual_hours" type="number" step="0.25" min="0.25" required inputClassName={inputClass} value={form.actual_hours} onChange={onChange} />
                </Field>
                <Field label="Actual crew size" htmlFor={id("actual_crew_size")}>
                    <UnitInput unit="movers" id={id("actual_crew_size")} name="actual_crew_size" type="number" min="1" required inputClassName={inputClass} value={form.actual_crew_size} onChange={onChange} />
                </Field>
                <Field label="Final price charged" htmlFor={id("final_price")}>
                    <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-ink-3">$</span>
                        <input id={id("final_price")} name="final_price" type="number" step="0.01" min="0" placeholder="Optional" className={`${inputClass} pl-7`} value={form.final_price} onChange={onChange} />
                    </div>
                </Field>
            </div>
            <div className="flex justify-end gap-2">
                <button type="button" onClick={onCancel} className={buttonClass.ghost}>Cancel</button>
                <button type="submit" disabled={busy} className={`${buttonClass.primary} py-2`}>
                    {existing ? "Save Results" : "Mark Completed"}
                </button>
            </div>
        </form>
    )
}

export default CompletionForm
