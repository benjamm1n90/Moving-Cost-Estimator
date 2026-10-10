import { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import { jwtDecode } from "jwt-decode"
import api from "../api"
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants"
import LoadingIndicator from "./LoadingIndicator"

// Is there a usable access token? Refreshes it if it has expired.
async function checkAuth() {
    const token = localStorage.getItem(ACCESS_TOKEN)
    if (!token) return false

    const { exp } = jwtDecode(token)
    if (exp > Date.now() / 1000) return true

    try {
        const res = await api.post("/api/token/refresh/", {
            refresh: localStorage.getItem(REFRESH_TOKEN),
        })
        localStorage.setItem(ACCESS_TOKEN, res.data.access)
        return true
    } catch {
        return false
    }
}

// Renders its children only for signed-in users; otherwise redirects to /login.
function ProtectedRoute({ children }) {
    const [isAuthorized, setIsAuthorized] = useState(null)

    useEffect(() => {
        checkAuth()
            .then(setIsAuthorized)
            .catch(() => setIsAuthorized(false))
    }, [])

    if (isAuthorized === null) {
        return (
            <div className="flex min-h-screen items-center justify-center text-ink-3">
                <LoadingIndicator />
            </div>
        )
    }

    return isAuthorized ? children : <Navigate to="/login" />
}

export default ProtectedRoute
