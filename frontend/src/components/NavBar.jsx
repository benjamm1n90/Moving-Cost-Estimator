import { NavLink } from "react-router-dom"
import { LogOut } from "lucide-react"
import { Logo } from "./controls"
import ThemeToggle from "./ThemeToggle"

const linkClass = ({ isActive }) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        isActive ? "bg-subtle text-ink" : "text-ink-2 hover:text-ink"
    }`

function NavBar() {
    return (
        <nav className="sticky top-0 z-20 border-b border-line bg-canvas/80 backdrop-blur-xl backdrop-saturate-150">
            <div className="mx-auto flex h-16 max-w-6xl items-center gap-1 px-4 sm:px-6">
                <NavLink to="/" className="mr-auto flex items-center gap-2.5" aria-label="Moving Cost Estimator home">
                    <Logo size={28} />
                    <span className="hidden text-[0.9375rem] font-semibold tracking-tight text-ink sm:inline">
                        Moving Cost <span className="font-display text-lg font-normal italic text-accent-text">Estimator</span>
                    </span>
                </NavLink>
                <NavLink to="/" end className={linkClass}>Estimates</NavLink>
                <NavLink to="/completed" className={linkClass}>Completed</NavLink>
                <span className="mx-2 h-5 w-px bg-line" aria-hidden="true" />
                <ThemeToggle />
                <NavLink to="/logout" className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-ink-3 transition-colors hover:text-ink" aria-label="Log out">
                    <LogOut size={16} />
                    <span className="hidden sm:inline">Log out</span>
                </NavLink>
            </div>
        </nav>
    )
}

export default NavBar
