import { AlertTriangle } from 'lucide-react';
import EmptyState from '@/components/ui-v2/EmptyState';
import Button from '@/components/ui-v2/Button';

const ChartsErrorState = ({ onRetry }) => (
  <EmptyState
    icon={AlertTriangle}
    title="Couldn't load chart data. Check your connection."
    description="You can try again without leaving this page."
    action={(
      <Button type="button" onClick={onRetry}>
        Try again
      </Button>
    )}
  />
);

export default ChartsErrorState;
