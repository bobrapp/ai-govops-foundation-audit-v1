import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Eager — landing must render fast (LCP).
import Landing from "./pages/Landing";

// Lazy — every other route is code-split. Cuts initial bundle ~60%.
const Auth = lazy(() => import("./pages/Auth"));
const Donate = lazy(() => import("./pages/Donate"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Submit = lazy(() => import("./pages/Submit"));
const ReviewDetail = lazy(() => import("./pages/ReviewDetail"));
const AuditLog = lazy(() => import("./pages/AuditLog"));
const Admin = lazy(() => import("./pages/Admin"));
const AosCatalog = lazy(() => import("./pages/AosCatalog"));
const Registry = lazy(() => import("./pages/Registry"));
const MyAssessor = lazy(() => import("./pages/MyAssessor"));
const Firms = lazy(() => import("./pages/Firms"));
const Verify = lazy(() => import("./pages/Verify"));
const Docs = lazy(() => import("./pages/Docs"));
const DocViewer = lazy(() => import("./pages/DocViewer"));
const AosSpec = lazy(() => import("./pages/AosSpec"));
const RiskScenarios = lazy(() => import("./pages/RiskScenarios"));
const Canary = lazy(() => import("./pages/Canary"));
const Operations = lazy(() => import("./pages/Operations"));
const Agents = lazy(() => import("./pages/Agents"));
const AgentsDashboard = lazy(() => import("./pages/AgentsDashboard"));
const AgentChat = lazy(() => import("./pages/AgentChat"));
const QuickAudit = lazy(() => import("./pages/QuickAudit"));
const Demo = lazy(() => import("./pages/Demo"));
const Developers = lazy(() => import("./pages/Developers"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
});

const RouteFallback = () => (
  <div className="min-h-screen grid place-items-center bg-background text-muted-foreground">
    <Loader2 className="h-5 w-5 animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/donate" element={<Donate />} />
              <Route path="/registry" element={<Registry />} />
              <Route path="/verify/:reviewId" element={<Verify />} />
              <Route path="/docs" element={<Docs />} />
              <Route path="/docs/aos-spec" element={<AosSpec />} />
              <Route path="/docs/risk-scenarios" element={<RiskScenarios />} />
              <Route path="/docs/canary" element={<Canary />} />
              <Route path="/docs/operations" element={<Operations />} />
              <Route path="/docs/:slug" element={<DocViewer />} />
              <Route path="/demo" element={<Demo />} />
              <Route path="/demo/:scenario" element={<Demo />} />
              <Route path="/developers" element={<Developers />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/quick-audit" element={<ProtectedRoute><QuickAudit /></ProtectedRoute>} />
              <Route path="/submit" element={<ProtectedRoute><Submit /></ProtectedRoute>} />
              <Route path="/review/:id" element={<ProtectedRoute><ReviewDetail /></ProtectedRoute>} />
              <Route path="/audit" element={<ProtectedRoute><AuditLog /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
              <Route path="/aos" element={<ProtectedRoute><AosCatalog /></ProtectedRoute>} />
              <Route path="/me/assessor" element={<ProtectedRoute><MyAssessor /></ProtectedRoute>} />
              <Route path="/firms" element={<ProtectedRoute><Firms /></ProtectedRoute>} />
              <Route path="/agents" element={<ProtectedRoute><Agents /></ProtectedRoute>} />
              <Route path="/agents/dashboard" element={<ProtectedRoute><AgentsDashboard /></ProtectedRoute>} />
              <Route path="/agents/chat" element={<ProtectedRoute><AgentChat /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
