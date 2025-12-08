import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bell, Plus, Trash2, BellRing, Volume2 } from 'lucide-react';
import { ChartAlert } from './types';
import { toast } from '@/hooks/use-toast';

interface AlertsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: ChartAlert[];
  onAddAlert: (alert: ChartAlert) => void;
  onRemoveAlert: (id: string) => void;
  onToggleAlert: (id: string) => void;
  currentSymbol: string;
  currentPrice: number;
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({
  isOpen,
  onClose,
  alerts,
  onAddAlert,
  onRemoveAlert,
  onToggleAlert,
  currentSymbol,
  currentPrice,
}) => {
  const [newAlert, setNewAlert] = useState({
    condition: 'crosses_above' as ChartAlert['condition'],
    value: currentPrice,
    message: '',
  });
  const [soundEnabled, setSoundEnabled] = useState(true);

  const handleAddAlert = () => {
    if (!newAlert.value) {
      toast({
        title: 'Invalid Alert',
        description: 'Please enter a price value',
        variant: 'destructive',
      });
      return;
    }

    const alert: ChartAlert = {
      id: `alert-${Date.now()}`,
      symbol: currentSymbol,
      condition: newAlert.condition,
      value: newAlert.value,
      message: newAlert.message || `${currentSymbol} ${newAlert.condition.replace('_', ' ')} ${newAlert.value}`,
      triggered: false,
      createdAt: Date.now(),
    };

    onAddAlert(alert);
    setNewAlert({
      condition: 'crosses_above',
      value: currentPrice,
      message: '',
    });

    toast({
      title: 'Alert Created',
      description: alert.message,
    });
  };

  const getConditionLabel = (condition: ChartAlert['condition']) => {
    const labels: Record<ChartAlert['condition'], string> = {
      crosses_above: 'Crosses Above',
      crosses_below: 'Crosses Below',
      greater_than: 'Greater Than',
      less_than: 'Less Than',
    };
    return labels[condition];
  };

  const getConditionColor = (condition: ChartAlert['condition']) => {
    return condition.includes('above') || condition.includes('greater')
      ? 'text-green-500'
      : 'text-red-500';
  };

  const symbolAlerts = alerts.filter(a => a.symbol === currentSymbol);
  const otherAlerts = alerts.filter(a => a.symbol !== currentSymbol);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[350px] bg-card border-l border-terminal-amber/30">
        <SheetHeader>
          <SheetTitle className="text-terminal-amber font-mono flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Price Alerts
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)] mt-4 pr-4">
          {/* Settings */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded mb-4">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-terminal-amber" />
              <span className="text-sm">Sound Notifications</span>
            </div>
            <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
          </div>

          {/* Create new alert */}
          <div className="p-4 border border-terminal-amber/30 rounded-lg mb-6">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Alert for {currentSymbol}
            </h4>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Condition</Label>
                  <Select
                    value={newAlert.condition}
                    onValueChange={(v: ChartAlert['condition']) =>
                      setNewAlert({ ...newAlert, condition: v })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="crosses_above">Crosses Above</SelectItem>
                      <SelectItem value="crosses_below">Crosses Below</SelectItem>
                      <SelectItem value="greater_than">Greater Than</SelectItem>
                      <SelectItem value="less_than">Less Than</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Price</Label>
                  <Input
                    type="number"
                    value={newAlert.value}
                    onChange={e => setNewAlert({ ...newAlert, value: parseFloat(e.target.value) })}
                    className="h-8 text-xs"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Message (optional)</Label>
                <Input
                  value={newAlert.message}
                  onChange={e => setNewAlert({ ...newAlert, message: e.target.value })}
                  className="h-8 text-xs"
                  placeholder="Custom alert message..."
                />
              </div>

              <Button
                onClick={handleAddAlert}
                className="w-full bg-terminal-amber text-black hover:bg-terminal-amber/80"
              >
                <BellRing className="w-4 h-4 mr-2" />
                Create Alert
              </Button>
            </div>
          </div>

          {/* Current symbol alerts */}
          {symbolAlerts.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                {currentSymbol} Alerts ({symbolAlerts.length})
              </h4>
              <div className="space-y-2">
                {symbolAlerts.map(alert => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded border ${
                      alert.triggered
                        ? 'border-green-500/50 bg-green-500/10'
                        : 'border-terminal-amber/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={getConditionColor(alert.condition)}
                        >
                          {getConditionLabel(alert.condition)}
                        </Badge>
                        <span className="font-mono font-medium">
                          {alert.value.toLocaleString()}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-red-500"
                        onClick={() => onRemoveAlert(alert.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    {alert.message && (
                      <p className="text-xs text-muted-foreground">{alert.message}</p>
                    )}
                    {alert.triggered && (
                      <Badge className="mt-2 bg-green-500/20 text-green-500">
                        Triggered
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Other alerts */}
          {otherAlerts.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Other Alerts ({otherAlerts.length})
              </h4>
              <div className="space-y-2">
                {otherAlerts.map(alert => (
                  <div
                    key={alert.id}
                    className="p-2 rounded border border-muted flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {alert.symbol}
                        </Badge>
                        <span className="text-xs font-mono">{alert.value.toLocaleString()}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-red-500"
                      onClick={() => onRemoveAlert(alert.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {alerts.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No alerts set</p>
              <p className="text-sm">Create alerts to get notified of price movements</p>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default AlertsPanel;
