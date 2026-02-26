import { useState, Suspense, lazy, useEffect } from 'react';
import { Box } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { ServerProvider, useServer } from './context/ServerContext';
import { NavigationRail } from './components/layout/NavigationRail';
import { TopBar } from './components/layout/TopBar';
import { LoadingScreen } from './components/ui/LoadingScreen';
import ConnectionManager from './components/ConnectionManager';
import './styles/modern-theme.css';

// Lazy load heavy page components for code splitting
const Dashboard = lazy(() => import('./components/Dashboard'));
const DockerEnhanced = lazy(() => import('./components/DockerEnhanced'));
const ServicesManager = lazy(() => import('./components/ServicesManager'));
const NginxManager = lazy(() => import('./components/NginxManager'));
const CronManager = lazy(() => import('./components/CronManager'));
const LogViewer = lazy(() => import('./components/LogViewer'));
const QuickCommands = lazy(() => import('./components/QuickCommands'));
const FirewallManager = lazy(() => import('./components/FirewallManager'));
const UserManager = lazy(() => import('./components/UserManager'));
const InfrastructureManager = lazy(() => import('./components/InfrastructureManager'));

type View = 'dashboard' | 'docker' | 'services' | 'nginx' | 'cron' | 'logs' | 'commands' | 'firewall' | 'users' | 'infrastructure';

function AppContent() {
  const { isConnected, disconnect } = useServer();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate initial loading
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleViewChange = (view: View) => {
    setCurrentView(view);
  };

  const handleDisconnect = () => {
    disconnect();
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Box className="layout-fixed">
      {/* Modern Navigation Rail - Fixed position */}
      <NavigationRail currentView={currentView} onViewChange={handleViewChange} />

      {/* Modern Top Bar - Fixed position */}
      <TopBar onDisconnect={handleDisconnect} />

      {/* Main Content Area - Scrollable */}
      <Box
        style={{
          flex: 1,
          overflow: 'auto',
          padding: 'var(--space-6)',
          marginLeft: 'var(--sidebar-width-collapsed)',
          marginTop: 'var(--header-height)',
          height: 'calc(100vh - var(--header-height))',
          width: 'calc(100vw - var(--sidebar-width-collapsed))',
          minHeight: 0,
          transition: 'margin-left var(--duration-slow) var(--easing-smooth)',
        }}
      >
        {!isConnected ? (
          <ConnectionManager />
        ) : (
          <Suspense
            fallback={
              <Box
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%',
                }}
              >
                <div className="spinner" />
              </Box>
            }
          >
            {currentView === 'dashboard' && <Dashboard />}
            {currentView === 'docker' && <DockerEnhanced />}
            {currentView === 'services' && <ServicesManager />}
            {currentView === 'nginx' && <NginxManager />}
            {currentView === 'cron' && <CronManager />}
            {currentView === 'logs' && <LogViewer />}
            {currentView === 'commands' && <QuickCommands />}
            {currentView === 'firewall' && <FirewallManager />}
            {currentView === 'users' && <UserManager />}
            {currentView === 'infrastructure' && <InfrastructureManager />}
          </Suspense>
        )}
      </Box>
    </Box>
  );
}

function App() {
  return (
    <ServerProvider>
      <AppContent />
    </ServerProvider>
  );
}

export default App;
