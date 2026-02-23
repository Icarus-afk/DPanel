import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider, createTheme } from '@mantine/core';
import { NavigationProgress } from '@mantine/nprogress';
import { Notifications } from '@mantine/notifications';
import App from './App';
import { ToastProvider } from './context/ToastContext';
import '@mantine/core/styles.css';
import '@mantine/nprogress/styles.css';
import '@mantine/notifications/styles.css';

const theme = createTheme({
  colors: {
    dark: [
      '#C1C2C5',
      '#A6A7A8',
      '#909296',
      '#5c5f66',
      '#373A40',
      '#2C2E33',
      '#25262B',
      '#1A1B1E',
      '#141517',
      '#101113',
    ],
  },
  primaryColor: 'dark',
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  defaultRadius: 'md',
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <NavigationProgress />
      <Notifications position="top-right" />
      <ToastProvider>
        <App />
      </ToastProvider>
    </MantineProvider>
  </React.StrictMode>
);
