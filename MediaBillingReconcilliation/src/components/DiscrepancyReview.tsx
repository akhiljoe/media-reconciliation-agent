import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ReconciliationResult, DiscrepancyItem } from '../types';
import './DiscrepancyReview.css';

interface DiscrepancyWithId extends DiscrepancyItem {
  id: number;
}

const DiscrepancyReview: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const reconciliationData = location.state?.reconciliationData as ReconciliationResult;

  const [discrepancies, setDiscrepancies] = useState<DiscrepancyWithId[]>([]);

  useEffect(() => {
    if (!reconciliationData) {
      navigate('/extractor');
      return;
    }

    // Transform potential_discrepancies into discrepancies with IDs
    const transformedDiscrepancies: DiscrepancyWithId[] = [];
    let idCounter = 1;

    reconciliationData.fuzzy_matches.potential_discrepancies.forEach((disc) => {
      disc.discrepancies.forEach((fieldDisc) => {
        transformedDiscrepancies.push({
          id: idCounter++,
          mapping_file: disc.mapping_file,
          extracted_line: disc.extracted_line,
          mapping_line: disc.mapping_line,
          campaign: disc.campaign,
          overall_score: disc.overall_score,
          discrepancies: [fieldDisc]
        });
      });
    });

    setDiscrepancies(transformedDiscrepancies);
  }, [reconciliationData, navigate]);

  const handleGenerateReport = () => {
    navigate('/report', { 
      state: { 
        reconciliationData
      } 
    });
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return '🔴';
      case 'HIGH': return '🟠';
      case 'MEDIUM': return '🟡';
      case 'LOW': return '🟢';
      default: return '⚪';
    }
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return String(value);
  };

  if (!reconciliationData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="discrepancy-review">
      <div className="review-header">
        <h1>🔍 Discrepancy Review</h1>
        <p>Review discrepancies found during invoice matching</p>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <h3>Total Line Items</h3>
          <p className="card-value">{reconciliationData.summary.total_line_items}</p>
        </div>
        <div className="summary-card success">
          <h3>Matched Items</h3>
          <p className="card-value">{reconciliationData.summary.fuzzy_matches}</p>
        </div>
        <div className="summary-card warning">
          <h3>Discrepancies Found</h3>
          <p className="card-value">{discrepancies.length}</p>
        </div>
        <div className="summary-card info">
          <h3>Unmatched Items</h3>
          <p className="card-value">{reconciliationData.summary.unmatched}</p>
        </div>
      </div>

      {/* Discrepancies Table */}
      <div className="discrepancies-section">
        <h2>📋 Discrepancies Found ({discrepancies.length})</h2>
        {discrepancies.length === 0 ? (
          <div className="no-discrepancies">
            <p>✅ No discrepancies found! All line items match perfectly.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="discrepancies-table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Line</th>
                  <th>Field</th>
                  <th>Invoice Value</th>
                  <th>Planned Value</th>
                  <th>Difference</th>
                  <th>Severity</th>
                </tr>
              </thead>
              <tbody>
                {discrepancies.map((disc) => {
                  const fieldDisc = disc.discrepancies[0];
                  return (
                    <tr key={disc.id}>
                      <td className="campaign-cell">{disc.campaign || 'N/A'}</td>
                      <td>{disc.extracted_line}</td>
                      <td className="field-cell">{fieldDisc.field}</td>
                      <td className="value-cell">{formatValue(fieldDisc.extracted_value)}</td>
                      <td className="value-cell">{formatValue(fieldDisc.mapping_value)}</td>
                      <td className="difference-cell">
                        {fieldDisc.difference_percent 
                          ? `${fieldDisc.difference_percent}%` 
                          : formatValue(fieldDisc.difference)}
                      </td>
                      <td className="severity-cell">
                        <span className={`severity-badge ${fieldDisc.severity.toLowerCase()}`}>
                          {getSeverityIcon(fieldDisc.severity)} {fieldDisc.severity}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="review-actions">
        <button
          className="btn btn-secondary"
          onClick={() => navigate('/extractor')}
        >
          ← Back to Upload
        </button>
        <button
          className="btn btn-primary"
          onClick={handleGenerateReport}
        >
          Generate Final Report →
        </button>
      </div>
    </div>
  );
};

export default DiscrepancyReview;

