"""
Invoice Reconciliation Service - Phase 2
Compares extracted invoice data with internal mapping files to detect discrepancies
"""

import json
import pandas as pd
from pathlib import Path
from typing import Optional, Dict, Any, List
from difflib import SequenceMatcher


# ============================================
# MAPPING DATA LOADER
# ============================================

def load_mapping_files(mapping_folder: str = 'mapping') -> list:
    """Load all JSON mapping files from the mapping folder."""
    mapping_path = Path(mapping_folder)
    
    if not mapping_path.exists():
        print(f"⚠️  Warning: Mapping folder not found: {mapping_folder}")
        return []
    
    mapping_files = list(mapping_path.glob('*.json'))
    
    if not mapping_files:
        print(f"⚠️  Warning: No JSON files found in {mapping_folder}")
        return []
    
    mappings = []
    for file_path in mapping_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                data['_source_file'] = file_path.name
                mappings.append(data)
                print(f"✅ Loaded: {file_path.name}")
        except Exception as e:
            print(f"❌ Error loading {file_path.name}: {str(e)}")
    
    print(f"\n📂 Total mapping files loaded: {len(mappings)}")
    return mappings


def normalize_mapping_data(mapping_data: dict) -> dict:
    """Normalize mapping data to match canonical schema structure."""
    header = mapping_data.get('Header', {})
    
    normalized = {
        'invoice_header': {
            'invoice_number': (
                header.get('Invoice ID') or 
                header.get('Bill Number') or 
                header.get('Reference No.')
            ),
            'vendor_name': mapping_data.get('Vendor'),
            'invoice_date': (
                header.get('Invoice Date') or 
                header.get('Date Issued') or 
                header.get('Date')
            ),
            'currency': (
                header.get('Currency Type') or 
                header.get('Currency')
            ),
            'total_amount': (
                header.get('Total Due') or 
                header.get('Grand Total') or 
                header.get('Amount')
            ),
        },
        'line_items': [],
        '_source_file': mapping_data.get('_source_file', 'unknown'),
        '_invoice_index': mapping_data.get('InvoiceIndex')
    }
    
    line_items = mapping_data.get('LineItems', [])
    for idx, item in enumerate(line_items, 1):
        dates_str = item.get('Dates')
        normalized_item = {
            'line_id': idx,
            'campaign_name': item.get('Campaign'),
            'insertion_order_id': item.get('IO'),
            'ad_unit': item.get('Ad Unit'),
            'format': item.get('Format'),
            'booked_impressions': parse_number(item.get('Booked')),
            'billed_impressions': parse_number(item.get('Billed')),
            'clicks': parse_number(item.get('Clicks')),
            'rate': item.get('Rate'),
            'discount': item.get('Discount'),
            'net_cost': parse_currency(item.get('Net Cost')),
            'geo': item.get('Geo'),
            'dates': dates_str,
            'duration_days': parse_duration(dates_str),
            'creative': item.get('Creative'),
            'tracking': item.get('Tracking'),
            'notes': item.get('Notes'),
        }
        normalized['line_items'].append(normalized_item)
    
    return normalized


def parse_number(value) -> Optional[float]:
    """Parse string number with commas to float."""
    if value is None:
        return None
    try:
        if isinstance(value, str):
            return float(value.replace(',', ''))
        return float(value)
    except (ValueError, AttributeError):
        return None


def parse_currency(value) -> Optional[float]:
    """Parse currency string to float."""
    if value is None:
        return None
    try:
        if isinstance(value, str):
            clean_value = value.replace('$', '').replace(',', '').strip()
            return float(clean_value)
        return float(value)
    except (ValueError, AttributeError):
        return None


def parse_duration(dates_str: str) -> Optional[int]:
    """Parse duration from date range string (e.g., '2025-10-01 to 2025-10-15')."""
    if not dates_str:
        return None
    try:
        from datetime import datetime
        # Split on ' to ' and handle various formats
        parts = dates_str.replace(' - ', ' to ').split(' to ')
        if len(parts) != 2:
            return None
        
        # Try to parse dates
        start_date = datetime.strptime(parts[0].strip(), '%Y-%m-%d')
        end_date = datetime.strptime(parts[1].strip(), '%Y-%m-%d')
        
        # Calculate duration in days (inclusive)
        duration = (end_date - start_date).days + 1
        return duration if duration > 0 else None
    except (ValueError, AttributeError):
        return None


# ============================================
# FUZZY MATCHING FUNCTIONS
# ============================================

def fuzzy_string_match(str1: str, str2: str) -> float:
    """Calculate similarity ratio between two strings (0.0 to 1.0)."""
    if str1 is None or str2 is None:
        return 0.0
    s1 = str(str1).strip().lower()
    s2 = str(str2).strip().lower()
    return SequenceMatcher(None, s1, s2).ratio()


def fuzzy_number_match(num1: float, num2: float, tolerance_percent: float = 5.0) -> dict:
    """Check if two numbers are within tolerance."""
    if num1 is None or num2 is None:
        return {
            'is_match': False,
            'difference': None,
            'difference_percent': None,
            'within_tolerance': False
        }
    
    difference = abs(num1 - num2)
    base_value = max(abs(num1), abs(num2))
    
    if base_value == 0:
        difference_percent = 0.0 if difference == 0 else 100.0
    else:
        difference_percent = (difference / base_value) * 100
    
    within_tolerance = difference_percent <= tolerance_percent
    
    return {
        'is_match': within_tolerance,
        'difference': difference,
        'difference_percent': round(difference_percent, 2),
        'within_tolerance': within_tolerance
    }


def get_discrepancy_severity(percent_diff: float) -> str:
    """Determine severity based on percentage difference."""
    if percent_diff < 15:
        return 'LOW'
    elif percent_diff < 35:
        return 'MEDIUM'
    elif percent_diff < 50:
        return 'HIGH'
    else:
        return 'CRITICAL'


def compare_line_items_fuzzy(extracted: dict, mapping: dict,
                             string_threshold: float = 0.8,
                             number_tolerance: float = 5.0) -> dict:
    """Compare line items using fuzzy matching logic."""
    scores = []
    matched_fields = []
    discrepancies = []
    
    # Compare campaign name (high weight)
    campaign_similarity = fuzzy_string_match(
        extracted.get('campaign_name'),
        mapping.get('campaign_name')
    )
    if campaign_similarity >= string_threshold:
        matched_fields.append('campaign_name')
        scores.append(('campaign_name', campaign_similarity, 3.0))
    
    # Compare insertion order ID (high weight)
    io_similarity = fuzzy_string_match(
        extracted.get('insertion_order_id'),
        mapping.get('insertion_order_id')
    )
    if io_similarity >= 0.9:
        matched_fields.append('insertion_order_id')
        scores.append(('insertion_order_id', io_similarity, 3.0))
    
    # Compare numerical fields
    numerical_fields = {
        'booked_impressions': 2.0,
        'billed_impressions': 2.5,
        'clicks': 1.5,
        'net_cost': 2.5,
        'gross_revenue': 2.0,
        'net_revenue': 2.0,
        'duration_days': 2.0
    }
    
    for field, weight in numerical_fields.items():
        ext_value = extracted.get(field)
        map_value = mapping.get(field)
        
        if ext_value is not None and map_value is not None:
            match_result = fuzzy_number_match(ext_value, map_value, number_tolerance)
            
            if match_result['within_tolerance']:
                matched_fields.append(field)
                score = 1.0 - (match_result['difference_percent'] / 100)
                scores.append((field, score, weight))
            else:
                discrepancies.append({
                    'field': field,
                    'extracted_value': ext_value,
                    'mapping_value': map_value,
                    'difference': match_result['difference'],
                    'difference_percent': match_result['difference_percent'],
                    'severity': get_discrepancy_severity(match_result['difference_percent'])
                })
    
    # Compare text fields
    text_fields = {'ad_unit': 1.0, 'format': 1.0, 'geo': 1.0}
    
    for field, weight in text_fields.items():
        similarity = fuzzy_string_match(extracted.get(field), mapping.get(field))
        if similarity >= string_threshold:
            matched_fields.append(field)
            scores.append((field, similarity, weight))
        elif similarity > 0.5:
            discrepancies.append({
                'field': field,
                'extracted_value': extracted.get(field),
                'mapping_value': mapping.get(field),
                'similarity': round(similarity, 2),
                'severity': 'LOW'
            })
    
    # Calculate weighted overall score
    if scores:
        total_weighted_score = sum(score * weight for _, score, weight in scores)
        total_weight = sum(weight for _, _, weight in scores)
        overall_score = total_weighted_score / total_weight
    else:
        overall_score = 0.0
    
    return {
        'overall_score': round(overall_score, 3),
        'matched_fields': matched_fields,
        'discrepancies': discrepancies,
        'field_scores': [(field, round(score, 2)) for field, score, _ in scores]
    }


def find_fuzzy_matches(extracted_data: dict, mapping_data: list, 
                       string_threshold: float = 0.8,
                       number_tolerance: float = 5.0) -> dict:
    """Find matches using fuzzy logic for more flexible comparison."""
    results = {
        'fuzzy_matches': [],
        'potential_discrepancies': [],
        'no_match_found': []
    }
    
    extracted_items = extracted_data.get('line_items', [])
    
    for ext_item in extracted_items:
        best_match = None
        best_score = 0
        
        for mapping in mapping_data:
            for map_item in mapping.get('line_items', []):
                match_result = compare_line_items_fuzzy(
                    ext_item, 
                    map_item,
                    string_threshold,
                    number_tolerance
                )
                
                if match_result['overall_score'] > best_score:
                    best_score = match_result['overall_score']
                    best_match = {
                        'mapping_file': mapping['_source_file'],
                        'extracted_line': ext_item.get('line_id'),
                        'mapping_line': map_item.get('line_id'),
                        'campaign': ext_item.get('campaign_name'),
                        'overall_score': best_score,
                        'match_details': match_result
                    }
        
        if best_match:
            if best_score >= 0.7:
                results['fuzzy_matches'].append(best_match)
                
                discrepancies = best_match['match_details'].get('discrepancies', [])
                if discrepancies:
                    results['potential_discrepancies'].append({
                        **best_match,
                        'discrepancies': discrepancies
                    })
            else:
                results['no_match_found'].append({
                    'extracted_line': ext_item.get('line_id'),
                    'campaign': ext_item.get('campaign_name'),
                    'io': ext_item.get('insertion_order_id'),
                    'best_score': best_score,
                    'reason': 'No strong match found in mapping files'
                })
    
    return results


# ============================================
# REPORTING FUNCTIONS
# ============================================

def calculate_trust_score(fuzzy_matches: dict) -> dict:
    """
    Calculate trust score based on severity distribution using a weighted algorithm.
    
    Trust Score Formula:
    - CRITICAL discrepancies: -15 points each
    - HIGH discrepancies: -8 points each
    - MEDIUM discrepancies: -4 points each
    - LOW discrepancies: -1 point each
    - Successful matches: +2 points each
    
    Base score starts at 100, minimum is 0, maximum is 100
    """
    severity_weights = {
        'CRITICAL': -15,
        'HIGH': -8,
        'MEDIUM': -4,
        'LOW': -1
    }
    
    base_score = 100
    total_items = len(fuzzy_matches.get('fuzzy_matches', []))
    discrepancies = fuzzy_matches.get('potential_discrepancies', [])
    
    # Count severities
    severity_counts = {'CRITICAL': 0, 'HIGH': 0, 'MEDIUM': 0, 'LOW': 0}
    
    for disc in discrepancies:
        for field_disc in disc.get('discrepancies', []):
            severity = field_disc.get('severity', 'UNKNOWN')
            if severity in severity_counts:
                severity_counts[severity] += 1
    
    # Calculate deductions
    total_deduction = sum(
        severity_counts[severity] * severity_weights[severity]
        for severity in severity_counts
    )
    
    # Calculate successful matches bonus
    successful_matches = len([m for m in fuzzy_matches.get('fuzzy_matches', []) 
                              if m.get('overall_score', 0) >= 0.9])
    match_bonus = successful_matches * 2
    
    # Calculate final score
    trust_score = base_score + total_deduction + match_bonus
    trust_score = max(0, min(100, trust_score))  # Clamp between 0-100
    
    # Determine trust level
    if trust_score >= 90:
        trust_level = 'EXCELLENT'
        trust_color = 'green'
    elif trust_score >= 75:
        trust_level = 'GOOD'
        trust_color = 'blue'
    elif trust_score >= 60:
        trust_level = 'FAIR'
        trust_color = 'yellow'
    elif trust_score >= 40:
        trust_level = 'POOR'
        trust_color = 'orange'
    else:
        trust_level = 'CRITICAL'
        trust_color = 'red'
    
    return {
        'score': round(trust_score, 2),
        'level': trust_level,
        'color': trust_color,
        'severity_breakdown': severity_counts,
        'total_discrepancies': sum(severity_counts.values()),
        'successful_matches': successful_matches,
        'total_items': total_items,
        'match_rate': round((successful_matches / total_items * 100), 2) if total_items > 0 else 0
    }


def generate_discrepancy_report(fuzzy_matches: dict, vendor_name: str = None) -> pd.DataFrame:
    """Generate a detailed discrepancy report as a DataFrame with vendor information."""
    report_data = []
    
    for disc in fuzzy_matches.get('potential_discrepancies', []):
        for field_disc in disc.get('discrepancies', []):
            field_name = field_disc.get('field')
            
            # Use more descriptive field name for duration
            if field_name == 'duration_days':
                display_field = 'Incorrect Duration Days'
            else:
                display_field = field_name
            
            report_data.append({
                'Vendor Name': vendor_name or 'Unknown',
                'Source': 'Fuzzy Match',
                'Mapping File': disc.get('mapping_file'),
                'Campaign': disc.get('campaign'),
                'Line ID': disc.get('extracted_line'),
                'Field': display_field,
                'Extracted Value': field_disc.get('extracted_value'),
                'Planned Value': field_disc.get('mapping_value'),
                'Difference': field_disc.get('difference', 'N/A'),
                'Difference %': field_disc.get('difference_percent', 'N/A'),
                'Severity': field_disc.get('severity', 'UNKNOWN')
            })
    
    df = pd.DataFrame(report_data)
    
    if not df.empty:
        severity_order = {'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3, 'UNKNOWN': 4}
        df['_severity_rank'] = df['Severity'].map(severity_order)
        df = df.sort_values('_severity_rank').drop('_severity_rank', axis=1)
    
    return df


def save_discrepancy_report(df: pd.DataFrame, output_path: str = None) -> str:
    """Save discrepancy report to CSV file."""
    if output_path is None:
        timestamp = pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')
        output_path = f'output/discrepancy_report_{timestamp}.csv'
    
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False)
    return output_path


def calculate_vendor_score(vendor_name: str = None, output_folder: str = 'output') -> dict:
    """
    Calculate vendor performance score based on historical discrepancy reports.
    Reads all CSV files in output folder and aggregates vendor performance.
    
    Args:
        vendor_name: Specific vendor to calculate score for (None = all vendors)
        output_folder: Folder containing discrepancy CSV files
    
    Returns:
        Dictionary with vendor scores and statistics
    """
    output_path = Path(output_folder)
    
    if not output_path.exists():
        return {
            'error': f'Output folder not found: {output_folder}',
            'vendor_scores': []
        }
    
    # Find all CSV files
    csv_files = list(output_path.glob('discrepancy_report_*.csv'))
    
    if not csv_files:
        return {
            'message': 'No discrepancy reports found',
            'vendor_scores': []
        }
    
    # Aggregate all discrepancy data
    all_data = []
    for csv_file in csv_files:
        try:
            df = pd.read_csv(csv_file)
            # Check if Vendor Name column exists, if not skip this file
            if 'Vendor Name' not in df.columns:
                print(f"⚠️  Skipping {csv_file.name} - missing 'Vendor Name' column")
                continue
            all_data.append(df)
        except Exception as e:
            print(f"Error reading {csv_file}: {str(e)}")
    
    if not all_data:
        return {
            'message': 'No valid CSV data with Vendor Name column found',
            'vendor_scores': []
        }
    
    # Combine all data
    combined_df = pd.concat(all_data, ignore_index=True)
    
    # Filter by vendor if specified
    if vendor_name:
        combined_df = combined_df[combined_df['Vendor Name'] == vendor_name]
        if combined_df.empty:
            return {
                'message': f'No data found for vendor: {vendor_name}',
                'vendor_scores': []
            }
    
    # Calculate vendor scores
    vendor_scores = []
    
    for vendor in combined_df['Vendor Name'].unique():
        vendor_data = combined_df[combined_df['Vendor Name'] == vendor]
        
        total_discrepancies = len(vendor_data)
        severity_counts = vendor_data['Severity'].value_counts().to_dict()
        
        # Calculate weighted score (same logic as trust score but inverted)
        severity_weights = {
            'CRITICAL': -15,
            'HIGH': -8,
            'MEDIUM': -4,
            'LOW': -1
        }
        
        base_score = 100
        deductions = sum(
            severity_counts.get(severity, 0) * weight
            for severity, weight in severity_weights.items()
        )
        
        vendor_score = max(0, min(100, base_score + deductions))
        
        # Determine grade
        if vendor_score >= 90:
            grade = 'A (Excellent)'
        elif vendor_score >= 75:
            grade = 'B (Good)'
        elif vendor_score >= 60:
            grade = 'C (Fair)'
        elif vendor_score >= 40:
            grade = 'D (Poor)'
        else:
            grade = 'F (Critical)'
        
        vendor_scores.append({
            'vendor_name': vendor,
            'score': round(vendor_score, 2),
            'grade': grade,
            'total_discrepancies': total_discrepancies,
            'severity_breakdown': {
                'CRITICAL': severity_counts.get('CRITICAL', 0),
                'HIGH': severity_counts.get('HIGH', 0),
                'MEDIUM': severity_counts.get('MEDIUM', 0),
                'LOW': severity_counts.get('LOW', 0)
            },
            'reports_analyzed': len([f for f in csv_files if vendor in pd.read_csv(f)['Vendor Name'].values])
        })
    
    # Sort by score descending
    vendor_scores.sort(key=lambda x: x['score'], reverse=True)
    
    return {
        'total_vendors': len(vendor_scores),
        'total_reports_analyzed': len(csv_files),
        'vendor_scores': vendor_scores
    }


# ============================================
# MAIN RECONCILIATION WORKFLOW
# ============================================

def run_invoice_reconciliation(invoice_file_path: str, 
                               mapping_folder: str = 'mapping',
                               string_threshold: float = 0.8,
                               number_tolerance: float = 5.0,
                               save_report: bool = True) -> dict:
    """
    Complete invoice reconciliation workflow.
    
    Args:
        invoice_file_path: Path to invoice file
        mapping_folder: Folder containing mapping JSON files
        string_threshold: Minimum similarity for fuzzy string matching
        number_tolerance: Acceptable percentage difference for numbers
        save_report: Whether to save the report to file
    
    Returns:
        Dictionary with complete reconciliation results
    """
    from .invoice_extractor import extract_invoice_data
    
    # Extract invoice data
    extracted_data = extract_invoice_data(invoice_file_path)
    
    if "error" in extracted_data:
        return {"error": extracted_data, "status": "failed"}
    
    # Load mapping data
    mapping_data_raw = load_mapping_files(mapping_folder)
    
    if not mapping_data_raw:
        return {
            "status": "success",
            "extracted_data": extracted_data,
            "mapping_data": [],
            "warning": "No mapping files available",
            "discrepancy_report": [],
            "trust_score": calculate_trust_score({'fuzzy_matches': [], 'potential_discrepancies': []})
        }
    
    mapping_data = [normalize_mapping_data(m) for m in mapping_data_raw]
    
    # Run fuzzy matching
    fuzzy_matches = find_fuzzy_matches(
        extracted_data, 
        mapping_data,
        string_threshold,
        number_tolerance
    )
    
    # Calculate trust score
    trust_score = calculate_trust_score(fuzzy_matches)
    
    # Get vendor name from extracted data
    vendor_name = extracted_data.get('invoice_header', {}).get('vendor_name')
    
    # Generate report with vendor name
    discrepancy_df = generate_discrepancy_report(fuzzy_matches, vendor_name)
    
    report_path = None
    if save_report and not discrepancy_df.empty:
        report_path = save_discrepancy_report(discrepancy_df)
    
    return {
        "status": "success",
        "extracted_data": extracted_data,
        "mapping_files_count": len(mapping_data),
        "fuzzy_matches": fuzzy_matches,
        "discrepancy_report": discrepancy_df.to_dict('records') if not discrepancy_df.empty else [],
        "report_path": report_path,
        "trust_score": trust_score,
        "summary": {
            "total_line_items": len(extracted_data.get('line_items', [])),
            "fuzzy_matches": len(fuzzy_matches['fuzzy_matches']),
            "discrepancies": len(fuzzy_matches['potential_discrepancies']),
            "unmatched": len(fuzzy_matches['no_match_found'])
        }
    }
