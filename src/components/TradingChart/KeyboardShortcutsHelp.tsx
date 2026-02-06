import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts = [
  { category: 'Zoom', items: [
    { keys: ['Ctrl', '+'], action: 'Zoom In' },
    { keys: ['Ctrl', '-'], action: 'Zoom Out' },
    { keys: ['Ctrl', '0'], action: 'Reset Zoom' },
  ]},
  { category: 'Navigation', items: [
    { keys: ['←', '→'], action: 'Pan Chart' },
    { keys: ['Home'], action: 'Go to Start' },
    { keys: ['End'], action: 'Go to Latest' },
  ]},
  { category: 'Panels', items: [
    { keys: ['I'], action: 'Toggle Indicators' },
    { keys: ['P'], action: 'Toggle Pine Script' },
    { keys: ['T'], action: 'Toggle Theme' },
    { keys: ['G'], action: 'Toggle Grid' },
  ]},
  { category: 'Actions', items: [
    { keys: ['Ctrl', 'S'], action: 'Save Chart' },
    { keys: ['Escape'], action: 'Cancel Drawing' },
    { keys: ['Delete'], action: 'Delete Selected' },
  ]},
];

const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  isOpen,
  onClose,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="bg-card border-terminal-green/30 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-terminal-green">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {shortcuts.map(section => (
            <div key={section.category}>
              <h4 className="text-sm font-medium text-terminal-cyan mb-2">
                {section.category}
              </h4>
              <div className="space-y-1">
                {section.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <span className="text-sm text-muted-foreground">{item.action}</span>
                    <div className="flex gap-1">
                      {item.keys.map((key, j) => (
                        <span key={j} className="inline-flex items-center gap-1">
                          <kbd className="px-2 py-0.5 bg-muted rounded text-xs font-mono">
                            {key}
                          </kbd>
                          {j < item.keys.length - 1 && (
                            <span className="text-muted-foreground">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KeyboardShortcutsHelp;
