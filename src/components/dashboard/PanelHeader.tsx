import { LucideIcon, Maximize2, X, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PanelHeaderProps {
  title: string;
  icon: React.ReactNode;
  subtitle?: string;
  onMaximize: () => void;
  onClose: () => void;
}

export function PanelHeader({ title, icon, subtitle, onMaximize, onClose }: PanelHeaderProps) {
  return (
    <div className="drag-handle flex items-center justify-between px-4 py-2 bg-gray-700 border-b border-gray-600 cursor-move">
      <div className="flex items-center gap-2">
        <div className="text-blue-400">{icon}</div>
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400 hover:text-white">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
            <DropdownMenuItem onClick={onMaximize} className="text-white hover:bg-gray-700 cursor-pointer">
              <Maximize2 className="h-4 w-4 mr-2" />
              Maximize
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onClose} className="text-red-400 hover:bg-gray-700 cursor-pointer">
              <X className="h-4 w-4 mr-2" />
              Close
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
