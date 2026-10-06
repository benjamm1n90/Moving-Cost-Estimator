import { useState } from "react"
import api from "../api"
import Breakdown from "./Breakdown"
import CompletionForm from "./CompletionForm"
import EstimateForm from "./EstimateForm"
import { estimateToForm, hoursVariance } from "../estimates"
import Note from "./Note"
import { buttonClass, errorMessage, formatDate, formatHours, formatMoney, inputClass } from "../ui"

function VarianceBadge({ variance }) {
    if (variance === null) return null
    const pct = Math.round(variance * 100)
    const close = Math.abs(pct) <= 10
    const text = pct === 0 ? "Right on estimate" : `${Math.abs(pct)}% ${pct > 0 ? "over" : "under"} estimate`
    return (
        <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${close ? "border-emerald-400/50 text-emerald-300" : "border-amber-400/50 text-amber-300"}`}>
            {text}
        </span>
    )
}

/**
 * One saved estimate. Handles its own edit / complete / notes / delete
 * calls and reports changes up via onChange(updated) / onRemove(id).
 */
function EstimateCard({ estimate: est, options, onChange, onRemove, onError }) {
    const [panel, setPanel] = useState(null) // null | "edit" | "complete" | "breakdown"
    const [notesOpen, setNotesOpen] = useState(false)
    const [noteDraft, setNoteDraft] = useState({ title: "", content: "" })
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [busy, setBusy] = useState(false)

    const completed = Boolean(est.completion)
    const toggle = (name) => setPanel((p) => (p === name ? null : name))

    const run = async (fn, failMsg) => {
        setBusy(true)
        try {
            await fn()
        } catch (err) {
            onError(errorMessage(err, failMsg))
        } finally {
            setBusy(false)
        }
    }

    const saveEdit = (payload) =>
        run(async () => {
            const res = await api.patch(`/api/estimates/update/${est.id}/`, payload)
            onChange(res.data)
            setPanel(null)
        }, "Couldn't save the estimate.")

    const saveCompletion = (payload) =>
        run(async () => {
            const res = await api.put(`/api/estimates/${est.id}/completion/`, payload)
            onChange(res.data)
            setPanel(null)
        }, "Couldn't save the move results.")

    const reopen = () =>
        run(async () => {
            await api.delete(`/api/estimates/${est.id}/completion/`)
            onChange({ ...est, completion: null })
        }, "Couldn't reopen the estimate.")

    const remove = () =>
        run(async () => {
            await api.delete(`/api/estimates/delete/${est.id}/`)
            onRemove(est.id)
        }, "Couldn't delete the estimate.")

    const createNote = (e) => {
        e.preventDefault()
        run(async () => {
            const res = await api.post(`/api/estimates/${est.id}/notes/`, noteDraft)
            onChange({ ...est, notes: [...(est.notes || []), res.data] })
            setNoteDraft({ title: "", content: "" })
        }, "Couldn't save the note.")
    }

    const deleteNote = (noteId) =>
        run(async () => {
            await api.delete(`/api/notes/delete/${noteId}/`)
            onChange({ ...est, notes: (est.notes || []).filter((n) => n.id !== noteId) })
        }, "Couldn't delete the note.")

    const b = est.breakdown || {}
    const noteCount = (est.notes || []).length

    return (
        <article className="rounded-xl border border-cyan-500/25 bg-black/45 p-5 shadow-[0_0_15px_rgba(34,211,238,0.1)] backdrop-blur-md transition hover:border-cyan-400/50">
            <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 className="text-lg font-semibold text-cyan-100">{est.customer_name}</h3>
                    <p className="text-xs text-slate-500">
                        {est.move_date ? `Move date ${formatDate(est.move_date)}` : "No move date"} · Updated {new Date(est.updated_at).toLocaleDateString("en-US")}
                    </p>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-bold text-purple-300 [text-shadow:0_0_12px_rgba(192,132,252,0.6)]">{formatMoney(est.price)}</div>
                    {b.low && <div className="text-xs text-slate-500">{formatMoney(b.low)} - {formatMoney(b.high)}</div>}
                </div>
            </header>

            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
                <Detail label="Est. hours" value={formatHours(est.estimated_hours)} />
                <Detail label="Crew" value={b.crew ?? est.crew_size ?? "-"} />
                <Detail label="Weight" value={b.weight ? `${b.weight.toLocaleString()} lbs` : est.pound_estimate ? `${est.pound_estimate} lbs` : "-"} />
                <Detail label="Square ft" value={est.square_footage?.toLocaleString()} />
            </dl>

            {completed && (
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-emerald-400/25 bg-emerald-500/5 px-3 py-2 text-sm text-slate-300">
                    <span className="font-semibold text-emerald-300">Completed {formatDate(est.completion.completed_date)}</span>
                    <span>Actual: {formatHours(est.completion.actual_hours)}, {est.completion.actual_crew_size} movers</span>
                    {est.completion.final_price && <span>Charged {formatMoney(est.completion.final_price)}</span>}
                    <VarianceBadge variance={hoursVariance(est)} />
                </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => toggle("breakdown")} className={buttonClass.secondary}>
                    {panel === "breakdown" ? "Hide Breakdown" : "Breakdown"}
                </button>
                <button type="button" onClick={() => setNotesOpen((o) => !o)} className={buttonClass.primary}>
                    {notesOpen ? "Hide Notes" : "Show Notes"}
                </button>
                <button type="button" onClick={() => toggle("edit")} className={buttonClass.secondary}>Edit</button>
                <button type="button" onClick={() => toggle("complete")} className={buttonClass.success}>
                    {completed ? "Edit Results" : "Mark Completed"}
                </button>
                {completed && (
                    <button type="button" onClick={reopen} disabled={busy} className={buttonClass.secondary}>Reopen</button>
                )}
                {confirmDelete ? (
                    <>
                        <button type="button" onClick={remove} disabled={busy} className={`${buttonClass.danger} bg-red-500/20`}>Confirm Delete</button>
                        <button type="button" onClick={() => setConfirmDelete(false)} className={buttonClass.secondary}>Keep</button>
                    </>
                ) : (
                    <button type="button" onClick={() => setConfirmDelete(true)} className={buttonClass.danger}>Delete</button>
                )}
            </div>
            {noteCount > 0 && !notesOpen && <p className="mt-2 text-xs text-slate-500">{noteCount} note{noteCount === 1 ? "" : "s"}</p>}

            {panel === "breakdown" && (
                <div className="mt-4 border-t border-cyan-500/20 pt-4"><Breakdown breakdown={est.breakdown} /></div>
            )}

            {panel === "edit" && (
                <div className="mt-4 border-t border-cyan-500/20 pt-4">
                    <EstimateForm
                        initial={estimateToForm(est)}
                        options={options}
                        submitLabel="Save Changes"
                        onSubmit={saveEdit}
                        onCancel={() => setPanel(null)}
                        busy={busy}
                    />
                </div>
            )}

            {panel === "complete" && (
                <div className="mt-4">
                    <CompletionForm estimate={est} onSubmit={saveCompletion} onCancel={() => setPanel(null)} busy={busy} />
                </div>
            )}

            {notesOpen && (
                <div className="mt-4 flex flex-col gap-2 border-t border-cyan-500/20 pt-3">
                    {(est.notes || []).map((note) => (
                        <Note note={note} onDelete={deleteNote} key={note.id} />
                    ))}
                    <form onSubmit={createNote} className="flex flex-col gap-1.5">
                        <input
                            type="text"
                            placeholder="Note title"
                            className={inputClass}
                            value={noteDraft.title}
                            onChange={(e) => setNoteDraft((d) => ({ ...d, title: e.target.value }))}
                            required
                        />
                        <textarea
                            placeholder="Note details"
                            className={`${inputClass} min-h-[60px] resize-y`}
                            value={noteDraft.content}
                            onChange={(e) => setNoteDraft((d) => ({ ...d, content: e.target.value }))}
                            required
                        />
                        <input type="submit" value="Save Note" disabled={busy} className={`${buttonClass.primary} w-full cursor-pointer`} />
                    </form>
                </div>
            )}
        </article>
    )
}

function Detail({ label, value }) {
    return (
        <div>
            <dt className="text-[0.7rem] uppercase tracking-wider text-slate-500">{label}</dt>
            <dd className="text-slate-200">{value}</dd>
        </div>
    )
}

export default EstimateCard
