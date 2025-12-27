import { useQuery } from '@tanstack/react-query';
import { 
  STOCK_MARKETS, 
  CENTRAL_BANKS, 
  MAJOR_PORTS, 
  OIL_GAS_LOCATIONS,
  updateMarketData,
  fetchWildfires,
  fetchShips,
  MarketData,
  WildfireFeature,
  ShipFeature
} from '@/services/GeoDataService';

export const useMarketMapData = () => {
  return useQuery<MarketData[]>({
    queryKey: ['stockMarkets'],
    queryFn: () => updateMarketData(STOCK_MARKETS),
    refetchInterval: 60 * 1000, // Refetch every minute
    staleTime: 30 * 1000,
  });
};

export const useCentralBanks = () => {
  return useQuery({
    queryKey: ['centralBanks'],
    queryFn: () => Promise.resolve(CENTRAL_BANKS),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
};

export const usePorts = () => {
  return useQuery({
    queryKey: ['ports'],
    queryFn: () => Promise.resolve(MAJOR_PORTS),
    staleTime: 24 * 60 * 60 * 1000,
  });
};

export const useOilGas = () => {
  return useQuery({
    queryKey: ['oilGas'],
    queryFn: () => Promise.resolve(OIL_GAS_LOCATIONS),
    staleTime: 24 * 60 * 60 * 1000,
  });
};

export const useWildfires = () => {
  return useQuery<WildfireFeature[]>({
    queryKey: ['wildfires'],
    queryFn: fetchWildfires,
    refetchInterval: 15 * 60 * 1000, // Refetch every 15 minutes
    staleTime: 10 * 60 * 1000,
  });
};

export const useShips = () => {
  return useQuery<ShipFeature[]>({
    queryKey: ['ships'],
    queryFn: fetchShips,
    refetchInterval: 30 * 1000, // Refetch every 30 seconds for more real-time feel
    staleTime: 15 * 1000,
  });
};
