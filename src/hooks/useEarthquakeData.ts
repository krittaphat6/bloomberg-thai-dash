import { useQuery } from '@tanstack/react-query';
import { fetchEarthquakes, EarthquakeFeature } from '@/services/GeoDataService';

export const useEarthquakeData = (minMagnitude = 4, limit = 100) => {
  return useQuery<EarthquakeFeature[]>({
    queryKey: ['earthquakes', minMagnitude, limit],
    queryFn: () => fetchEarthquakes(minMagnitude, limit),
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    staleTime: 2 * 60 * 1000, // Consider stale after 2 minutes
  });
};
