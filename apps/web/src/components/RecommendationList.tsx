import RecommendationItem from './RecommendationItem';

export default function RecommendationList({ recommendations }: any) {
  if (!recommendations.length) {
    return (
      <div className="p-8 text-center text-sm text-slate-500">
        Aucune recommandation
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-200">
      {recommendations.map((reco: any) => (
        <RecommendationItem key={reco.id} reco={reco} />
      ))}
    </ul>
  );
}