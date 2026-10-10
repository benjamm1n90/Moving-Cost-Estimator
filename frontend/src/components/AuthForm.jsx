import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowRight, Check } from "lucide-react"
import api from "../api"
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants"
import LoadingIndicator from "./LoadingIndicator"
import Notice from "./Notice"
import { Logo } from "./controls"
import ThemeToggle from "./ThemeToggle"
import { buttonClass, errorMessage, inputClass, labelClass } from "../ui"

const FEATURES = [
    "Hours-based quotes from stairs, carries, parking and special items",
    "A live breakdown of every hour and dollar",
    "Track actual results to sharpen future estimates",
]

function AuthForm({ route, method }) {
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const navigate = useNavigate()

    const isLogin = method === "login"
    const name = isLogin ? "Sign in" : "Create account"

    const handleSubmit = async (e) => {
        setLoading(true)
        setError("")
        e.preventDefault()
        try {
            const res = await api.post(route, { username, password })
            if (isLogin) {
                localStorage.setItem(ACCESS_TOKEN, res.data.access)
                localStorage.setItem(REFRESH_TOKEN, res.data.refresh)
                navigate("/")
            } else {
                navigate("/login")
            }
        } catch (err) {
            if (isLogin && err?.response?.status === 401) {
                setError("Incorrect username or password.")
            } else {
                setError(errorMessage(err, `${name} failed.`))
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
            <aside className="relative hidden overflow-hidden bg-[#173f36] p-12 text-white lg:flex lg:flex-col">
                <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white/5" />
                <div className="pointer-events-none absolute -bottom-40 -left-20 h-[28rem] w-[28rem] rounded-full bg-white/[0.04]" />
                <div className="relative flex items-center gap-2.5">
                    <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
                        <rect width="32" height="32" rx="8" fill="rgb(255 255 255 / 0.12)" />
                        <path d="M9 13.5 16 9.5l7 4v9l-7 4-7-4z M9 13.5l7 4 7-4 M16 17.5v9" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
                    </svg>
                    <span className="font-semibold tracking-tight">Moving Cost Estimator</span>
                </div>
                <div className="relative mt-auto max-w-md">
                    <p className="font-display text-5xl leading-[1.05] tracking-tight">
                        Quotes built on how moves <span className="italic text-[#9fd8c6]">really</span> go.
                    </p>
                    <ul className="mt-10 space-y-3.5">
                        {FEATURES.map((f) => (
                            <li key={f} className="flex items-start gap-3 text-[0.9375rem] text-white/80">
                                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15">
                                    <Check size={12} strokeWidth={3} />
                                </span>
                                {f}
                            </li>
                        ))}
                    </ul>
                </div>
            </aside>

            <main className="relative flex items-center justify-center px-5 py-12">
                <div className="absolute right-4 top-4"><ThemeToggle /></div>
                <form onSubmit={handleSubmit} className="w-full max-w-sm">
                    <div className="mb-8 lg:hidden">
                        <Logo size={36} />
                    </div>
                    <h1 className="font-display text-4xl tracking-tight text-ink">{isLogin ? "Welcome back" : "Create your account"}</h1>
                    <p className="mt-2 text-[0.9375rem] text-ink-2">
                        {isLogin ? "Sign in to your estimates." : "Start building accurate moving quotes."}
                    </p>

                    <div className="mt-8 space-y-4">
                        <Notice message={error} />
                        <div>
                            <label htmlFor="username" className={labelClass}>Username</label>
                            <input id="username" className={inputClass} type="text" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" required />
                        </div>
                        <div>
                            <label htmlFor="password" className={labelClass}>Password</label>
                            <input id="password" className={inputClass} type="password" autoComplete={isLogin ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
                        </div>
                        <button className={`${buttonClass.primary} mt-2 w-full py-2.5`} type="submit" disabled={loading}>
                            {loading ? <LoadingIndicator /> : <>{name}<ArrowRight size={16} aria-hidden="true" /></>}
                        </button>
                    </div>

                    <p className="mt-8 text-center text-sm text-ink-2">
                        {isLogin ? "New here? " : "Already have an account? "}
                        <Link to={isLogin ? "/register" : "/login"} className="font-medium text-accent-text underline-offset-4 hover:underline">
                            {isLogin ? "Create an account" : "Sign in"}
                        </Link>
                    </p>
                </form>
            </main>
        </div>
    )
}

export default AuthForm
