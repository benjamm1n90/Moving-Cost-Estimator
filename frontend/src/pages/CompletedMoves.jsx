import { useState } from "react"
import EstimateCard from "../components/EstimateCard"
import { accuracyStats } from "../estimates"
import NavBar from "../components/NavBar"
import Notice from "../components/Notice"
import { useEstimates, usePricingOptions } from "../hooks"
import { formatHours, formatMoney, panelClass } from "../ui"

function CompletedMoves() {
    const [error, setError] = useState("")
    const options = usePricingOptions(setError)
    const { estimates, loading, replace, remove } = useEstimates("completed", setError)
    const stats = accuracyStats(estimates)

    return (
        <>
            <NavBar />
            <main className="mx-auto max-w-[960px] px-4 py-10 text-slate-200">
                <Notice message={error} onDismiss={() => setError("")} />

                <h2 className="mb-5 text-2xl font-semibold uppercase tracking-widest text-cyan-300">Completed Moves</h2>

                {stats && (
                    <section className={`${panelClass} mb-8`} aria-label="Estimate accuracy">
                        <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-cyan-300">Estimate accuracy</h3>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <Stat label="Moves compared" value={stats.count} />
                            <Stat label="Avg estimated vs actual" value={`${formatHours(stats.avgEstimated.toFixed(2))} / ${formatHours(stats.avgActual.toFixed(2))}`} />
                            <Stat
                                label="Average miss"
                                value={`${Math.abs(Math.round(stats.avgVariance * 100))}% ${stats.avgVariance >= 0 ? "over" : "under"}`}
                                note={stats.avgVariance >= 0 ? "jobs run longer than estimated" : "jobs finish faster than estimated"}
                            />
                            <Stat label="Within ±10%" value={`${Math.round(stats.withinTen * 100)}%`} note="of moves" />
                        </div>
                        {stats.revenue > 0 && <p className="mt-3 text-xs text-slate-500">Total charged across completed moves: {formatMoney(stats.revenue)}</p>}
                    </section>
                )}

                {!loading && estimates.length === 0 && (
                    <p className="text-sm text-slate-400">No completed moves yet. Use "Mark Completed" on an estimate after the job to record the actual hours.</p>
                )}

                <div className="flex flex-col gap-5">
                    {estimates.map((est) => (
                        <EstimateCard
                            key={est.id}
                            estimate={est}
                            options={options}
                            onChange={replace}
                            onRemove={remove}
                            onError={setError}
                        />
                    ))}
                </div>
            </main>
        </>
    )
}

function Stat({ label, value, note }) {
    return (
        <div className="rounded-lg border border-cyan-500/15 bg-black/30 p-3">
            <div className="text-[0.7rem] uppercase tracking-wider text-slate-500">{label}</div>
            <div className="text-lg font-semibold text-cyan-100">{value}</div>
            {note && <div className="text-[0.7rem] text-slate-500">{note}</div>}
        </div>
    )
}

export default CompletedMoves
