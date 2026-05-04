import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { extractInvoice, reconcileInvoice } from '../services/campaignAPI';
import { InvoiceExtractionResult } from '../types';
import './InvoiceExtractor.css';

const InvoiceExtractor: React.FC = () => {
  const navigate = useNavigate();
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [isReconciling, setIsReconciling] = useState(false);
  const [extractionResult, setExtractionResult] = useState<InvoiceExtractionResult | null>(null);
  const [reconciliationResult, setReconciliationResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      setUploadedFiles(prev => [...prev, ...newFiles]);
      setExtractionResult(null);
      setError(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);
      setUploadedFiles(prev => [...prev, ...newFiles]);
      setExtractionResult(null);
      setError(null);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleReset = () => {
    setUploadedFiles([]);
    setExtractionResult(null);
    setReconciliationResult(null);
    setError(null);
    setExtractionProgress(0);
  };

  const handleExtract = async () => {
    if (uploadedFiles.length === 0) {
      setError('Please select at least one file');
      return;
    }

    setIsExtracting(true);
    setExtractionProgress(0);
    setError(null);
    setReconciliationResult(null); // Reset reconciliation when re-extracting

    // Simulate progress
    const progressInterval = setInterval(() => {
      setExtractionProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 300);

    try {
      // For now, extract the first file. In future, handle multiple files
      const result = await extractInvoice(uploadedFiles[0], 50);
      clearInterval(progressInterval);
      setExtractionProgress(100);
      setExtractionResult(result);
    } catch (err: any) {
      clearInterval(progressInterval);
      setError(err.response?.data?.error || err.message || 'Failed to extract invoice data');
      console.error('Extraction error:', err);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleReconcile = async () => {
    if (!extractionResult) {
      setError('Please extract invoice data first');
      return;
    }

    setIsReconciling(true);
    setError(null);

    try {
      const result = await reconcileInvoice(extractionResult.invoice_data, {
        mapping_folder: '../MediaBillingNotebook/mapping',
        string_threshold: 0.8,
        number_tolerance: 5
      });
      setReconciliationResult(result);
      console.log('Reconciliation result:', result);
      
      // Navigate directly to report screen with reconciliation data
      navigate('/report', { state: { reconciliationData: result } });
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to reconcile invoice');
      console.error('Reconciliation error:', err);
    } finally {
      setIsReconciling(false);
    }
  };

  const formatCurrency = (amount: number | null, currency: string | null = 'USD') => {
    if (amount === null) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount);
  };

  const formatNumber = (num: number | null) => {
    if (num === null) return '';
    return num.toLocaleString();
  };

  const formatDate = (date: string | null) => {
    if (!date) return '';
    return date;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const hasValue = (value: any): boolean => {
    return value !== null && value !== undefined && value !== '' && value !== 'N/A';
  };

  const getFileTypeIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return '📄';
      case 'xlsx':
      case 'xls': return '📊';
      case 'csv': return '📑';
      case 'eml': return '📧';
      case 'png':
      case 'jpg':
      case 'jpeg': return '🖼️';
      case 'html':
      case 'htm': return '🌐';
      case 'txt': return '📝';
      default: return '📁';
    }
  };

  return (
    <div className="invoice-extractor">
      {/* Show header only when no extraction result */}
      {!extractionResult && (
        <div className="extractor-header">
          <h1>Upload Your Invoice for Reconciliation</h1>
        </div>
      )}

      <div className="extractor-content">
        {/* Show upload section only when not extracting and no results */}
        {!isExtracting && !extractionResult && (
          <>
            {/* Supported Formats */}
            <p className="supported-formats">Supported Formats: PDF, XLS, CSV, Images (PNG/JPG), HTML, Text</p>

            {/* File Upload Section */}
            <div className="upload-section">
          <div 
            className={`file-upload-area ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              className="file-input"
              onChange={handleFileUpload}
              disabled={isExtracting}
              id="invoice-file"
              multiple
              accept=".pdf,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.html,.htm,.txt"
            />
            <label htmlFor="invoice-file" className="file-upload-label">
              <div className="upload-prompt">
                <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="upload-text">Drop files here <span className="or-text">OR</span> Browse</p>
                <p className="upload-hint">You can upload invoice file</p>
              </div>
            </label>
          </div>

          {/* File Chips */}
          {uploadedFiles.length > 0 && (
            <div className="file-chips-container">
              {uploadedFiles.map((file, index) => (
                <div key={`${file.name}-${index}`} className="file-chip">
                  <span className="file-chip-icon">{getFileTypeIcon(file.name)}</span>
                  <div className="file-chip-info">
                    <span className="file-chip-name">{file.name}</span>
                    <span className="file-chip-size">{formatFileSize(file.size)}</span>
                  </div>
                  <button 
                    className="file-chip-remove"
                    onClick={() => removeFile(index)}
                    aria-label="Remove file"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            className={`extract-button ${isExtracting ? 'extracting' : ''}`}
            onClick={handleExtract}
            disabled={uploadedFiles.length === 0 || isExtracting}
          >
            {isExtracting ? (
              <>
                <span className="spinner"></span>
                {' '}Extracting Invoice Data...
              </>
            ) : (
              'Extract Report'
            )}
          </button>
            </div>
          </>
        )}

        {/* Extraction Progress */}
        {isExtracting && (
          <div className="extraction-progress-section">
            <div className="progress-content">
              <div className="progress-icon">
                <span className="spinner-large"></span>
              </div>
              <h2>Extracting Invoice Data...</h2>
              <p className="progress-subtitle">Analyzing {uploadedFiles[0]?.name}</p>
              <div className="progress-bar-wrapper">
                <div className="progress-bar-track">
                  <div 
                    className="progress-bar-fill" 
                    style={{ width: `${extractionProgress}%` }}
                  >
                    <span className="progress-percentage">{extractionProgress}%</span>
                  </div>
                </div>
              </div>
              <p className="progress-status">
                {extractionProgress < 30 && 'Reading file contents...'}
                {extractionProgress >= 30 && extractionProgress < 60 && 'Analyzing structure...'}
                {extractionProgress >= 60 && extractionProgress < 90 && 'Extracting data fields...'}
                {extractionProgress >= 90 && 'Finalizing extraction...'}
              </p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            <p>{error}</p>
          </div>
        )}

        {/* Show validation errors/warnings inline if any */}
        {extractionResult && (extractionResult.validation.errors.length > 0 || extractionResult.validation.warnings.length > 0) && (
          <div className="inline-validation">
            {extractionResult.validation.errors.length > 0 && (
              <div className="validation-errors-inline">
                <h4>⚠️ Errors:</h4>
                <ul>
                  {extractionResult.validation.errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
            {extractionResult.validation.warnings.length > 0 && (
              <div className="validation-warnings-inline">
                <h4>⚠️ Warnings:</h4>
                <ul>
                  {extractionResult.validation.warnings.map((warn, idx) => (
                    <li key={idx}>{warn}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Invoice Header */}
        {extractionResult && extractionResult.invoice_data.invoice_header && (
          <div className="invoice-header-section">
            <h2>📄 Invoice Header</h2>
            <div className="header-grid">
              {hasValue(extractionResult.invoice_data.invoice_header.invoice_number) && (
                <div className="header-item">
                  <label>Invoice Number:</label>
                  <span>{extractionResult.invoice_data.invoice_header.invoice_number}</span>
                </div>
              )}
              {hasValue(extractionResult.invoice_data.invoice_header.vendor_name) && (
                <div className="header-item">
                  <label>Vendor:</label>
                  <span>{extractionResult.invoice_data.invoice_header.vendor_name}</span>
                </div>
              )}
              {hasValue(extractionResult.invoice_data.invoice_header.campaign_name) && (
                <div className="header-item">
                  <label>Campaign:</label>
                  <span>{extractionResult.invoice_data.invoice_header.campaign_name}</span>
                </div>
              )}
              {hasValue(extractionResult.invoice_data.invoice_header.invoice_date) && (
                <div className="header-item">
                  <label>Invoice Date:</label>
                  <span>{formatDate(extractionResult.invoice_data.invoice_header.invoice_date)}</span>
                </div>
              )}
              {(hasValue(extractionResult.invoice_data.invoice_header.billing_start_date) || hasValue(extractionResult.invoice_data.invoice_header.billing_end_date)) && (
                <div className="header-item">
                  <label>Billing Period:</label>
                  <span>
                    {formatDate(extractionResult.invoice_data.invoice_header.billing_start_date)} - {formatDate(extractionResult.invoice_data.invoice_header.billing_end_date)}
                  </span>
                </div>
              )}
              {hasValue(extractionResult.invoice_data.invoice_header.currency) && (
                <div className="header-item">
                  <label>Currency:</label>
                  <span>{extractionResult.invoice_data.invoice_header.currency}</span>
                </div>
              )}
            </div>

            {(hasValue(extractionResult.invoice_data.invoice_header.total_impressions) || 
              hasValue(extractionResult.invoice_data.invoice_header.total_views) || 
              hasValue(extractionResult.invoice_data.invoice_header.total_clicks)) && (
              <div className="metrics-section">
                <h3>📊 Delivery Metrics</h3>
                <div className="metrics-grid">
                  {hasValue(extractionResult.invoice_data.invoice_header.total_impressions) && (
                    <div className="metric-card">
                      <label>Impressions</label>
                      <span className="metric-value">
                        {formatNumber(extractionResult.invoice_data.invoice_header.total_impressions)}
                      </span>
                    </div>
                  )}
                  {hasValue(extractionResult.invoice_data.invoice_header.total_views) && (
                    <div className="metric-card">
                      <label>Views</label>
                      <span className="metric-value">
                        {formatNumber(extractionResult.invoice_data.invoice_header.total_views)}
                      </span>
                    </div>
                  )}
                  {hasValue(extractionResult.invoice_data.invoice_header.total_clicks) && (
                    <div className="metric-card">
                      <label>Clicks</label>
                      <span className="metric-value">
                        {formatNumber(extractionResult.invoice_data.invoice_header.total_clicks)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {(hasValue(extractionResult.invoice_data.invoice_header.gross_revenue) || 
              hasValue(extractionResult.invoice_data.invoice_header.net_revenue) || 
              hasValue(extractionResult.invoice_data.invoice_header.profit) || 
              hasValue(extractionResult.invoice_data.invoice_header.total_discount_amount)) && (
              <div className="financial-section">
                <h3>💰 Financial Summary</h3>
                <div className="financial-grid">
                  {hasValue(extractionResult.invoice_data.invoice_header.gross_revenue) && (
                    <div className="financial-item highlight">
                      <label>Gross Revenue:</label>
                      <span className="amount">
                        {formatCurrency(extractionResult.invoice_data.invoice_header.gross_revenue, extractionResult.invoice_data.invoice_header.currency)}
                      </span>
                    </div>
                  )}
                  {hasValue(extractionResult.invoice_data.invoice_header.total_discount_amount) && (
                    <div className="financial-item">
                      <label>Discount ({extractionResult.invoice_data.invoice_header.discount_percent || 0}%):</label>
                      <span className="amount discount">
                        -{formatCurrency(extractionResult.invoice_data.invoice_header.total_discount_amount, extractionResult.invoice_data.invoice_header.currency)}
                      </span>
                    </div>
                  )}
                  {hasValue(extractionResult.invoice_data.invoice_header.net_revenue) && (
                    <div className="financial-item highlight">
                      <label>Net Revenue:</label>
                      <span className="amount">
                        {formatCurrency(extractionResult.invoice_data.invoice_header.net_revenue, extractionResult.invoice_data.invoice_header.currency)}
                      </span>
                    </div>
                  )}
                  {hasValue(extractionResult.invoice_data.invoice_header.profit) && (
                    <div className="financial-item profit">
                      <label>Profit:</label>
                      <span className="amount">
                        {formatCurrency(extractionResult.invoice_data.invoice_header.profit, extractionResult.invoice_data.invoice_header.currency)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Line Items */}
        {extractionResult && extractionResult.invoice_data.line_items.length > 0 && (
          <div className="line-items-section">
            <h2>📋 Line Items ({extractionResult.invoice_data.line_items.length})</h2>
            <div className="table-container">
              <table className="line-items-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Campaign</th>
                    <th>Placement</th>
                    <th>Period</th>
                    <th>Impressions</th>
                    <th>Views</th>
                    <th>Clicks</th>
                    <th>Gross Revenue</th>
                    <th>Discount</th>
                    <th>Net Revenue</th>
                    <th>Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {extractionResult.invoice_data.line_items.map((item) => (
                    <tr key={item.line_id}>
                      <td>{item.line_id}</td>
                      <td>{item.campaign_name || ''}</td>
                      <td>{item.placement || ''}</td>
                      <td className="date-cell">
                        {hasValue(item.start_date) && hasValue(item.end_date) 
                          ? `${formatDate(item.start_date)} - ${formatDate(item.end_date)}`
                          : formatDate(item.start_date) || formatDate(item.end_date)}
                      </td>
                      <td className="number-cell">{formatNumber(item.billed_impressions)}</td>
                      <td className="number-cell">{formatNumber(item.views)}</td>
                      <td className="number-cell">{formatNumber(item.clicks)}</td>
                      <td className="currency-cell">
                        {formatCurrency(item.gross_revenue, extractionResult.invoice_data.invoice_header.currency)}
                      </td>
                      <td className="currency-cell discount">
                        {item.discount_amount ? `-${formatCurrency(item.discount_amount, extractionResult.invoice_data.invoice_header.currency)}` : ''}
                      </td>
                      <td className="currency-cell">
                        {formatCurrency(item.net_revenue, extractionResult.invoice_data.invoice_header.currency)}
                      </td>
                      <td className="currency-cell profit">
                        {formatCurrency(item.profit, extractionResult.invoice_data.invoice_header.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Notes */}
        {extractionResult && extractionResult.invoice_data.notes && (
          <div className="notes-section">
            <h3>📝 Notes</h3>
            <p>{extractionResult.invoice_data.notes}</p>
          </div>
        )}

        {/* Export Options */}
        {extractionResult && (
          <div className="export-section">
            <button
              className="export-button"
              onClick={() => {
                const dataStr = JSON.stringify(extractionResult.invoice_data, null, 2);
                const blob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `invoice_${extractionResult.invoice_data.invoice_header.invoice_number || 'extracted'}.json`;
                link.click();
              }}
            >
              💾 Export as JSON
            </button>
          </div>
        )}

        {/* Action Buttons */}
        {extractionResult && (
          <div className="action-buttons-section">
            <button
              className="btn btn-secondary"
              onClick={handleReset}
            >
              ← Upload New Invoice
            </button>
            <button
              className={`btn btn-primary ${isReconciling ? 'reconciling' : ''}`}
              onClick={handleReconcile}
              disabled={isReconciling}
            >
              {isReconciling ? (
                <>
                  <span className="spinner"></span>
                  {' '}Running Reconciliation...
                </>
              ) : (
                '🔍 Run Reconciliation & Generate Report'
              )}
            </button>
          </div>
        )}

        {/* Reconciliation Summary */}
        {reconciliationResult && (
          <div className="reconciliation-summary">
            <h2>📊 Reconciliation Summary</h2>
            <div className="summary-stats">
              <div className="stat-card">
                <label>Mapping Files Checked</label>
                <span className="stat-value">{reconciliationResult.mapping_files_count}</span>
              </div>
              <div className="stat-card">
                <label>Line Items Matched</label>
                <span className="stat-value success">{reconciliationResult.summary.fuzzy_matches}</span>
              </div>
              <div className="stat-card">
                <label>Discrepancies Found</label>
                <span className={`stat-value ${reconciliationResult.summary.discrepancies > 0 ? 'warning' : 'success'}`}>
                  {reconciliationResult.summary.discrepancies}
                </span>
              </div>
              <div className="stat-card">
                <label>Unmatched Items</label>
                <span className={`stat-value ${reconciliationResult.summary.unmatched > 0 ? 'error' : 'success'}`}>
                  {reconciliationResult.summary.unmatched}
                </span>
              </div>
            </div>

            {reconciliationResult.discrepancy_report.length > 0 && (
              <div className="discrepancy-preview">
                <h3>⚠️ Top Discrepancies</h3>
                <div className="table-container">
                  <table className="discrepancies-preview-table">
                    <thead>
                      <tr>
                        <th>Campaign</th>
                        <th>Field</th>
                        <th>Extracted</th>
                        <th>Planned</th>
                        <th>Difference</th>
                        <th>Severity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reconciliationResult.discrepancy_report.slice(0, 5).map((disc: any, idx: number) => (
                        <tr key={idx} className={`severity-${disc.Severity.toLowerCase()}`}>
                          <td>{disc.Campaign}</td>
                          <td>{disc.Field}</td>
                          <td>{disc['Extracted Value']}</td>
                          <td>{disc['Planned Value']}</td>
                          <td>{disc['Difference %'] !== 'N/A' ? `${disc['Difference %']}%` : disc.Difference}</td>
                          <td>
                            <span className={`severity-badge ${disc.Severity.toLowerCase()}`}>
                              {disc.Severity === 'CRITICAL' && '🔴'}
                              {disc.Severity === 'HIGH' && '🟠'}
                              {disc.Severity === 'MEDIUM' && '🟡'}
                              {disc.Severity === 'LOW' && '🟢'}
                              {' '}{disc.Severity}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {reconciliationResult.discrepancy_report.length > 5 && (
                  <p className="more-discrepancies">
                    + {reconciliationResult.discrepancy_report.length - 5} more discrepancies
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceExtractor;
