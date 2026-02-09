const WORKFLOW_PHASES: Record<string, string[]> = {
  create_app: ['Planning', 'Design', 'Development', 'Testing'],
  modify_app: ['Analysis', 'Planning', 'Implementation', 'Testing'],
  workflow: ['Planning', 'Design', 'Development', 'Testing'],
  custom: ['Execution'],
};

export function PhaseTimeline({
  taskType,
  currentPhase,
  progress,
}: {
  taskType: string;
  currentPhase: number | null;
  progress: number;
}) {
  const phases = WORKFLOW_PHASES[taskType] || ['Unknown'];
  const active = currentPhase ?? 0;

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Progress</h2>
        <span className="text-sm text-gray-500">{progress}%</span>
      </div>

      {/* Phase stepper */}
      <div className="flex items-center">
        {phases.map((name, i) => {
          const phaseNum = i + 1;
          const isCompleted = active > phaseNum || progress === 100;
          const isCurrent = active === phaseNum && progress < 100;
          const isPending = !isCompleted && !isCurrent;

          return (
            <div key={name} className="flex items-center flex-1 last:flex-none">
              {/* Step circle + label */}
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
                    isCompleted
                      ? 'bg-green-600 text-white'
                      : isCurrent
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isCompleted ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    phaseNum
                  )}
                </div>
                <span
                  className={`mt-1.5 text-xs ${
                    isCurrent ? 'font-medium text-blue-700' : 'text-gray-500'
                  }`}
                >
                  {name}
                </span>
              </div>

              {/* Connector line */}
              {i < phases.length - 1 && (
                <div
                  className={`mx-2 h-0.5 flex-1 ${
                    isCompleted ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-1.5 w-full rounded-full bg-gray-200">
        <div
          className="h-1.5 rounded-full bg-blue-600 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
