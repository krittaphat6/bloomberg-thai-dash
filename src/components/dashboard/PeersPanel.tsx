import { useState } from 'react';
import { Users, ArrowUp, ArrowDown } from 'lucide-react';
import { PanelHeader } from './PanelHeader';

interface Peer {
  company: string;
  marketCap: string;
  peRatio: number;
  change: number;
}

const initialPeers: Peer[] = [
  { company: 'Pfizer Inc', marketCap: '$265.2B', peRatio: 15.3, change: 2.1 },
  { company: 'Johnson & Johnson', marketCap: '$455.8B', peRatio: 18.7, change: -0.5 },
  { company: 'AbbVie Inc', marketCap: '$289.4B', peRatio: 35.2, change: 1.8 },
  { company: 'Eli Lilly', marketCap: '$524.1B', peRatio: 45.8, change: 3.2 },
  { company: 'Bristol Myers', marketCap: '$112.3B', peRatio: 12.1, change: -1.2 },
  { company: 'Amgen Inc', marketCap: '$145.6B', peRatio: 19.4, change: 0.7 },
];

type SortField = 'company' | 'marketCap' | 'peRatio' | 'change';

interface PeersPanelProps {
  onMaximize: () => void;
  onClose: () => void;
}

export function PeersPanel({ onMaximize, onClose }: PeersPanelProps) {
  const [peers, setPeers] = useState(initialPeers);
  const [sortField, setSortField] = useState<SortField>('company');
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);

  const handleSort = (field: SortField) => {
    const isAsc = sortField === field ? !sortAsc : true;
    setSortField(field);
    setSortAsc(isAsc);

    const sorted = [...peers].sort((a, b) => {
      let aVal: any = a[field];
      let bVal: any = b[field];
      
      if (field === 'marketCap') {
        aVal = parseFloat(aVal.replace(/[$B]/g, ''));
        bVal = parseFloat(bVal.replace(/[$B]/g, ''));
      }
      
      if (aVal < bVal) return isAsc ? -1 : 1;
      if (aVal > bVal) return isAsc ? 1 : -1;
      return 0;
    });
    
    setPeers(sorted);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden flex flex-col h-full">
      <PanelHeader
        title="Peer Companies"
        icon={<Users className="h-4 w-4" />}
        subtitle={`${peers.length} peers`}
        onMaximize={onMaximize}
        onClose={onClose}
      />
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-700 sticky top-0">
            <tr>
              <th 
                className="text-left p-2 text-xs font-semibold text-gray-300 cursor-pointer hover:bg-gray-600"
                onClick={() => handleSort('company')}
              >
                <div className="flex items-center gap-1">
                  Company <SortIcon field="company" />
                </div>
              </th>
              <th 
                className="text-right p-2 text-xs font-semibold text-gray-300 cursor-pointer hover:bg-gray-600"
                onClick={() => handleSort('marketCap')}
              >
                <div className="flex items-center justify-end gap-1">
                  Market Cap <SortIcon field="marketCap" />
                </div>
              </th>
              <th 
                className="text-right p-2 text-xs font-semibold text-gray-300 cursor-pointer hover:bg-gray-600"
                onClick={() => handleSort('peRatio')}
              >
                <div className="flex items-center justify-end gap-1">
                  P/E Ratio <SortIcon field="peRatio" />
                </div>
              </th>
              <th 
                className="text-right p-2 text-xs font-semibold text-gray-300 cursor-pointer hover:bg-gray-600"
                onClick={() => handleSort('change')}
              >
                <div className="flex items-center justify-end gap-1">
                  Change % <SortIcon field="change" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {peers.map((peer, i) => (
              <tr
                key={i}
                className={`border-b border-gray-700 hover:bg-gray-700 cursor-pointer transition-all ${
                  selectedRow === i ? 'bg-gray-700' : ''
                }`}
                onClick={() => setSelectedRow(i)}
              >
                <td className="p-2 text-white font-medium">{peer.company}</td>
                <td className="p-2 text-right text-gray-300 font-mono">{peer.marketCap}</td>
                <td className="p-2 text-right text-gray-300 font-mono">{peer.peRatio.toFixed(1)}</td>
                <td className={`p-2 text-right font-mono font-semibold ${peer.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {peer.change >= 0 ? '+' : ''}{peer.change.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
