import { useState, ReactNode } from 'react';
import { RefreshCw, Download, AlertCircle, Table, BarChart3, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface COTStyleWrapperProps {
  title: string;
  icon?: string;
  children?: ReactNode;
  className?: string;
  
  // Header options
  lastUpdate?: Date | null;
  selectOptions?: { value: string; label: string }[];
  selectedValue?: string;
  onSelectChange?: (value: string) => void;
  
  // Actions
  onRefresh?: () => void;
  onExport?: () => void;
  loading?: boolean;
  
  // Error
  error?: string | null;
  onErrorDismiss?: () => void;
  
  // Tabs
  tabs?: { id: string; label: string; icon: ReactNode; content: ReactNode }[];
  defaultTab?: string;
  
  // Footer
  footerStats?: { label: string; value: string | number }[];
  footerLeft?: string;
  footerRight?: string;
}

export const COTStyleWrapper = ({
  title,
  icon = '📊',
  children,
  className,
  lastUpdate,
  selectOptions,
  selectedValue,
  onSelectChange,
  onRefresh,
  onExport,
  loading = false,
  error,
  onErrorDismiss,
  tabs,
  defaultTab,
  footerStats,
  footerLeft,
  footerRight,
}: COTStyleWrapperProps) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs?.[0]?.id || 'main');

  return (
    <div className={cn("terminal-panel h-full flex flex-col text-[0.5rem] xs:text-[0.6rem] sm:text-xs md:text-sm", className)}>
      {/* ═══════════════════════════════════════════════════
          1. HEADER SECTION
          ═══════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2 border-b border-green-500/30 gap-2">
        <div>
          <span className="font-bold text-green-400 text-sm sm:text-base">
            {icon} {title}
          </span>
          {lastUpdate && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Last updated: {lastUpdate.toLocaleString()}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Select Dropdown */}
          {selectOptions && selectOptions.length > 0 && (
            <select
              value={selectedValue}
              onChange={(e) => onSelectChange?.(e.target.value)}
              className="bg-background border border-border text-green-400 text-xs px-2 py-1 rounded font-mono"
              disabled={loading}
            >
              {selectOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}

          {/* Refresh Button */}
          {onRefresh && (
            <Button
              onClick={onRefresh}
              size="sm"
              variant="outline"
              className="h-7 px-2 border-green-500/30 text-green-400 hover:bg-green-500/10"
              disabled={loading}
            >
              <RefreshCw className={cn("w-3 h-3 mr-1", loading && "animate-spin")} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          )}

          {/* Export Button */}
          {onExport && (
            <Button
              onClick={onExport}
              size="sm"
              variant="outline"
              className="h-7 px-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
              disabled={loading}
            >
              <Download className="w-3 h-3 mr-1" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          2. ERROR ALERT
          ═══════════════════════════════════════════════════ */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 p-2 flex items-center gap-2 text-red-400 text-xs mx-2 mt-2 rounded">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          {onErrorDismiss && (
            <button
              onClick={onErrorDismiss}
              className="hover:opacity-70 text-red-400 px-1"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          3. TABS OR CONTENT
          ═══════════════════════════════════════════════════ */}
      {tabs && tabs.length > 0 ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full justify-start gap-1 bg-transparent border-b border-border/30 rounded-none p-0 px-2">
            {tabs.map(tab => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400 data-[state=active]:border-b-2 data-[state=active]:border-green-500 rounded-none text-xs px-3 py-1.5 gap-1"
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {tabs.map(tab => (
            <TabsContent key={tab.id} value={tab.id} className="flex-1 overflow-auto m-0 p-2">
              {tab.content}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <div className="flex-1 overflow-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-green-400">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              Loading...
            </div>
          ) : (
            children
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          4. FOOTER
          ═══════════════════════════════════════════════════ */}
      <div className="border-t border-green-500/30 p-2">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{footerLeft || ''}</span>
          {footerStats && (
            <span className="flex items-center gap-2">
              {footerStats.map((stat, i) => (
                <span key={i}>
                  <span className="text-amber-400">{stat.label}:</span> {stat.value}
                  {i < footerStats.length - 1 ? ' | ' : ''}
                </span>
              ))}
            </span>
          )}
          <span>{footerRight || ''}</span>
        </div>
      </div>
    </div>
  );
};

export default COTStyleWrapper;
