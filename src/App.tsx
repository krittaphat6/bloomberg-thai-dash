import { useEffect, Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ResponsiveProvider } from "@/contexts/ResponsiveContext";
import { MCPProvider } from "@/contexts/MCPContext";
import { PanelCommanderProvider } from "@/contexts/PanelCommanderContext";
import { AgentProvider } from "@/contexts/AgentContext";
import { AuthWrapper } from "@/components/AuthWrapper";

// Lazy load page components to reduce initial bundle size
const Index = lazy(() => import("./pages/Index"));
const NotesAndVisualization = lazy(() => import("./pages/NotesAndVisualization"));
const RelationshipDashboard = lazy(() => import("./pages/RelationshipDashboard"));
const IntelligencePlatform = lazy(() => import("./pages/IntelligencePlatform"));
const NotFound = lazy(() => import("./pages/NotFound"));
const OptionsSurfacePlot = lazy(() => import("./components/OptionsSurfacePlot"));
const PacManGame = lazy(() => import("./components/PacManGame").then(m => ({ default: m.PacManGame })));
const GlobalMap = lazy(() => import("./pages/GlobalMap"));


const queryClient = new QueryClient();

// Initialize COT theme on app load
const initializeTheme = () => {
  const savedTheme = localStorage.getItem('able-theme') || 'cot';
  document.documentElement.classList.remove('theme-dark', 'theme-gray', 'theme-light-gray', 'theme-bright', 'theme-cot');
  document.documentElement.classList.add(`theme-${savedTheme === 'cot' ? 'cot' : savedTheme}`);
};

// Loading fallback for lazy-loaded components
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-terminal-amber animate-pulse font-mono text-lg">
      Loading...
    </div>
  </div>
);

// Protected App Content with Face Scan Auth
const AppContent = () => {
  return (
    <AuthWrapper>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Index />} />
            
            <Route path="/notes" element={<NotesAndVisualization />} />
            <Route path="/relationship-dashboard" element={<RelationshipDashboard />} />
            <Route path="/intelligence" element={<IntelligencePlatform />} />
            <Route path="/options" element={<OptionsSurfacePlot />} />
            <Route path="/pacman" element={<PacManGame />} />
            <Route path="/map" element={<GlobalMap />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthWrapper>
  );
};

const App = () => {
  useEffect(() => {
    initializeTheme();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ResponsiveProvider>
          <MCPProvider>
            <PanelCommanderProvider>
              <AgentProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <AppContent />
                </TooltipProvider>
              </AgentProvider>
            </PanelCommanderProvider>
          </MCPProvider>
        </ResponsiveProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
