// Invoice Data Types (Canonical Schema)
export interface InvoiceHeader {
  invoice_number: string | null;
  vendor_name: string | null;
  campaign_name: string | null;
  invoice_date: string | null;
  billing_start_date: string | null;
  billing_end_date: string | null;
  currency: string | null;
  total_impressions: number | null;
  total_views: number | null;
  total_clicks: number | null;
  gross_revenue: number | null;
  net_revenue: number | null;
  total_discount_amount: number | null;
  discount_percent: number | null;
  profit: number | null;
}

export interface InvoiceLineItem {
  line_id: number;
  campaign_name: string | null;
  placement: string | null;
  start_date: string | null;
  end_date: string | null;
  planned_impressions: number | null;
  billed_impressions: number | null;
  views: number | null;
  clicks: number | null;
  gross_revenue: number | null;
  net_revenue: number | null;
  discount_amount: number | null;
  discount_percent: number | null;
  profit: number | null;
  rate_type: string | null;
  rate: number | null;
}

export interface InvoiceData {
  invoice_header: InvoiceHeader;
  line_items: InvoiceLineItem[];
  notes: string | null;
}

export interface InvoiceValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface InvoiceExtractionResult {
  invoice_data: InvoiceData;
  validation: InvoiceValidation;
  filepath: string;
}

export interface TrustScore {
  score: number;
  level: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
  color: string;
  severity_breakdown: {
    CRITICAL: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
  total_discrepancies: number;
  successful_matches: number;
  total_items: number;
  match_rate: number;
}

export interface ReconciliationSummary {
  total_line_items: number;
  fuzzy_matches: number;
  discrepancies: number;
  unmatched: number;
}

export interface ReconciliationResult {
  status: string;
  extracted_data: InvoiceData;
  mapping_files_count: number;
  discrepancy_report: any[];
  report_path: string | null;
  trust_score: TrustScore;
  summary: ReconciliationSummary;
}
