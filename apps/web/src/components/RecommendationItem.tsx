export default function RecommendationItem({ reco }: any) {
  const isOverdue = new Date(reco.targetDate) < new Date();

  return (
    <li className="px-6 py-4 hover:bg-slate-50">
      <div className="flex justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-indigo-600">
            {reco.title}
          </p>

          <p className="text-xs text-slate-500 mt-1">
            Finding: {reco.finding.title}
          </p>

          <p className="text-sm text-slate-600 mt-2">
            {reco.actionPlan}
          </p>

          <div className="mt-2 flex items-center gap-3 text-xs">
            <span>Status: {reco.status}</span>
            <span>Progress: {reco.implementedPercent}%</span>

            <span className={isOverdue ? 'text-red-500' : ''}>
              Échéance: {new Date(reco.targetDate).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="text-right text-xs space-y-1">
          {reco.priority && (
            <div>Priorité: {reco.priority.name}</div>
          )}

          {reco.department && (
            <div>Dept: {reco.department.name}</div>
          )}

          {reco.assigneeUser && (
            <div>
              {reco.assigneeUser.firstName} {reco.assigneeUser.lastName}
            </div>
          )}

          {reco.assigneeGlpiUser && (
            <div>{reco.assigneeGlpiUser.fullName}</div>
          )}
        </div>
      </div>
    </li>
  );
}