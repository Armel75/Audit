import RecommendationItem from './RecommendationItem';

export default function RecommendationList({ recommendations = [], onRefresh }: any) {

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-slate-500">
        Aucune recommandation
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-200">
      {recommendations.map((reco: any) => (
        <RecommendationItem
          key={reco.id}
          reco={reco}
          onRefresh={onRefresh}
        />
      ))}
    </ul>
  );
}