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
    <div className="border border-border rounded bg-card p-3">
      <div className="text-[10px] text-terminal-amber uppercase tracking-wider font-bold mb-2">CORRELATED MARKETS</div>
      <div className="space-y-1">
        {related.map(m => {
          const outcomes = PolymarketService.parseOutcomes(m);
          const yesPct = Math.round((outcomes[0]?.price || 0) * 100);
          return (
            <div
              key={m.id}
              onClick={() => onSelect(m)}
              className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
            >
              <span className="text-[11px] text-foreground line-clamp-1 flex-1 mr-3">{m.question}</span>
              <span className={`text-[11px] font-bold ${yesPct >= 50 ? 'text-terminal-green' : 'text-destructive'}`}>
                {yesPct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
