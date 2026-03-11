import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { ReconciliationResult } from '../types';
import { analyzeDiscrepancy } from '../services/api';

type ReconciliationReportScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ReconciliationReport'>;
  route: RouteProp<RootStackParamList, 'ReconciliationReport'>;
};

interface DiscrepancyAnalysis {
  reasoning: string;
  remediation_plan: string;
  priority: string;
  estimated_impact: string;
}

const ReconciliationReportScreen: React.FC<ReconciliationReportScreenProps> = ({ navigation, route }) => {
  const { reconciliationData } = route.params;
  const data = reconciliationData as ReconciliationResult;

  const [selectedDiscrepancy, setSelectedDiscrepancy] = useState<any>(null);
  const [analysisModalVisible, setAnalysisModalVisible] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<DiscrepancyAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyzeDiscrepancy = async (discrepancy: any) => {
    setSelectedDiscrepancy(discrepancy);
    setIsAnalyzing(true);
    setAnalysisModalVisible(true);
    setCurrentAnalysis(null);

    try {
      const invoiceContext = {
        vendor_name: data.extracted_data?.invoice_header?.vendor_name || undefined,
        invoice_number: data.extracted_data?.invoice_header?.invoice_number || undefined,
      };

      const analysis = await analyzeDiscrepancy(discrepancy, invoiceContext);

      if (analysis.success) {
        setCurrentAnalysis({
          reasoning: analysis.reasoning,
          remediation_plan: analysis.remediation_plan,
          priority: analysis.priority,
          estimated_impact: analysis.estimated_impact,
        });
      } else {
        Alert.alert('Error', 'Failed to analyze discrepancy');
        setAnalysisModalVisible(false);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to analyze discrepancy');
      setAnalysisModalVisible(false);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const closeAnalysisModal = () => {
    setAnalysisModalVisible(false);
    setSelectedDiscrepancy(null);
    setCurrentAnalysis(null);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return '#dc3545';
      case 'HIGH':
        return '#fd7e14';
      case 'MEDIUM':
        return '#ffc107';
      case 'LOW':
        return '#28a745';
      default:
        return '#6c757d';
    }
  };

  const getTrustScoreColor = (level: string) => {
    switch (level) {
      case 'EXCELLENT':
        return '#28a745';
      case 'GOOD':
        return '#5cb85c';
      case 'FAIR':
        return '#ffc107';
      case 'POOR':
        return '#fd7e14';
      case 'CRITICAL':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  const formatAnalysisText = (text: string) => {
    // Split text into lines and format appropriately
    const lines = text.split('\n');
    const formattedElements: JSX.Element[] = [];

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      // Check for section headers (with emojis)
      if (/^[🎯💰⚠️📊⚡📋🛡️🚨]/.test(trimmedLine)) {
        formattedElements.push(
          <Text key={`header-${index}`} style={styles.analysisSectionHeader}>
            {trimmedLine}
          </Text>
        );
      }
      // Check for numbered items
      else if (/^\d+\./.test(trimmedLine)) {
        formattedElements.push(
          <Text key={`num-${index}`} style={styles.analysisNumberedItem}>
            {trimmedLine}
          </Text>
        );
      }
      // Check for bullet points
      else if (/^[•\-*]/.test(trimmedLine) || trimmedLine.startsWith('- ')) {
        formattedElements.push(
          <Text key={`bullet-${index}`} style={styles.analysisBulletItem}>
            {trimmedLine.replace(/^[-*]\s/, '• ')}
          </Text>
        );
      }
      // Regular text
      else {
        formattedElements.push(
          <Text key={`text-${index}`} style={styles.analysisRegularText}>
            {trimmedLine}
          </Text>
        );
      }
    });

    return <View>{formattedElements}</View>;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📊 Reconciliation Report</Text>
        <Text style={styles.subtitle}>Analysis Complete</Text>
      </View>

      <View style={styles.content}>
        {/* Trust Score */}
        {data.trust_score && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trust Score</Text>
            <View style={[styles.scoreCard, { borderLeftColor: getTrustScoreColor(data.trust_score.level) }]}>
              <View style={styles.scoreHeader}>
                <Text style={styles.scoreValue}>{data.trust_score.score.toFixed(1)}</Text>
                <Text style={[styles.scoreLevel, { color: getTrustScoreColor(data.trust_score.level) }]}>
                  {data.trust_score.level}
                </Text>
              </View>
              <View style={styles.scoreDetails}>
                <Text style={styles.scoreText}>
                  Match Rate: {data.trust_score.match_rate.toFixed(1)}%
                </Text>
                <Text style={styles.scoreText}>
                  Matches: {data.trust_score.successful_matches}/{data.trust_score.total_items}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Summary Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{data.mapping_files_count}</Text>
              <Text style={styles.statLabel}>Mapping Files</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#28a745' }]}>
                {data.summary.fuzzy_matches}
              </Text>
              <Text style={styles.statLabel}>Matched</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#ffc107' }]}>
                {data.summary.discrepancies}
              </Text>
              <Text style={styles.statLabel}>Discrepancies</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#dc3545' }]}>
                {data.summary.unmatched}
              </Text>
              <Text style={styles.statLabel}>Unmatched</Text>
            </View>
          </View>
        </View>

        {/* Severity Breakdown */}
        {data.trust_score && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Severity Breakdown</Text>
            <View style={styles.severityList}>
              <View style={styles.severityRow}>
                <View style={[styles.severityDot, { backgroundColor: '#dc3545' }]} />
                <Text style={styles.severityLabel}>Critical:</Text>
                <Text style={styles.severityValue}>
                  {data.trust_score.severity_breakdown.CRITICAL}
                </Text>
              </View>
              <View style={styles.severityRow}>
                <View style={[styles.severityDot, { backgroundColor: '#fd7e14' }]} />
                <Text style={styles.severityLabel}>High:</Text>
                <Text style={styles.severityValue}>
                  {data.trust_score.severity_breakdown.HIGH}
                </Text>
              </View>
              <View style={styles.severityRow}>
                <View style={[styles.severityDot, { backgroundColor: '#ffc107' }]} />
                <Text style={styles.severityLabel}>Medium:</Text>
                <Text style={styles.severityValue}>
                  {data.trust_score.severity_breakdown.MEDIUM}
                </Text>
              </View>
              <View style={styles.severityRow}>
                <View style={[styles.severityDot, { backgroundColor: '#28a745' }]} />
                <Text style={styles.severityLabel}>Low:</Text>
                <Text style={styles.severityValue}>
                  {data.trust_score.severity_breakdown.LOW}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Discrepancies */}
        {data.discrepancy_report && data.discrepancy_report.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              ⚠️ Discrepancies ({data.discrepancy_report.length})
            </Text>
            {data.discrepancy_report.slice(0, 10).map((disc: any, idx: number) => (
              <View
                key={`${disc.Campaign}-${disc.Field}-${idx}`}
                style={[
                  styles.discrepancyCard,
                  { borderLeftColor: getSeverityColor(disc.Severity) },
                ]}
              >
                <View style={styles.discrepancyHeader}>
                  <Text style={styles.discrepancyCampaign}>{disc.Campaign}</Text>
                  <View
                    style={[
                      styles.severityBadge,
                      { backgroundColor: getSeverityColor(disc.Severity) },
                    ]}
                  >
                    <Text style={styles.severityBadgeText}>{disc.Severity}</Text>
                  </View>
                </View>
                <Text style={styles.discrepancyField}>Field: {disc.Field}</Text>
                <View style={styles.discrepancyValues}>
                  <View style={styles.valueColumn}>
                    <Text style={styles.valueLabel}>Extracted:</Text>
                    <Text style={styles.valueText}>{disc['Extracted Value']}</Text>
                  </View>
                  <View style={styles.valueColumn}>
                    <Text style={styles.valueLabel}>Planned:</Text>
                    <Text style={styles.valueText}>{disc['Planned Value']}</Text>
                  </View>
                </View>
                {disc['Difference %'] !== 'N/A' && (
                  <Text style={styles.difference}>
                    Difference: {disc['Difference %']}%
                  </Text>
                )}
                
                {/* AI Analysis Button */}
                <TouchableOpacity
                  style={styles.analyzeButton}
                  onPress={() => handleAnalyzeDiscrepancy(disc)}
                >
                  <Text style={styles.analyzeButtonText}>
                    🤖 Get AI Reasoning & Remediation
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
            {data.discrepancy_report.length > 10 && (
              <Text style={styles.moreText}>
                + {data.discrepancy_report.length - 10} more discrepancies
              </Text>
            )}
          </View>
        )}

        {data.discrepancy_report && data.discrepancy_report.length === 0 && (
          <View style={styles.section}>
            <View style={styles.successCard}>
              <Text style={styles.successIcon}>✅</Text>
              <Text style={styles.successTitle}>Perfect Match!</Text>
              <Text style={styles.successText}>
                No discrepancies found. All invoice items match the planned data.
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={() => navigation.navigate('InvoiceExtractor')}
        >
          <Text style={styles.buttonText}>← Process Another Invoice</Text>
        </TouchableOpacity>
      </View>

      {/* AI Analysis Modal */}
      <Modal
        visible={analysisModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={closeAnalysisModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>AI Analysis</Text>
            <TouchableOpacity onPress={closeAnalysisModal}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {isAnalyzing && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Analyzing discrepancy...</Text>
                <Text style={styles.loadingSubtext}>
                  Our AI is reviewing the data and generating insights
                </Text>
              </View>
            )}

            {!isAnalyzing && currentAnalysis && (
              <>
                {selectedDiscrepancy && (
                  <View style={styles.analysisContext}>
                    <Text style={styles.contextTitle}>Discrepancy Details</Text>
                    <Text style={styles.contextText}>
                      Campaign: {selectedDiscrepancy.Campaign}
                    </Text>
                    <Text style={styles.contextText}>
                      Field: {selectedDiscrepancy.Field}
                    </Text>
                    <View style={styles.contextValueRow}>
                      <Text style={styles.contextText}>
                        Extracted: {selectedDiscrepancy['Extracted Value']}
                      </Text>
                      <Text style={styles.contextText}>
                        Planned: {selectedDiscrepancy['Planned Value']}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.analysisSection}>
                  <View style={styles.analysisBadgeRow}>
                    <View style={[styles.priorityBadge, getPriorityStyle(currentAnalysis.priority)]}>
                      <Text style={styles.priorityBadgeText}>
                        {currentAnalysis.priority} PRIORITY
                      </Text>
                    </View>
                    <Text style={styles.impactText}>{currentAnalysis.estimated_impact}</Text>
                  </View>

                  <View style={styles.analysisBlock}>
                    <Text style={styles.analysisBlockTitle}>🔍 Reasoning</Text>
                    {formatAnalysisText(currentAnalysis.reasoning)}
                  </View>

                  <View style={styles.analysisBlock}>
                    <Text style={styles.analysisBlockTitle}>📋 Remediation Plan</Text>
                    {formatAnalysisText(currentAnalysis.remediation_plan)}
                  </View>
                </View>
              </>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={closeAnalysisModal}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

function getPriorityStyle(priority: string) {
  switch (priority) {
    case 'URGENT':
      return { backgroundColor: '#dc3545' };
    case 'HIGH':
      return { backgroundColor: '#fd7e14' };
    case 'MEDIUM':
      return { backgroundColor: '#ffc107' };
    default:
      return { backgroundColor: '#28a745' };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  content: {
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  scoreCard: {
    borderLeftWidth: 4,
    paddingLeft: 12,
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginRight: 12,
  },
  scoreLevel: {
    fontSize: 18,
    fontWeight: '600',
  },
  scoreDetails: {
    gap: 4,
  },
  scoreText: {
    fontSize: 14,
    color: '#666',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  severityList: {
    gap: 12,
  },
  severityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  severityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  severityLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  severityValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  discrepancyCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  discrepancyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  discrepancyCampaign: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  severityBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  discrepancyField: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  discrepancyValues: {
    flexDirection: 'row',
    gap: 16,
  },
  valueColumn: {
    flex: 1,
  },
  valueLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  valueText: {
    fontSize: 13,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  difference: {
    fontSize: 12,
    color: '#dc3545',
    marginTop: 8,
    fontWeight: '600',
  },
  analyzeButton: {
    backgroundColor: '#007AFF',
    borderRadius: 6,
    padding: 10,
    marginTop: 12,
    alignItems: 'center',
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  moreText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
  },
  successCard: {
    alignItems: 'center',
    padding: 24,
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  button: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginVertical: 8,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#007AFF',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 20,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  analysisContext: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  contextTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  contextText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  contextValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  analysisSection: {
    gap: 20,
  },
  analysisBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  priorityBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  impactText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  analysisBlock: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  analysisBlockTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  analysisBlockText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
  // Analysis Text Formatting
  analysisSectionHeader: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 12,
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  analysisNumberedItem: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
    marginBottom: 6,
    fontWeight: '500',
  },
  analysisBulletItem: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
    marginBottom: 6,
    paddingLeft: 10,
  },
  analysisRegularText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
    marginBottom: 6,
  },
});

export default ReconciliationReportScreen;
