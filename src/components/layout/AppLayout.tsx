import { useCallback, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import { Sidebar } from './Sidebar';
import InactivityWarningBanner from './InactivityWarningBanner';
import ShopCreationPolicyDialog from '@/components/onboarding/ShopCreationPolicyDialog';
import MFAGate from '@/components/auth/MFAGate';
import { useUsageTracking } from '@/hooks/useUsageTracking';

export default function AppLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  useUsageTracking();
  const handleMenuClick = useCallback(() => {
    setIsMobileMenuOpen((v) => !v);
  }, []);
  const handleCloseMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  return (
    <MFAGate>
      <div className="flex h-screen overflow-hidden flex-col">
        <InactivityWarningBanner />
        <ShopCreationPolicyDialog />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar isOpen={isMobileMenuOpen} onClose={handleCloseMobileMenu} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header
              onMenuClick={handleMenuClick}
              isMobileMenuOpen={isMobileMenuOpen}
            />
            <Outlet />
          </div>
        </div>
      </div>
    </MFAGate>
  );
}
