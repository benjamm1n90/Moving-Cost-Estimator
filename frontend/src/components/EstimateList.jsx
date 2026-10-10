import { useState } from "react"
import { Search } from "lucide-react"
import EstimateCard from "./EstimateCard"
import { inputClass } from "../ui"

// Titled, searchable list of estimate cards with an empty state.
function EstimateList({ title, estimates, loading, options, onChange, onRemove, onError, empty }) {
    const [query, setQuery] = useState("")
    const q = query.trim().toLowerCase()
    const shown = q ? estimates.filter((e) => e.customer_name.toLowerCase().includes(q)) : estimates

    return (
        <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-baseline gap-2.5 text-lg font-semibold text-ink">
                    {title}
                    {!loading && <span className="rounded-full bg-subtle px-2 py-0.5 text-xs font-medium text-ink-2 tabular-nums">{estimates.length}</span>}
                </h2>
                {estimates.length > 3 && (
                    <div className="relative w-full sm:w-64">
                        <Search size={15} className="pointer-events-none absolute inset-y-0 left-3 my-auto text-ink-3" aria-hidden="true" />
                        <input type="search" aria-label="Search customers" placeholder="Search customers" value={query} onChange={(e) => setQuery(e.target.value)} className={`${inputClass} py-1.5 pl-9 text-sm`} />
                    </div>
                )}
            </div>

            {loading && (
                <div className="space-y-4" aria-hidden="true">
                    {[0, 1].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl border border-line bg-surface" />)}
                </div>
            )}

            {!loading && estimates.length === 0 && (
                <div className="rounded-2xl border border-dashed border-line-strong px-6 py-12 text-center">
                    <p className="text-sm text-ink-2">{empty}</p>
                </div>
            )}

            {!loading && estimates.length > 0 && shown.length === 0 && (
                <p className="py-8 text-center text-sm text-ink-3">No customers match “{query}”.</p>
            )}

            <div className="space-y-4">
                {shown.map((est) => (
                    <EstimateCard key={est.id} estimate={est} options={options} onChange={onChange} onRemove={onRemove} onError={onError} />
                ))}
            </div>
        </section>
    )
}

export default EstimateList
