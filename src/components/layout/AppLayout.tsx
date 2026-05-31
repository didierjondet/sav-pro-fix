import { useCallback, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import { Sidebar } from './Sidebar';

export default function AppLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const handleMenuClick = useCallback(() => {
    setIsMobileMenuOpen((v) => !v);
  }, []);
  const handleCloseMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden flex-col">
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
  );
}
