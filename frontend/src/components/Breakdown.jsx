import { formatHours, formatMoney, eyebrowClass } from "../ui"

// Shows how an estimate's hours and price were worked out.
function Breakdown({ breakdown, compact = false }) {
    if (!breakdown || !breakdown.hours) {
        return (
            <p className="rounded-lg bg-subtle px-4 py-3 text-sm text-ink-2">
                This estimate was made with the old pricing formula, so there's no breakdown. Edit and save it to re-price it.
            </p>
        )
    }

    const maxHours = Math.max(...breakdown.hours.map((h) => h.hours), 0.01)

    return (
        <div className="space-y-6 text-sm" data-testid="breakdown">
            <dl className={`grid gap-px overflow-hidden rounded-xl border border-line bg-line ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}>
                <Stat label="Weight" value={`${breakdown.weight.toLocaleString()} lbs`} note={breakdown.weight_source === "entered" ? "entered" : breakdown.weight_source} />
                <Stat label="Crew" value={`${breakdown.crew} movers`} note={breakdown.crew_source} />
                <Stat label="Billable time" value={formatHours(breakdown.billable_hours)} note={breakdown.minimum_applied ? "minimum applied" : `${breakdown.total_hours} hrs of work`} />
                <Stat label="Hourly rate" value={formatMoney(breakdown.hourly_rate)} note="crew + truck" />
            </dl>

            <div className={compact ? "space-y-6" : "grid gap-8 sm:grid-cols-2"}>
                <section>
                    <h4 className={`${eyebrowClass} mb-2`}>Time</h4>
                    <ul className="space-y-3">
                        {breakdown.hours.map((line) => (
                            <li key={line.label}>
                                <div className="flex items-baseline justify-between gap-3">
                                    <span className="text-ink">{line.label}</span>
                                    <span className="tabular-nums text-ink-2">{formatHours(line.hours)}</span>
                                </div>
                                <div className="mt-1 h-1 overflow-hidden rounded-full bg-subtle">
                                    <div className="h-full rounded-full bg-accent/70" style={{ width: `${Math.max(3, (line.hours / maxHours) * 100)}%` }} />
                                </div>
                                {line.detail && <p className="mt-1 text-xs text-ink-3">{line.detail}</p>}
                            </li>
                        ))}
                    </ul>
                </section>

                <section>
                    <h4 className={`${eyebrowClass} mb-2`}>Price</h4>
                    <table className="w-full">
                        <tbody>
                            {breakdown.costs.map((line) => (
                                <tr key={line.label} className="border-b border-line">
                                    <td className="py-2 pr-3 text-ink-2">{line.label}</td>
                                    <td className="py-2 text-right tabular-nums text-ink">{formatMoney(line.amount)}</td>
                                </tr>
                            ))}
                            <tr>
                                <td className="pt-3 font-semibold text-ink">Total</td>
                                <td className="pt-3 text-right text-base font-semibold tabular-nums text-ink">{formatMoney(breakdown.total)}</td>
                            </tr>
                        </tbody>
                    </table>
                </section>
            </div>
        </div>
    )
}

function Stat({ label, value, note }) {
    return (
        <div className="bg-surface p-3">
            <dt className="text-[0.6875rem] uppercase tracking-wider text-ink-3">{label}</dt>
            <dd className="mt-0.5">
                <span className="block font-semibold text-ink tabular-nums">{value}</span>
                {note && <span className="block text-[0.6875rem] leading-snug text-ink-3">{note}</span>}
            </dd>
        </div>
    )
}

export default Breakdown
