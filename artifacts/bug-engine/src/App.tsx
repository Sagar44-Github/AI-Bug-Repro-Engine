import { Component, type ReactNode } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout";
import { NotificationsProvider } from "@/contexts/notifications";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

import { LandingPage } from "@/pages/landing";
import { Dashboard } from "@/pages/dashboard";
import { History } from "@/pages/history";
import { NewAnalysis } from "@/pages/new";
import { AnalysisDetail } from "@/pages/detail";
import { ExportPage } from "@/pages/export";
import { Settings } from "@/pages/settings";
import { EnvDiffPage } from "@/pages/env-diff";
import { Nl2TestPage } from "@/pages/nl2test";
import { FlakyDetectorPage } from "@/pages/flaky-detector";
import { ProjectsPage } from "@/pages/projects";
import { RegressionGuardPage } from "@/pages/regression-guard";
import { BugDigestPage } from "@/pages/bug-digest";
import { DocsPage } from "@/pages/docs";
import NotFound from "@/pages/not-found";

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50 max-w-2xl mx-auto my-8">
          <CardContent className="p-8 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto opacity-80" />
            <h2 className="text-xl font-bold">Unable to Load Page Data</h2>
            <p className="text-sm text-muted-foreground">
              {this.state.error?.message || "The backend API server is unreachable or returning an unexpected response."}
            </p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw className="w-4 h-4 mr-2" /> Reload Page
            </Button>
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/history" component={History} />
      <Route path="/new" component={NewAnalysis} />
      <Route path="/analyses/:id/export" component={ExportPage} />
      <Route path="/analyses/:id" component={AnalysisDetail} />
      <Route path="/settings" component={Settings} />
      <Route path="/tools/env-diff" component={EnvDiffPage} />
      <Route path="/tools/nl2test" component={Nl2TestPage} />
      <Route path="/tools/flaky-detector" component={FlakyDetectorPage} />
      <Route path="/tools/regression-guard" component={RegressionGuardPage} />
      <Route path="/tools/bug-digest" component={BugDigestPage} />
      <Route path="/projects" component={ProjectsPage} />
      <Route path="/docs" component={DocsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

const rawBase = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
const routerBase = rawBase.length > 0 ? rawBase : undefined;

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <NotificationsProvider>
          <WouterRouter base={routerBase}>
            <AppLayout>
              <ErrorBoundary>
                <Router />
              </ErrorBoundary>
            </AppLayout>
          </WouterRouter>
        </NotificationsProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
