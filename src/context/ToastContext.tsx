import { createContext, useContext } from 'react';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX, IconInfoCircle, IconAlertTriangle } from '@tabler/icons-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastContextType {
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const addToast = (message: string, type: ToastType = 'info') => {
    const iconMap = {
      success: <IconCheck size={18} />,
      error: <IconX size={18} />,
      info: <IconInfoCircle size={18} />,
      warning: <IconAlertTriangle size={18} />,
    };

    const colorMap = {
      success: 'green',
      error: 'red',
      info: 'blue',
      warning: 'yellow',
    };

    notifications.show({
      message,
      icon: iconMap[type],
      color: colorMap[type],
      autoClose: 4000,
    });
  };

  const removeToast = (id: string) => {
    notifications.hide(id);
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
