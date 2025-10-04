import { DollarSign } from 'lucide-react';
import { PanelHeader } from './PanelHeader';

interface FinancialItem {
  label: string;
  value: number;
  change: number;
  type: 'asset' | 'liability' | 'equity';
}

const financialData: FinancialItem[] = [
  { label: 'Total Assets', value: 105.2, change: 5.3, type: 'asset' },
  { label: 'Current Assets', value: 42.8, change: 3.1, type: 'asset' },
  { label: 'Fixed Assets', value: 35.4, change: 1.8, type: 'asset' },
  { label: 'Intangible Assets', value: 27.0, change: 0.4, type: 'asset' },
  { label: 'Total Liabilities', value: 65.3, change: -2.1, type: 'liability' },
  { label: 'Current Liabilities', value: 28.1, change: -1.5, type: 'liability' },
  { label: 'Long-term Debt', value: 37.2, change: -0.6, type: 'liability' },
  { label: 'Total Equity', value: 39.9, change: 7.4, type: 'equity' },
];

interface BalanceSheetPanelProps {
  onMaximize: () => void;
  onClose: () => void;
}

export function BalanceSheetPanel({ onMaximize, onClose }: BalanceSheetPanelProps) {
  const getTypeColor = (type: FinancialItem['type']) => {
    switch (type) {
      case 'asset': return 'bg-green-500';
      case 'liability': return 'bg-red-500';
      case 'equity': return 'bg-blue-500';
    }
  };

  const getTypeLabel = (type: FinancialItem['type']) => {
    switch (type) {
      case 'asset': return 'Assets';
      case 'liability': return 'Liabilities';
      case 'equity': return 'Equity';
    }
  };

  const maxValue = Math.max(...financialData.map(item => item.value));

  const groupedData = {
    asset: financialData.filter(item => item.type === 'asset'),
    liability: financialData.filter(item => item.type === 'liability'),
    equity: financialData.filter(item => item.type === 'equity'),
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden flex flex-col h-full">
      <PanelHeader
        title="Balance Sheet"
        icon={<DollarSign className="h-4 w-4" />}
        subtitle="in billions USD"
        onMaximize={onMaximize}
        onClose={onClose}
      />
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-6">
          {Object.entries(groupedData).map(([type, items]) => (
            <div key={type}>
              <h4 className="text-sm font-semibold text-gray-300 mb-3">{getTypeLabel(type as FinancialItem['type'])}</h4>
              <div className="space-y-3">
                {items.map((item, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-white">{item.label}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono font-bold text-white">${item.value.toFixed(1)}B</span>
                        <span className={`text-xs font-mono ${item.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {item.change >= 0 ? '+' : ''}{item.change.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${getTypeColor(item.type)}`}
                        style={{ width: `${(item.value / maxValue) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 pt-4 border-t border-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-300">Net Worth</span>
            <span className="text-lg font-mono font-bold text-white">
              ${(financialData.find(i => i.type === 'equity')?.value || 0).toFixed(1)}B
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
