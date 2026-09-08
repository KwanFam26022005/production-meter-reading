import React, { useEffect, useRef, useState } from 'react';
import { Camera, Image as ImageIcon, AlertTriangle, RefreshCw } from 'lucide-react';

interface MeterCameraProps {
  onCapture: (file: File) => void;
  onSelectGallery: (file: File) => void;
}

export const MeterCamera: React.FC<MeterCameraProps> = ({
  onCapture,
  onSelectGallery,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const [cameraReady, setCameraReady] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState<boolean>(false);

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
    setCameraReady(false);
  };

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    setIsStarting(true);

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
      } catch (firstErr: unknown) {
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

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
        setCameraReady(true);
      }
    } catch (err: unknown) {
      stopCamera();
      let msg = 'Không thể mở camera trực tiếp. Vui lòng cấp quyền hoặc chọn ảnh từ thư viện.';

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          msg = 'Trình duyệt chưa được cấp quyền Camera. Hãy mở cài đặt Safari > Cài đặt trang web > Camera > Cho phép, rồi thử lại.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          msg = 'Không tìm thấy thiết bị camera hợp lệ trên thiết bị.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          msg = 'Camera đang bị ứng dụng khác sử dụng hoặc không phản hồi. Vui lòng đóng các ứng dụng dùng camera và thử lại.';
        } else if (err.name === 'OverconstrainedError') {
          msg = 'Camera không đáp ứng cấu hình yêu cầu. Vui lòng chọn ảnh từ thư viện.';
        }
      }
      setCameraError(msg);
    } finally {
      setIsStarting(false);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const handleCapturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const width = video.videoWidth || 1920;
    const height = video.videoHeight || 1080;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Capture the FULL uncropped frame so E2 localization has the entire context
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError('Không thể chụp ảnh từ video stream. Vui lòng thử lại.');
          return;
        }

        const file = new File([blob], `meter_${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });
        stopCamera();
        onCapture(file);
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
    <div className="meter-camera-container">
      {/* Hidden File Picker Fallback */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden-input"
        onChange={handleGalleryChange}
        aria-label="Chọn ảnh công tơ từ thư viện"
      />

      <div className="screen-heading">
        <h1 className="screen-title">Đọc chỉ số công tơ</h1>
        <p className="screen-instruction">
          Đặt dãy số công tơ nằm ngang trong khung hướng dẫn để nhận diện chính xác.
        </p>
      </div>

      {cameraError ? (
        <div className="camera-permission-box">
          <AlertTriangle size={32} strokeWidth={2} className="warning-icon" />
          <h2 className="camera-err-title">Không thể mở camera trực tiếp</h2>
          <p className="camera-err-desc">{cameraError}</p>
          <div className="button-stack" style={{ marginTop: '16px' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={startCamera}
              disabled={isStarting}
              aria-label="Thử mở lại camera"
            >
              <RefreshCw size={18} strokeWidth={2} />
              {isStarting ? 'Đang khởi động...' : 'Thử lại camera'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Chọn ảnh từ thư viện"
            >
              <ImageIcon size={18} strokeWidth={1.8} />
              Chọn từ thư viện
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="meter-live-camera-viewport">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="meter-live-video"
              onLoadedMetadata={() => {
                videoRef.current?.play().catch(() => {});
                setCameraReady(true);
              }}
            />

            {/* Camera Status Badge */}
            <div className="meter-camera-status-badge">
              <span className="camera-status-dot" />
              <span>Camera sau</span>
            </div>

            {/* Fixed Alignment Overlay (Visual Aid Only - Not Burned or Cropped) */}
            <div className="meter-alignment-overlay" aria-hidden="true">
              <div className="meter-alignment-box">
                <span className="reticle-corner top-left" />
                <span className="reticle-corner top-right" />
                <span className="reticle-corner bottom-left" />
                <span className="reticle-corner bottom-right" />
                <span className="meter-alignment-label">ĐẶT DÃY SỐ TRONG KHUNG</span>
              </div>
              <span className="meter-alignment-sub">Giữ máy song song với mặt công tơ</span>
            </div>
          </div>

          <div className="button-stack" style={{ marginTop: '16px' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCapturePhoto}
              disabled={!cameraReady}
              aria-label="Chụp ảnh công tơ"
            >
              <Camera size={20} strokeWidth={2} />
              Chụp công tơ
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Chọn ảnh từ thư viện"
            >
              <ImageIcon size={18} strokeWidth={1.8} />
              Chọn từ thư viện
            </button>
          </div>
        </>
      )}
    </div>
  );
};
