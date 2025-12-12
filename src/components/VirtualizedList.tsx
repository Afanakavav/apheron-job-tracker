import React from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';

interface VirtualizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight?: number;
  height?: number;
  columns?: number | { xs?: number; sm?: number; md?: number; lg?: number }; // Responsive columns
  gap?: number;
  threshold?: number; // Only use virtualization if items.length > threshold
}

/**
 * Virtualized list component for rendering large lists efficiently
 * Currently uses standard rendering (virtual scrolling will be added in future if needed)
 * Automatically switches between list and grid based on columns prop
 */
export function VirtualizedList<T>({
  items,
  renderItem,
  height = 600,
  columns = 1,
  gap = 16,
}: VirtualizedListProps<T>) {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const isSm = useMediaQuery(theme.breakpoints.down('md'));
  const isMd = useMediaQuery(theme.breakpoints.down('lg'));

  // Determine column count based on responsive prop
  let columnCount = 1;
  if (typeof columns === 'object') {
    if (isXs) {
      columnCount = columns.xs || 1;
    } else if (isSm) {
      columnCount = columns.sm || columns.xs || 1;
    } else if (isMd) {
      columnCount = columns.md || columns.sm || columns.xs || 1;
    } else {
      columnCount = columns.lg || columns.md || columns.sm || columns.xs || 1;
    }
  } else {
    columnCount = columns;
  }

  if (items.length === 0) {
    return null;
  }

  // For now, always use standard rendering
  // Virtual scrolling can be added later if needed for very large lists (1000+ items)
  if (columnCount === 1) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: gap, maxHeight: height, overflowY: 'auto' }}>
        {items.map((item, index) => (
          <Box key={index}>
            {renderItem(item, index)}
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <Box sx={{ 
      display: 'grid', 
      gridTemplateColumns: `repeat(${columnCount}, 1fr)`, 
      gap: gap,
      maxHeight: height,
      overflowY: 'auto'
    }}>
      {items.map((item, index) => (
        <Box key={index}>
          {renderItem(item, index)}
        </Box>
      ))}
    </Box>
  );
}
