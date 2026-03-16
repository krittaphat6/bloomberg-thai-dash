import { PolymarketMarket, PolymarketService } from '@/services/PolymarketService';

interface Props {
  currentMarket: PolymarketMarket;
  allMarkets: PolymarketMarket[];
  onSelect: (m: PolymarketMarket) => void;
}

export const PolymarketCorrelated = ({ currentMarket, allMarkets, onSelect }: Props) => {
  const related = allMarkets
    .filter(m => m.id !== currentMarket.id)
    .slice(0, 6);

  if (related.length === 0) return null;

  return (
    <div className="p-3 border-t border-border">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">RELATED MARKETS</div>
      <div className="space-y-1">
        {related.map(m => {
          const outcomes = PolymarketService.parseOutcomes(m);
          const yesPct = Math.round((outcomes[0]?.price || 0) * 100);
          return (
            <div
              key={m.id}
              onClick={() => onSelect(m)}
              className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-accent/50 cursor-pointer"
            >
              <span className="text-[10px] text-foreground line-clamp-1 flex-1 mr-2">{m.question}</span>
              <span className={`text-[10px] font-bold ${yesPct >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                {yesPct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
