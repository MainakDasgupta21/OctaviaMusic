import { Navigate, useLocation } from 'react-router-dom';
import { normalizeRegion, normalizeWindow } from '@/lib/chartsUtils';

const ChartsArtistsPage = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const region = normalizeRegion(params.get('region'));
  const window = normalizeWindow(params.get('window'));
  const nextParams = new URLSearchParams({
    mode: 'artists',
    region,
    window,
  });
  return <Navigate to={`/charts?${nextParams.toString()}`} replace />;
};

export default ChartsArtistsPage;
