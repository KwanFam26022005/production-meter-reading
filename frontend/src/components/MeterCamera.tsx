import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Image as ImageIcon,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  HelpCircle,
  X,
  CheckCircle2,
} from 'lucide-react';

export interface MeterCameraProps {
  meterCode?: string;
  meterName?: string;
  roundTime?: string;
  onCapture: (file: File) => void;
  onSelectGallery: (file: File) => void;
  onBack?: () => void;
}

export const MeterCamera: React.FC<MeterCameraProps> = ({
  meterCode,
  meterName,
  roundTime,
  onCapture,
  onSelectGallery,
  onBack,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef<boolean>(true);

  const [cameraReady, setCameraReady] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [capturedStillUrl, setCapturedStillUrl] = useState<string | null>(null);

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (mountedRef.current) {
      setCameraReady(false);
    }
  };

  const startCamera = async () => {
    stopCamera();
    if (!mountedRef.current) return;

    setCameraError(null);
    setIsStarting(true);
    setCameraReady(false);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Trình duyệt không hỗ trợ truy cập camera trực tiếp. Vui lòng chọn ảnh từ thư viện.');
      }

      let stream: MediaStream | null = null;

      // Primary ideal constraints (rear / environment, 1080p target)
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
      } catch {
        // Fallback constraint attempt (general environment facing)
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              facingMode: 'environment',
            },
          });
        } catch {
          // General fallback video constraint
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: true,
          });
        }
      }

      if (!mountedRef.current) {
        stream?.getTracks().forEach((t) => t.stop());
        return;
      }

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
        if (mountedRef.current) {
          setCameraReady(true);
        }
      }
    } catch (err: unknown) {
      stopCamera();
      if (!mountedRef.current) return;

      let msg = 'Không thể mở camera trực tiếp. Vui lòng cấp quyền hoặc chọn ảnh từ thư viện.';
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          msg = 'Trình duyệt chưa được cấp quyền Camera. Hãy mở cài đặt trình duyệt > Cho phép truy cập Camera, rồi thử lại.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          msg = 'Không tìm thấy thiết bị camera hợp lệ trên máy.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          msg = 'Camera đang bị ứng dụng khác sử dụng hoặc không phản hồi. Vui lòng đóng ứng dụng khác và thử lại.';
        } else if (err.name === 'OverconstrainedError') {
          msg = 'Camera không đáp ứng cấu hình yêu cầu. Vui lòng chọn ảnh từ thư viện.';
        }
      }
      setCameraError(msg);
    } finally {
      if (mountedRef.current) {
        setIsStarting(false);
        setIsCapturing(false);
      }
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    startCamera();
    return () => {
      mountedRef.current = false;
      stopCamera();
    };
  }, []);

  // Handle escape key for guide modal
  useEffect(() => {
    if (!isGuideOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsGuideOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGuideOpen]);

  const handleCapturePhoto = () => {
    // 1. Nhấn chụp & 2. Khóa thao tác chụp trùng
    if (isCapturing || !cameraReady || !videoRef.current) return;
    setIsCapturing(true);

    // Haptic feedback (calm 25ms)
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(25);
      } catch {
        // ignore
      }
    }

    // Gentle shutter feedback (non-white, calm 60ms)
    setIsFlashing(true);
    setTimeout(() => {
      if (mountedRef.current) {
        setIsFlashing(false);
      }
    }, 60);

    const video = videoRef.current;
    // 3. Tạo ảnh toàn khung từ video
    const canvas = document.createElement('canvas');
    const width = video.videoWidth || 1920;
    const height = video.videoHeight || 1080;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsCapturing(false);
      return;
    }

    // Capture the FULL uncropped frame so YOLO detector has the entire context
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          if (mountedRef.current) {
            setCameraError('Không thể chụp ảnh từ video stream. Vui lòng thử lại.');
            setIsCapturing(false);
          }
          return;
        }

        const file = new File([blob], `meter_${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });

        // 4. Chuẩn bị và xác nhận ảnh tĩnh có thể render
        const staticUrl = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          if (!mountedRef.current) {
            URL.revokeObjectURL(staticUrl);
            return;
          }
          // 5. Hiển thị ảnh tĩnh trong cùng vùng camera
          setCapturedStillUrl(staticUrl);

          // 6. Sau đó mới dừng video stream và chuyển sang Preview
          stopCamera();
          onCapture(file);
        };
        img.onerror = () => {
          if (mountedRef.current) {
            setCameraError('Không thể xử lý hình ảnh chụp. Vui lòng thử lại.');
            setIsCapturing(false);
          }
          URL.revokeObjectURL(staticUrl);
        };
        img.src = staticUrl;
      },
      'image/jpeg',
      0.92
    );
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      stopCamera();
      onSelectGallery(files[0]);
    }
  };

  return (
    <div className="focused-capture-shell" data-testid="focused-camera-shell">
      {/* Hidden File Picker Fallback */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden-input"
        onChange={handleGalleryChange}
        aria-label="Chọn ảnh công tơ từ thư viện"
        data-testid="gallery-input"
      />

      {/* 1. MINIMAL FOCUSED HEADER */}
      <header className="focused-capture-header" role="banner">
        {onBack ? (
          <button
            type="button"
            className="btn-focused-back"
            onClick={onBack}
            aria-label="Quay lại danh sách công tơ"
            title="Quay lại danh sách"
          >
            <ArrowLeft size={20} strokeWidth={2.4} />
            <span className="focused-back-text">Danh sách</span>
          </button>
        ) : (
          <div style={{ width: '44px' }} />
        )}

        <div className="focused-header-identity">
          <span className="focused-meter-code">{meterCode || 'ĐO ĐẾM CÔNG TƠ'}</span>
          {meterName && <span className="focused-meter-name">{meterName}</span>}
        </div>

        <div className="focused-header-right">
          {roundTime ? (
            <span className="focused-round-pill">Lượt {roundTime}</span>
          ) : (
            <div style={{ width: '44px' }} />
          )}
        </div>
      </header>

      {/* 2. CAMERA VIEWPORT OR ERROR */}
      <div className="focused-camera-viewport">
        {cameraError ? (
          <div className="focused-camera-error-card" role="alert">
            <div className="camera-err-icon-wrap">
              <AlertTriangle size={36} strokeWidth={2.2} className="warning-icon" />
            </div>
            <h2 className="camera-err-title">Không thể mở camera</h2>
            <p className="camera-err-desc">{cameraError}</p>

            <div className="focused-err-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={startCamera}
                disabled={isStarting}
                aria-label="Thử mở lại camera"
              >
                <RefreshCw size={18} strokeWidth={2} className={isStarting ? 'animate-spin' : ''} />
                {isStarting ? 'Đang khởi động...' : 'Thử lại camera'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Chọn ảnh từ thư viện"
              >
                <ImageIcon size={18} strokeWidth={2} />
                Chọn từ thư viện
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Live Video Feed */}
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`focused-live-video ${cameraReady ? 'is-ready' : 'is-loading'}`}
              onLoadedMetadata={() => {
                videoRef.current?.play().catch(() => {});
                if (mountedRef.current) {
                  setCameraReady(true);
                }
              }}
            />

            {/* Static captured image rendered immediately over video upon capture */}
            {capturedStillUrl && (
              <img
                src={capturedStillUrl}
                alt="Ảnh công tơ vừa chụp"
                className="focused-captured-frame"
              />
            )}

            {/* Shutter Flash Animation Overlay */}
            {isFlashing && <div className="shutter-flash-overlay" aria-hidden="true" />}

            {/* Camera Loading Spinner while video prepares */}
            {!cameraReady && !isStarting && (
              <div className="focused-camera-opening-state" role="status" aria-live="polite">
                <div className="maritime-spinner" aria-hidden="true" />
                <span className="camera-opening-text">Đang kết nối camera...</span>
              </div>
            )}

            {isStarting && (
              <div className="focused-camera-opening-state" role="status" aria-live="polite">
                <div className="maritime-spinner" aria-hidden="true" />
                <span className="camera-opening-text">Đang khởi động thiết bị...</span>
              </div>
            )}

            {/* Subtle Camera Status Pill */}
            {cameraReady && (
              <div className="focused-camera-status-pill" aria-label="Camera sau đang hoạt động">
                <span className="camera-status-dot" />
                <span>Camera sau</span>
              </div>
            )}

            {/* Visual Reticle Overlay (Presentation Only - Full Frame Invariant) */}
            {cameraReady && (
              <div className="focused-reticle-overlay" aria-hidden="true">
                <div className="focused-reticle-box">
                  <span className="reticle-corner top-left" />
                  <span className="reticle-corner top-right" />
                  <span className="reticle-corner bottom-left" />
                  <span className="reticle-corner bottom-right" />
                  <div className="focused-reticle-label-wrap">
                    <span className="focused-reticle-label">ĐẶT MẶT CÔNG TƠ VÀO KHUNG</span>
                  </div>
                </div>
                <span className="focused-reticle-hint">Giữ máy vuông góc • Ảnh chụp toàn khung</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* 3. BOTTOM CAPTURE CONTROLS */}
      {!cameraError && (
        <div className="focused-capture-controls">
          {/* Secondary Left: Gallery Picker */}
          <button
            type="button"
            className="btn-capture-utility"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Chọn ảnh từ thư viện"
            title="Thư viện ảnh"
            disabled={isCapturing}
          >
            <div className="utility-icon-circle">
              <ImageIcon size={22} strokeWidth={2} />
            </div>
            <span className="utility-label">Thư viện</span>
          </button>

          {/* Primary Center: Thumb-Friendly Shutter Button */}
          <div className="shutter-button-wrapper">
            <button
              type="button"
              className={`btn-shutter-outer ${!cameraReady || isCapturing ? 'is-disabled' : ''}`}
              onClick={handleCapturePhoto}
              disabled={!cameraReady || isCapturing}
              aria-label="Chụp ảnh công tơ"
              title="Chụp công tơ"
              data-testid="shutter-button"
            >
              <div className="btn-shutter-inner">
                <Camera size={24} strokeWidth={2.4} className="shutter-cam-icon" />
              </div>
            </button>
            <span className="shutter-label">Chụp</span>
          </div>

          {/* Secondary Right: Help / Guidance */}
          <button
            type="button"
            className="btn-capture-utility"
            onClick={() => setIsGuideOpen(true)}
            aria-label="Xem hướng dẫn chụp công tơ"
            title="Hướng dẫn chụp"
            disabled={isCapturing}
          >
            <div className="utility-icon-circle">
              <HelpCircle size={22} strokeWidth={2} />
            </div>
            <span className="utility-label">Hướng dẫn</span>
          </button>
        </div>
      )}

      {/* 4. GUIDANCE MODAL */}
      {isGuideOpen && (
        <div
          className="focused-modal-backdrop"
          onClick={() => setIsGuideOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Hướng dẫn chụp công tơ"
        >
          <div
            className="focused-guide-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="focused-guide-header">
              <div className="guide-header-title-wrap">
                <HelpCircle size={20} className="guide-header-icon" />
                <h3 className="guide-title">Hướng dẫn chụp công tơ</h3>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setIsGuideOpen(false)}
                aria-label="Đóng hướng dẫn"
              >
                <X size={18} />
              </button>
            </div>

            <div className="focused-guide-content">
              <div className="guide-item">
                <CheckCircle2 size={18} className="guide-check-icon" />
                <div>
                  <strong>Căn chỉnh mặt số:</strong> Đặt toàn bộ mặt số hoặc màn hình LCD công tơ vào giữa khung ngắm.
                </div>
              </div>

              <div className="guide-item">
                <CheckCircle2 size={18} className="guide-check-icon" />
                <div>
                  <strong>Góc chụp thẳng:</strong> Giữ điện thoại song song và vuông góc với mặt kính công tơ để tránh méo chữ số.
                </div>
              </div>

              <div className="guide-item">
                <CheckCircle2 size={18} className="guide-check-icon" />
                <div>
                  <strong>Ánh sáng & Phản quang:</strong> Tránh đèn pin hoặc ánh nắng mặt trời chiếu trực tiếp gây chói lóa mặt kính; tránh bóng người chụp che khuất số.
                </div>
              </div>

              <div className="guide-item">
                <CheckCircle2 size={18} className="guide-check-icon" />
                <div>
                  <strong>Ảnh chụp toàn khung:</strong> Khung ngắm chỉ dùng hỗ trợ thị giác. Máy luôn chụp và gửi toàn bộ ảnh gốc cho hệ thống nhận diện.
                </div>
              </div>
            </div>

            <div className="focused-guide-footer">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setIsGuideOpen(false)}
                aria-label="Đã hiểu hướng dẫn"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
