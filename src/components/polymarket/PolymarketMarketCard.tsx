import { PolymarketMarket, PolymarketService } from '@/services/PolymarketService';

interface Props {
  market: PolymarketMarket;
  isSelected: boolean;
  onClick: () => void;
  getLivePrice?: (market: PolymarketMarket) => { yesPrice: number; noPrice: number };
}

export const PolymarketMarketCard = ({ market, isSelected, onClick, getLivePrice }: Props) => {
  const live = getLivePrice ? getLivePrice(market) : null;
  const outcomes = PolymarketService.parseOutcomes(market);
  const yesPrice = live?.yesPrice ?? outcomes[0]?.price ?? 0;
  const noPrice = live?.noPrice ?? outcomes[1]?.price ?? 0;
  const yesPct = Math.round(yesPrice * 100);
  const noPct = Math.round(noPrice * 100);
  const vol = PolymarketService.formatVolume(market.volume24hr || 0);
  const liq = PolymarketService.formatVolume(parseFloat(market.liquidity || '0'));
  const endDate = market.endDate ? new Date(market.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

  return (
    <div
      onClick={onClick}
      className={`px-3 py-3 cursor-pointer transition-all ${
        isSelected ? 'bg-terminal-amber/5 border-l-2 border-l-terminal-amber' : 'hover:bg-muted border-l-2 border-l-transparent'
      }`}
    >
      <div className="text-[12px] font-semibold text-foreground leading-snug mb-2">
        {market.question}
      </div>
      {/* Probability bar */}
      <div className="flex h-6 rounded overflow-hidden mb-2">
        <div
          className="flex items-center justify-center text-[11px] font-bold text-black bg-terminal-green"
          style={{ width: `${Math.max(yesPct, 8)}%` }}
        >
          {yesPct}% Yes
        </div>
        <div
          className="flex items-center justify-center text-[11px] font-bold text-white bg-destructive"
          style={{ width: `${Math.max(noPct, 8)}%` }}
        >
          {noPct}%
        </div>
      </div>
      <div className="flex gap-3 text-[10px] text-muted-foreground">
        <span className="text-terminal-green">Vol: {vol}</span>
        <span>Liquidity: {liq}</span>
        {endDate && <span>Ends: {endDate}</span>}
      </div>
    </div>
  );
};
