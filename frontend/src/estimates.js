// Plain helpers for estimate data: form <-> API conversion and accuracy math.

export const EMPTY_FORM = {
    customer_name: "",
    move_date: "",
    square_footage: "",
    pound_estimate: "",
    crew_size: "",
    packing: "none",
    origin_stairs: "",
    origin_elevator: false,
    origin_long_carry_ft: "",
    origin_parking: "driveway",
    dest_stairs: "",
    dest_elevator: false,
    dest_long_carry_ft: "",
    dest_parking: "driveway",
    drive_minutes: "",
    assembly_items: "",
    special_items: {},
}

const NUMBER_FIELDS = [
    "square_footage", "origin_stairs", "origin_long_carry_ft",
    "dest_stairs", "dest_long_carry_ft", "drive_minutes", "assembly_items",
]
// Blank means "let the estimator work it out".
const OPTIONAL_NUMBER_FIELDS = ["pound_estimate", "crew_size"]

// Saved estimate (numbers / nulls) -> form state (strings).
export function estimateToForm(est) {
    const form = { ...EMPTY_FORM }
    for (const key of Object.keys(EMPTY_FORM)) {
        const value = est[key]
        if (value === null || value === undefined) continue
        if (typeof EMPTY_FORM[key] === "string") {
            form[key] = value === 0 && key !== "square_footage" ? "" : String(value)
        } else {
            form[key] = value
        }
    }
    form.special_items = { ...(est.special_items || {}) }
    return form
}

// Form state -> API payload.
export function formToPayload(form) {
    const payload = { ...form }
    for (const key of NUMBER_FIELDS) payload[key] = form[key] === "" ? 0 : Number(form[key])
    for (const key of OPTIONAL_NUMBER_FIELDS) payload[key] = form[key] === "" ? null : Number(form[key])
    payload.move_date = form.move_date || null
    payload.special_items = Object.fromEntries(
        Object.entries(form.special_items || {}).filter(([, count]) => Number(count) > 0).map(([k, c]) => [k, Number(c)])
    )
    return payload
}

// How far off the estimate was, as a % of estimated hours.
export function hoursVariance(est) {
    const estimated = Number(est.estimated_hours)
    const actual = Number(est.completion?.actual_hours)
    if (!estimated || !actual) return null
    return (actual - estimated) / estimated
}

// Summary of how accurate estimates have been, across completed moves
// that have an hours-based estimate to compare against.
export function accuracyStats(estimates) {
    const comparable = estimates.filter((e) => hoursVariance(e) !== null)
    if (comparable.length === 0) return null
    const variances = comparable.map(hoursVariance)
    const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length
    return {
        count: comparable.length,
        avgEstimated: avg(comparable.map((e) => Number(e.estimated_hours))),
        avgActual: avg(comparable.map((e) => Number(e.completion.actual_hours))),
        avgVariance: avg(variances),
        withinTen: variances.filter((v) => Math.abs(v) <= 0.1).length / variances.length,
        revenue: estimates.reduce((sum, e) => sum + Number(e.completion?.final_price || 0), 0),
    }
}

