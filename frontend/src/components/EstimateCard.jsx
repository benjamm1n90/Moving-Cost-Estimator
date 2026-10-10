import { useState } from "react"
import { CalendarDays, CheckCircle2, ChevronDown, Clock, NotebookPen, Pencil, Ruler, RotateCcw, Trash2, Users, Weight } from "lucide-react"
import api from "../api"
import Breakdown from "./Breakdown"
import CompletionForm from "./CompletionForm"
import EstimateForm from "./EstimateForm"
import Note from "./Note"
import { estimateToForm, hoursVariance } from "../estimates"
import { buttonClass, cardClass, errorMessage, formatDate, formatHours, formatMoney, inputClass } from "../ui"

function VarianceBadge({ variance }) {
    if (variance === null) return null
    const pct = Math.round(variance * 100)
    const close = Math.abs(pct) <= 10
    const text = pct === 0 ? "Right on estimate" : `${Math.abs(pct)}% ${pct > 0 ? "over" : "under"} estimate`
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${close ? "bg-success-soft text-success" : "bg-warn-soft text-warn"}`}>
            {text}
        </span>
    )
}

function initials(name) {
    return name.split(/\s+/).filter((w) => /^[a-z0-9]/i.test(w)).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?"
}

/**
 * One saved estimate. Handles its own edit / complete / notes / delete
 * calls and reports changes up via onChange(updated) / onRemove(id).
 */
function EstimateCard({ estimate: est, options, onChange, onRemove, onError }) {
    const [panel, setPanel] = useState(null) // null | "edit" | "complete" | "breakdown" | "notes"
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
    const weight = b.weight ?? est.pound_estimate

    const tab = (name) =>
        `${buttonClass.ghost} ${panel === name ? "bg-subtle text-ink" : ""}`

    return (
        <article className={`${cardClass} overflow-hidden transition-shadow duration-200 hover:shadow-raised`}>
            <div className="p-5 sm:p-6">
                <header className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3.5">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent-text" aria-hidden="true">
                            {initials(est.customer_name)}
                        </span>
                        <div className="min-w-0">
                            <h3 className="truncate text-base font-semibold text-ink">{est.customer_name}</h3>
                            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-3">
                                <span className="inline-flex items-center gap-1">
                                    <CalendarDays size={12} />
                                    {est.move_date ? formatDate(est.move_date) : "No move date"}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span>Updated {new Date(est.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                            </p>
                        </div>
                    </div>
                    <div className="w-full pl-[3.625rem] sm:w-auto sm:pl-0 sm:text-right">
                        <div className="font-display text-3xl leading-none tracking-tight text-ink tabular-nums">{formatMoney(est.price)}</div>
                        {b.low && <div className="mt-1.5 text-xs text-ink-3 tabular-nums">{formatMoney(b.low)} – {formatMoney(b.high)}</div>}
                    </div>
                </header>

                <dl className="mt-5 grid grid-cols-2 gap-y-3 sm:grid-cols-4">
                    <Detail icon={Clock} label="Est. hours" value={formatHours(est.estimated_hours)} />
                    <Detail icon={Users} label="Crew" value={b.crew ?? est.crew_size ?? "-"} />
                    <Detail icon={Weight} label="Weight" value={weight ? `${weight.toLocaleString()} lbs` : "-"} />
                    <Detail icon={Ruler} label="Square ft" value={est.square_footage?.toLocaleString()} />
                </dl>

                {completed && (
                    <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-subtle px-4 py-3 text-sm">
                        <span className="inline-flex items-center gap-1.5 font-medium text-success">
                            <CheckCircle2 size={16} />
                            Completed {formatDate(est.completion.completed_date)}
                        </span>
                        <span className="text-ink-2">Actual: {formatHours(est.completion.actual_hours)}, {est.completion.actual_crew_size} movers</span>
                        {est.completion.final_price && <span className="text-ink-2">Charged {formatMoney(est.completion.final_price)}</span>}
                        <VarianceBadge variance={hoursVariance(est)} />
                    </div>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-1 border-t border-line px-3 py-2 sm:px-4">
                <button type="button" onClick={() => toggle("breakdown")} className={tab("breakdown")} aria-expanded={panel === "breakdown"}>
                    <ChevronDown size={15} className={`transition-transform ${panel === "breakdown" ? "rotate-180" : ""}`} aria-hidden="true" />
                    {panel === "breakdown" ? "Hide Breakdown" : "Breakdown"}
                </button>
                <button type="button" onClick={() => toggle("notes")} className={tab("notes")} aria-expanded={panel === "notes"}>
                    <NotebookPen size={15} aria-hidden="true" />
                    {panel === "notes" ? "Hide Notes" : "Show Notes"}
                    {noteCount > 0 && (
                        <span aria-hidden="true" className="rounded-full bg-accent-soft px-1.5 text-[0.6875rem] font-semibold text-accent-text">{noteCount}</span>
                    )}
                </button>

                <div className="ml-auto flex flex-wrap items-center gap-1">
                    {confirmDelete ? (
                        <span className="flex items-center gap-1 rounded-lg bg-danger-soft py-0.5 pl-3 pr-0.5 text-sm">
                            <span className="text-danger">Delete for good?</span>
                            <button type="button" onClick={() => setConfirmDelete(false)} className={buttonClass.ghost}>Keep</button>
                            <button type="button" onClick={remove} disabled={busy} className={buttonClass.dangerSolid}>Confirm Delete</button>
                        </span>
                    ) : (
                        <>
                            <button type="button" onClick={() => toggle("edit")} className={tab("edit")}>
                                <Pencil size={14} aria-hidden="true" />
                                Edit
                            </button>
                            {completed && (
                                <button type="button" onClick={reopen} disabled={busy} className={buttonClass.ghost}>
                                    <RotateCcw size={14} aria-hidden="true" />
                                    Reopen
                                </button>
                            )}
                            <button type="button" onClick={() => setConfirmDelete(true)} className={buttonClass.danger}>
                                <Trash2 size={14} aria-hidden="true" />
                                Delete
                            </button>
                            <button type="button" onClick={() => toggle("complete")} className={`${buttonClass.secondary} ml-1`}>
                                <CheckCircle2 size={14} aria-hidden="true" className="text-success" />
                                {completed ? "Edit Results" : "Mark Completed"}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {panel && (
                <div className="animate-fade-in border-t border-line bg-canvas/60 p-5 sm:p-6">
                    {panel === "breakdown" && <Breakdown breakdown={est.breakdown} />}

                    {panel === "edit" && (
                        <EstimateForm
                            initial={estimateToForm(est)}
                            options={options}
                            submitLabel="Save Changes"
                            onSubmit={saveEdit}
                            onCancel={() => setPanel(null)}
                            busy={busy}
                        />
                    )}

                    {panel === "complete" && (
                        <CompletionForm estimate={est} onSubmit={saveCompletion} onCancel={() => setPanel(null)} busy={busy} />
                    )}

                    {panel === "notes" && (
                        <div className="space-y-3">
                            {noteCount === 0 && <p className="text-sm text-ink-3">No notes yet. Add access details, special items, or anything the crew should know.</p>}
                            {(est.notes || []).map((note) => (
                                <Note note={note} onDelete={deleteNote} key={note.id} />
                            ))}
                            <form onSubmit={createNote} className="space-y-2 rounded-xl border border-line bg-surface p-3">
                                <input
                                    type="text"
                                    placeholder="Note title"
                                    className={`${inputClass} border-transparent px-1 font-medium shadow-none hover:border-transparent focus:border-transparent focus:ring-0`}
                                    value={noteDraft.title}
                                    onChange={(e) => setNoteDraft((d) => ({ ...d, title: e.target.value }))}
                                    required
                                />
                                <textarea
                                    placeholder="Note details"
                                    className={`${inputClass} min-h-[72px] resize-y border-transparent px-1 shadow-none hover:border-transparent focus:border-transparent focus:ring-0`}
                                    value={noteDraft.content}
                                    onChange={(e) => setNoteDraft((d) => ({ ...d, content: e.target.value }))}
                                    required
                                />
                                <div className="flex justify-end border-t border-line pt-2">
                                    <button type="submit" disabled={busy} className={`${buttonClass.primary} py-1.5`}>Save Note</button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            )}
        </article>
    )
}

function Detail({ icon: Icon, label, value }) {
    return (
        <div className="flex items-center gap-2.5">
            <Icon size={16} className="shrink-0 text-ink-3" aria-hidden="true" />
            <div>
                <dt className="text-[0.6875rem] uppercase tracking-wider text-ink-3">{label}</dt>
                <dd className="text-sm font-medium text-ink tabular-nums">{value}</dd>
            </div>
        </div>
    )
}

export default EstimateCard
