import { useParams } from 'react-router-dom';
import RevenueDetails from './RevenueDetails';
import ExpensesDetails from './ExpensesDetails';
import NotFound from './NotFound';

export default function StatsDetailsRouter() {
  const { type } = useParams();
  if (type === 'revenue') return <RevenueDetails />;
  if (type === 'expenses') return <ExpensesDetails />;
  return <NotFound />;
}
