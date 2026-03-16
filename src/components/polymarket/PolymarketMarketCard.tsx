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
      className={`px-3 py-3 cursor-pointer transition-all ${
        isSelected ? 'bg-amber-500/5 border-l-2 border-l-amber-500' : 'hover:bg-[#1c2333] border-l-2 border-l-transparent'
      }`}
    >
      <div className="text-[12px] font-semibold text-foreground leading-snug mb-2">
        {market.question}
      </div>
      {/* Probability bar */}
      <div className="flex h-6 rounded overflow-hidden mb-2">
        <div
          className="flex items-center justify-center text-[11px] font-bold text-black"
          style={{ width: `${Math.max(yesPct, 8)}%`, backgroundColor: '#22c55e' }}
        >
          {yesPct}% Yes
        </div>
        <div
          className="flex items-center justify-center text-[11px] font-bold text-white"
          style={{ width: `${Math.max(noPct, 8)}%`, backgroundColor: '#ef4444' }}
        >
          {noPct}%
        </div>
      </div>
      <div className="flex gap-3 text-[10px] text-muted-foreground">
        <span className="text-green-400">Vol: {vol}</span>
        <span>Liquidity: {liq}</span>
        {endDate && <span>Ends: {endDate}</span>}
      </div>
    </div>
  );
};
