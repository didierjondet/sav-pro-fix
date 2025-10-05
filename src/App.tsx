import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { get, set, del } from "idb-keyval";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ShopProvider } from "@/contexts/ShopContext";
import { LimitDialogProvider } from "@/contexts/LimitDialogContext";

import { DelayNotificationProvider } from "@/components/layout/DelayNotificationProvider";
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
import NotFound from "./pages/NotFound";
import ShopWebsite from "./pages/ShopWebsite";
import Features from "./pages/Features";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Home from "./pages/Home";
import TestLanding from "./pages/TestLanding";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
import Notifications from "./pages/Notifications";
import QuotePublic from "./pages/QuotePublic";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 15, // 15 minutes - Données considérées "fraîches"
      gcTime: 1000 * 60 * 60 * 24, // 24 heures - Durée de vie du cache
      retry: 1, // Réduit à 1 pour éviter les ralentissements
      refetchOnWindowFocus: false, // Ne pas recharger au focus
      refetchOnReconnect: false, // Ne pas recharger à la reconnexion
      refetchOnMount: false, // Ne pas recharger au montage si data existe
    },
  },
});

// Persister pour cache IndexedDB avec stratégie stale-while-revalidate
const persister = {
  persistClient: async (client: any) => {
    await set('FIXWAY_REACT_QUERY_CACHE', client);
  },
  restoreClient: async () => {
    return await get('FIXWAY_REACT_QUERY_CACHE');
  },
  removeClient: async () => {
    await del('FIXWAY_REACT_QUERY_CACHE');
  },
};

const App = () => (
  <PersistQueryClientProvider 
    client={queryClient} 
    persistOptions={{ 
      persister,
      maxAge: 1000 * 60 * 60 * 24, // 24 heures
      dehydrateOptions: {
        shouldDehydrateQuery: (query) => {
          // Ne persister que les queries réussies et non en erreur
          return query.state.status === 'success';
        },
      },
    }}
  >
    <AuthProvider>
      <ShopProvider>
        <DelayNotificationProvider>
          <LimitDialogProvider>
            <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/dashboard" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/sav" element={<SAVList />} />
                <Route path="/sav/new" element={<NewSAV />} />
                <Route path="/sav/:id" element={<SAVDetail />} />
                <Route path="/track/:slug" element={<TrackSAV />} />
                <Route path="/parts" element={<Parts />} />
                <Route path="/quotes" element={<Quotes />} />
                <Route path="/quote/:id" element={<QuotePublic />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/customers" element={<Customers />} />
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
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/support" element={<Support />} />
                <Route path="/test" element={<TestLanding />} />
                <Route path="/subscription-success" element={<SubscriptionSuccess />} />
                <Route path="/super-admin" element={<SuperAdmin />} />
                <Route path="/subscription" element={<Subscription />} />
                <Route path="/landing" element={<Landing />} />
                <Route path="/features" element={<Features />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/shop/:slug" element={<ShopWebsite />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </LimitDialogProvider>
        </DelayNotificationProvider>
      </ShopProvider>
    </AuthProvider>
  </PersistQueryClientProvider>
);

export default App;