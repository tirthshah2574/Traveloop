import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/contexts/AppContext";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import CreateTrip from "./pages/CreateTrip";
import MyTrips from "./pages/MyTrips";
import ItineraryBuilder from "./pages/ItineraryBuilder";
import ItineraryView from "./pages/ItineraryView";
import CitySearch from "./pages/CitySearch";
import ActivitySearch from "./pages/ActivitySearch";
import BudgetBreakdown from "./pages/BudgetBreakdown";
import PackingChecklist from "./pages/PackingChecklist";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/login"} component={Login} />
      <Route path={"/signup"} component={Signup} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/create-trip"} component={CreateTrip} />
      <Route path={"/my-trips"} component={MyTrips} />
      <Route path={"/trip/:id/builder"} component={ItineraryBuilder} />
      <Route path={"/trip/:id/itinerary"} component={ItineraryView} />
      <Route path={"/trip/:id/cities"} component={CitySearch} />
      <Route path={"/trip/:id/activities"} component={ActivitySearch} />
      <Route path={"/trip/:id/budget"} component={BudgetBreakdown} />
      <Route path={"/trip/:id/packing"} component={PackingChecklist} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AppProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AppProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
