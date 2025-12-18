import * as React from 'react'
import { useCallback, useEffect, useRef, useState, useMemo } from 'react'

export interface VirtualScrollerProps {
  /** Total number of items */
  totalItems: number
  /** Height of each item in pixels */
  itemHeight: number
  /** Container height */
  height: number
  /** Render function for each item */
  renderItem: (index: number) => React.ReactNode
  /** Number of extra items to render outside viewport (default: 5) */
  overscan?: number
  /** Current scroll position (controlled) */
  scrollIndex?: number
  /** Called when scroll position changes */
  onScrollIndexChange?: (index: number) => void
  /** Additional className */
  className?: string
}

/**
 * Simple virtual scroller that only renders visible items
 */
export function VirtualScroller({
  totalItems,
  itemHeight,
  height,
  renderItem,
  overscan = 5,
  scrollIndex,
  onScrollIndexChange,
  className = '',
}: VirtualScrollerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [internalScrollTop, setInternalScrollTop] = useState(0)

  // Use controlled scroll position if provided
  const scrollTop = scrollIndex !== undefined ? scrollIndex * itemHeight : internalScrollTop

  // Calculate visible range
  const visibleCount = Math.ceil(height / itemHeight)
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(totalItems - 1, startIndex + visibleCount + overscan * 2)

  // Total scrollable height
  const totalHeight = totalItems * itemHeight

  // Handle scroll events
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const newScrollTop = e.currentTarget.scrollTop

      if (scrollIndex === undefined) {
        setInternalScrollTop(newScrollTop)
      }

      if (onScrollIndexChange) {
        const newIndex = Math.floor(newScrollTop / itemHeight)
        onScrollIndexChange(newIndex)
      }
    },
    [scrollIndex, itemHeight, onScrollIndexChange],
  )

  // Sync scroll position when controlled
  useEffect(() => {
    if (scrollIndex !== undefined && containerRef.current) {
      const targetScrollTop = scrollIndex * itemHeight
      if (Math.abs(containerRef.current.scrollTop - targetScrollTop) > itemHeight / 2) {
        containerRef.current.scrollTop = targetScrollTop
      }
    }
  }, [scrollIndex, itemHeight])

  // Generate visible items
  const items = useMemo(() => {
    const result: React.ReactNode[] = []
    for (let i = startIndex; i <= endIndex; i++) {
      result.push(
        <div
          key={i}
          style={{
            position: 'absolute',
            top: i * itemHeight,
            left: 0,
            right: 0,
            height: itemHeight,
          }}
        >
          {renderItem(i)}
        </div>,
      )
    }
    return result
  }, [startIndex, endIndex, itemHeight, renderItem])

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>{items}</div>
    </div>
  )
}
