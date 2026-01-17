'use client';

import * as React from 'react';
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';

export interface DataManagementProps {
  onExport: () => Promise<void>;
  onImport: (file: File) => Promise<{ success: boolean; error?: string }>;
  onReset: () => Promise<boolean>;
  totalXP?: number;
  sessionsCount?: number;
  topicsCount?: number;
}

export function DataManagement({
  onExport,
  onImport,
  onReset,
  totalXP = 0,
  sessionsCount = 0,
  topicsCount = 0,
}: DataManagementProps) {
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success, error: toastError } = useToast();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport();
      success('Export successful! Your progress has been downloaded.');
    } catch (err) {
      toastError('Export failed. Could not export your data.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const result = await onImport(file);
      if (result.success) {
        success('Import successful! Your progress has been restored.');
      } else {
        toastError(result.error || 'Import failed. Could not import the file.');
      }
    } catch (err) {
      toastError('Import failed. Invalid file format.');
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      const resetSuccess = await onReset();
      if (resetSuccess) {
        success('Progress reset. All your data has been cleared.');
      } else {
        toastError('Reset failed. Could not reset your progress.');
      }
    } catch (err) {
      toastError('Reset failed. An error occurred.');
    } finally {
      setIsResetting(false);
      setIsResetModalOpen(false);
    }
  };

  return (
    <div className="data-management">
      <h3 className="data-management-title">Data Management</h3>

      {/* Current Stats */}
      <div className="data-management-stats">
        <div className="data-management-stat">
          <span className="data-management-stat-value">{totalXP.toLocaleString()}</span>
          <span className="data-management-stat-label">Total XP</span>
        </div>
        <div className="data-management-stat">
          <span className="data-management-stat-value">{sessionsCount}</span>
          <span className="data-management-stat-label">Sessions</span>
        </div>
        <div className="data-management-stat">
          <span className="data-management-stat-value">{topicsCount}</span>
          <span className="data-management-stat-label">Topics</span>
        </div>
      </div>

      {/* Actions */}
      <div className="data-management-actions">
        <div className="data-management-action">
          <div className="data-management-action-info">
            <div className="data-management-action-title">Export Progress</div>
            <div className="data-management-action-description">
              Download your progress as a JSON file for backup
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </div>

        <div className="data-management-action">
          <div className="data-management-action-info">
            <div className="data-management-action-title">Import Progress</div>
            <div className="data-management-action-description">
              Restore progress from a previously exported file
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <Button
            variant="secondary"
            onClick={handleImportClick}
            disabled={isImporting}
          >
            {isImporting ? 'Importing...' : 'Import'}
          </Button>
        </div>

        <div className="data-management-action data-management-action-danger">
          <div className="data-management-action-info">
            <div className="data-management-action-title">Reset All Progress</div>
            <div className="data-management-action-description">
              Permanently delete all your progress and start fresh
            </div>
          </div>
          <Button
            variant="ghost"
            className="btn-danger"
            onClick={() => setIsResetModalOpen(true)}
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <Modal
        open={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
      >
        <div className="modal-header">
          <h2 className="modal-title">Reset All Progress?</h2>
        </div>
        <div className="reset-modal-content">
          <p className="reset-modal-warning">
            This action cannot be undone. All your progress, XP, and session history will be permanently deleted.
          </p>
          <div className="reset-modal-stats">
            <div>You will lose:</div>
            <ul>
              <li><strong>{totalXP.toLocaleString()}</strong> XP earned</li>
              <li><strong>{sessionsCount}</strong> practice sessions</li>
              <li><strong>{topicsCount}</strong> topics of progress</li>
            </ul>
          </div>
          <div className="reset-modal-actions">
            <Button
              variant="secondary"
              onClick={() => setIsResetModalOpen(false)}
              disabled={isResetting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="btn-danger"
              onClick={handleReset}
              disabled={isResetting}
            >
              {isResetting ? 'Resetting...' : 'Yes, Reset Everything'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default DataManagement;
