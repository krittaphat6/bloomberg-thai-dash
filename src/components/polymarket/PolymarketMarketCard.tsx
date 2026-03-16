import { PolymarketMarket, PolymarketService } from '@/services/PolymarketService';

interface Props {
  market: PolymarketMarket;
  isSelected: boolean;
  onClick: () => void;
}

export const PolymarketMarketCard = ({ market, isSelected, onClick }: Props) => {
  const outcomes = PolymarketService.parseOutcomes(market);
  const yesPrice = outcomes[0]?.price || 0;
  const noPrice = outcomes[1]?.price || 0;
  const yesPct = Math.round(yesPrice * 100);
  const noPct = Math.round(noPrice * 100);
  const vol = PolymarketService.formatVolume(market.volume24hr || 0);
  const liq = PolymarketService.formatVolume(parseFloat(market.liquidity || '0'));
  const endDate = market.endDate ? new Date(market.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

  return (
    <div
      onClick={onClick}
      className={`px-3 py-2.5 cursor-pointer transition-colors ${
        isSelected ? 'bg-amber-500/5 border-l-2 border-l-amber-500' : 'hover:bg-accent/50 border-l-2 border-l-transparent'
      }`}
    >
      <div className="text-[11px] text-foreground leading-snug mb-1.5 line-clamp-2">
        {market.question}
      </div>
      {/* Probability bar */}
      <div className="flex h-5 rounded-sm overflow-hidden mb-1.5">
        <div
          className="flex items-center justify-center text-[10px] font-bold text-black bg-green-500"
          style={{ width: `${Math.max(yesPct, 5)}%` }}
        >
          {yesPct}%
        </div>
        <div
          className="flex items-center justify-center text-[10px] font-bold text-white bg-red-500/70"
          style={{ width: `${Math.max(noPct, 5)}%` }}
        >
          {noPct}%
        </div>
      </div>
      <div className="flex gap-3 text-[9px] text-muted-foreground">
        <span>Vol: {vol}</span>
        <span>Liq: {liq}</span>
        {endDate && <span>{endDate}</span>}
      </div>
    </div>
  );
};
