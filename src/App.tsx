import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { get, set, del } from "idb-keyval";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ShopProvider } from "@/contexts/ShopContext";
import { LimitDialogProvider } from "@/contexts/LimitDialogContext";
import { RealtimeProvider } from "@/contexts/RealtimeContext";
import { useEffect } from "react";
import { unlockAudio } from "@/hooks/useNotificationSound";

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
import Satisfaction from "./pages/Satisfaction";
import Reports from "./pages/Reports";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes par défaut - réduit de 15 min
      gcTime: 1000 * 60 * 60, // 1 heure - réduit de 24h pour économiser mémoire
      retry: 1,
      refetchOnWindowFocus: true, // ✅ Réactiver pour synchronisation multi-sessions
      refetchOnReconnect: true, // ✅ Réactiver pour synchronisation
      refetchOnMount: 'always', // ✅ Toujours recharger au montage pour données fraîches
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

const App = () => {
  // Débloquer l'audio au premier clic/tap pour permettre les notifications automatiques
  useEffect(() => {
    const handleUserInteraction = () => {
      unlockAudio();
    };

    document.addEventListener('click', handleUserInteraction, { once: true });
    document.addEventListener('touchstart', handleUserInteraction, { once: true });

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, []);

  return (
    <PersistQueryClientProvider
    client={queryClient} 
    persistOptions={{ 
      persister,
      maxAge: 1000 * 60 * 30, // 30 minutes - réduit de 24h pour synchronisation multi-sessions
      dehydrateOptions: {
        shouldDehydrateQuery: (query) => {
          // Ne persister que les queries réussies et non en erreur
          return query.state.status === 'success';
        },
      },
    }}
  >
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AuthProvider>
        <ShopProvider>
          <RealtimeProvider>
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
                <Route path="/satisfaction/:token" element={<Satisfaction />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/client-chats" element={<ClientChats />} />
                <Route path="/client-chats/*" element={<ClientChats />} />
                <Route path="/chats" element={<ClientChats />} />
                <Route path="/statistics" element={<Statistics />} />
                <Route path="/reports" element={<Reports />} />
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
        </RealtimeProvider>
      </ShopProvider>
    </AuthProvider>
    </ThemeProvider>
  </PersistQueryClientProvider>
  );
};

export default App;