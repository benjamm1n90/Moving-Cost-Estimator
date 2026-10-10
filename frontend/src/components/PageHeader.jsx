// Consistent page title block: small eyebrow, serif title, optional text.
function PageHeader({ eyebrow, title, description, aside }) {
    return (
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
                {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-accent-text">{eyebrow}</p>}
                <h1 className="font-display text-4xl leading-[1.05] tracking-tight text-ink sm:text-5xl">{title}</h1>
                {description && <p className="mt-3 max-w-xl text-[0.9375rem] text-ink-2">{description}</p>}
            </div>
            {aside}
        </header>
    )
}

export default PageHeader
