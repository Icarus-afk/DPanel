/**
 * Centralized Icon Exports - Minimal Set
 * Standardized on Tabler Icons for consistency
 * 
 * Usage: import { Icons } from '@/lib/icons';
 *        <Icons.Dashboard size={20} />
 */

import {
  // Navigation
  IconLayoutDashboard,
  IconBrandDocker,
  IconSettings,
  IconWorld,
  IconClock,
  IconFileStack,
  IconTerminal,
  IconShield,
  IconUsers,
  IconTopologyStar,
  
  // Status
  IconWifi,
  IconWifiOff,
  IconBell,
  IconSearch,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconAlertTriangle,
  IconInfoCircle,
  IconCircleCheck,
  IconCircleX,
  
  // Actions
  IconRefresh,
  IconPlayerPlay,
  IconPlayerStop,
  IconPlayerPause,
  IconCopy,
  IconDownload,
  IconUpload,
  IconTrash,
  IconEdit,
  IconPlus,
  IconMinus,
  IconDots,
  IconDotsVertical,
  IconChevronDown,
  IconChevronUp,
  IconChevronLeft,
  IconChevronRight,
  IconArrowDown,
  IconArrowUp,
  IconArrowRight,
  IconArrowLeft,
  IconExternalLink,
  IconMaximize,
  IconMinimize,
  
  // System Metrics
  IconCpu,
  IconDatabase,
  IconActivity,
  IconGauge,
  IconDeviceDesktop,
  IconServer,
  
  // Docker
  IconContainer,
  IconBox,
  IconPackage,
  
  // Files
  IconFolder,
  IconFile,
  IconFileText,
  IconFileCode,
  IconFiles,
  
  // Network
  IconNetwork,
  
  // Security
  IconLock,
  IconLockOpen,
  IconKey,
  IconEye,
  IconEyeOff,
  
  // UI
  IconList,
  IconLayoutGrid,
  IconMenu,
  IconMenu2,
  
  // Trends
  IconTrendingUp,
  IconTrendingDown,
  
  // Misc
  IconStar,
  IconTools,
} from '@tabler/icons-react';

export const Icons = {
  // Navigation
  Dashboard: IconLayoutDashboard,
  Docker: IconBrandDocker,
  Settings: IconSettings,
  World: IconWorld,
  Clock: IconClock,
  FileStack: IconFileStack,
  Terminal: IconTerminal,
  Shield: IconShield,
  Users: IconUsers,
  TopologyStar: IconTopologyStar,
  
  // Status
  Wifi: IconWifi,
  WifiOff: IconWifiOff,
  Bell: IconBell,
  Search: IconSearch,
  Check: IconCheck,
  X: IconX,
  AlertCircle: IconAlertCircle,
  AlertTriangle: IconAlertTriangle,
  InfoCircle: IconInfoCircle,
  CheckCircle: IconCircleCheck,
  XCircle: IconCircleX,
  
  // Actions
  Refresh: IconRefresh,
  Play: IconPlayerPlay,
  Stop: IconPlayerStop,
  Pause: IconPlayerPause,
  Copy: IconCopy,
  Download: IconDownload,
  Upload: IconUpload,
  Trash: IconTrash,
  Edit: IconEdit,
  Plus: IconPlus,
  Minus: IconMinus,
  Dots: IconDots,
  DotsVertical: IconDotsVertical,
  ChevronDown: IconChevronDown,
  ChevronUp: IconChevronUp,
  ChevronLeft: IconChevronLeft,
  ChevronRight: IconChevronRight,
  ArrowDown: IconArrowDown,
  ArrowUp: IconArrowUp,
  ArrowRight: IconArrowRight,
  ArrowLeft: IconArrowLeft,
  ExternalLink: IconExternalLink,
  Maximize: IconMaximize,
  Minimize: IconMinimize,
  
  // System Metrics
  Cpu: IconCpu,
  Database: IconDatabase,
  Activity: IconActivity,
  Gauge: IconGauge,
  HardDrive: IconDeviceDesktop,
  Server: IconServer,
  Memory: IconCpu,
  
  // Docker
  Container: IconContainer,
  Box: IconBox,
  Package: IconPackage,
  
  // Files
  Folder: IconFolder,
  File: IconFile,
  FileText: IconFileText,
  FileCode: IconFileCode,
  Files: IconFiles,
  
  // Network
  Network: IconNetwork,
  
  // Security
  Lock: IconLock,
  LockOpen: IconLockOpen,
  Key: IconKey,
  Eye: IconEye,
  EyeOff: IconEyeOff,
  
  // UI
  List: IconList,
  LayoutGrid: IconLayoutGrid,
  Menu: IconMenu,
  Menu2: IconMenu2,
  
  // Trends
  TrendingUp: IconTrendingUp,
  TrendingDown: IconTrendingDown,
  
  // Misc
  Star: IconStar,
  Tools: IconTools,
};

// Export individual icons for direct import
export {
  IconLayoutDashboard,
  IconBrandDocker,
  IconSettings,
  IconWorld,
  IconClock,
  IconFileStack,
  IconTerminal,
  IconShield,
  IconUsers,
  IconTopologyStar,
  IconWifi,
  IconWifiOff,
  IconBell,
  IconSearch,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconAlertTriangle,
  IconInfoCircle,
  IconCircleCheck,
  IconCircleX,
  IconRefresh,
  IconPlayerPlay,
  IconPlayerStop,
  IconPlayerPause,
  IconCopy,
  IconDownload,
  IconUpload,
  IconTrash,
  IconEdit,
  IconPlus,
  IconMinus,
  IconDots,
  IconDotsVertical,
  IconChevronDown,
  IconChevronUp,
  IconChevronLeft,
  IconChevronRight,
  IconArrowDown,
  IconArrowUp,
  IconArrowRight,
  IconArrowLeft,
  IconExternalLink,
  IconMaximize,
  IconMinimize,
  IconCpu,
  IconDatabase,
  IconActivity,
  IconGauge,
  IconDeviceDesktop,
  IconServer,
  IconContainer,
  IconBox,
  IconPackage,
  IconFolder,
  IconFile,
  IconFileText,
  IconFileCode,
  IconFiles,
  IconNetwork,
  IconLock,
  IconLockOpen,
  IconKey,
  IconEye,
  IconEyeOff,
  IconList,
  IconLayoutGrid,
  IconMenu,
  IconMenu2,
  IconTrendingUp,
  IconTrendingDown,
  IconStar,
  IconTools,
};

// Type for icon component props
export type IconProps = React.ComponentProps<typeof IconLayoutDashboard>;

// Default icon size
export const DEFAULT_ICON_SIZE = 20;

// Common icon sizes
export const ICON_SIZES = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  '2xl': 48,
};
