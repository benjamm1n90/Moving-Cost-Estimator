import { useState } from "react"
import api from "../api"
import EstimateCard from "../components/EstimateCard"
import EstimateForm from "../components/EstimateForm"
import NavBar from "../components/NavBar"
import Notice from "../components/Notice"
import { useEstimates, usePricingOptions } from "../hooks"
import { errorMessage, panelClass } from "../ui"

function Estimate() {
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [saving, setSaving] = useState(false)
    const options = usePricingOptions(setError)
    const { estimates, loading, replace, remove, add } = useEstimates("open", setError)

    const createEstimate = async (payload, resetForm) => {
        setSaving(true)
        setError("")
        try {
            const res = await api.post("/api/estimates/", payload)
            add(res.data)
            resetForm()
            setSuccess(`Saved estimate for ${res.data.customer_name}.`)
        } catch (err) {
            setError(errorMessage(err, "Couldn't save the estimate."))
        } finally {
            setSaving(false)
        }
    }

    return (
        <>
            <NavBar />
            <main className="mx-auto max-w-[960px] px-4 py-10 text-slate-200">
                <Notice message={error} onDismiss={() => setError("")} />
                <Notice message={success} kind="success" onDismiss={() => setSuccess("")} />

                <h2 className="mb-5 text-2xl font-semibold uppercase tracking-widest text-cyan-300">Create a New Estimate</h2>
                <div className={`${panelClass} mb-12`}>
                    <EstimateForm options={options} submitLabel="Save Estimate" onSubmit={createEstimate} busy={saving} />
                </div>

                <h2 className="mb-5 text-2xl font-semibold uppercase tracking-widest text-cyan-300">Open Estimates</h2>
                {!loading && estimates.length === 0 && (
                    <p className="text-sm text-slate-400">No open estimates. Completed moves are on the Completed Moves page.</p>
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

export default Estimate
