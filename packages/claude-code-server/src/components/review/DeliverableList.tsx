interface Deliverable {
  path: string;
  content: string;
  size: number;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DeliverableList({
  deliverables,
  selectedIndex,
  onSelect,
}: {
  deliverables: Deliverable[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  if (deliverables.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-500">No deliverables found</div>
    );
  }

  return (
    <div className="divide-y">
      {deliverables.map((d, i) => {
        const fileName = d.path.split('/').pop() || d.path;
        const dir = d.path.includes('/')
          ? d.path.substring(0, d.path.lastIndexOf('/'))
          : '';

        return (
          <button
            key={d.path}
            onClick={() => onSelect(i)}
            className={`block w-full px-3 py-2.5 text-left transition hover:bg-gray-50 ${
              i === selectedIndex ? 'bg-blue-50 border-l-2 border-l-blue-600' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">
                  {fileName}
                </p>
                {dir && (
                  <p className="truncate text-xs text-gray-400">{dir}/</p>
                )}
              </div>
              <span className="ml-2 flex-shrink-0 text-xs text-gray-400">
                {formatFileSize(d.size)}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
