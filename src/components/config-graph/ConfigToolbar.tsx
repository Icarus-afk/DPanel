import { useState } from 'react';
import { Box, Group, TextInput, Checkbox, Badge, ActionIcon, Tooltip } from '@mantine/core';
import {
  IconSearch,
  IconRefresh,
  IconZoomIn,
  IconZoomOut,
  IconFocusCentered,
  IconFileCode,
  IconBrandTypescript,
  IconBrandJavascript,
  IconFile,
} from '@tabler/icons-react';
import { ConfigFilterState, ConfigFileType, DEFAULT_FILTER_STATE } from '../../types/config-graph';

interface ConfigToolbarProps {
  onSearch: (query: string) => void;
  onFilterChange: (filter: ConfigFilterState) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

const fileTypeIcons: Record<ConfigFileType, React.ReactNode> = {
  json: <IconFileCode size={14} />,
  toml: <IconFile size={14} />,
  yaml: <IconFile size={14} />,
  yml: <IconFile size={14} />,
  ts: <IconBrandTypescript size={14} />,
  js: <IconBrandJavascript size={14} />,
  other: <IconSearch size={14} />,
};

export function ConfigToolbar({
  onSearch,
  onFilterChange,
  onZoomIn,
  onZoomOut,
  onResetView,
  onRefresh,
  isLoading,
}: ConfigToolbarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterState, setFilterState] = useState<ConfigFilterState>(DEFAULT_FILTER_STATE);

  const handleFileTypeToggle = (fileType: ConfigFileType) => {
    const newFilterState = {
      ...filterState,
      fileTypes: filterState.fileTypes.includes(fileType)
        ? filterState.fileTypes.filter((t) => t !== fileType)
        : [...filterState.fileTypes, fileType],
    };
    setFilterState(newFilterState);
    onFilterChange(newFilterState);
  };

  return (
    <Box
      style={{
        position: 'absolute',
        top: 16,
        left: 16,
        right: 16,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* Search Bar */}
      <Box style={{ display: 'flex', gap: 8 }}>
        <TextInput
          placeholder="Search configuration keys..."
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.currentTarget.value);
            onSearch(e.currentTarget.value);
          }}
          style={{ flex: 1 }}
          size="sm"
          radius="md"
          variant="filled"
        />
        <Tooltip label="Refresh">
          <ActionIcon
            variant="filled"
            size="lg"
            radius="md"
            onClick={onRefresh}
            loading={isLoading}
            style={{
              background: '#1a1a1a',
              border: '1px solid #2a2a2a',
            }}
          >
            <IconRefresh size={18} />
          </ActionIcon>
        </Tooltip>
      </Box>

      {/* Filters and Controls */}
      <Box
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          alignItems: 'center',
          background: 'rgba(26, 26, 26, 0.8)',
          backdropFilter: 'blur(8px)',
          padding: '12px 16px',
          borderRadius: '12px',
          border: '1px solid #2a2a2a',
        }}
      >
        {/* Node Type Filters */}
        <Group gap="xs" wrap="wrap">
          <Checkbox
            label="Files"
            checked={filterState.showFiles}
            onChange={(e) => {
              const newFilterState = { ...filterState, showFiles: e.currentTarget.checked };
              setFilterState(newFilterState);
              onFilterChange(newFilterState);
            }}
            size="xs"
            color="blue"
          />
          <Checkbox
            label="Environments"
            checked={filterState.showEnvironments}
            onChange={(e) => {
              const newFilterState = {
                ...filterState,
                showEnvironments: e.currentTarget.checked,
              };
              setFilterState(newFilterState);
              onFilterChange(newFilterState);
            }}
            size="xs"
            color="violet"
          />
        </Group>

        {/* File Type Filters */}
        <Group gap="xs" wrap="wrap">
          {(['json', 'toml', 'yaml', 'yml', 'ts', 'js'] as ConfigFileType[]).map((fileType) => (
            <Badge
              key={fileType}
              size="sm"
              variant={filterState.fileTypes.includes(fileType) ? 'filled' : 'outline'}
              color={filterState.fileTypes.includes(fileType) ? 'blue' : 'gray'}
              onClick={() => handleFileTypeToggle(fileType)}
              style={{
                cursor: 'pointer',
                textTransform: 'uppercase',
                fontSize: '11px',
                padding: '4px 8px',
              }}
              leftSection={fileTypeIcons[fileType]}
            >
              {fileType}
            </Badge>
          ))}
        </Group>

        {/* Zoom Controls */}
        <Group gap="xs" style={{ marginLeft: 'auto' }}>
          <Tooltip label="Zoom out">
            <ActionIcon
              variant="subtle"
              size="lg"
              radius="md"
              onClick={onZoomOut}
              style={{
                color: '#888888',
                '&:hover': {
                  background: '#1a1a1a',
                  color: '#ffffff',
                },
              }}
            >
              <IconZoomOut size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Reset view">
            <ActionIcon
              variant="subtle"
              size="lg"
              radius="md"
              onClick={onResetView}
              style={{
                color: '#888888',
                '&:hover': {
                  background: '#1a1a1a',
                  color: '#ffffff',
                },
              }}
            >
              <IconFocusCentered size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Zoom in">
            <ActionIcon
              variant="subtle"
              size="lg"
              radius="md"
              onClick={onZoomIn}
              style={{
                color: '#888888',
                '&:hover': {
                  background: '#1a1a1a',
                  color: '#ffffff',
                },
              }}
            >
              <IconZoomIn size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Box>
    </Box>
  );
}
