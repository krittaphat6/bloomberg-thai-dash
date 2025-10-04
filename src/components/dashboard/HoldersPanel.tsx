import { PieChart } from 'lucide-react';
import { PanelHeader } from './PanelHeader';
import { Badge } from '@/components/ui/badge';

interface Holder {
  name: string;
  percentage: number;
  type: 'Institutional' | 'Retail' | 'Insider';
}

const holders: Holder[] = [
  { name: 'Vanguard Group Inc', percentage: 8.2, type: 'Institutional' },
  { name: 'BlackRock Inc', percentage: 7.1, type: 'Institutional' },
  { name: 'State Street Corp', percentage: 4.5, type: 'Institutional' },
  { name: 'Capital Group', percentage: 3.9, type: 'Institutional' },
  { name: 'Geode Capital', percentage: 2.8, type: 'Institutional' },
  { name: 'Retail Investors', percentage: 15.5, type: 'Retail' },
  { name: 'Frazier Kenneth C', percentage: 1.2, type: 'Insider' },
  { name: 'Board Members', percentage: 2.8, type: 'Insider' },
];

interface HoldersPanelProps {
  onMaximize: () => void;
  onClose: () => void;
}

export function HoldersPanel({ onMaximize, onClose }: HoldersPanelProps) {
  const totalPercentage = holders.reduce((sum, h) => sum + h.percentage, 0);

  const getTypeColor = (type: Holder['type']) => {
    switch (type) {
      case 'Institutional': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'Retail': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'Insider': return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden flex flex-col h-full">
      <PanelHeader
        title="Top Holders"
        icon={<PieChart className="h-4 w-4" />}
        subtitle={`${holders.length} shareholders`}
        onMaximize={onMaximize}
        onClose={onClose}
      />
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {holders.map((holder, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-sm text-white font-medium truncate">{holder.name}</span>
                <Badge variant="outline" className={`text-xs shrink-0 ${getTypeColor(holder.type)}`}>
                  {holder.type}
                </Badge>
              </div>
              <span className="text-sm font-mono font-bold text-white ml-2">{holder.percentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  holder.type === 'Institutional' ? 'bg-blue-500' :
                  holder.type === 'Retail' ? 'bg-green-500' :
                  'bg-purple-500'
                }`}
                style={{ width: `${(holder.percentage / 50) * 100}%` }}
              />
            </div>
          </div>
        ))}
        <div className="pt-3 mt-3 border-t border-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-300">Total Ownership</span>
            <span className="text-lg font-mono font-bold text-white">{totalPercentage.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
