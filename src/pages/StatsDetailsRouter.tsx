import { useLocation, useParams } from 'react-router-dom';
import RevenueDetails from './RevenueDetails';
import ExpensesDetails from './ExpensesDetails';
import NotFound from './NotFound';

export default function StatsDetailsRouter() {
  const { type } = useParams();
  const { pathname } = useLocation();

  const t = type || (pathname.includes('revenue') ? 'revenue' : pathname.includes('expenses') ? 'expenses' : undefined);

  if (t === 'revenue') return <RevenueDetails />;
  if (t === 'expenses') return <ExpensesDetails />;
  return <NotFound />;
}
