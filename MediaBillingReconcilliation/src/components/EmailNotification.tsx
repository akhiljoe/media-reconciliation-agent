import React, { useState } from 'react';
import './EmailNotification.css';

interface EmailNotificationProps {
  discrepancies: any[];
  invoiceContext: {
    vendor_name?: string;
    invoice_number?: string;
    invoice_date?: string;
    total_amount?: string;
  };
  onClose?: () => void;
}

interface EmailPreview {
  subject: string;
  body_html: string;
  recipient: string;
  generated_at: string;
  discrepancy_count: number;
}

const EmailNotification: React.FC<EmailNotificationProps> = ({ 
  discrepancies, 
  invoiceContext,
  onClose 
}) => {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [ccEmails, setCcEmails] = useState('');
  const [emailPreview, setEmailPreview] = useState<EmailPreview | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'compose' | 'preview' | 'sent'>('compose');

  const handleGeneratePreview = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5000/api/email/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discrepancies: discrepancies,
          invoice_context: invoiceContext,
          recipient_info: {
            email: recipientEmail || 'vendor@example.com',
            name: recipientName || 'Vendor Contact',
            company: invoiceContext.vendor_name || 'Vendor'
          }
        })
      });

      const result = await response.json();

      if (result.success) {
        setEmailPreview(result);
        setMode('preview');
      } else {
        setError(result.error || 'Failed to generate email');
      }
    } catch (err) {
      setError('Network error: Could not connect to backend');
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendEmail = async () => {
    if (!recipientEmail) {
      setError('Recipient email is required to send');
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const ccEmailsList = ccEmails
        .split(',')
        .map(e => e.trim())
        .filter(e => e.length > 0);

      const response = await fetch('http://localhost:5000/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discrepancies: discrepancies,
          invoice_context: invoiceContext,
          recipient_info: {
            email: recipientEmail,
            name: recipientName || 'Vendor Contact',
            company: invoiceContext.vendor_name || 'Vendor',
            cc_emails: ccEmailsList.length > 0 ? ccEmailsList : undefined
          }
        })
      });

      const result = await response.json();

      if (result.success) {
        setMode('sent');
        setTimeout(() => {
          if (onClose) onClose();
        }, 3000);
      } else {
        setError(result.error || result.message || 'Failed to send email');
      }
    } catch (err) {
      setError('Network error: Could not connect to backend');
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const getSeverityStats = () => {
    const stats = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      total: discrepancies.length
    };

    discrepancies.forEach(disc => {
      const severity = disc.Severity || disc.severity || 'UNKNOWN';
      if (severity in stats) {
        stats[severity as keyof typeof stats]++;
      }
    });

    return stats;
  };

  const stats = getSeverityStats();

  return (
    <div className="email-notification-modal">
      <div className="email-modal-content">
        <div className="email-modal-header">
          <h2>📧 Email Notification</h2>
          {onClose && (
            <button className="close-btn" onClick={onClose}>×</button>
          )}
        </div>

        {error && (
          <div className="error-banner">
            <strong>⚠️ Error:</strong> {error}
          </div>
        )}

        {mode === 'compose' && (
          <>
            <div className="email-summary">
              <h3>Discrepancy Summary</h3>
              <div className="summary-stats">
                <div className="stat-item">
                  <span className="stat-label">Total:</span>
                  <span className="stat-value">{stats.total}</span>
                </div>
                <div className="stat-item critical">
                  <span className="stat-label">Critical:</span>
                  <span className="stat-value">{stats.CRITICAL}</span>
                </div>
                <div className="stat-item high">
                  <span className="stat-label">High:</span>
                  <span className="stat-value">{stats.HIGH}</span>
                </div>
                <div className="stat-item medium">
                  <span className="stat-label">Medium:</span>
                  <span className="stat-value">{stats.MEDIUM}</span>
                </div>
                <div className="stat-item low">
                  <span className="stat-label">Low:</span>
                  <span className="stat-value">{stats.LOW}</span>
                </div>
              </div>
              <div className="invoice-info">
                <p><strong>Invoice:</strong> {invoiceContext.invoice_number || 'N/A'}</p>
                <p><strong>Vendor:</strong> {invoiceContext.vendor_name || 'N/A'}</p>
                <p><strong>Date:</strong> {invoiceContext.invoice_date || 'N/A'}</p>
              </div>
            </div>

            <div className="email-form">
              <div className="form-group">
                <label htmlFor="recipientEmail">
                  Recipient Email <span className="required">*</span>
                </label>
                <input
                  type="email"
                  id="recipientEmail"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="vendor@example.com"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="recipientName">Recipient Name</label>
                <input
                  type="text"
                  id="recipientName"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>

              <div className="form-group">
                <label htmlFor="ccEmails">CC Emails (comma-separated)</label>
                <input
                  type="text"
                  id="ccEmails"
                  value={ccEmails}
                  onChange={(e) => setCcEmails(e.target.value)}
                  placeholder="manager@company.com, team@company.com"
                />
              </div>
            </div>

            <div className="email-actions">
              <button
                className="btn btn-secondary"
                onClick={handleGeneratePreview}
                disabled={isGenerating}
              >
                {isGenerating ? '🔄 Generating...' : '👁️ Preview Email'}
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSendEmail}
                disabled={isSending || !recipientEmail}
              >
                {isSending ? '📤 Sending...' : '📧 Generate & Send'}
              </button>
            </div>

            <div className="info-box">
              <p>
                <strong>ℹ️ Note:</strong> The AI will generate a professional email with 
                detailed discrepancy analysis and remediation plans. 
                {!recipientEmail && ' Use Preview to see the email without sending.'}
              </p>
            </div>
          </>
        )}

        {mode === 'preview' && emailPreview && (
          <>
            <div className="email-preview">
              <div className="preview-header">
                <h3>Email Preview</h3>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => setMode('compose')}
                >
                  ← Back to Edit
                </button>
              </div>

              <div className="preview-meta">
                <div className="meta-row">
                  <strong>To:</strong> {emailPreview.recipient}
                </div>
                {ccEmails && (
                  <div className="meta-row">
                    <strong>CC:</strong> {ccEmails}
                  </div>
                )}
                <div className="meta-row">
                  <strong>Subject:</strong> {emailPreview.subject}
                </div>
                <div className="meta-row">
                  <strong>Discrepancies:</strong> {emailPreview.discrepancy_count}
                </div>
              </div>

              <div className="preview-body">
                <div 
                  className="email-html-content"
                  dangerouslySetInnerHTML={{ __html: emailPreview.body_html }}
                />
              </div>

              <div className="preview-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => setMode('compose')}
                >
                  ← Edit Recipients
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSendEmail}
                  disabled={isSending || !recipientEmail}
                >
                  {isSending ? '📤 Sending...' : '📧 Send Email'}
                </button>
              </div>
            </div>
          </>
        )}

        {mode === 'sent' && (
          <div className="success-screen">
            <div className="success-icon">✅</div>
            <h3>Email Sent Successfully!</h3>
            <p>Your discrepancy notification has been sent to:</p>
            <div className="recipient-list">
              <p><strong>{recipientEmail}</strong></p>
              {ccEmails && (
                <p className="cc-list">CC: {ccEmails}</p>
              )}
            </div>
            <button 
              className="btn btn-primary"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailNotification;
