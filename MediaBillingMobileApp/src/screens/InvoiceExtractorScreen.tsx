import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { extractInvoice, reconcileInvoice } from '../services/api';
import { InvoiceExtractionResult } from '../types';

type InvoiceExtractorScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'InvoiceExtractor'>;
};

const InvoiceExtractorScreen: React.FC<InvoiceExtractorScreenProps> = ({ navigation }) => {
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [extractionResult, setExtractionResult] = useState<InvoiceExtractionResult | null>(null);

  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedFile(result.assets[0]);
        setExtractionResult(null);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick file');
      console.error('File picker error:', error);
    }
  };

  const handleExtract = async () => {
    if (!selectedFile) {
      Alert.alert('No File', 'Please select a file first');
      return;
    }

    setIsExtracting(true);
    try {
      const file = {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.mimeType || 'application/octet-stream',
      };

      const result = await extractInvoice(file, 50);
      setExtractionResult(result);
      Alert.alert('Success', 'Invoice data extracted successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || error.message || 'Failed to extract invoice');
      console.error('Extraction error:', error);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleReconcile = async () => {
    if (!extractionResult) {
      Alert.alert('No Data', 'Please extract invoice data first');
      return;
    }

    setIsReconciling(true);
    try {
      const result = await reconcileInvoice(extractionResult.invoice_data);
      navigation.navigate('ReconciliationReport', { reconciliationData: result });
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || error.message || 'Failed to reconcile invoice');
      console.error('Reconciliation error:', error);
    } finally {
      setIsReconciling(false);
    }
  };

  const formatCurrency = (amount: number | null, currency: string | null = 'USD') => {
    if (amount === null) return 'N/A';
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'USD',
      }).format(amount);
    } catch (error) {
      // Fallback if Intl is not available
      return `${currency || 'USD'} ${formatNumber(amount)}`;
    }
  };

  const formatNumber = (num: number | null) => {
    if (num === null) return 'N/A';
    // React Native safe number formatting
    const numStr = Math.abs(num).toString();
    const parts = numStr.split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const decimalPart = parts[1] ? '.' + parts[1] : '';
    return (num < 0 ? '-' : '') + integerPart + decimalPart;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📄 Invoice Extractor</Text>
        <Text style={styles.subtitle}>Upload and process invoices</Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={handleFilePick}
          disabled={isExtracting || isReconciling}
        >
          <Text style={styles.uploadIcon}>📎</Text>
          <Text style={styles.uploadText}>
            {selectedFile ? selectedFile.name : 'Select Invoice File'}
          </Text>
          <Text style={styles.uploadHint}>PDF, Excel, CSV</Text>
        </TouchableOpacity>

        {selectedFile && !extractionResult && (
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleExtract}
            disabled={isExtracting}
          >
            {isExtracting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Extract Invoice Data</Text>
            )}
          </TouchableOpacity>
        )}

        {extractionResult && (
          <View style={styles.resultsContainer}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📋 Invoice Header</Text>
              <View style={styles.infoCard}>
                {extractionResult.invoice_data.invoice_header.invoice_number && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Invoice #:</Text>
                    <Text style={styles.infoValue}>
                      {extractionResult.invoice_data.invoice_header.invoice_number}
                    </Text>
                  </View>
                )}
                {extractionResult.invoice_data.invoice_header.vendor_name && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Vendor:</Text>
                    <Text style={styles.infoValue}>
                      {extractionResult.invoice_data.invoice_header.vendor_name}
                    </Text>
                  </View>
                )}
                {extractionResult.invoice_data.invoice_header.campaign_name && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Campaign:</Text>
                    <Text style={styles.infoValue}>
                      {extractionResult.invoice_data.invoice_header.campaign_name}
                    </Text>
                  </View>
                )}
                {extractionResult.invoice_data.invoice_header.gross_revenue !== null && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Gross Revenue:</Text>
                    <Text style={[styles.infoValue, styles.currency]}>
                      {formatCurrency(
                        extractionResult.invoice_data.invoice_header.gross_revenue,
                        extractionResult.invoice_data.invoice_header.currency
                      )}
                    </Text>
                  </View>
                )}
                {extractionResult.invoice_data.invoice_header.net_revenue !== null && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Net Revenue:</Text>
                    <Text style={[styles.infoValue, styles.currency]}>
                      {formatCurrency(
                        extractionResult.invoice_data.invoice_header.net_revenue,
                        extractionResult.invoice_data.invoice_header.currency
                      )}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {extractionResult.invoice_data.invoice_header.total_impressions !== null && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📊 Metrics</Text>
                <View style={styles.metricsGrid}>
                  <View style={styles.metricCard}>
                    <Text style={styles.metricValue}>
                      {formatNumber(extractionResult.invoice_data.invoice_header.total_impressions)}
                    </Text>
                    <Text style={styles.metricLabel}>Impressions</Text>
                  </View>
                  <View style={styles.metricCard}>
                    <Text style={styles.metricValue}>
                      {formatNumber(extractionResult.invoice_data.invoice_header.total_views)}
                    </Text>
                    <Text style={styles.metricLabel}>Views</Text>
                  </View>
                  <View style={styles.metricCard}>
                    <Text style={styles.metricValue}>
                      {formatNumber(extractionResult.invoice_data.invoice_header.total_clicks)}
                    </Text>
                    <Text style={styles.metricLabel}>Clicks</Text>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                📝 Line Items ({extractionResult.invoice_data.line_items.length})
              </Text>
              <Text style={styles.infoHint}>
                {extractionResult.invoice_data.line_items.length} items extracted
              </Text>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={() => {
                  setSelectedFile(null);
                  setExtractionResult(null);
                }}
              >
                <Text style={styles.secondaryButtonText}>← New Invoice</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.primaryButton, styles.reconcileButton]}
                onPress={handleReconcile}
                disabled={isReconciling}
              >
                {isReconciling ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>🔍 Reconcile</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

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
  uploadButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#007AFF',
    marginBottom: 16,
  },
  uploadIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  uploadHint: {
    fontSize: 12,
    color: '#999',
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
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    marginTop: 16,
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
  infoCard: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  currency: {
    color: '#28a745',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  infoHint: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  reconcileButton: {
    flex: 1,
  },
});

export default InvoiceExtractorScreen;
