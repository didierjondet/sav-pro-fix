import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LimitDialogProvider } from "@/contexts/LimitDialogContext";
import { PageLoader } from "@/components/ui/page-loader";

import { DelayNotificationProvider } from "@/components/layout/DelayNotificationProvider";
import { Suspense, lazy } from "react";

// Lazy load all pages for better performance
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Settings = lazy(() => import("./pages/Settings"));
const SAVList = lazy(() => import("./pages/SAVList"));
const NewSAV = lazy(() => import("./pages/NewSAV"));
const SAVDetail = lazy(() => import("./pages/SAVDetail"));
const TrackSAV = lazy(() => import("./pages/TrackSAV"));
const SimpleTrack = lazy(() => import("./pages/SimpleTrack"));
const Parts = lazy(() => import("./pages/Parts"));
const Quotes = lazy(() => import("./pages/Quotes"));
const Customers = lazy(() => import("./pages/Customers"));
const Statistics = lazy(() => import("./pages/Statistics"));
const ClientChats = lazy(() => import("./pages/ClientChats"));
const Landing = lazy(() => import("./pages/Landing"));
const Orders = lazy(() => import("./pages/Orders"));
const SuperAdmin = lazy(() => import("./pages/SuperAdmin"));
const Subscription = lazy(() => import("./pages/Subscription"));
const Support = lazy(() => import("./pages/Support"));
const RevenueDetails = lazy(() => import("./pages/RevenueDetails"));
const ExpensesDetails = lazy(() => import("./pages/ExpensesDetails"));
const StatsDetailsRouter = lazy(() => import("./pages/StatsDetailsRouter"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ShopWebsite = lazy(() => import("./pages/ShopWebsite"));
const Features = lazy(() => import("./pages/Features"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Home = lazy(() => import("./pages/Home"));
const TestLanding = lazy(() => import("./pages/TestLanding"));
const SubscriptionSuccess = lazy(() => import("./pages/SubscriptionSuccess"));
const Notifications = lazy(() => import("./pages/Notifications"));
const QuotePublic = lazy(() => import("./pages/QuotePublic"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 10, // 10 minutes (augmenté de 5 à 10)
      retry: 2, // Réduit de 3 à 2
      refetchOnWindowFocus: false, // Désactiver le refetch au focus
      refetchOnMount: false, // Utiliser le cache si disponible
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <DelayNotificationProvider>
        <LimitDialogProvider>
          <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
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
              </Suspense>
              </BrowserRouter>
            </TooltipProvider>
          </LimitDialogProvider>
        </DelayNotificationProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;