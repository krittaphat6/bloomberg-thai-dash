import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { PanelHeader } from './PanelHeader';

interface Index {
  name: string;
  value: string;
  change: number;
  changePercent: number;
}

const indices: Index[] = [
  { name: 'MRK US Equity', value: '98.85', change: 1.82, changePercent: 1.84 },
  { name: 'RLV', value: '98.85', change: -0.05, changePercent: -0.05 },
  { name: 'SPR', value: '98.85', change: 0.15, changePercent: 0.15 },
  { name: 'SANDI', value: '98.85', change: 1.25, changePercent: 1.27 },
  { name: 'INC', value: '99.80', change: 0.95, changePercent: 0.96 },
];

interface IndicesPanelProps {
  onMaximize: () => void;
  onClose: () => void;
}

export function IndicesPanel({ onMaximize, onClose }: IndicesPanelProps) {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden flex flex-col h-full">
      <PanelHeader
        title="Indices"
        icon={<Activity className="h-4 w-4" />}
        subtitle={`${indices.length} markets`}
        onMaximize={onMaximize}
        onClose={onClose}
      />
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-1 gap-3">
          {indices.map((index, i) => (
            <div
              key={i}
              className="bg-gray-700/50 rounded-lg p-3 hover:bg-gray-700 transition-all duration-200 border border-gray-600"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="text-xs text-gray-400 mb-1">{index.name}</p>
                  <p className="text-2xl font-mono font-bold text-white">{index.value}</p>
                </div>
                <div className="flex items-center gap-1">
                  {index.change >= 0 ? (
                    <>
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      <TrendingUp className="h-5 w-5 text-green-400" />
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                      <TrendingDown className="h-5 w-5 text-red-400" />
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-sm font-mono font-semibold ${
                    index.change >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {index.change >= 0 ? '+' : ''}{index.change.toFixed(2)}
                </span>
                <span
                  className={`text-xs font-mono ${
                    index.change >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  ({index.changePercent >= 0 ? '+' : ''}{index.changePercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
