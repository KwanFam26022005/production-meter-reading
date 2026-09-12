import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

export interface CommandPopoverSurfaceProps {
  isOpen: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  width?: number | string;
  role?: string;
  ariaLabel?: string;
  align?: 'left' | 'right' | 'center';
}

/**
 * CommandPopoverSurface (V13.2)
 *
 * Section 16 & 24:
 * - Shared anchored surface primitive for shift, search, filter, and overflow
 * - Renders outside the command bar stacking context via Portal (z-index: 60)
 * - Clamps coordinates to stay within viewport bounds
 * - Handles Escape key priority and click-outside dismissal
 * - Motion: 160-180ms opacity + translateY(4px)
 */
export const CommandPopoverSurface: React.FC<CommandPopoverSurfaceProps> = ({
  isOpen,
  anchorRef,
  onClose,
  children,
  className = '',
  width = 340,
  role = 'dialog',
  ariaLabel,
  align = 'left',
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Compute anchored viewport coordinates
  useLayoutEffect(() => {
    if (!isOpen || !anchorRef.current) return;

    const updatePosition = () => {
      if (!anchorRef.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      const popoverWidth = typeof width === 'number' ? width : 340;
      const margin = 16;
      const gap = 8;

      let left = rect.left;
      if (align === 'right') {
        left = rect.right - popoverWidth;
      } else if (align === 'center') {
        left = rect.left + rect.width / 2 - popoverWidth / 2;
      }

      // Viewport horizontal clamping
      if (left + popoverWidth > window.innerWidth - margin) {
        left = window.innerWidth - margin - popoverWidth;
      }
      if (left < margin) {
        left = margin;
      }

      const top = rect.bottom + gap;
      setCoords({ top, left });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, anchorRef, width, align]);

  // Click outside & Escape dismissal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popoverRef.current && popoverRef.current.contains(target)) return;
      if (anchorRef.current && anchorRef.current.contains(target)) return;
      onClose();
    };

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('mousedown', handleMouseDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('mousedown', handleMouseDown, true);
    };
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={popoverRef}
      className={`sgp-cmd-popover-portal ${className}`}
      role={role}
      aria-label={ariaLabel}
      style={{
        position: 'fixed',
        top: coords.top,
        left: coords.left,
        width,
        zIndex: 60, // Per Z-index contract (Section 24)
      }}
    >
      {children}
    </div>,
    document.body
  );
};
