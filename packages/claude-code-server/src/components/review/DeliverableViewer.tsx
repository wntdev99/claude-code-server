interface Deliverable {
  path: string;
  content: string;
  size: number;
}

export function DeliverableViewer({
  deliverable,
}: {
  deliverable: Deliverable | null;
}) {
  if (!deliverable) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-gray-400">
        <p>Select a file to preview</p>
      </div>
    );
  }

  const lineCount = deliverable.content.split('\n').length;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-2">
        <span className="text-sm font-medium text-gray-700">
          {deliverable.path}
        </span>
        <span className="text-xs text-gray-400">
          {lineCount} lines
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <pre className="p-4 text-xs leading-relaxed text-gray-800">
          <code>{deliverable.content}</code>
        </pre>
      </div>
    </div>
  );
}
