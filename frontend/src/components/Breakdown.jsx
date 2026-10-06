import { formatHours, formatMoney } from "../ui"

// Shows how an estimate's hours and price were worked out.
function Breakdown({ breakdown }) {
    if (!breakdown || !breakdown.hours) {
        return (
            <p className="text-sm text-slate-400">
                This estimate was made with the old pricing formula, so there's no breakdown. Edit and save it to re-price it.
            </p>
        )
    }

    return (
        <div className="space-y-4 text-sm" data-testid="breakdown">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Weight" value={`${breakdown.weight.toLocaleString()} lbs`} note={breakdown.weight_source} />
                <Stat label="Crew" value={`${breakdown.crew} movers`} note={breakdown.crew_source} />
                <Stat label="Billable time" value={formatHours(breakdown.billable_hours)} note={breakdown.minimum_applied ? "minimum applied" : `${breakdown.total_hours} hrs worked out`} />
                <Stat label="Hourly rate" value={formatMoney(breakdown.hourly_rate)} note="crew + truck" />
            </div>

            <table className="w-full">
                <caption className="mb-1 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Time</caption>
                <tbody>
                    {breakdown.hours.map((line) => (
                        <tr key={line.label} className="border-t border-cyan-500/10">
                            <td className="py-1.5 pr-2 text-slate-200">
                                {line.label}
                                {line.detail && <span className="block text-xs text-slate-500">{line.detail}</span>}
                            </td>
                            <td className="py-1.5 text-right tabular-nums text-cyan-200">{formatHours(line.hours)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <table className="w-full">
                <caption className="mb-1 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Price</caption>
                <tbody>
                    {breakdown.costs.map((line) => (
                        <tr key={line.label} className="border-t border-cyan-500/10">
                            <td className="py-1.5 pr-2 text-slate-200">{line.label}</td>
                            <td className="py-1.5 text-right tabular-nums text-cyan-200">{formatMoney(line.amount)}</td>
                        </tr>
                    ))}
                    <tr className="border-t border-purple-400/40 font-semibold">
                        <td className="py-1.5 text-purple-200">Total</td>
                        <td className="py-1.5 text-right tabular-nums text-purple-200">{formatMoney(breakdown.total)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    )
}

function Stat({ label, value, note }) {
    return (
        <div className="rounded-lg border border-cyan-500/15 bg-black/30 p-2.5">
            <div className="text-[0.7rem] uppercase tracking-wider text-slate-500">{label}</div>
            <div className="font-semibold text-cyan-100">{value}</div>
            {note && <div className="text-[0.7rem] text-slate-500">{note}</div>}
        </div>
    )
}

export default Breakdown
