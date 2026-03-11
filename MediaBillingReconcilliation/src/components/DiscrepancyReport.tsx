import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ReconciliationResult } from '../types';
import { analyzeDiscrepancy } from '../services/campaignAPI';
import './DiscrepancyReport.css';

interface Discrepancy {
  id: number;
  campaign: string;
  line: number;
  field: string;
  invoiceValue: any;
  plannedValue: any;
  difference: any;
  differencePercent?: number;
  severity: string;
}

interface DiscrepancyAnalysis {
  reasoning: string;
  remediation_plan: string;
  priority: string;
  estimated_impact: string;
}

const DiscrepancyReport: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const reconciliationData = location.state?.reconciliationData as ReconciliationResult;

  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]);
  const [selectedDiscrepancy, setSelectedDiscrepancy] = useState<Discrepancy | null>(null);
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<DiscrepancyAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (!reconciliationData) {
      navigate('/extractor');
      return;
    }

    // Transform potential discrepancies for report
    const transformedDiscrepancies: Discrepancy[] = [];
    let idCounter = 1;

    reconciliationData.fuzzy_matches.potential_discrepancies.forEach((disc) => {
      disc.discrepancies.forEach((fieldDisc) => {
        transformedDiscrepancies.push({
          id: idCounter++,
          campaign: disc.campaign || 'N/A',
          line: disc.extracted_line,
          field: fieldDisc.field,
          invoiceValue: fieldDisc.extracted_value,
          plannedValue: fieldDisc.mapping_value,
          difference: fieldDisc.difference,
          differencePercent: fieldDisc.difference_percent,
          severity: fieldDisc.severity
        });
      });
    });

    setDiscrepancies(transformedDiscrepancies);
  }, [reconciliationData, navigate]);

  const handleExportPDF = () => {
    console.log('Exporting report as PDF...');
    alert('PDF export functionality coming soon!');
  };

  const handleExportExcel = () => {
    console.log('Exporting report as Excel...');
    alert('Excel export functionality coming soon!');
  };

  const handleStartNew = () => {
    navigate('/extractor');
  };

  const handleAnalyzeDiscrepancy = async (disc: Discrepancy) => {
    setSelectedDiscrepancy(disc);
    setIsAnalyzing(true);
    setAnalysisModalOpen(true);
    setCurrentAnalysis(null);

    try {
      const invoiceContext = {
        vendor_name: reconciliationData.extracted_data?.invoice_header?.vendor_name || undefined,
        invoice_number: reconciliationData.extracted_data?.invoice_header?.invoice_number || undefined,
      };

      const discrepancyData = {
        Campaign: disc.campaign,
        Field: disc.field,
        'Extracted Value': String(disc.invoiceValue),
        'Planned Value': String(disc.plannedValue),
        'Difference': String(disc.difference),
        'Difference %': disc.differencePercent ? String(disc.differencePercent) : 'N/A',
        Severity: disc.severity
      };

      const analysis = await analyzeDiscrepancy(discrepancyData, invoiceContext);

      if (analysis.success) {
        setCurrentAnalysis({
          reasoning: analysis.reasoning,
          remediation_plan: analysis.remediation_plan,
          priority: analysis.priority,
          estimated_impact: analysis.estimated_impact,
        });
      } else {
        alert('Failed to analyze discrepancy');
        setAnalysisModalOpen(false);
      }
    } catch (error: any) {
      alert(error.message || 'Failed to analyze discrepancy');
      setAnalysisModalOpen(false);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const closeAnalysisModal = () => {
    setAnalysisModalOpen(false);
    setSelectedDiscrepancy(null);
    setCurrentAnalysis(null);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return '#dc3545';
      case 'HIGH':
        return '#fd7e14';
      case 'MEDIUM':
        return '#ffc107';
      default:
        return '#28a745';
    }
  };

  const formatAnalysisText = (text: string): JSX.Element => {
    // Convert text to HTML with proper line breaks and formatting
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      // Check if line is a section header (contains emoji or ends with :)
      if (trimmedLine.match(/^[🎯💰⚠️📊⚡📋🛡️🚨🔍]/)) {
        elements.push(
          <div key={index} className="analysis-section-header">
            {trimmedLine}
          </div>
        );
      }
      // Check if line is a numbered item
      else if (trimmedLine.match(/^\d+\.\s/)) {
        elements.push(
          <div key={index} className="analysis-item numbered">
            {trimmedLine}
          </div>
        );
      }
      // Check if line is a bullet point
      else if (trimmedLine.match(/^[•\-\*]\s/) || trimmedLine.startsWith('- ')) {
        elements.push(
          <div key={index} className="analysis-item bullet">
            {trimmedLine.replace(/^[•\-\*]\s/, '• ')}
          </div>
        );
      }
      // Regular text
      else {
        elements.push(
          <div key={index} className="analysis-text">
            {trimmedLine}
          </div>
        );
      }
    });

    return <>{elements}</>;
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return String(value);
  };

  const getTrustScoreColor = (level: string) => {
    switch (level) {
      case 'EXCELLENT': return '#2e7d32';
      case 'GOOD': return '#1976d2';
      case 'FAIR': return '#f57f17';
      case 'POOR': return '#e65100';
      case 'CRITICAL': return '#c62828';
      default: return '#757575';
    }
  };

  const getVendorScoreColor = (score: number) => {
    if (score >= 90) return '#2e7d32'; // Green
    if (score >= 75) return '#1976d2'; // Blue
    if (score >= 60) return '#f57f17'; // Yellow
    if (score >= 40) return '#e65100'; // Orange
    return '#c62828'; // Red
  };

  if (!reconciliationData) {
    return <div>Loading...</div>;
  }

  const trustScore = reconciliationData.trust_score;
  const vendorScore = reconciliationData.vendor_score;
  const vendorName = reconciliationData.extracted_data?.invoice_header?.vendor_name || 'Unknown Vendor';

  return (
    <div className="discrepancy-report">
      <div className="report-header">
        <h1>📊 Discrepancy Report</h1>
        <p>Comprehensive reconciliation report for media billing</p>
        <div className="report-date">
          Generated on: {new Date().toLocaleString('en-US', {
            dateStyle: 'long',
            timeStyle: 'short'
          })}
        </div>
      </div>

      {/* Vendor Information */}
      <div className="vendor-info-section">
        <h2>🏢 Vendor Information</h2>
        <div className="vendor-info-container">
          <div className="vendor-name">
            <span className="vendor-label">Vendor Name:</span>
            <span className="vendor-value">{vendorName}</span>
          </div>
          {vendorScore ? (
            <div className="vendor-performance">
              <div className="vendor-score-badge" style={{ 
                borderColor: getVendorScoreColor(vendorScore.score),
                backgroundColor: `${getVendorScoreColor(vendorScore.score)}15`
              }}>
                <div className="vendor-score-circle" style={{ color: getVendorScoreColor(vendorScore.score) }}>
                  {vendorScore.score}
                </div>
                <div className="vendor-grade">{vendorScore.grade}</div>
              </div>
              <div className="vendor-stats">
                <div className="vendor-stat-item">
                  <span className="stat-label">Historical Discrepancies:</span>
                  <span className="stat-value">{vendorScore.total_discrepancies}</span>
                </div>
                <div className="vendor-stat-item">
                  <span className="stat-label">Reports Analyzed:</span>
                  <span className="stat-value">{vendorScore.reports_analyzed}</span>
                </div>
                <div className="vendor-severity-mini">
                  <span className="severity-mini critical">🔴 {vendorScore.severity_breakdown.CRITICAL}</span>
                  <span className="severity-mini high">🟠 {vendorScore.severity_breakdown.HIGH}</span>
                  <span className="severity-mini medium">🟡 {vendorScore.severity_breakdown.MEDIUM}</span>
                  <span className="severity-mini low">🟢 {vendorScore.severity_breakdown.LOW}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="vendor-no-history">
              <span className="no-history-icon">📊</span>
              <span className="no-history-text">No historical data available for this vendor yet</span>
            </div>
          )}
        </div>
      </div>

      {/* Trust Score Section */}
      <div className="trust-score-section">
        <h2>🎯 Trust Score</h2>
        <div className="trust-score-container">
          <div className="trust-score-circle" style={{ borderColor: getTrustScoreColor(trustScore.level) }}>
            <div className="trust-score-value" style={{ color: getTrustScoreColor(trustScore.level) }}>
              {trustScore.score}
            </div>
            <div className="trust-score-label">{trustScore.level}</div>
          </div>
          <div className="trust-score-details">
            <div className="trust-metric">
              <span className="metric-label">Match Rate:</span>
              <span className="metric-value">{trustScore.match_rate}%</span>
            </div>
            <div className="trust-metric">
              <span className="metric-label">Successful Matches:</span>
              <span className="metric-value">{trustScore.successful_matches} / {trustScore.total_items}</span>
            </div>
            <div className="trust-metric">
              <span className="metric-label">Total Discrepancies:</span>
              <span className="metric-value">{trustScore.total_discrepancies}</span>
            </div>
          </div>
        </div>
        
        {/* Severity Breakdown */}
        <div className="severity-breakdown">
          <h3>Severity Distribution</h3>
          <div className="severity-bars">
            <div className="severity-bar-item">
              <span className="severity-bar-label">🔴 Critical</span>
              <div className="severity-bar-container">
                <div 
                  className="severity-bar-fill critical" 
                  style={{ width: `${(trustScore.severity_breakdown.CRITICAL / trustScore.total_discrepancies * 100) || 0}%` }}
                ></div>
              </div>
              <span className="severity-bar-count">{trustScore.severity_breakdown.CRITICAL}</span>
            </div>
            <div className="severity-bar-item">
              <span className="severity-bar-label">🟠 High</span>
              <div className="severity-bar-container">
                <div 
                  className="severity-bar-fill high" 
                  style={{ width: `${(trustScore.severity_breakdown.HIGH / trustScore.total_discrepancies * 100) || 0}%` }}
                ></div>
              </div>
              <span className="severity-bar-count">{trustScore.severity_breakdown.HIGH}</span>
            </div>
            <div className="severity-bar-item">
              <span className="severity-bar-label">🟡 Medium</span>
              <div className="severity-bar-container">
                <div 
                  className="severity-bar-fill medium" 
                  style={{ width: `${(trustScore.severity_breakdown.MEDIUM / trustScore.total_discrepancies * 100) || 0}%` }}
                ></div>
              </div>
              <span className="severity-bar-count">{trustScore.severity_breakdown.MEDIUM}</span>
            </div>
            <div className="severity-bar-item">
              <span className="severity-bar-label">🟢 Low</span>
              <div className="severity-bar-container">
                <div 
                  className="severity-bar-fill low" 
                  style={{ width: `${(trustScore.severity_breakdown.LOW / trustScore.total_discrepancies * 100) || 0}%` }}
                ></div>
              </div>
              <span className="severity-bar-count">{trustScore.severity_breakdown.LOW}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="summary-section">
        <h2>📋 Executive Summary</h2>
        <div className="summary-grid">
          <div className="summary-card">
            <div className="card-icon">📝</div>
            <div className="card-content">
              <h3>Total Line Items</h3>
              <p className="card-value">{reconciliationData.summary.total_line_items}</p>
            </div>
          </div>
          <div className="summary-card success">
            <div className="card-icon">✓</div>
            <div className="card-content">
              <h3>Matched Items</h3>
              <p className="card-value">{reconciliationData.summary.fuzzy_matches}</p>
            </div>
          </div>
          <div className="summary-card warning">
            <div className="card-icon">⚠️</div>
            <div className="card-content">
              <h3>Discrepancies Found</h3>
              <p className="card-value">{discrepancies.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Discrepancy Details */}
      {discrepancies.length > 0 && (
        <div className="details-section">
          <h2>📄 Discrepancy Details</h2>
          <div className="table-container">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Line</th>
                  <th>Field</th>
                  <th>Invoice Value</th>
                  <th>Planned Value</th>
                  <th>Difference</th>
                  <th>Severity</th>
                  <th>AI Analysis</th>
                </tr>
              </thead>
              <tbody>
                {discrepancies.map((disc) => (
                  <tr key={disc.id}>
                    <td>{disc.campaign}</td>
                    <td>{disc.line}</td>
                    <td className="field-cell">{disc.field}</td>
                    <td className="value-cell">{formatValue(disc.invoiceValue)}</td>
                    <td className="value-cell">{formatValue(disc.plannedValue)}</td>
                    <td className="difference-cell">
                      {disc.differencePercent ? `${disc.differencePercent}%` : formatValue(disc.difference)}
                    </td>
                    <td className="severity-cell">
                      <span className={`severity-badge ${disc.severity.toLowerCase()}`}>
                        {disc.severity}
                      </span>
                    </td>
                    <td className="action-cell">
                      <button 
                        className="btn-analyze"
                        onClick={() => handleAnalyzeDiscrepancy(disc)}
                        title="Get AI reasoning and remediation plan"
                      >
                        🤖 Analyze
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="recommendations-section">
        <h2>💡 Recommendations</h2>
        <ul className="recommendations-list">
          {trustScore.level === 'EXCELLENT' && (
            <li>
              <span className="recommendation-icon">🎉</span>
              <span>Excellent data quality - proceed with confidence</span>
            </li>
          )}
          {trustScore.level === 'CRITICAL' && (
            <li>
              <span className="recommendation-icon">🚨</span>
              <span>Critical issues detected - immediate vendor consultation required</span>
            </li>
          )}
          {vendorScore && vendorScore.score < 60 && (
            <li>
              <span className="recommendation-icon">📊</span>
              <span>Vendor performance score is {vendorScore.grade} - consider reviewing vendor relationship or SLA requirements</span>
            </li>
          )}
          {vendorScore && vendorScore.score >= 90 && (
            <li>
              <span className="recommendation-icon">⭐</span>
              <span>Vendor has excellent historical performance ({vendorScore.grade}) - maintain strong partnership</span>
            </li>
          )}
          {vendorScore && vendorScore.severity_breakdown.CRITICAL > 0 && (
            <li>
              <span className="recommendation-icon">🔴</span>
              <span>Vendor has {vendorScore.severity_breakdown.CRITICAL} critical discrepancies in historical data - prioritize data quality discussion</span>
            </li>
          )}
          {reconciliationData.summary.unmatched > 0 && (
            <li>
              <span className="recommendation-icon">📧</span>
              <span>Investigate {reconciliationData.summary.unmatched} unmatched line items</span>
            </li>
          )}
          <li>
            <span className="recommendation-icon">📅</span>
            <span>Schedule follow-up review within 5 business days</span>
          </li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="report-actions">
        <div className="export-buttons">
          <button className="btn btn-export" onClick={handleExportPDF}>
            📄 Export as PDF
          </button>
          <button className="btn btn-export" onClick={handleExportExcel}>
            📊 Export as Excel
          </button>
        </div>
        <button className="btn btn-primary" onClick={handleStartNew}>
          Start New Reconciliation
        </button>
      </div>

      {/* AI Analysis Modal */}
      {analysisModalOpen && (
        <div className="modal-overlay" onClick={closeAnalysisModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🤖 AI Discrepancy Analysis</h2>
              <button className="modal-close" onClick={closeAnalysisModal}>×</button>
            </div>

            <div className="modal-body">
              {isAnalyzing && (
                <div className="loading-container">
                  <div className="spinner"></div>
                  <p className="loading-text">Analyzing discrepancy with AI...</p>
                  <p className="loading-subtext">Our AI is reviewing the data and generating insights</p>
                </div>
              )}

              {!isAnalyzing && currentAnalysis && selectedDiscrepancy && (
                <>
                  <div className="analysis-context">
                    <h3>Discrepancy Details</h3>
                    <div className="context-grid">
                      <div className="context-item">
                        <strong>Campaign:</strong> {selectedDiscrepancy.campaign}
                      </div>
                      <div className="context-item">
                        <strong>Field:</strong> {selectedDiscrepancy.field}
                      </div>
                      <div className="context-item">
                        <strong>Extracted:</strong> {formatValue(selectedDiscrepancy.invoiceValue)}
                      </div>
                      <div className="context-item">
                        <strong>Planned:</strong> {formatValue(selectedDiscrepancy.plannedValue)}
                      </div>
                    </div>
                  </div>

                  <div className="analysis-badges">
                    <span 
                      className="priority-badge" 
                      style={{ backgroundColor: getPriorityColor(currentAnalysis.priority) }}
                    >
                      {currentAnalysis.priority} PRIORITY
                    </span>
                    <span className="impact-badge">{currentAnalysis.estimated_impact}</span>
                  </div>

                  <div className="analysis-section">
                    <h3>🔍 Reasoning</h3>
                    <div className="analysis-content">
                      {formatAnalysisText(currentAnalysis.reasoning)}
                    </div>
                  </div>

                  <div className="analysis-section">
                    <h3>📋 Remediation Plan</h3>
                    <div className="analysis-content remediation-plan">
                      {formatAnalysisText(currentAnalysis.remediation_plan)}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-primary" onClick={closeAnalysisModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscrepancyReport;

