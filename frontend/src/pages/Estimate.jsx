import { useState } from "react"
import api from "../api"
import EstimateForm from "../components/EstimateForm"
import EstimateList from "../components/EstimateList"
import NavBar from "../components/NavBar"
import Notice from "../components/Notice"
import PageHeader from "../components/PageHeader"
import { useEstimates, usePricingOptions } from "../hooks"
import { errorMessage } from "../ui"

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
            <main className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6 sm:pt-14">
                <PageHeader
                    eyebrow="Estimates"
                    title="New estimate"
                    description="Describe the move and the quote updates as you go. Every number comes from your pricing rules."
                />

                <Notice message={error} onDismiss={() => setError("")} />
                <Notice message={success} kind="success" onDismiss={() => setSuccess("")} />

                <EstimateForm layout="split" options={options} submitLabel="Save Estimate" onSubmit={createEstimate} busy={saving} />

                <div className="mt-16">
                    <EstimateList
                        title="Open estimates"
                        estimates={estimates}
                        loading={loading}
                        options={options}
                        onChange={replace}
                        onRemove={remove}
                        onError={setError}
                        empty="No open estimates yet. Saved estimates appear here until the move is completed."
                    />
                </div>
            </main>
        </>
    )
}

export default Estimate
