import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import OverviewTab from './OverviewTab';
import PerformanceTab from './PerformanceTab';
import TradeAnalysisTab from './TradeAnalysisTab';
import RiskRewardTab from './RiskRewardTab';
import TradeListTab from './TradeListTab';
import { Trade } from '@/utils/tradingMetrics';

interface JournalTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  trades: Trade[];
  initialCapital?: number;
  onEditTrade?: (trade: Trade) => void;
  onDeleteTrade?: (id: string) => void;
  onCloseTrade?: (id: string, exitPrice: number) => void;
}

export default function JournalTabs({
  activeTab,
  onTabChange,
  trades,
  initialCapital = 100,
  onEditTrade,
  onDeleteTrade,
  onCloseTrade
}: JournalTabsProps) {
  const tabs = [
    { id: 'overview', label: 'ภาพรวม' },
    { id: 'performance', label: 'ประสิทธิภาพ' },
    { id: 'analysis', label: 'การวิเคราะห์การซื้อขาย' },
    { id: 'risk', label: 'อัตราส่วน ความเสี่ยง/ผลตอบแทน' },
    { id: 'trades', label: 'รายการของการซื้อขาย' },
  ];

  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="w-full h-auto flex flex-wrap gap-1 bg-transparent border-b border-terminal-green/30 pb-2 mb-4">
        {tabs.map(tab => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            className={cn(
              "px-3 py-1.5 text-xs rounded-md transition-all border",
              "data-[state=active]:bg-terminal-green/20 data-[state=active]:text-terminal-green data-[state=active]:border-terminal-green/50",
              "data-[state=inactive]:bg-muted/30 data-[state=inactive]:text-muted-foreground data-[state=inactive]:border-transparent",
              "hover:bg-muted/50"
            )}
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="overview" className="mt-0">
        <OverviewTab trades={trades} initialCapital={initialCapital} />
      </TabsContent>

      <TabsContent value="performance" className="mt-0">
        <PerformanceTab trades={trades} initialCapital={initialCapital} />
      </TabsContent>

      <TabsContent value="analysis" className="mt-0">
        <TradeAnalysisTab trades={trades} initialCapital={initialCapital} />
      </TabsContent>

      <TabsContent value="risk" className="mt-0">
        <RiskRewardTab trades={trades} initialCapital={initialCapital} />
      </TabsContent>

      <TabsContent value="trades" className="mt-0">
        <TradeListTab 
          trades={trades} 
          onEditTrade={onEditTrade}
          onDeleteTrade={onDeleteTrade}
          onCloseTrade={onCloseTrade}
        />
      </TabsContent>
    </Tabs>
  );
}
