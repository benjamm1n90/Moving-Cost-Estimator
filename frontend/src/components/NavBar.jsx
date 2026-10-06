import { NavLink } from "react-router-dom"

const linkClass = ({ isActive }) =>
    `rounded-md px-3 py-1.5 text-sm font-semibold uppercase tracking-wide transition-colors ${
        isActive ? "bg-cyan-500/15 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.35)]" : "text-slate-400 hover:text-cyan-200"
    }`

function NavBar() {
    return (
        <nav className="sticky top-0 z-10 border-b border-cyan-500/20 bg-black/60 backdrop-blur-md">
            <div className="mx-auto flex max-w-[960px] flex-wrap items-center gap-2 px-4 py-3">
                <span className="mr-auto text-sm font-bold uppercase tracking-[0.2em] text-purple-300">Moving Cost Estimator</span>
                <NavLink to="/" end className={linkClass}>Estimates</NavLink>
                <NavLink to="/completed" className={linkClass}>Completed Moves</NavLink>
                <NavLink to="/logout" className="rounded-md px-3 py-1.5 text-sm font-semibold uppercase tracking-wide text-slate-500 hover:text-red-300">Log out</NavLink>
            </div>
        </nav>
    )
}

export default NavBar
