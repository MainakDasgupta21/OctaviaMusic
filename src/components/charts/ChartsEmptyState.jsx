import { BarChart3 } from 'lucide-react';
import EmptyState from '@/components/ui-v2/EmptyState';

const ChartsEmptyState = () => (
  <EmptyState
    icon={BarChart3}
    title="No chart data available for this filter."
    description="Try a different region or time window."
  />
);

export default ChartsEmptyState;
