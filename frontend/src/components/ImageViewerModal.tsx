import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, X, Eye } from 'lucide-react';

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title: string;
  subtitle?: string;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title,
  subtitle,
}) => {
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTouchDistRef = useRef<number | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const resetTransform = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (isOpen) {
      resetTransform();
    }
  }, [isOpen, resetTransform, imageUrl]);

  // Keyboard shortcut listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        setScale((s) => Math.min(s + 0.5, 5));
      } else if (e.key === '-' || e.key === '_') {
        setScale((s) => Math.max(s - 0.5, 0.5));
      } else if (e.key === '0') {
        resetTransform();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, resetTransform]);

  if (!isOpen) return null;

  const handleZoomIn = () => {
    setScale((s) => Math.min(Number((s + 0.5).toFixed(1)), 5));
  };

  const handleZoomOut = () => {
    setScale((s) => Math.max(Number((s - 0.5).toFixed(1)), 0.5));
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 0.2 : -0.2;
    setScale((s) => Math.min(Math.max(Number((s + zoomFactor).toFixed(1)), 0.5), 5));
  };

  // Mouse drag handling
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handling (pinch-to-zoom and drag)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // Double tap check
      const now = Date.now();
      if (now - lastTapTimeRef.current < 300) {
        // Toggle zoom
        if (scale > 1) {
          resetTransform();
        } else {
          setScale(2.5);
        }
      }
      lastTapTimeRef.current = now;

      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      };
      lastTouchDistRef.current = null;
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastTouchDistRef.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      setPosition({
        x: e.touches[0].clientX - dragStartRef.current.x,
        y: e.touches[0].clientY - dragStartRef.current.y,
      });
    } else if (e.touches.length === 2 && lastTouchDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const diff = dist - lastTouchDistRef.current;
      lastTouchDistRef.current = dist;
      setScale((s) => Math.min(Math.max(Number((s + diff * 0.005).toFixed(2)), 0.5), 5));
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    lastTouchDistRef.current = null;
  };

  return (
    <div
      className="image-viewer-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Trình xem phóng to ảnh công tơ"
    >
      <div className="image-viewer-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header toolbar */}
        <div className="image-viewer-header">
          <div className="viewer-title-group">
            <div className="viewer-badge">
              <Eye size={13} />
              <span>{title}</span>
            </div>
            {subtitle && <span className="viewer-subtitle">{subtitle}</span>}
          </div>
          <div className="viewer-actions">
            <span className="viewer-zoom-label">{Math.round(scale * 100)}%</span>
            <button
              type="button"
              className="viewer-btn"
              onClick={handleZoomOut}
              aria-label="Thu nhỏ"
              title="Thu nhỏ (-)"
            >
              <ZoomOut size={18} />
            </button>
            <button
              type="button"
              className="viewer-btn"
              onClick={handleZoomIn}
              aria-label="Phóng to"
              title="Phóng to (+)"
            >
              <ZoomIn size={18} />
            </button>
            <button
              type="button"
              className="viewer-btn"
              onClick={resetTransform}
              aria-label="Đặt lại kích thước"
              title="Về mặc định (0)"
            >
              <RotateCcw size={16} />
            </button>
            <button
              type="button"
              className="viewer-btn viewer-close-btn"
              onClick={onClose}
              aria-label="Đóng trình xem"
              title="Đóng (Esc)"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Viewport */}
        <div
          ref={containerRef}
          className="image-viewer-viewport"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <div
            className="image-viewer-transform"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            }}
          >
            <img
              src={imageUrl}
              alt="Ảnh công tơ kiểm tra chi tiết"
              className="image-viewer-img"
              draggable={false}
            />
          </div>
        </div>

        {/* Footer hint */}
        <div className="image-viewer-footer">
          <span>Kéo để di chuyển • Cuộn hoặc chụm 2 ngón tay để phóng to • Chạm 2 lần để chuyển đổi</span>
        </div>
      </div>
    </div>
  );
};
