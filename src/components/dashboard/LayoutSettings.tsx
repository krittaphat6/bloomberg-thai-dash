import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface LayoutSettingsProps {
  visiblePanels: Record<string, boolean>;
  onApply: (panels: Record<string, boolean>) => void;
  onClose: () => void;
}

const panelOptions = [
  { id: 'relationship-map', label: 'Relationship Map', description: 'Network visualization of connections' },
  { id: 'news', label: 'News Feed', description: 'Latest market news and updates' },
  { id: 'indices', label: 'Market Indices', description: 'Real-time market indicators' },
  { id: 'peers', label: 'Peer Companies', description: 'Competitor analysis and comparison' },
  { id: 'holders', label: 'Top Holders', description: 'Major shareholders information' },
  { id: 'board', label: 'Board of Directors', description: 'Company leadership overview' },
  { id: 'balance', label: 'Balance Sheet', description: 'Financial statements summary' },
];

export function LayoutSettings({ visiblePanels, onApply, onClose }: LayoutSettingsProps) {
  const [localPanels, setLocalPanels] = useState(visiblePanels);

  const handleToggle = (panelId: string) => {
    setLocalPanels(prev => ({
      ...prev,
      [panelId]: !prev[panelId]
    }));
  };

  const handleApply = () => {
    onApply(localPanels);
    onClose();
  };

  const handleSelectAll = () => {
    const allVisible = Object.fromEntries(
      panelOptions.map(panel => [panel.id, true])
    );
    setLocalPanels(allVisible);
  };

  const handleDeselectAll = () => {
    const allHidden = Object.fromEntries(
      panelOptions.map(panel => [panel.id, false])
    );
    setLocalPanels(allHidden);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-white">Dashboard Settings</h2>
            <p className="text-sm text-gray-400 mt-1">Customize which panels are visible on your dashboard</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="flex gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="text-xs"
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeselectAll}
              className="text-xs"
            >
              Deselect All
            </Button>
          </div>

          <div className="space-y-4">
            {panelOptions.map(panel => (
              <div
                key={panel.id}
                className="flex items-start gap-3 p-4 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-all border border-gray-600"
              >
                <Checkbox
                  id={panel.id}
                  checked={localPanels[panel.id]}
                  onCheckedChange={() => handleToggle(panel.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label
                    htmlFor={panel.id}
                    className="text-sm font-medium text-white cursor-pointer"
                  >
                    {panel.label}
                  </Label>
                  <p className="text-xs text-gray-400 mt-1">{panel.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700">
          <p className="text-xs text-gray-400">
            {Object.values(localPanels).filter(Boolean).length} of {panelOptions.length} panels selected
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleApply} className="bg-blue-600 hover:bg-blue-700">
              <Check className="h-4 w-4 mr-2" />
              Apply Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
