"""
Flask API Server for iPhone 17 Campaign Generator
Bridges React UI with Jupyter Notebook CrewAI agents
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import sys
import tempfile
from pathlib import Path

app = Flask(__name__)
CORS(app)

# Directory to store uploaded files
UPLOAD_FOLDER = Path(__file__).parent / 'uploads'
UPLOAD_FOLDER.mkdir(exist_ok=True)

# Add paths for imports
sys.path.append(str(Path(__file__).parent))
sys.path.append(str(Path(__file__).parent / 'utils'))
sys.path.append(str(Path(__file__).parent / 'services'))

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'iPhone 17 Campaign Generator API'
    })

@app.route('/api/upload-file', methods=['POST'])
def upload_file():
    """
    Upload file from React UI (supports PDF, CSV, XML, Images)
    Returns: Parsed content and file metadata
    """
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Save file
        file_path = UPLOAD_FOLDER / file.filename
        file.save(file_path)
        
        # Parse file using universal parser
        from utils.file_parsers import parse_file, detect_file_type
        
        file_type = detect_file_type(str(file_path))
        parse_result = parse_file(str(file_path))
        
        if not parse_result.get('success', False):
            return jsonify({
                'error': parse_result.get('error', 'File parsing failed')
            }), 400
        
        return jsonify({
            'success': True,
            'file_type': file_type,
            'content': parse_result.get('raw_content', ''),
            'parsed_data': parse_result.get('parsed_data', {}),
            'metadata': parse_result.get('metadata', {}),
            'filepath': str(file_path),
            'filename': file.filename
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/extract-invoice', methods=['POST'])
def extract_invoice():
    """
    Extract structured invoice data using production notebook logic
    Accepts: file (multipart) OR filepath (JSON)
    Returns: Canonical invoice JSON with validation results
    """
    try:
        # Support both file upload and filepath
        if 'file' in request.files:
            file = request.files['file']
            
            if file.filename == '':
                return jsonify({'error': 'No file selected'}), 400
            
            # Save uploaded file
            file_path = UPLOAD_FOLDER / file.filename
            file.save(file_path)
            filepath = str(file_path)
            
            # Extract max_rows from form data when using multipart
            max_rows = int(request.form.get('max_rows', 50))
        
        elif request.is_json and request.json and 'filepath' in request.json:
            filepath = request.json['filepath']
            
            if not Path(filepath).exists():
                return jsonify({'error': f'File not found: {filepath}'}), 404
            
            # Extract max_rows from JSON when using filepath
            max_rows = request.json.get('max_rows', 50)
        
        else:
            return jsonify({'error': 'No file or filepath provided'}), 400
        
        # Import invoice extractor
        from services.invoice_extractor import extract_invoice_data, validate_extracted_data
        
        # Extract invoice data
        print(f"🔍 Extracting invoice from: {filepath}")
        invoice_data = extract_invoice_data(filepath, max_rows=max_rows)
        
        # Validate extracted data
        validation = validate_extracted_data(invoice_data)
        
        return jsonify({
            'success': True,
            'invoice_data': invoice_data,
            'validation': validation,
            'filepath': filepath
        })
    
    except Exception as e:
        import traceback
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@app.route('/api/reconcile-invoice', methods=['POST'])
def reconcile_invoice():
    """
    Run complete invoice reconciliation workflow - Phase 2
    Accepts: extracted_data (JSON) OR filepath (will extract first)
    Returns: Reconciliation results with discrepancy report
    """
    try:
        # Import reconciliation functions
        from services.invoice_reconciliation import run_invoice_reconciliation
        
        # Support both pre-extracted data and filepath
        if request.is_json and 'extracted_data' in request.json:
            # Use pre-extracted data
            extracted_data = request.json['extracted_data']
            mapping_folder = request.json.get('mapping_folder', '../MediaBillingNotebook/mapping')
            string_threshold = request.json.get('string_threshold', 0.8)
            number_tolerance = request.json.get('number_tolerance', 5.0)
            
            # Import reconciliation module functions
            from services.invoice_reconciliation import (
                load_mapping_files, normalize_mapping_data, 
                find_fuzzy_matches, generate_discrepancy_report, 
                save_discrepancy_report, calculate_trust_score
            )
            
            # Load and normalize mapping data
            mapping_data_raw = load_mapping_files(mapping_folder)
            if not mapping_data_raw:
                return jsonify({
                    'success': False,
                    'error': 'No mapping files found'
                }), 404
            
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
            if not discrepancy_df.empty:
                report_path = save_discrepancy_report(discrepancy_df)
            
            # Calculate vendor score from historical data
            from services.invoice_reconciliation import calculate_vendor_score
            vendor_score = None
            if vendor_name:
                try:
                    vendor_score_result = calculate_vendor_score(vendor_name, 'output')
                    if 'vendor_scores' in vendor_score_result and vendor_score_result['vendor_scores']:
                        vendor_score = vendor_score_result['vendor_scores'][0]
                except Exception as e:
                    print(f"⚠️  Warning: Could not calculate vendor score: {str(e)}")
                    # Continue without vendor score - don't fail the whole reconciliation
            
            return jsonify({
                'success': True,
                'status': 'success',
                'extracted_data': extracted_data,
                'mapping_files_count': len(mapping_data),
                'fuzzy_matches': fuzzy_matches,
                'discrepancy_report': discrepancy_df.to_dict('records') if not discrepancy_df.empty else [],
                'report_path': report_path,
                'trust_score': trust_score,
                'vendor_score': vendor_score,
                'summary': {
                    'total_line_items': len(extracted_data.get('line_items', [])),
                    'fuzzy_matches': len(fuzzy_matches['fuzzy_matches']),
                    'discrepancies': len(fuzzy_matches['potential_discrepancies']),
                    'unmatched': len(fuzzy_matches['no_match_found'])
                }
            })
        
        elif request.is_json and 'filepath' in request.json:
            # Extract and reconcile
            filepath = request.json['filepath']
            if not Path(filepath).exists():
                return jsonify({'error': f'File not found: {filepath}'}), 404
            
            mapping_folder = request.json.get('mapping_folder', '../MediaBillingNotebook/mapping')
            string_threshold = request.json.get('string_threshold', 0.8)
            number_tolerance = request.json.get('number_tolerance', 5.0)
            
            results = run_invoice_reconciliation(
                filepath,
                mapping_folder,
                string_threshold,
                number_tolerance,
                save_report=True
            )
            
            return jsonify({
                'success': True,
                **results
            })
        
        else:
            return jsonify({'error': 'Either extracted_data or filepath required'}), 400
    
    except Exception as e:
        import traceback
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@app.route('/api/vendor-scores', methods=['GET'])
def get_vendor_scores():
    """
    Calculate vendor performance scores based on historical discrepancy reports.
    Query params:
        - vendor_name (optional): Filter by specific vendor
        - output_folder (optional): Custom output folder path (default: 'output')
    Returns: Vendor scores and statistics from audit trail CSVs
    """
    try:
        from services.invoice_reconciliation import calculate_vendor_score
        
        vendor_name = request.args.get('vendor_name')
        output_folder = request.args.get('output_folder', 'output')
        
        # Calculate vendor scores
        results = calculate_vendor_score(vendor_name, output_folder)
        
        return jsonify({
            'success': True,
            **results
        })
    
    except Exception as e:
        import traceback
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@app.route('/api/analyze-discrepancy', methods=['POST'])
def analyze_discrepancy():
    """
    Analyze a single discrepancy using AI to provide reasoning and remediation plan.
    Body:
        - discrepancy: Dict with Campaign, Field, values, severity
        - invoice_context: Dict with vendor_name, invoice_number (optional)
    Returns: Analysis with reasoning, remediation plan, priority
    """
    try:
        from services.discrepancy_agent import analyze_single_discrepancy
        
        if not request.is_json:
            return jsonify({'error': 'Request must be JSON'}), 400
        
        discrepancy = request.json.get('discrepancy')
        invoice_context = request.json.get('invoice_context', {})
        
        if not discrepancy:
            return jsonify({'error': 'discrepancy data required'}), 400
        
        # Run AI analysis
        analysis = analyze_single_discrepancy(discrepancy, invoice_context)
        
        return jsonify(analysis)
    
    except Exception as e:
        import traceback
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@app.route('/api/analyze-discrepancies-batch', methods=['POST'])
def analyze_discrepancies_batch():
    """
    Analyze multiple discrepancies using AI (batch processing).
    Body:
        - discrepancies: List of discrepancy dicts
        - invoice_context: Dict with vendor_name, invoice_number
        - max_analyses: Max number to analyze with AI (default: 10, for cost control)
    Returns: List of analyzed discrepancies with reasoning and remediation
    """
    try:
        from services.discrepancy_agent import analyze_batch_discrepancies
        
        if not request.is_json:
            return jsonify({'error': 'Request must be JSON'}), 400
        
        discrepancies = request.json.get('discrepancies', [])
        invoice_context = request.json.get('invoice_context', {})
        max_analyses = request.json.get('max_analyses', 10)
        
        if not discrepancies:
            return jsonify({'error': 'discrepancies list required'}), 400
        
        # Run batch analysis
        results = analyze_batch_discrepancies(
            discrepancies,
            invoice_context,
            max_analyses=max_analyses
        )
        
        return jsonify({
            'success': True,
            'analyzed_count': len(results),
            'results': results
        })
    
    except Exception as e:
        import traceback
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@app.route('/api/email/generate', methods=['POST'])
def generate_discrepancy_email():
    """
    Generate email notification for discrepancies (preview mode).
    Body:
        - discrepancies: List of discrepancy records
        - invoice_context: Invoice metadata (vendor_name, invoice_number, etc.)
        - recipient_info: Dict with email, name, company, role
    Returns: Generated email with subject and HTML body for preview
    """
    try:
        from services.email_service import send_discrepancy_email
        
        if not request.is_json:
            return jsonify({'error': 'Request must be JSON'}), 400
        
        discrepancies = request.json.get('discrepancies', [])
        invoice_context = request.json.get('invoice_context', {})
        recipient_info = request.json.get('recipient_info', {})
        
        if not discrepancies:
            return jsonify({'error': 'discrepancies list required'}), 400
        
        # Generate email in preview mode
        result = send_discrepancy_email(
            discrepancies=discrepancies,
            invoice_context=invoice_context,
            recipient_info=recipient_info,
            send_mode='preview'
        )
        
        return jsonify(result)
    
    except Exception as e:
        import traceback
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@app.route('/api/email/send', methods=['POST'])
def send_discrepancy_email_smtp():
    """
    Send email notification for discrepancies via SMTP.
    Body:
        - discrepancies: List of discrepancy records
        - invoice_context: Invoice metadata
        - recipient_info: Dict with email (required), name, company, role, cc_emails
        - attachments: Optional list of file paths to attach
        - smtp_config: Optional SMTP configuration (overrides env vars)
    Returns: Email send status and delivery confirmation
    """
    try:
        from services.email_service import send_discrepancy_email
        
        if not request.is_json:
            return jsonify({'error': 'Request must be JSON'}), 400
        
        discrepancies = request.json.get('discrepancies', [])
        invoice_context = request.json.get('invoice_context', {})
        recipient_info = request.json.get('recipient_info', {})
        attachments = request.json.get('attachments', [])
        smtp_config = request.json.get('smtp_config')
        
        if not discrepancies:
            return jsonify({'error': 'discrepancies list required'}), 400
        
        if not recipient_info.get('email'):
            return jsonify({'error': 'recipient email address required'}), 400
        
        # Send email via SMTP
        result = send_discrepancy_email(
            discrepancies=discrepancies,
            invoice_context=invoice_context,
            recipient_info=recipient_info,
            send_mode='send',
            attachments=attachments,
            smtp_config=smtp_config
        )
        
        return jsonify(result)
    
    except Exception as e:
        import traceback
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@app.route('/api/email/send-all-discrepancies', methods=['POST'])
def send_all_discrepancies_email():
    """
    Generate and send email for all discrepancies from a reconciliation report.
    Convenient endpoint that combines reconciliation results with email sending.
    Body:
        - report_path: Path to CSV report (optional if discrepancies provided)
        - discrepancies: List of discrepancy records (optional if report_path provided)
        - invoice_context: Invoice metadata
        - recipient_info: Recipient details with email
        - send_mode: 'preview' or 'send' (default: preview)
        - attach_report: Boolean to attach CSV report (default: true)
    Returns: Email generation/send result
    """
    try:
        import pandas as pd
        from services.email_service import send_discrepancy_email
        
        if not request.is_json:
            return jsonify({'error': 'Request must be JSON'}), 400
        
        report_path = request.json.get('report_path')
        discrepancies = request.json.get('discrepancies', [])
        invoice_context = request.json.get('invoice_context', {})
        recipient_info = request.json.get('recipient_info', {})
        send_mode = request.json.get('send_mode', 'preview')
        attach_report = request.json.get('attach_report', True)
        
        # Load discrepancies from CSV if path provided
        if report_path and not discrepancies:
            if not Path(report_path).exists():
                return jsonify({'error': f'Report file not found: {report_path}'}), 404
            
            df = pd.read_csv(report_path)
            discrepancies = df.to_dict('records')
        
        if not discrepancies:
            return jsonify({'error': 'No discrepancies found to send'}), 400
        
        # Prepare attachments
        attachments = []
        if attach_report and report_path and Path(report_path).exists():
            attachments.append(report_path)
        
        # Send email
        result = send_discrepancy_email(
            discrepancies=discrepancies,
            invoice_context=invoice_context,
            recipient_info=recipient_info,
            send_mode=send_mode,
            attachments=attachments
        )
        
        return jsonify(result)
    
    except Exception as e:
        import traceback
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

if __name__ == '__main__':
    print("🚀 Starting iPhone 17 Campaign Generator API...")
    print(f"📁 Upload folder: {UPLOAD_FOLDER}")
    print("📄 Supported file types: PDF, CSV, Excel (.xlsx, .xls), XML, Images (JPG, PNG, GIF, BMP)")
    print("✉️  Email endpoints available: /api/email/generate, /api/email/send")
    print("🌐 Server running on http://localhost:5000")
    app.run(debug=True, port=5000)
