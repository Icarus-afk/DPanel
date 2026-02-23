import { createContext, useContext, useState, ReactNode } from 'react';
import { ServerProfile, SystemMetrics, DockerContainer } from '../types';

interface ServerContextType {
  activeServer: ServerProfile | null;
  isConnected: boolean;
  cachedMetrics: SystemMetrics | null;
  cachedContainers: DockerContainer[] | null;
  metricsTimestamp: number | null;
  containersTimestamp: number | null;
  setActiveServer: (server: ServerProfile | null) => void;
  setIsConnected: (connected: boolean) => void;
  setCachedMetrics: (metrics: SystemMetrics | null) => void;
  setCachedContainers: (containers: DockerContainer[] | null) => void;
  invalidateCache: () => void;
}

const ServerContext = createContext<ServerContextType | undefined>(undefined);

export function ServerProvider({ children }: { children: ReactNode }) {
  const [activeServer, setActiveServer] = useState<ServerProfile | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [cachedMetrics, setCachedMetrics] = useState<SystemMetrics | null>(null);
  const [cachedContainers, setCachedContainers] = useState<DockerContainer[] | null>(null);
  const [metricsTimestamp, setMetricsTimestamp] = useState<number | null>(null);
  const [containersTimestamp, setContainersTimestamp] = useState<number | null>(null);

  const invalidateCache = () => {
    setCachedMetrics(null);
    setCachedContainers(null);
    setMetricsTimestamp(null);
    setContainersTimestamp(null);
  };

  return (
    <ServerContext.Provider value={{ 
      activeServer, 
      isConnected, 
      cachedMetrics,
      cachedContainers,
      metricsTimestamp,
      containersTimestamp,
      setActiveServer, 
      setIsConnected,
      setCachedMetrics: (metrics) => {
        setCachedMetrics(metrics);
        if (metrics) setMetricsTimestamp(Date.now());
      },
      setCachedContainers: (containers) => {
        setCachedContainers(containers);
        if (containers) setContainersTimestamp(Date.now());
      },
      invalidateCache,
    }}>
      {children}
    </ServerContext.Provider>
  );
}

export function useServer() {
  const context = useContext(ServerContext);
  if (context === undefined) {
    throw new Error('useServer must be used within a ServerProvider');
  }
  return context;
}
