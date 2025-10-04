import { useEffect, useState } from 'react';
import { Newspaper } from 'lucide-react';
import { PanelHeader } from './PanelHeader';
import { Badge } from '@/components/ui/badge';

interface NewsItem {
  id: string;
  title: string;
  source: string;
  time: string;
  category: 'Breaking' | 'Market' | 'Company' | 'Analysis';
}

const initialNews: NewsItem[] = [
  { id: '1', title: 'Lilly Aims Experimental Alzheimer Drug at Early Stage Patients', source: 'Bloomberg', time: '2 min ago', category: 'Breaking' },
  { id: '2', title: 'Bayer, Merck, J&J Among Pharma Giants Eye Cancer Breakthrough', source: 'Reuters', time: '15 min ago', category: 'Company' },
  { id: '3', title: 'Pharma Guidance Tracks Higher Than Expected in Q4', source: 'CNBC', time: '1 hour ago', category: 'Market' },
  { id: '4', title: 'FDA Approves New Treatment Protocol for Rare Disease', source: 'WSJ', time: '2 hours ago', category: 'Breaking' },
  { id: '5', title: 'Merck Reports Strong Quarterly Earnings Beat Estimates', source: 'FT', time: '3 hours ago', category: 'Company' },
  { id: '6', title: 'Healthcare Sector Rallies on Positive Clinical Trial Results', source: 'MarketWatch', time: '4 hours ago', category: 'Market' },
  { id: '7', title: 'Analyst Upgrades Major Pharmaceutical Stocks', source: 'Barrons', time: '5 hours ago', category: 'Analysis' },
  { id: '8', title: 'New Study Shows Promise in Cancer Immunotherapy', source: 'Bloomberg', time: '6 hours ago', category: 'Analysis' },
];

interface NewsPanelProps {
  onMaximize: () => void;
  onClose: () => void;
}

export function NewsPanel({ onMaximize, onClose }: NewsPanelProps) {
  const [news, setNews] = useState<NewsItem[]>(initialNews);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const headlines = [
      'FDA Approves Breakthrough Cancer Treatment Protocol',
      'Major Pharma Companies Report Strong Q4 Earnings',
      'Clinical Trial Shows Promise for New Alzheimer\'s Drug',
      'Healthcare Sector Rallies on Positive Regulatory News',
      'Biotech Merger Creates $50B Industry Giant',
      'New Drug Approval Expected to Boost Revenue by 15%',
      'Analyst Upgrades Major Pharmaceutical Stocks',
      'Patent Expiration Concerns Weigh on Stock Price',
    ];

    const interval = setInterval(() => {
      const newItem: NewsItem = {
        id: Date.now().toString(),
        title: headlines[Math.floor(Math.random() * headlines.length)],
        source: ['Bloomberg', 'Reuters', 'CNBC', 'WSJ', 'FT', 'MarketWatch'][Math.floor(Math.random() * 6)],
        time: 'Just now',
        category: ['Breaking', 'Market', 'Company', 'Analysis'][Math.floor(Math.random() * 4)] as NewsItem['category'],
      };
      setNews(prev => [newItem, ...prev.slice(0, 9)]);
    }, 15000); // Add new item every 15 seconds

    return () => clearInterval(interval);
  }, []);

  const getCategoryColor = (category: NewsItem['category']) => {
    switch (category) {
      case 'Breaking': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'Market': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'Company': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'Analysis': return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden flex flex-col h-full">
      <PanelHeader
        title="News"
        icon={<Newspaper className="h-4 w-4" />}
        subtitle={
          <div className="flex items-center gap-2">
            <span>{news.length} items</span>
            <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30 text-[10px] px-1">
              LIVE
            </Badge>
          </div>
        }
        onMaximize={onMaximize}
        onClose={onClose}
      />
      <div className="flex-1 overflow-auto">
        {news.map((item, index) => (
          <div
            key={item.id}
            className={`p-3 border-b border-gray-700 hover:bg-gray-700 cursor-pointer transition-all duration-200 ${
              selectedId === item.id ? 'bg-gray-700 border-l-4 border-l-blue-400' : ''
            } ${index === 0 ? 'animate-fade-in' : ''}`}
            onClick={() => setSelectedId(item.id)}
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="text-sm font-bold text-white line-clamp-2 flex-1">{item.title}</h4>
              <Badge variant="outline" className={`text-xs shrink-0 ${getCategoryColor(item.category)}`}>
                {item.category}
              </Badge>
            </div>
            <p className="text-xs text-gray-400">
              {item.source} • {item.time}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
