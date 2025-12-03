import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ResponsiveProvider } from "@/contexts/ResponsiveContext";
import { AuthScreen } from "@/components/AuthScreen";
import Index from "./pages/Index";
import NotesAndVisualization from "./pages/NotesAndVisualization";
import RelationshipDashboard from "./pages/RelationshipDashboard";
import IntelligencePlatform from "./pages/IntelligencePlatform";
import NotFound from "./pages/NotFound";
import OptionsSurfacePlot from "./components/OptionsSurfacePlot";
import { PacManGame } from "./components/PacManGame";

const queryClient = new QueryClient();

// Protected App Content
const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-terminal-amber animate-pulse font-mono text-lg">
          Loading ABLE Terminal...
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/notes" element={<NotesAndVisualization />} />
        <Route path="/relationship-dashboard" element={<RelationshipDashboard />} />
        <Route path="/intelligence" element={<IntelligencePlatform />} />
        <Route path="/options" element={<OptionsSurfacePlot />} />
        <Route path="/pacman" element={<PacManGame />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ResponsiveProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppContent />
          </TooltipProvider>
        </ResponsiveProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
