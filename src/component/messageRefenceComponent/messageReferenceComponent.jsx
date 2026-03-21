const MessageReferenceComponent = ({ references = [] }) => {
    return (
        <div className="grid gap-3 pt-2 grid-cols-[1fr_1fr_auto] max-sm:grid-cols-1 w-full">
            {references.map((ref, i) => (
                <a
                    key={i}
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative flex min-w-0 flex-col gap-2 rounded-3xl bg-bg-hover p-4 border border-transparent hover:border-border-default hover:bg-bg-hover transition-all duration-200 max-h-[116px]"
                >
                    <div className="flex items-center gap-2">
                        <div className="flex shrink-0 items-center justify-center rounded bg-white p-0.5 size-4">
                            <img
                                src={`https://services.bingapis.com/favicon?url=${new URL(ref.url).hostname}`}
                                alt={ref.source}
                                className="size-full object-contain"
                            />
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden">
                            <p className="truncate text-text-muted text-xs">{ref.source}</p>
                        </div>
                    </div>
                    <div className="overflow-hidden">
                        <p className="line-clamp-1 text-sm font-medium text-text-primary group-hover:underline">
                            {ref.title}
                        </p>
                    </div>
                </a>
            ))}
        </div>
    );
}

export default MessageReferenceComponent;
