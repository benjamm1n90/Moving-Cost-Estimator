import { useState } from "react"
import api from "../api"
import { useNavigate } from "react-router-dom"
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants"
import LoadingIndicator from "./LoadingIndicator"
import Notice from "./Notice"
import { errorMessage } from "../ui"

function Form({ route, method }) {
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const navigate = useNavigate()

    const name = method === "login" ? "Login" : "Register"

    const handleSubmit = async (e) => {
        setLoading(true)
        setError("")
        e.preventDefault()
        try {
            const res = await api.post(route, { username, password })
            if (method === "login") {
                localStorage.setItem(ACCESS_TOKEN, res.data.access)
                localStorage.setItem(REFRESH_TOKEN, res.data.refresh)
                navigate("/")
            } else {
                navigate("/login")
            }
        }
        catch (err) {
            if (method === "login" && err?.response?.status === 401) {
                setError("Incorrect username or password.")
            } else {
                setError(errorMessage(err, `${name} failed.`))
            }
        }
        finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center px-4">
            <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl border border-cyan-500/30 bg-black/50 p-8 shadow-[0_0_30px_rgba(34,211,238,0.15)] backdrop-blur-md">
                <h1 className="mb-6 text-center text-xl font-semibold uppercase tracking-widest text-cyan-300">{name}</h1>
                <Notice message={error} />
                <input
                    className="mb-4 w-full rounded-lg border border-cyan-500/30 bg-black/40 px-3 py-2.5 text-sm text-cyan-100 placeholder:text-slate-500 transition-colors focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                />
                <input
                    className="mb-4 w-full rounded-lg border border-cyan-500/30 bg-black/40 px-3 py-2.5 text-sm text-cyan-100 placeholder:text-slate-500 transition-colors focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                />
                {loading && <LoadingIndicator />}
                <button
                    className="mt-2 w-full rounded-lg border border-purple-400 bg-purple-500/10 py-2.5 text-sm font-semibold uppercase tracking-wide text-purple-300 transition-colors hover:bg-purple-500/20 hover:shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                    type="submit"
                >
                    {name}
                </button>
            </form>
        </div>
    )
}

export default Form
