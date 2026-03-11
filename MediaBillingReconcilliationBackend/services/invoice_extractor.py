"""
Invoice Extraction Service
Integrates production notebook invoice extraction with Flask API
"""

import os
import json
import pandas as pd
from pathlib import Path
from dotenv import load_dotenv
from typing import Dict, Any

# File reading libraries
import pdfplumber
from PIL import Image
import pytesseract

# CrewAI imports
from crewai import Agent, Task, Crew, Process, LLM

# Load environment
load_dotenv()

# ============================================
# CANONICAL INVOICE SCHEMA
# ============================================

CANONICAL_SCHEMA_DOC = """
You MUST output a JSON object matching this EXACT structure:

{
  "invoice_header": {
    "invoice_number": "INV-2025-001",
    "vendor_name": "BrightAds Global",
    "invoice_date": "2025-11-13",
    "billing_start_date": "2025-10-01",
    "billing_end_date": "2025-10-31",
    "currency": "USD",
    "gross_revenue": 17657,
    "discount_amount": 500,
    "discount_percent": 5,
    "tax": 2100
  },
  "line_items": [
    {
      "line_id": 1,
      "campaign_name": "Summer Blast",
      "campaign_id": null,
      "insertion_order_ID": "IO-900",
      "start_date": "2025-10-14",
      "end_date": "2025-10-30",
      "duration_days": 17,
      "booked_impressions": 636375,
      "billed_impressions": 931870,
      "views": null,
      "clicks": 5682,
      "gross_revenue": 4500,
      "net_revenue": 4018,
      "discount_amount": 482,
      "discount_percent": 5,
      "profit": null,
      "rate_type": "CPM",
      "rate": 6.0
    }
  ],
  "notes": null
}

EXTRACTION RULES:
1. Use null for missing values - DO NOT INVENT DATA
2. MANDATORY: Extract start_date and end_date from Dates column, then calculate duration_days
3. For duration_days: Parse "2025-10-14 to 2025-10-30" → start_date="2025-10-14", end_date="2025-10-30", duration_days=17 (inclusive count)
4. Discounts: Extract explicit or calculate implicit (gross - net)
5. Profit: Use stated value or calculate (revenue - cost) if available
6. Metrics: Map views/impressions/clicks to closest available field
7. Dates: Convert to YYYY-MM-DD format when possible
8. Line Items: Each table row becomes one line_item with sequential line_id
9. Currency: Extract currency code (USD, EUR, GBP, etc.)
"""

# ============================================
# INITIALIZE LLM
# ============================================

llm = LLM(
    model="gpt-4o",
    api_key=os.getenv("OPENAI_API_KEY"),
    temperature=0.1
)

# ============================================
# FILE READING FUNCTIONS
# ============================================

def read_pdf_content(pdf_path: str, max_pages: int = 5) -> str:
    """Extract text from PDF files with OCR fallback for image-based PDFs."""
    try:
        pages_text = []
        with pdfplumber.open(pdf_path) as pdf:
            for i, page in enumerate(pdf.pages):
                if i >= max_pages:
                    break
                text = page.extract_text() or ""
                
                # If no text extracted, try OCR on the page image
                if not text.strip():
                    try:
                        # Convert page to image and use OCR
                        page_image = page.to_image(resolution=300).original
                        text = pytesseract.image_to_string(page_image)
                    except pytesseract.TesseractNotFoundError:
                        text = """[ERROR: Tesseract OCR not installed]
                        
To install Tesseract:
• macOS: brew install tesseract
• Ubuntu/Debian: sudo apt-get install tesseract-ocr
• Windows: Download from https://github.com/UB-Mannheim/tesseract/wiki"""
                    except Exception as ocr_error:
                        text = f"[OCR failed for page {i+1}: {str(ocr_error)}]"
                
                if text:
                    pages_text.append(f"--- Page {i+1} ---\n{text}")
        
        return "\n\n".join(pages_text) if pages_text else "No text extracted from PDF"
    except Exception as e:
        return f"Error reading PDF: {str(e)}"


def read_excel_content(excel_path: str, sheet_name=None, max_rows=50) -> Dict[str, Any]:
    """Read Excel file and return structured preview."""
    try:
        excel_file = pd.ExcelFile(excel_path)
        
        if sheet_name is not None:
            sheets = [sheet_name]
        else:
            sheets = [excel_file.sheet_names[0]]
        
        result = {
            "file_name": Path(excel_path).name,
            "total_sheets": len(excel_file.sheet_names),
            "sheet_names": excel_file.sheet_names,
            "data": {}
        }
        
        for sheet in sheets:
            df = pd.read_excel(excel_path, sheet_name=sheet)
            df.columns = [str(c).strip().lower().replace(" ", "_").replace("-", "_") for c in df.columns]
            preview_df = df.head(max_rows)
            
            result["data"][sheet] = {
                "total_rows": len(df),
                "columns": list(df.columns),
                "preview": preview_df.to_dict(orient="records"),
                "preview_text": preview_df.to_string(index=False, max_colwidth=30)
            }
        
        return result
    except Exception as e:
        return {"error": str(e)}


def read_csv_content(csv_path: str, max_rows=50) -> Dict[str, Any]:
    """Read CSV file and return structured preview."""
    try:
        df = pd.read_csv(csv_path)
        df.columns = [str(c).strip().lower().replace(" ", "_").replace("-", "_") for c in df.columns]
        preview_df = df.head(max_rows)
        
        return {
            "file_name": Path(csv_path).name,
            "total_rows": len(df),
            "columns": list(df.columns),
            "preview": preview_df.to_dict(orient="records"),
            "preview_text": preview_df.to_string(index=False, max_colwidth=30)
        }
    except Exception as e:
        return {"error": str(e)}


def read_image_content(image_path: str) -> str:
    """Extract text from images using OCR."""
    try:
        image = Image.open(image_path)
        text = pytesseract.image_to_string(image)
        return text.strip() if text.strip() else "No text extracted from image"
    except pytesseract.TesseractNotFoundError:
        return """ERROR: Tesseract OCR is not installed.
        
To install Tesseract:
        • macOS: brew install tesseract
        • Ubuntu/Debian: sudo apt-get install tesseract-ocr
        • Windows: Download from https://github.com/UB-Mannheim/tesseract/wiki
        
After installation, restart your application."""
    except Exception as e:
        return f"Error reading image: {str(e)}"


def build_invoice_context(file_path: str, max_rows: int = 50) -> str:
    """Build formatted context from any invoice file type."""
    file_path_obj = Path(file_path)
    
    if not file_path_obj.exists():
        return f"ERROR: File not found: {file_path}"
    
    suffix = file_path_obj.suffix.lower()
    output = [f"FILE: {file_path_obj.name}", "=" * 70]
    
    if suffix == '.pdf':
        output.append("TYPE: PDF Invoice\n\nCONTENT:")
        output.append(read_pdf_content(str(file_path)))
    elif suffix in ['.xlsx', '.xls']:
        output.append("TYPE: Excel Spreadsheet")
        data = read_excel_content(str(file_path), max_rows=max_rows)
        if "error" in data:
            output.append(f"\nERROR: {data['error']}")
        else:
            output.append(f"\nSheets: {', '.join(data['sheet_names'])}")
            for sheet_name, sheet_data in data['data'].items():
                output.append(f"\n--- Sheet: {sheet_name} ---")
                output.append(f"Total Rows: {sheet_data['total_rows']}")
                output.append(f"Columns: {', '.join(sheet_data['columns'])}")
                output.append(f"\nData Preview (first {max_rows} rows):")
                output.append(sheet_data['preview_text'])
    elif suffix == '.csv':
        output.append("TYPE: CSV File")
        data = read_csv_content(str(file_path), max_rows=max_rows)
        if "error" in data:
            output.append(f"\nERROR: {data['error']}")
        else:
            output.append(f"\nTotal Rows: {data['total_rows']}")
            output.append(f"Columns: {', '.join(data['columns'])}")
            output.append(f"\nData Preview (first {max_rows} rows):")
            output.append(data['preview_text'])
    elif suffix in ['.png', '.jpg', '.jpeg', '.bmp', '.tiff']:
        output.append("TYPE: Image File (OCR Extraction)")
        output.append("\nCONTENT:")
        content = read_image_content(str(file_path))
        output.append(content)
    else:
        output.append(f"ERROR: Unsupported file type: {suffix}")
    
    return "\n".join(output)


# ============================================
# AGENT & TASK
# ============================================

invoice_extraction_agent = Agent(
    role='Media Invoice Data Extraction Specialist',
    goal='Extract structured financial and delivery data from media invoices into canonical JSON format, including accurate campaign duration calculations',
    backstory="""You are an expert in media billing and invoice processing. 
    You understand advertising metrics (impressions, views, clicks), financial terms 
    (revenue, costs, discounts, profit), and how to extract data accurately from 
    various invoice formats including OCR-extracted text from images and scanned PDFs.
    
    You are skilled at handling noisy or imperfectly formatted text from OCR, identifying
    patterns, and extracting meaningful data even when formatting is inconsistent.
    You always follow the canonical schema strictly and never invent data - you use null 
    for missing values. When dealing with OCR text, you intelligently parse tables and 
    structured data even when spacing or alignment is imperfect.
    
    You are meticulous about extracting date ranges from the Dates column and calculating
    campaign duration in days. You parse date ranges like "2025-10-14 to 2025-10-30" and
    calculate duration_days as the number of days from start to end, inclusive.""",
    llm=llm,
    tools=[],
    verbose=True,
    allow_delegation=False
)


def create_extraction_task(file_path: str, max_rows: int = 50) -> Task:
    """Create extraction task with invoice context and schema."""
    context_str = build_invoice_context(file_path, max_rows=max_rows)
    
    description = f"""
Extract structured invoice data from the provided file and map it to the canonical schema.

**CANONICAL SCHEMA:**
{CANONICAL_SCHEMA_DOC}

**INVOICE DATA:**
{context_str}

**INSTRUCTIONS:**
1. Identify invoice header information (vendor, dates, totals, currency)
2. Extract all line items with sequential line_id starting from 1
3. Map financial metrics (revenue, costs, discounts, profit)
4. Map delivery metrics (impressions, views, clicks)
5. **CRITICAL: Extract date ranges from the Dates column and calculate duration_days:**
   - Parse the Dates field (format: "YYYY-MM-DD to YYYY-MM-DD")
   - Extract start_date and end_date separately  
   - Calculate duration_days = (end_date - start_date) + 1 (inclusive count)
   - Example: "2025-10-14 to 2025-10-30" → start_date: "2025-10-14", end_date: "2025-10-30", duration_days: 17
6. Calculate implicit discounts if gross and net revenue differ
7. Use null for missing values - DO NOT INVENT DATA
8. For OCR-extracted text: Look for patterns and table structures even if spacing/formatting is imperfect
9. Handle OCR artifacts gracefully (e.g., misread characters, spacing issues)
10. Add clarifications to 'notes' field if needed or if OCR quality affected extraction
11. Return ONLY valid JSON - no markdown, no explanations

**OUTPUT REQUIREMENT:**
Return a single valid JSON object following the canonical schema exactly.
""".strip()
    
    return Task(
        description=description,
        agent=invoice_extraction_agent,
        expected_output="Valid JSON object with invoice_header, line_items array, and notes field"
    )


# ============================================
# MAIN EXTRACTION FUNCTION
# ============================================

def extract_invoice_data(file_path: str, max_rows: int = 50) -> Dict[str, Any]:
    """
    Extract structured invoice data from any supported file format.
    
    Args:
        file_path: Path to invoice file
        max_rows: Maximum rows to process from tabular files
    
    Returns:
        Dictionary with extracted invoice data in canonical format
    """
    print(f"📄 Extracting invoice data from: {Path(file_path).name}")
    
    # Create task
    task = create_extraction_task(file_path, max_rows=max_rows)
    
    # Create crew
    crew = Crew(
        agents=[invoice_extraction_agent],
        tasks=[task],
        process=Process.sequential,
        verbose=True
    )
    
    # Execute extraction
    result = crew.kickoff()
    result_str = str(result).strip()
    
    # Parse JSON from result
    try:
        parsed = json.loads(result_str)
    except json.JSONDecodeError:
        # Try to extract JSON from response
        start = result_str.find("{")
        end = result_str.rfind("}")
        
        if start != -1 and end != -1 and start < end:
            json_str = result_str[start : end + 1]
            try:
                parsed = json.loads(json_str)
            except json.JSONDecodeError as e:
                return {
                    "error": "Failed to parse JSON response",
                    "details": str(e),
                    "raw_response": result_str[:500]
                }
        else:
            return {
                "error": "No JSON object found in response",
                "raw_response": result_str[:500]
            }
    
    # Post-process: Calculate duration_days if missing
    parsed = calculate_missing_durations(parsed)
    
    return parsed


def calculate_missing_durations(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Post-process extracted data to calculate duration_days if missing.
    Ensures all line items have duration_days calculated from start_date and end_date.
    """
    from datetime import datetime
    
    if "line_items" not in data or not isinstance(data["line_items"], list):
        return data
    
    for item in data["line_items"]:
        # Only calculate if duration_days is missing but we have dates
        if item.get("duration_days") is None:
            start_date = item.get("start_date")
            end_date = item.get("end_date")
            
            if start_date and end_date:
                try:
                    # Parse dates
                    start = datetime.strptime(str(start_date).strip(), '%Y-%m-%d')
                    end = datetime.strptime(str(end_date).strip(), '%Y-%m-%d')
                    
                    # Calculate duration (inclusive)
                    duration = (end - start).days + 1
                    item["duration_days"] = duration if duration > 0 else None
                    
                    print(f"   ✓ Calculated duration for {item.get('campaign_name', 'Unknown')}: {duration} days")
                except (ValueError, AttributeError) as e:
                    print(f"   ⚠ Could not calculate duration for {item.get('campaign_name', 'Unknown')}: {e}")
    
    return data


# ============================================
# VALIDATION & EXPORT
# ============================================

def validate_extracted_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate extracted data against canonical schema."""
    validation = {
        "valid": True,
        "errors": [],
        "warnings": []
    }
    
    if "invoice_header" not in data:
        validation["valid"] = False
        validation["errors"].append("Missing 'invoice_header' field")
    
    if "line_items" not in data:
        validation["valid"] = False
        validation["errors"].append("Missing 'line_items' field")
    elif not isinstance(data["line_items"], list):
        validation["valid"] = False
        validation["errors"].append("'line_items' must be an array")
    
    if "invoice_header" in data:
        header = data["invoice_header"]
        if not header.get("invoice_number") and not header.get("vendor_name"):
            validation["warnings"].append("Missing both invoice_number and vendor_name")
    
    return validation


def save_to_json(data: Dict[str, Any], output_path: str = None) -> str:
    """Save extracted data to JSON file."""
    if output_path is None:
        timestamp = pd.Timestamp.now().strftime("%Y%m%d_%H%M%S")
        output_path = f"extracted_invoice_{timestamp}.json"
    
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    return output_path
