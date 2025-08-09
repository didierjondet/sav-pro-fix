import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

import Auth from './pages/Auth';
import PublicLanding from './pages/PublicLanding';
import Index from './pages/Index';
import Customers from './pages/Customers';
import Parts from './pages/Parts';
import Quotes from './pages/Quotes';
import Orders from './pages/Orders';
import NewSAV from './pages/NewSAV';
import SAVList from './pages/SAVList';
import SAVDetail from './pages/SAVDetail';
import Settings from './pages/Settings';
import SuperAdmin from './pages/SuperAdmin';
import Support from './pages/Support';
import Subscription from './pages/Subscription';
import ShopWebsite from './pages/ShopWebsite';
import Landing from './pages/Landing';
import Statistics from './pages/Statistics';
import RevenueDetails from './pages/RevenueDetails';
import ExpensesDetails from './pages/ExpensesDetails';
import ClientChats from './pages/ClientChats';
import NotFound from './pages/NotFound';
import SubscriptionSuccess from './pages/SubscriptionSuccess';
import SMSPurchaseSuccess from './pages/SMSPurchaseSuccess';
import SimpleTrack from './pages/SimpleTrack';
import TrackSAV from './pages/TrackSAV';
import './index.css';

const queryClient = new QueryClient();

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Routes>
            <Route path="/" element={<PublicLanding />} />
            <Route path="/auth" element={
              <AuthProvider>
                <Auth />
              </AuthProvider>
            } />
            <Route path="/dashboard" element={
              <AuthProvider>
                <Index />
              </AuthProvider>
            } />
            <Route path="/customers" element={
              <AuthProvider>
                <Customers />
              </AuthProvider>
            } />
            <Route path="/parts" element={
              <AuthProvider>
                <Parts />
              </AuthProvider>
            } />
            <Route path="/quotes" element={
              <AuthProvider>
                <Quotes />
              </AuthProvider>
            } />
            <Route path="/orders" element={
              <AuthProvider>
                <Orders />
              </AuthProvider>
            } />
            <Route path="/sav/new" element={
              <AuthProvider>
                <NewSAV />
              </AuthProvider>
            } />
            <Route path="/sav" element={
              <AuthProvider>
                <SAVList />
              </AuthProvider>
            } />
            <Route path="/sav/:id" element={
              <AuthProvider>
                <SAVDetail />
              </AuthProvider>
            } />
            <Route path="/settings" element={
              <AuthProvider>
                <Settings />
              </AuthProvider>
            } />
            <Route path="/super-admin" element={
              <AuthProvider>
                <SuperAdmin />
              </AuthProvider>
            } />
            <Route path="/support" element={
              <AuthProvider>
                <Support />
              </AuthProvider>
            } />
            <Route path="/subscription" element={
              <AuthProvider>
                <Subscription />
              </AuthProvider>
            } />
            <Route path="/shop-website" element={
              <AuthProvider>
                <ShopWebsite />
              </AuthProvider>
            } />
            <Route path="/shop/:slug" element={<ShopWebsite />} />
            <Route path="/simple-track" element={<SimpleTrack />} />
            <Route path="/track/:slug" element={<TrackSAV />} />
            <Route path="/subscription-success" element={
              <AuthProvider>
                <SubscriptionSuccess />
              </AuthProvider>
            } />
            <Route path="/sms-purchase-success" element={
              <AuthProvider>
                <SMSPurchaseSuccess />
              </AuthProvider>
            } />
            <Route path="/client-chats" element={
              <AuthProvider>
                <ClientChats />
              </AuthProvider>
            } />
            <Route path="/client-chats/*" element={
              <AuthProvider>
                <ClientChats />
              </AuthProvider>
            } />
            <Route path="/chats" element={
              <AuthProvider>
                <ClientChats />
              </AuthProvider>
            } />
            <Route path="/statistics" element={
              <AuthProvider>
                <Statistics />
              </AuthProvider>
            } />
            <Route path="/statistics/revenue" element={
              <AuthProvider>
                <RevenueDetails />
              </AuthProvider>
            } />
            <Route path="/statistics/revenue/*" element={
              <AuthProvider>
                <RevenueDetails />
              </AuthProvider>
            } />
            <Route path="/statistics/expenses" element={
              <AuthProvider>
                <ExpensesDetails />
              </AuthProvider>
            } />
            <Route path="/statistics/expenses/*" element={
              <AuthProvider>
                <ExpensesDetails />
              </AuthProvider>
            } />
            <Route path="/stats/revenue" element={
              <AuthProvider>
                <RevenueDetails />
              </AuthProvider>
            } />
            <Route path="/stats/revenue/*" element={
              <AuthProvider>
                <RevenueDetails />
              </AuthProvider>
            } />
            <Route path="/stats/expenses" element={
              <AuthProvider>
                <ExpensesDetails />
              </AuthProvider>
            } />
            <Route path="/stats/expenses/*" element={
              <AuthProvider>
                <ExpensesDetails />
              </AuthProvider>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
          <Sonner />
        </Router>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);