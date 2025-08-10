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
import SimpleTrack from "./pages/SimpleTrack";
import Parts from "./pages/Parts";
import Quotes from "./pages/Quotes";
import Customers from "./pages/Customers";
import Statistics from "./pages/Statistics";
import ClientChats from "./pages/ClientChats";
import Landing from "./pages/Landing";
import Orders from "./pages/Orders";
import SuperAdmin from "./pages/SuperAdmin";
import Subscription from "./pages/Subscription";
import Support from "./pages/Support";
import RevenueDetails from "./pages/RevenueDetails";
import ExpensesDetails from "./pages/ExpensesDetails";
import StatsDetailsRouter from "./pages/StatsDetailsRouter";
// CreateShop page supprimée - création automatique par trigger

import NotFound from "./pages/NotFound";
import ShopWebsite from "./pages/ShopWebsite";
import Features from "./pages/Features";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Home from "./pages/Home";
import TestLanding from "./pages/TestLanding";
import SMSTest from "./pages/SMSTest";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<TestLanding />} />
            <Route path="/dashboard" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/sav" element={<SAVList />} />
            <Route path="/sav/new" element={<NewSAV />} />
            <Route path="/sav/:id" element={<SAVDetail />} />
            <Route path="/track/:slug" element={<TrackSAV />} />
            <Route path="/parts" element={<Parts />} />
            <Route path="/quotes" element={<Quotes />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/customers" element={<Customers />} />
            {/* Chat clients routes (aliases) */}
            <Route path="/client-chats" element={<ClientChats />} />
            <Route path="/client-chats/*" element={<ClientChats />} />
            <Route path="/chats" element={<ClientChats />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/statistics/revenue" element={<RevenueDetails />} />
            <Route path="/statistics/revenue/*" element={<RevenueDetails />} />
            <Route path="/statistics/expenses" element={<ExpensesDetails />} />
            <Route path="/statistics/expenses/*" element={<ExpensesDetails />} />
            <Route path="/stats/revenue" element={<RevenueDetails />} />
            <Route path="/stats/revenue/*" element={<RevenueDetails />} />
            <Route path="/stats/expenses" element={<ExpensesDetails />} />
            <Route path="/stats/expenses/*" element={<ExpensesDetails />} />
            <Route path="/support" element={<Support />} />
            <Route path="/sms-test" element={<SMSTest />} />
            
            <Route path="/super-admin" element={<SuperAdmin />} />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/landing" element={<Landing />} />
            
            {/* Pages SEO publiques */}
            <Route path="/features" element={<Features />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            
            {/* Routes pour les mini-sites des magasins */}
            <Route path="/shop/:slug" element={<ShopWebsite />} />
            
            {/* Route de suivi simple - désactivée temporairement pour éviter les collisions */}
            {/* <Route path="/:slug" element={<SimpleTrack />} /> */}
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
