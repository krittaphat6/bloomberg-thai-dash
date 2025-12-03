import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MobileHeaderProps {
  currentTime: Date;
}

export function MobileHeader({ currentTime }: MobileHeaderProps) {
  return (
    <header className="bg-background border-b border-border px-4 py-3 safe-area-top">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-terminal-green">ABLE</span>
          <span className="text-xs text-terminal-amber font-mono">TERMINAL</span>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-xs text-terminal-green font-mono">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Bell className="w-4 h-4 text-terminal-green" />
          </Button>
        </div>
      </div>
    </header>
  );
}
