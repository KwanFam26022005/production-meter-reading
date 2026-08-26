import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, RotateCcw, Zap, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { MeterReadResponse } from './types';
import { readMeter } from './services/api';

export default function App() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<MeterReadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn file hình ảnh hợp lệ (JPG, PNG).');
      return;
    }
    setError(null);
    setResult(null);
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleReset = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setImageFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  const handleReadMeter = async () => {
    if (!imageFile) return;

    setLoading(true);
    setError(null);

    try {
      const data = await readMeter(imageFile);
      setResult(data);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Không thể kết nối tới máy chủ. Vui lòng thử lại.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1 className="header-title">
          <Zap size={24} color="#38bdf8" />
          Đọc Chỉ Số Công Tơ
        </h1>
        <p className="header-subtitle">Hệ thống nhận diện chỉ số tự động</p>
      </header>

      <main className="main-content">
        {/* Hidden inputs for camera capture & file picking */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden-input"
          onChange={handleInputChange}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="hidden-input"
          onChange={handleInputChange}
        />

        {/* STATE 1: IDLE - Select / Take Photo */}
        {!previewUrl && !loading && !result && !error && (
          <div className="home-card">
            <div className="camera-icon-wrapper">
              <Camera size={42} />
            </div>
            <h2 className="home-prompt">Chụp ảnh mặt công tơ</h2>
            <p className="home-desc">
              Hướng camera thẳng vào mặt hiển thị số của công tơ điện để nhận diện chính xác nhất.
            </p>
            <div className="file-inputs">
              <button
                type="button"
                className="btn btn-primary btn-action-large"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera size={22} />
                Chụp ảnh trực tiếp
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => galleryInputRef.current?.click()}
              >
                <ImageIcon size={20} />
                Chọn ảnh từ thư viện
              </button>
            </div>
          </div>
        )}

        {/* STATE 2: LOADING */}
        {loading && (
          <div className="loading-card">
            <div className="spinner" />
            <div>
              <p className="loading-text">Đang nhận diện chỉ số...</p>
              <p className="loading-subtext">Đang xử lý phân vùng và giải mã số công tơ</p>
            </div>
          </div>
        )}

        {/* STATE 3: PREVIEW (Image selected, ready to run inference) */}
        {previewUrl && !loading && !result && !error && (
          <div className="preview-container">
            <div className="preview-image-wrapper">
              <img src={previewUrl} alt="Ảnh công tơ xem trước" className="preview-image" />
            </div>
            <div className="button-group">
              <button
                type="button"
                className="btn btn-primary btn-action-large"
                onClick={handleReadMeter}
              >
                <Zap size={22} />
                Đọc chỉ số
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleReset}
              >
                <RotateCcw size={18} />
                Chụp lại ảnh khác
              </button>
            </div>
          </div>
        )}

        {/* STATE 4: SUCCESS RESULT */}
        {result && result.status === 'success' && !loading && (
          <div className="result-container">
            {previewUrl && (
              <div className="preview-image-wrapper" style={{ maxHeight: '180px' }}>
                <img src={previewUrl} alt="Ảnh công tơ" className="preview-image" />
              </div>
            )}
            <div className="success-card">
              <div className="reading-badge">
                <CheckCircle size={16} style={{ marginRight: '6px' }} />
                Nhận diện thành công
              </div>
              <div className="reading-value-container">
                <span className="reading-value">{result.reading}</span>
              </div>

              <div className="meta-grid">
                <div className="meta-item">
                  <div className="meta-label">Loại công tơ</div>
                  <div className="meta-val">
                    {result.meter_type === 'lcd' ? 'Điện tử (LCD)' : 'Cơ (Mechanical)'}
                  </div>
                </div>
                <div className="meta-item">
                  <div className="meta-label">Độ tin cậy OCR</div>
                  <div className="meta-val">
                    {result.ocr_confidence !== null
                      ? `${(result.ocr_confidence * 100).toFixed(1)}%`
                      : 'N/A'}
                  </div>
                </div>
                <div className="meta-item">
                  <div className="meta-label">Độ tin cậy vị trí</div>
                  <div className="meta-val">
                    {result.det_confidence !== null
                      ? `${(result.det_confidence * 100).toFixed(1)}%`
                      : 'N/A'}
                  </div>
                </div>
                <div className="meta-item">
                  <div className="meta-label">Kích thước phân giải</div>
                  <div className="meta-val">
                    {result.localization_imgsz ? `${result.localization_imgsz}px` : 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            <div className="button-group">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleReset}
              >
                <Camera size={20} />
                Đọc công tơ khác
              </button>
            </div>
          </div>
        )}

        {/* STATE 5: REVIEW RESULT */}
        {result && result.status === 'review' && !loading && (
          <div className="result-container">
            {previewUrl && (
              <div className="preview-image-wrapper" style={{ maxHeight: '180px' }}>
                <img src={previewUrl} alt="Ảnh công tơ xem lại" className="preview-image" />
              </div>
            )}
            <div className="review-card">
              <div className="review-icon-wrapper">
                <AlertTriangle size={36} />
              </div>
              <h2 className="review-title">Cần kiểm tra lại</h2>
              <p className="review-message">
                Không thể đọc chắc chắn chỉ số. Vui lòng chụp lại ảnh công tơ.
              </p>
              <div className="review-tips">
                <strong>Lưu ý khi chụp:</strong>
                <ul>
                  <li>Đảm bảo đủ ánh sáng, tránh bóng lóa</li>
                  <li>Căn chỉnh hàng số nằm ngang và rõ nét</li>
                  <li>Không bị che khuất hoặc mờ nhòe</li>
                </ul>
              </div>
            </div>

            <div className="button-group">
              <button
                type="button"
                className="btn btn-primary btn-action-large"
                onClick={handleReset}
              >
                <RotateCcw size={20} />
                Chụp lại ảnh công tơ
              </button>
            </div>
          </div>
        )}

        {/* STATE 6: ERROR */}
        {error && !loading && (
          <div className="result-container">
            <div className="error-card">
              <div className="review-icon-wrapper" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
                <AlertTriangle size={36} />
              </div>
              <h2 className="review-title" style={{ color: '#f87171' }}>Đã xảy ra sự cố</h2>
              <p className="review-message">{error}</p>
            </div>
            <div className="button-group">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleReset}
              >
                <RefreshCw size={18} />
                Thử lại
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        Production Meter Reading System &bull; v1.0
      </footer>
    </div>
  );
}
