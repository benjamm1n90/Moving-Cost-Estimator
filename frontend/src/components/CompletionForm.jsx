import { useState } from "react"
import { buttonClass, inputClass, labelClass } from "../ui"

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
        <form onSubmit={handleSubmit} aria-label="Move results" className="grid gap-3 rounded-xl border border-emerald-400/30 bg-emerald-500/5 p-4 sm:grid-cols-2">
            <p className="text-sm text-slate-300 sm:col-span-2">Record how the move actually went. This is what lets you check how accurate your estimates are.</p>
            <div>
                <label htmlFor={id("completed_date")} className={labelClass}>Completed on</label>
                <input id={id("completed_date")} name="completed_date" type="date" required className={`${inputClass} [color-scheme:dark]`} value={form.completed_date} onChange={onChange} />
            </div>
            <div>
                <label htmlFor={id("actual_hours")} className={labelClass}>Actual hours</label>
                <input id={id("actual_hours")} name="actual_hours" type="number" step="0.25" min="0.25" required className={inputClass} value={form.actual_hours} onChange={onChange} />
            </div>
            <div>
                <label htmlFor={id("actual_crew_size")} className={labelClass}>Actual crew size</label>
                <input id={id("actual_crew_size")} name="actual_crew_size" type="number" min="1" required className={inputClass} value={form.actual_crew_size} onChange={onChange} />
            </div>
            <div>
                <label htmlFor={id("final_price")} className={labelClass}>Final price charged</label>
                <input id={id("final_price")} name="final_price" type="number" step="0.01" min="0" placeholder="Optional" className={inputClass} value={form.final_price} onChange={onChange} />
            </div>
            <div className="flex gap-2 sm:col-span-2">
                <button type="submit" disabled={busy} className={`${buttonClass.success} flex-1`}>
                    {existing ? "Save Results" : "Mark Completed"}
                </button>
                <button type="button" onClick={onCancel} className={buttonClass.danger}>Cancel</button>
            </div>
        </form>
    )
}

export default CompletionForm
