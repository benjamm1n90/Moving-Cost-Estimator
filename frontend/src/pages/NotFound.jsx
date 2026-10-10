import { Link } from "react-router-dom"
import { buttonClass } from "../ui"

function NotFound() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-accent-text">404</p>
            <h1 className="mt-3 font-display text-5xl tracking-tight text-ink">Page not found</h1>
            <p className="mt-3 text-ink-2">The page you're looking for doesn't exist.</p>
            <Link to="/" className={`${buttonClass.primary} mt-8`}>Back to estimates</Link>
        </main>
    )
}

export default NotFound
