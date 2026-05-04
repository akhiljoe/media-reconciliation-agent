import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Upload any file type (PDF, CSV, XML, Images) to backend
export const uploadFile = async (file: File): Promise<{ 
  content: string; 
  filepath: string;
  file_type: string;
  parsed_data: any;
  metadata: any;
}> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post(`${API_BASE_URL}/upload-file`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

// Legacy PDF upload (for backward compatibility)
export const uploadPDF = uploadFile;

// Extract invoice data using production notebook
export const extractInvoice = async (file: File, maxRows: number = 50): Promise<{
  invoice_data: {
    invoice_header: any;
    line_items: any[];
    notes: string | null;
  };
  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
  filepath: string;
}> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('max_rows', maxRows.toString());

  const response = await axios.post(`${API_BASE_URL}/extract-invoice`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

// Reconcile invoice data with mapping files - Phase 2
export const reconcileInvoice = async (
  extractedData: any,
  options?: {
    mapping_folder?: string;
    string_threshold?: number;
    number_tolerance?: number;
  }
): Promise<any> => {
  const response = await axios.post(`${API_BASE_URL}/reconcile-invoice`, {
    extracted_data: extractedData,
    mapping_folder: options?.mapping_folder || '../MediaBillingNotebook/mapping',
    string_threshold: options?.string_threshold || 0.8,
    number_tolerance: options?.number_tolerance || 5,
  });

  return response.data;
};

// Analyze a single discrepancy using AI
export const analyzeDiscrepancy = async (
  discrepancy: any,
  invoiceContext: { vendor_name?: string; invoice_number?: string }
): Promise<{
  success: boolean;
  reasoning: string;
  remediation_plan: string;
  priority: string;
  priority_score: number;
  estimated_impact: string;
}> => {
  const response = await axios.post(`${API_BASE_URL}/analyze-discrepancy`, {
    discrepancy,
    invoice_context: invoiceContext,
  });

  return response.data;
};

// Analyze multiple discrepancies in batch
export const analyzeDiscrepanciesBatch = async (
  discrepancies: any[],
  invoiceContext: { vendor_name?: string; invoice_number?: string },
  maxAnalyses: number = 10
): Promise<{
  success: boolean;
  analyzed_count: number;
  results: any[];
}> => {
  const response = await axios.post(`${API_BASE_URL}/analyze-discrepancies-batch`, {
    discrepancies,
    invoice_context: invoiceContext,
    max_analyses: maxAnalyses,
  });

  return response.data;
};
