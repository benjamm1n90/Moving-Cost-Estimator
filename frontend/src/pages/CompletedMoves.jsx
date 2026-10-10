import { useState } from "react"
import EstimateList from "../components/EstimateList"
import NavBar from "../components/NavBar"
import Notice from "../components/Notice"
import PageHeader from "../components/PageHeader"
import { accuracyStats } from "../estimates"
import { useEstimates, usePricingOptions } from "../hooks"
import { eyebrowClass, formatMoney } from "../ui"

function CompletedMoves() {
    const [error, setError] = useState("")
    const options = usePricingOptions(setError)
    const { estimates, loading, replace, remove } = useEstimates("completed", setError)
    const stats = accuracyStats(estimates)

    return (
        <>
            <NavBar />
            <main className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6 sm:pt-14">
                <PageHeader
                    eyebrow="Track record"
                    title="Completed moves"
                    description="How each job actually went, next to what you quoted. Use it to tune your pricing."
                />

                <Notice message={error} onDismiss={() => setError("")} />

                {stats && (
                    <section aria-label="Estimate accuracy" className="mb-12 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line shadow-card lg:grid-cols-4">
                        <Stat label="Moves compared" value={stats.count} />
                        <Stat
                            label="Avg. hours, est. vs actual"
                            value={
                                <>
                                    {stats.avgEstimated.toFixed(1)}
                                    <span className="mx-1.5 text-ink-3">/</span>
                                    {stats.avgActual.toFixed(1)}
                                </>
                            }
                        />
                        <Stat
                            label="Average miss"
                            value={`${Math.abs(Math.round(stats.avgVariance * 100))}% ${stats.avgVariance >= 0 ? "over" : "under"}`}
                            note={stats.avgVariance >= 0 ? "Jobs run longer than quoted" : "Jobs finish faster than quoted"}
                        />
                        <Stat
                            label="Within ±10%"
                            value={`${Math.round(stats.withinTen * 100)}%`}
                            note={stats.revenue > 0 ? `${formatMoney(stats.revenue)} charged in total` : "of moves"}
                        />
                    </section>
                )}

                <EstimateList
                    title="All completed moves"
                    estimates={estimates}
                    loading={loading}
                    options={options}
                    onChange={replace}
                    onRemove={remove}
                    onError={setError}
                    empty="No completed moves yet. After a job, use “Mark Completed” on its estimate to record the actual hours."
                />
            </main>
        </>
    )
}

function Stat({ label, value, note }) {
    return (
        <div className="bg-surface p-5 sm:p-6">
            <div className={eyebrowClass}>{label}</div>
            <div className="mt-2 font-display text-4xl leading-none tracking-tight text-ink tabular-nums">{value}</div>
            {note && <div className="mt-2 text-xs text-ink-3">{note}</div>}
        </div>
    )
}

export default CompletedMoves
