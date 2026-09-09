import React from 'react';
import { RotateCcw, ShieldAlert, Save } from 'lucide-react';

interface RosterDraftBarProps {
  pendingCount: number;
  conflictsCount: number;
  saving: boolean;
  onUndoAll: () => void;
  onInspectConflicts: () => void;
  onSave: () => void;
}

export const RosterDraftBar: React.FC<RosterDraftBarProps> = ({
  pendingCount,
  conflictsCount,
  saving,
  onUndoAll,
  onInspectConflicts,
  onSave,
}) => {
  if (pendingCount === 0) return null;

  return (
    <div className="roster-draft-bar" role="region" aria-label="Thao tác lưu nháp lịch phân ca">
      <div className="roster-draft-indicator">
        <span className="roster-draft-dot" />
        <span>
          <strong>{pendingCount}</strong> thay đổi chưa lưu
        </span>
      </div>

      <div className="roster-draft-actions">
        <button
          type="button"
          onClick={onUndoAll}
          disabled={saving}
          className="roster-draft-btn-undo"
          title="Hủy bỏ tất cả các thay đổi nháp trong phiên hiện tại"
        >
          <RotateCcw size={13} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '4px' }} />
          Hoàn tác tất cả
        </button>

        <button
          type="button"
          onClick={onInspectConflicts}
          className="roster-draft-btn-undo"
          style={{
            borderColor: conflictsCount > 0 ? '#F59E0B' : 'rgba(255,255,255,0.25)',
            color: conflictsCount > 0 ? '#FCD34D' : '#FFFFFF',
          }}
          title={
            conflictsCount > 0
              ? `Xem ${conflictsCount} vấn đề xung đột cần xử lý trước khi lưu`
              : 'Kiểm tra trạng thái định biên và xung đột'
          }
        >
          <ShieldAlert size={13} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '4px' }} />
          Kiểm tra lịch {conflictsCount > 0 ? `(${conflictsCount})` : ''}
        </button>

        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="roster-draft-btn-save"
          title="Lưu tất cả thay đổi phân ca lên máy chủ"
        >
          {saving ? (
            <span>Đang lưu...</span>
          ) : (
            <>
              <Save size={14} />
              <span>Lưu lịch</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
