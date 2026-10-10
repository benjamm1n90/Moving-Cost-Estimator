import { Trash2 } from "lucide-react"

function Note({ note, onDelete }) {
    const formattedDate = new Date(note.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    return (
        <div data-testid="note-card" className="group rounded-xl border border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="font-medium text-ink">{note.title}</p>
                    <p className="mt-1 whitespace-pre-line text-sm text-ink-2">{note.content}</p>
                    <p className="mt-2 text-xs text-ink-3">{formattedDate}</p>
                </div>
                <button
                    type="button"
                    onClick={() => onDelete(note.id)}
                    aria-label="Delete"
                    title="Delete note"
                    className="rounded-md p-1.5 text-ink-3 transition-colors hover:bg-danger-soft hover:text-danger"
                >
                    <Trash2 size={15} />
                </button>
            </div>
        </div>
    )
}

export default Note
