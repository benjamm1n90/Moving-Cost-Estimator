// Small spinner that inherits the surrounding text color.
function LoadingIndicator({ label = "Loading" }) {
    return (
        <span role="status" aria-label={label} className="inline-flex items-center justify-center">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
        </span>
    )
}

export default LoadingIndicator
