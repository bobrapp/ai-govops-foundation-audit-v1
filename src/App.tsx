import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Submit from "./pages/Submit";
import ReviewDetail from "./pages/ReviewDetail";
import AuditLog from "./pages/AuditLog";
import Admin from "./pages/Admin";
import AosCatalog from "./pages/AosCatalog";
import Registry from "./pages/Registry";
import MyAssessor from "./pages/MyAssessor";
import Firms from "./pages/Firms";
import Verify from "./pages/Verify";
import Docs from "./pages/Docs";
import DocViewer from "./pages/DocViewer";
import AosSpec from "./pages/AosSpec";
import RiskScenarios from "./pages/RiskScenarios";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/registry" element={<Registry />} />
            <Route path="/verify/:reviewId" element={<Verify />} />
            <Route path="/docs" element={<Docs />} />
            <Route path="/docs/aos-spec" element={<AosSpec />} />
            <Route path="/docs/risk-scenarios" element={<RiskScenarios />} />
            <Route path="/docs/:slug" element={<DocViewer />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/submit" element={<ProtectedRoute><Submit /></ProtectedRoute>} />
            <Route path="/review/:id" element={<ProtectedRoute><ReviewDetail /></ProtectedRoute>} />
            <Route path="/audit" element={<ProtectedRoute><AuditLog /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="/aos" element={<ProtectedRoute><AosCatalog /></ProtectedRoute>} />
            <Route path="/me/assessor" element={<ProtectedRoute><MyAssessor /></ProtectedRoute>} />
            <Route path="/firms" element={<ProtectedRoute><Firms /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
