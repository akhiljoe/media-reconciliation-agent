"""
Multi-Format File Parser for Campaign Generator
Supports: PDF, CSV, XML, Images (with AI-powered extraction)
"""

import os
import pandas as pd
import xml.etree.ElementTree as ET
from PIL import Image
import pdfplumber
from io import BytesIO
from typing import Dict, Any, Optional

# Initialize OpenAI for intelligent parsing (only if API key available)
llm = None
try:
    from langchain_openai import ChatOpenAI
    if os.getenv('OPENAI_API_KEY'):
        llm = ChatOpenAI(
            model="gpt-4o",
            temperature=0.3,
            api_key=os.getenv('OPENAI_API_KEY')
        )
except Exception as e:
    print(f"Warning: OpenAI LLM not initialized: {e}")

def detect_file_type(filepath: str) -> str:
    """Detect file type from extension"""
    ext = os.path.splitext(filepath)[1].lower()
    type_mapping = {
        '.pdf': 'pdf',
        '.csv': 'csv',
        '.xlsx': 'excel',
        '.xls': 'excel',
        '.xml': 'xml',
        '.jpg': 'image',
        '.jpeg': 'image',
        '.png': 'image',
        '.gif': 'image',
        '.bmp': 'image',
        '.txt': 'text'
    }
    return type_mapping.get(ext, 'unknown')

def parse_pdf(filepath: str) -> Dict[str, Any]:
    """Parse PDF file and extract text"""
    try:
        with pdfplumber.open(filepath) as pdf:
            text = ""
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
            
            return {
                'success': True,
                'file_type': 'pdf',
                'raw_content': text.strip(),
                'parsed_data': extract_product_info_from_text(text),
                'metadata': {
                    'pages': len(pdf.pages),
                    'parser': 'pdfplumber'
                }
            }
    except Exception as e:
        # Fallback to text file reading
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                text = f.read()
            return {
                'success': True,
                'file_type': 'pdf',
                'raw_content': text,
                'parsed_data': extract_product_info_from_text(text),
                'metadata': {
                    'parser': 'text_fallback'
                }
            }
        except Exception as fallback_error:
            return {
                'success': False,
                'error': f"PDF parsing failed: {str(e)}, Fallback: {str(fallback_error)}"
            }

def parse_csv(filepath: str) -> Dict[str, Any]:
    """Parse CSV file with intelligent column detection"""
    try:
        # Read CSV with pandas
        df = pd.read_csv(filepath)
        
        # Convert to readable format
        csv_text = f"CSV Data with {len(df)} rows and {len(df.columns)} columns:\n\n"
        csv_text += df.to_string(index=False)
        
        # Use AI to extract product information
        product_info = extract_product_info_with_ai(csv_text, "CSV")
        
        return {
            'success': True,
            'file_type': 'csv',
            'raw_content': csv_text,
            'parsed_data': product_info,
            'metadata': {
                'rows': len(df),
                'columns': list(df.columns),
                'parser': 'pandas'
            },
            'dataframe_summary': df.head(10).to_dict()
        }
    except Exception as e:
        return {
            'success': False,
            'error': f"CSV parsing failed: {str(e)}"
        }

def parse_excel(filepath: str) -> Dict[str, Any]:
    """Parse Excel file (.xlsx, .xls) with intelligent sheet detection"""
    try:
        # Read Excel with pandas - supports both .xlsx and .xls
        # openpyxl engine for .xlsx, xlrd for .xls (auto-detected)
        df = pd.read_excel(filepath, sheet_name=0)  # Read first sheet
        
        # Get sheet names
        excel_file = pd.ExcelFile(filepath)
        sheet_names = excel_file.sheet_names
        
        # Convert to readable format
        excel_text = f"Excel Data from sheet '{sheet_names[0]}' with {len(df)} rows and {len(df.columns)} columns:\n\n"
        excel_text += df.to_string(index=False)
        
        # Use AI to extract product information
        product_info = extract_product_info_with_ai(excel_text, "Excel")
        
        return {
            'success': True,
            'file_type': 'excel',
            'raw_content': excel_text,
            'parsed_data': product_info,
            'metadata': {
                'rows': len(df),
                'columns': list(df.columns),
                'sheets': sheet_names,
                'active_sheet': sheet_names[0],
                'parser': 'pandas_excel'
            },
            'dataframe_summary': df.head(10).to_dict()
        }
    except Exception as e:
        return {
            'success': False,
            'error': f"Excel parsing failed: {str(e)}"
        }

def parse_xml(filepath: str) -> Dict[str, Any]:
    """Parse XML file and extract structured data"""
    try:
        tree = ET.parse(filepath)
        root = tree.getroot()
        
        # Convert XML to readable text
        xml_text = f"XML Root: {root.tag}\n\n"
        xml_text += xml_to_text(root, indent=0)
        
        # Use AI to extract product information
        product_info = extract_product_info_with_ai(xml_text, "XML")
        
        # Also extract as dictionary
        xml_dict = xml_to_dict(root)
        
        return {
            'success': True,
            'file_type': 'xml',
            'raw_content': xml_text,
            'parsed_data': product_info,
            'metadata': {
                'root_tag': root.tag,
                'parser': 'xml.etree'
            },
            'structured_data': xml_dict
        }
    except Exception as e:
        return {
            'success': False,
            'error': f"XML parsing failed: {str(e)}"
        }

def parse_image(filepath: str) -> Dict[str, Any]:
    """Parse image using OpenAI Vision API for intelligent extraction"""
    try:
        # Load and validate image
        img = Image.open(filepath)
        
        # Convert to base64 for OpenAI Vision
        import base64
        with open(filepath, 'rb') as img_file:
            img_base64 = base64.b64encode(img_file.read()).decode('utf-8')
        
        # Use OpenAI Vision to extract text and information
        from openai import OpenAI
        client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": """Extract all text and product information from this image.
                            
                            Please provide:
                            1. All visible text (OCR)
                            2. Product Name (if visible)
                            3. Features or specifications
                            4. Target market or audience info
                            5. Pricing information
                            6. Any other relevant product details
                            
                            Format your response as structured text with clear sections."""
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{img_base64}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=1000
        )
        
        extracted_text = response.choices[0].message.content
        
        # Parse the extracted information
        product_info = extract_product_info_from_text(extracted_text)
        
        return {
            'success': True,
            'file_type': 'image',
            'raw_content': extracted_text,
            'parsed_data': product_info,
            'metadata': {
                'image_size': img.size,
                'image_mode': img.mode,
                'parser': 'openai_vision'
            }
        }
    except Exception as e:
        # Fallback to pytesseract OCR
        try:
            import pytesseract
            img = Image.open(filepath)
            text = pytesseract.image_to_string(img)
            
            product_info = extract_product_info_from_text(text)
            
            return {
                'success': True,
                'file_type': 'image',
                'raw_content': text,
                'parsed_data': product_info,
                'metadata': {
                    'parser': 'pytesseract_fallback'
                }
            }
        except Exception as fallback_error:
            return {
                'success': False,
                'error': f"Image parsing failed: {str(e)}, OCR fallback: {str(fallback_error)}"
            }

def parse_file(filepath: str) -> Dict[str, Any]:
    """Universal file parser - routes to appropriate parser"""
    file_type = detect_file_type(filepath)
    
    parsers = {
        'pdf': parse_pdf,
        'csv': parse_csv,
        'excel': parse_excel,
        'xml': parse_xml,
        'image': parse_image,
        'text': parse_pdf  # Reuse PDF parser for text files
    }
    
    parser = parsers.get(file_type)
    if parser:
        return parser(filepath)
    else:
        return {
            'success': False,
            'error': f"Unsupported file type: {file_type}"
        }

# Helper functions

def extract_product_info_from_text(text: str) -> Dict[str, Any]:
    """Extract structured product information from plain text"""
    info = {
        'product_name': '',
        'features': [],
        'target_market': '',
        'price': '',
        'additional_info': {}
    }
    
    lines = text.split('\n')
    for line in lines:
        line = line.strip()
        if line.startswith('Product Name:'):
            info['product_name'] = line.replace('Product Name:', '').strip()
        elif line.startswith('Features:'):
            features_text = line.replace('Features:', '').strip()
            info['features'] = [f.strip() for f in features_text.split(',')]
        elif line.startswith('Target Market:'):
            info['target_market'] = line.replace('Target Market:', '').strip()
        elif line.startswith('Price:'):
            info['price'] = line.replace('Price:', '').strip()
    
    return info

def extract_product_info_with_ai(content: str, file_type: str) -> Dict[str, Any]:
    """Use AI to intelligently extract product information from any format"""
    global llm
    
    if not llm:
        # Fallback to text parsing if AI not available
        return extract_product_info_from_text(content)
    
    try:
        prompt = f"""You are analyzing a {file_type} file for product marketing information.
        
        Content:
        {content[:2000]}  # Limit to first 2000 chars
        
        Extract the following information (if present):
        1. Product Name
        2. Key Features (list)
        3. Target Market/Audience
        4. Price/Pricing
        5. Any other relevant product details
        
        Respond in this exact format:
        Product Name: [name]
        Features: [feature1], [feature2], [feature3]
        Target Market: [description]
        Price: [price]
        Additional Info: [any other details]
        """
        
        response = llm.invoke(prompt)
        extracted_text = response.content
        
        # Parse AI response
        return extract_product_info_from_text(extracted_text)
    except Exception as e:
        print(f"AI extraction failed: {e}")
        return extract_product_info_from_text(content)

def xml_to_text(element, indent=0) -> str:
    """Convert XML element to readable text"""
    text = "  " * indent + f"{element.tag}"
    if element.text and element.text.strip():
        text += f": {element.text.strip()}"
    text += "\n"
    
    for child in element:
        text += xml_to_text(child, indent + 1)
    
    return text

def xml_to_dict(element) -> Dict:
    """Convert XML element to dictionary"""
    result = {}
    
    # Add attributes
    if element.attrib:
        result['@attributes'] = element.attrib
    
    # Add text content
    if element.text and element.text.strip():
        if len(element) == 0:
            return element.text.strip()
        result['text'] = element.text.strip()
    
    # Add children
    for child in element:
        child_data = xml_to_dict(child)
        if child.tag in result:
            if not isinstance(result[child.tag], list):
                result[child.tag] = [result[child.tag]]
            result[child.tag].append(child_data)
        else:
            result[child.tag] = child_data
    
    return result

# Test function
if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        filepath = sys.argv[1]
        result = parse_file(filepath)
        print(f"\n{'='*60}")
        print(f"File: {filepath}")
        print(f"Type: {result.get('file_type', 'unknown')}")
        print(f"{'='*60}\n")
        print("Parsed Data:")
        print(result.get('parsed_data', {}))
        print(f"\n{'='*60}\n")
        print("Raw Content Preview:")
        print(result.get('raw_content', '')[:500])
    else:
        print("Usage: python file_parsers.py <filepath>")
