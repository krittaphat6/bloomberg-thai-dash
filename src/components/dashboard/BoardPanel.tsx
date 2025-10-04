import { Building2 } from 'lucide-react';
import { PanelHeader } from './PanelHeader';

interface BoardMember {
  name: string;
  title: string;
  since: number;
}

const boardMembers: BoardMember[] = [
  { name: 'Leslie A. Brun', title: 'Chairman', since: 2015 },
  { name: 'Kenneth C. Frazier', title: 'CEO & Director', since: 2011 },
  { name: 'Thomas R. Cech', title: 'Director', since: 2009 },
  { name: 'Pamela J. Craig', title: 'Director', since: 2012 },
  { name: 'Thomas H. Glocer', title: 'Director', since: 2007 },
  { name: 'Risa J. Lavizzo-Mourey', title: 'Director', since: 2010 },
];

interface BoardPanelProps {
  onMaximize: () => void;
  onClose: () => void;
}

export function BoardPanel({ onMaximize, onClose }: BoardPanelProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2);
  };

  const getColor = (index: number) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500'];
    return colors[index % colors.length];
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden flex flex-col h-full">
      <PanelHeader
        title="Board of Directors"
        icon={<Building2 className="h-4 w-4" />}
        subtitle={`${boardMembers.length} members`}
        onMaximize={onMaximize}
        onClose={onClose}
      />
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-2 gap-3">
          {boardMembers.map((member, i) => (
            <div
              key={i}
              className="bg-gray-700/50 rounded-lg p-3 hover:scale-105 hover:bg-gray-700 transition-all duration-200 border border-gray-600"
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full ${getColor(i)} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                  {getInitials(member.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{member.name}</p>
                  <p className="text-xs text-gray-400 mb-1">{member.title}</p>
                  <p className="text-xs text-gray-500">Since {member.since}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
