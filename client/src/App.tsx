import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Workspace from "@/pages/workspace";
import Design from "@/pages/design";
import Auth from "@/pages/auth";
import Welcome from "@/pages/welcome";
import Dashboard from "@/pages/dashboard";
import AdminPage from "@/pages/admin";
import BrainPage from "@/pages/brain";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/workspace" component={Workspace} />
      <Route path="/design" component={Design} />
      <Route path="/figma" component={Design} />
      <Route path="/editor" component={Design} />
      <Route path="/auth" component={Auth} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/welcome" component={Welcome} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/brain" component={BrainPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
