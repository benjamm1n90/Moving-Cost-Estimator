import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"

const STORAGE_KEY = "theme"

function systemTheme() {
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function savedTheme() {
    try {
        const t = localStorage.getItem(STORAGE_KEY)
        return t === "light" || t === "dark" ? t : null
    } catch {
        return null
    }
}

// Sun/moon button that switches light and dark mode. The choice is
// remembered; until you pick one, it follows your system setting.
function ThemeToggle({ className = "" }) {
    const [theme, setTheme] = useState(() => savedTheme() ?? systemTheme())

    useEffect(() => {
        document.documentElement.dataset.theme = theme
    }, [theme])

    // Follow system changes until the user makes an explicit choice.
    useEffect(() => {
        const mq = window.matchMedia?.("(prefers-color-scheme: dark)")
        if (!mq?.addEventListener) return
        const onChange = (e) => {
            if (!savedTheme()) setTheme(e.matches ? "dark" : "light")
        }
        mq.addEventListener("change", onChange)
        return () => mq.removeEventListener("change", onChange)
    }, [])

    const next = theme === "dark" ? "light" : "dark"
    const toggle = () => {
        setTheme(next)
        try {
            localStorage.setItem(STORAGE_KEY, next)
        } catch {
            // Storage unavailable (private mode) - the toggle still works for this visit.
        }
    }

    return (
        <button
            type="button"
            onClick={toggle}
            aria-label={`Switch to ${next} mode`}
            title={`Switch to ${next} mode`}
            className={`relative flex h-9 w-9 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-subtle hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20 ${className}`}
        >
            <Sun size={17} className={`absolute transition-all duration-300 ${theme === "dark" ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"}`} aria-hidden="true" />
            <Moon size={17} className={`absolute transition-all duration-300 ${theme === "dark" ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"}`} aria-hidden="true" />
        </button>
    )
}

export default ThemeToggle
