import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

import Index from './pages/Index';
import Auth from './pages/Auth';
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
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/landing" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<Index />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/parts" element={<Parts />} />
              <Route path="/quotes" element={<Quotes />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/sav/new" element={<NewSAV />} />
              <Route path="/sav" element={<SAVList />} />
              <Route path="/sav/:id" element={<SAVDetail />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/super-admin" element={<SuperAdmin />} />
              <Route path="/support" element={<Support />} />
              <Route path="/subscription" element={<Subscription />} />
<Route path="/shop-website" element={<ShopWebsite />} />
              <Route path="/shop/:slug" element={<ShopWebsite />} />
              <Route path="/simple-track" element={<SimpleTrack />} />
              <Route path="/track/:slug" element={<TrackSAV />} />
              <Route path="/subscription-success" element={<SubscriptionSuccess />} />
              <Route path="/sms-purchase-success" element={<SMSPurchaseSuccess />} />
<Route path="/statistics" element={<Statistics />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Router>
          <Toaster />
          <Sonner />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);