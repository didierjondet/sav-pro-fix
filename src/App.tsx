import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Settings from "./pages/Settings";
import SAVList from "./pages/SAVList";
import NewSAV from "./pages/NewSAV";
import SAVDetail from "./pages/SAVDetail";
import TrackSAV from "./pages/TrackSAV";
import Parts from "./pages/Parts";
import Quotes from "./pages/Quotes";
import Customers from "./pages/Customers";

import Landing from "./pages/Landing";
import Orders from "./pages/Orders";
import SuperAdmin from "./pages/SuperAdmin";
import Subscription from "./pages/Subscription";
import CreateShop from "./pages/CreateShop";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/sav" element={<SAVList />} />
            <Route path="/sav/new" element={<NewSAV />} />
            <Route path="/sav/:id" element={<SAVDetail />} />
            <Route path="/track/:caseNumber" element={<TrackSAV />} />
            <Route path="/parts" element={<Parts />} />
            <Route path="/quotes" element={<Quotes />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/customers" element={<Customers />} />
            
            <Route path="/super-admin" element={<SuperAdmin />} />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/create-shop" element={<CreateShop />} />
            <Route path="/landing" element={<Landing />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
