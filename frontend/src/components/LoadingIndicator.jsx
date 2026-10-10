// Small spinner that inherits the surrounding text color.
const LoadingIndicator = ({ label = "Loading" }) => {
    return (
        <span className="loading-container inline-flex items-center justify-center" role="status" aria-label={label}>
            <span className="loader h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
        </span>
    )
}

export default LoadingIndicator
