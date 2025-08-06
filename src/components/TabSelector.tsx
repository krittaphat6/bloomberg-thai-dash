import { useState } from 'react';
import { X } from 'lucide-react';

interface TabOption {
  id: string;
  title: string;
  component: React.ReactNode;
}

interface TabSelectorProps {
  onSelect: (tab: TabOption) => void;
  onClose: () => void;
  availableComponents: TabOption[];
}

const TabSelector = ({ onSelect, onClose, availableComponents }: TabSelectorProps) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-bloomberg-black border border-terminal-amber/30 p-6 min-w-[400px]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-terminal-amber font-semibold">SELECT COMPONENT TO ADD</h3>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center hover:bg-terminal-red/20 hover:text-terminal-red transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {availableComponents.map((component) => (
            <button
              key={component.id}
              onClick={() => onSelect(component)}
              className="p-3 text-left border border-terminal-amber/20 hover:border-terminal-amber/60 hover:bg-terminal-amber/10 transition-colors text-terminal-white"
            >
              <div className="text-sm font-medium">{component.title}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TabSelector;