"""
Email Service for Discrepancy Reports
Generates and sends professional email notifications for billing discrepancies
Uses AI agent to create personalized email content
"""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path
import json

from crewai import Agent, Task, Crew, Process
from langchain_openai import ChatOpenAI


def get_llm():
    """Get configured LLM for email generation."""
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        raise ValueError("OPENAI_API_KEY environment variable not set")
    
    return ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.7,
        api_key=api_key
    )


def create_email_composer_agent(llm) -> Agent:
    """Create an agent specialized in composing professional business emails."""
    return Agent(
        role="Business Communication Specialist",
        goal="Compose clear, professional, and actionable email notifications for billing discrepancies",
        backstory="""You are an expert business communication specialist with extensive 
        experience in vendor relations and financial communications. You excel at 
        crafting emails that are professional, concise, and action-oriented while 
        maintaining positive vendor relationships. You understand the importance of 
        clarity, urgency levels, and appropriate tone in billing communications.""",
        verbose=True,
        allow_delegation=False,
        llm=llm
    )


def generate_email_content(
    discrepancies: List[Dict[str, Any]],
    invoice_context: Dict[str, Any],
    recipient_info: Dict[str, Any]
) -> Dict[str, str]:
    """
    Generate professional email content using AI agent.
    
    Args:
        discrepancies: List of discrepancy records with analysis
        invoice_context: Invoice header information
        recipient_info: Recipient details (name, role, company)
    
    Returns:
        Dict with subject and body of email
    """
    try:
        llm = get_llm()
        composer = create_email_composer_agent(llm)
        
        # Prepare discrepancy summary
        total_discrepancies = len(discrepancies)
        critical_count = len([d for d in discrepancies if d.get('Severity') == 'CRITICAL'])
        high_count = len([d for d in discrepancies if d.get('Severity') == 'HIGH'])
        medium_count = len([d for d in discrepancies if d.get('Severity') == 'MEDIUM'])
        low_count = len([d for d in discrepancies if d.get('Severity') == 'LOW'])
        
        # Get invoice details
        vendor_name = invoice_context.get('vendor_name', 'Unknown Vendor')
        invoice_number = invoice_context.get('invoice_number', 'N/A')
        invoice_date = invoice_context.get('invoice_date', 'N/A')
        total_amount = invoice_context.get('total_amount', 'N/A')
        
        # Get recipient info
        recipient_name = recipient_info.get('name', 'Valued Partner')
        recipient_company = recipient_info.get('company', vendor_name)
        
        # Format top discrepancies for email
        top_discrepancies = []
        for disc in discrepancies[:5]:  # Top 5 most critical
            top_discrepancies.append({
                'campaign': disc.get('Campaign', 'Unknown'),
                'field': disc.get('Field', 'Unknown'),
                'extracted': disc.get('Extracted Value', 'N/A'),
                'expected': disc.get('Planned Value', 'N/A'),
                'difference': disc.get('Difference', 'N/A'),
                'severity': disc.get('Severity', 'UNKNOWN'),
                'reasoning': disc.get('reasoning', 'Not analyzed'),
                'remediation': disc.get('remediation_plan', 'Not available')
            })
        
        # Create email composition task
        email_task = Task(
            description=f"""Compose a professional email notification about billing discrepancies.

**Email Details:**

**Recipient:** {recipient_name} at {recipient_company}

**Invoice Information:**
- Invoice Number: {invoice_number}
- Invoice Date: {invoice_date}
- Vendor: {vendor_name}
- Total Amount: {total_amount}

**Discrepancy Summary:**
- Total Discrepancies: {total_discrepancies}
- Critical: {critical_count}
- High: {high_count}
- Medium: {medium_count}
- Low: {low_count}

**Top Discrepancies:**
{json.dumps(top_discrepancies, indent=2)}

**Email Requirements:**

1. **Subject Line:** 
   - Concise, clear, and indicates urgency if critical issues present
   - Include invoice number
   - Format: "Action Required: Invoice #{invoice_number} - Billing Discrepancies Detected"

2. **Email Body Structure:**

   **Opening:**
   - Professional greeting
   - Brief context about invoice reconciliation
   
   **Summary Section:**
   - Clear statement of issue
   - Severity breakdown
   - Total impact if calculable
   
   **Detailed Discrepancies:**
   - List top 3-5 most critical issues
   - For each: Campaign, Issue, Values, Impact
   - Keep it scannable with bullet points
   
   **Action Items:**
   - Clear next steps required from recipient
   - Deadline or timeframe (if critical issues)
   - Contact person for questions
   
   **Closing:**
   - Professional sign-off
   - Reassurance of partnership
   - Availability for discussion

**Tone:** Professional, direct, solution-focused, respectful

**Format:** Use HTML formatting with:
- Clear sections with headings
- Bullet points for discrepancies
- Color coding for severity (Red=Critical, Orange=High, Yellow=Medium, Blue=Low)
- Tables for structured data if needed
- Bold for important items

Return TWO parts:
1. SUBJECT: [the email subject line]
2. BODY: [the complete HTML email body]

Keep professional but warm. Focus on resolution, not blame.""",
            agent=composer,
            expected_output="Professional email with clear subject line and well-structured HTML body"
        )
        
        # Execute task
        crew = Crew(
            agents=[composer],
            tasks=[email_task],
            process=Process.sequential,
            verbose=False
        )
        
        print(f"✉️  Generating email content for {total_discrepancies} discrepancies...")
        result = crew.kickoff()
        
        # Parse result
        output = email_task.output.raw_output if hasattr(email_task.output, 'raw_output') else str(result)
        
        # Extract subject and body
        subject = ""
        body = ""
        
        if "SUBJECT:" in output and "BODY:" in output:
            parts = output.split("BODY:", 1)
            subject = parts[0].replace("SUBJECT:", "").strip()
            body = parts[1].strip()
        else:
            # Fallback parsing
            lines = output.split('\n', 1)
            if lines:
                subject = lines[0].strip()
                body = lines[1].strip() if len(lines) > 1 else output
        
        return {
            'subject': subject,
            'body': body,
            'success': True
        }
        
    except Exception as e:
        print(f"❌ Error generating email: {str(e)}")
        # Fallback to template
        return generate_fallback_email(discrepancies, invoice_context, recipient_info)


def generate_fallback_email(
    discrepancies: List[Dict[str, Any]],
    invoice_context: Dict[str, Any],
    recipient_info: Dict[str, Any]
) -> Dict[str, str]:
    """Generate basic email template if AI generation fails."""
    
    vendor_name = invoice_context.get('vendor_name', 'Unknown Vendor')
    invoice_number = invoice_context.get('invoice_number', 'N/A')
    recipient_name = recipient_info.get('name', 'Valued Partner')
    
    total_discrepancies = len(discrepancies)
    critical_count = len([d for d in discrepancies if d.get('Severity') == 'CRITICAL'])
    high_count = len([d for d in discrepancies if d.get('Severity') == 'HIGH'])
    
    subject = f"Action Required: Invoice #{invoice_number} - {total_discrepancies} Billing Discrepancies Detected"
    
    # Build discrepancy list
    disc_html = ""
    for i, disc in enumerate(discrepancies[:5], 1):
        severity = disc.get('Severity', 'UNKNOWN')
        severity_color = {
            'CRITICAL': '#dc3545',
            'HIGH': '#fd7e14',
            'MEDIUM': '#ffc107',
            'LOW': '#0dcaf0'
        }.get(severity, '#6c757d')
        
        disc_html += f"""
        <li style="margin-bottom: 15px;">
            <strong style="color: {severity_color};">[{severity}]</strong> 
            {disc.get('Campaign', 'Unknown Campaign')} - {disc.get('Field', 'Unknown Field')}
            <br/>
            <span style="color: #666;">Invoice Value: {disc.get('Extracted Value', 'N/A')} | Expected: {disc.get('Planned Value', 'N/A')}</span>
            <br/>
            <span style="color: #666;">Difference: {disc.get('Difference', 'N/A')} ({disc.get('Difference %', 'N/A')}%)</span>
        </li>
        """
    
    body = f"""
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 800px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #f8f9fa; padding: 20px; border-left: 4px solid #0d6efd; margin-bottom: 20px; }}
            .summary {{ background-color: #fff3cd; padding: 15px; margin-bottom: 20px; border-radius: 5px; }}
            .discrepancy-list {{ margin: 20px 0; }}
            .action-box {{ background-color: #d1ecf1; padding: 15px; margin: 20px 0; border-radius: 5px; }}
            .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="margin: 0; color: #0d6efd;">Invoice Reconciliation Alert</h2>
                <p style="margin: 10px 0 0 0;">Invoice #{invoice_number} - {vendor_name}</p>
            </div>
            
            <p>Dear {recipient_name},</p>
            
            <p>Our automated reconciliation system has identified discrepancies between invoice #{invoice_number} 
            and our planned media buying records that require your attention.</p>
            
            <div class="summary">
                <h3 style="margin-top: 0;">Discrepancy Summary</h3>
                <ul style="list-style: none; padding-left: 0;">
                    <li>📊 <strong>Total Discrepancies:</strong> {total_discrepancies}</li>
                    <li>🔴 <strong>Critical:</strong> {critical_count}</li>
                    <li>🟠 <strong>High:</strong> {high_count}</li>
                </ul>
            </div>
            
            <h3>Top Discrepancies Requiring Review:</h3>
            <ul class="discrepancy-list">
                {disc_html}
            </ul>
            
            <div class="action-box">
                <h3 style="margin-top: 0;">⚡ Action Required</h3>
                <p>Please review the discrepancies listed above and provide clarification or revised billing within 
                <strong>5 business days</strong>. A detailed discrepancy report is attached to this email.</p>
                <p><strong>Next Steps:</strong></p>
                <ol>
                    <li>Review the attached discrepancy report</li>
                    <li>Verify billing data against your campaign records</li>
                    <li>Provide updated invoice or explanation for variances</li>
                    <li>Contact our billing team with questions</li>
                </ol>
            </div>
            
            <p>We appreciate your partnership and prompt attention to this matter. Please don't hesitate to 
            reach out if you need any clarification or have questions about these discrepancies.</p>
            
            <div class="footer">
                <p>Best regards,<br/>
                <strong>Media Billing Reconciliation Team</strong></p>
                <p style="font-size: 12px;">
                    This is an automated notification from our invoice reconciliation system. 
                    For questions, please contact your account manager.
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return {
        'subject': subject,
        'body': body,
        'success': True
    }


def send_email_smtp(
    to_email: str,
    subject: str,
    body_html: str,
    from_email: Optional[str] = None,
    from_name: Optional[str] = None,
    cc_emails: Optional[List[str]] = None,
    attachments: Optional[List[str]] = None,
    smtp_config: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Send email via SMTP.
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        body_html: HTML email body
        from_email: Sender email (defaults to env var)
        from_name: Sender display name
        cc_emails: List of CC recipients
        attachments: List of file paths to attach
        smtp_config: SMTP configuration (host, port, username, password, use_tls)
    
    Returns:
        Dict with success status and message
    """
    try:
        # Get SMTP configuration from env or parameter
        if smtp_config is None:
            smtp_config = {
                'host': os.getenv('SMTP_HOST', 'smtp.gmail.com'),
                'port': int(os.getenv('SMTP_PORT', '587')),
                'username': os.getenv('SMTP_USERNAME', ''),
                'password': os.getenv('SMTP_PASSWORD', ''),
                'use_tls': os.getenv('SMTP_USE_TLS', 'true').lower() == 'true'
            }
        
        if not from_email:
            from_email = os.getenv('SMTP_FROM_EMAIL', smtp_config.get('username', ''))
        
        if not from_name:
            from_name = os.getenv('SMTP_FROM_NAME', 'Media Billing Team')
        
        # Check if SMTP is configured
        if not smtp_config.get('username') or not smtp_config.get('password'):
            return {
                'success': False,
                'error': 'SMTP credentials not configured',
                'message': 'Email not sent - SMTP configuration required',
                'email_preview': {
                    'to': to_email,
                    'subject': subject,
                    'body_preview': body_html[:200] + '...'
                }
            }
        
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"{from_name} <{from_email}>"
        msg['To'] = to_email
        
        if cc_emails:
            msg['Cc'] = ', '.join(cc_emails)
        
        # Add HTML body
        html_part = MIMEText(body_html, 'html')
        msg.attach(html_part)
        
        # Add attachments
        if attachments:
            for file_path in attachments:
                if Path(file_path).exists():
                    with open(file_path, 'rb') as f:
                        part = MIMEBase('application', 'octet-stream')
                        part.set_payload(f.read())
                        encoders.encode_base64(part)
                        part.add_header(
                            'Content-Disposition',
                            f'attachment; filename={Path(file_path).name}'
                        )
                        msg.attach(part)
        
        # Send email
        with smtplib.SMTP(smtp_config['host'], smtp_config['port']) as server:
            if smtp_config.get('use_tls', True):
                server.starttls()
            
            server.login(smtp_config['username'], smtp_config['password'])
            
            recipients = [to_email]
            if cc_emails:
                recipients.extend(cc_emails)
            
            server.send_message(msg)
        
        print(f"✅ Email sent successfully to {to_email}")
        
        return {
            'success': True,
            'message': f'Email sent successfully to {to_email}',
            'sent_at': datetime.now().isoformat(),
            'recipients': recipients
        }
        
    except Exception as e:
        print(f"❌ Error sending email: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'message': 'Failed to send email via SMTP',
            'email_preview': {
                'to': to_email,
                'subject': subject,
                'body_preview': body_html[:200] + '...'
            }
        }


def generate_and_preview_email(
    discrepancies: List[Dict[str, Any]],
    invoice_context: Dict[str, Any],
    recipient_info: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Generate email content and return for preview (no sending).
    Useful when SMTP is not configured.
    
    Returns:
        Dict with email content and metadata for UI preview
    """
    email_content = generate_email_content(discrepancies, invoice_context, recipient_info)
    
    if not email_content.get('success'):
        return email_content
    
    return {
        'success': True,
        'subject': email_content['subject'],
        'body_html': email_content['body'],
        'preview_mode': True,
        'recipient': recipient_info.get('email', 'Not specified'),
        'generated_at': datetime.now().isoformat(),
        'discrepancy_count': len(discrepancies),
        'message': 'Email generated successfully (preview mode - SMTP not configured)'
    }


def send_discrepancy_email(
    discrepancies: List[Dict[str, Any]],
    invoice_context: Dict[str, Any],
    recipient_info: Dict[str, Any],
    send_mode: str = 'preview',
    attachments: Optional[List[str]] = None,
    smtp_config: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Main function to generate and send/preview discrepancy notification email.
    
    Args:
        discrepancies: List of discrepancy records
        invoice_context: Invoice metadata (vendor, number, date, etc.)
        recipient_info: Dict with 'email', 'name', 'company', 'role'
        send_mode: 'preview' (generate only) or 'send' (send via SMTP)
        attachments: Optional list of file paths to attach (e.g., CSV report)
        smtp_config: Optional SMTP configuration
    
    Returns:
        Dict with email status and content
    """
    # Generate email content using AI
    email_content = generate_email_content(discrepancies, invoice_context, recipient_info)
    
    if not email_content.get('success'):
        return email_content
    
    # Preview mode - just return the email
    if send_mode == 'preview':
        return {
            'success': True,
            'mode': 'preview',
            'subject': email_content['subject'],
            'body_html': email_content['body'],
            'recipient': recipient_info.get('email', 'Not specified'),
            'generated_at': datetime.now().isoformat(),
            'discrepancy_count': len(discrepancies),
            'message': 'Email generated successfully (preview mode)'
        }
    
    # Send mode - send via SMTP
    elif send_mode == 'send':
        recipient_email = recipient_info.get('email')
        if not recipient_email:
            return {
                'success': False,
                'error': 'Recipient email address required for send mode'
            }
        
        send_result = send_email_smtp(
            to_email=recipient_email,
            subject=email_content['subject'],
            body_html=email_content['body'],
            cc_emails=recipient_info.get('cc_emails'),
            attachments=attachments,
            smtp_config=smtp_config
        )
        
        return {
            **send_result,
            'mode': 'send',
            'subject': email_content['subject'],
            'discrepancy_count': len(discrepancies)
        }
    
    else:
        return {
            'success': False,
            'error': f'Invalid send_mode: {send_mode}. Use "preview" or "send".'
        }


# Quick test function
if __name__ == "__main__":
    # Test with sample data
    sample_discrepancies = [
        {
            'Campaign': 'Holiday 2024 Campaign',
            'Field': 'Billed Impressions',
            'Extracted Value': '1,200,000',
            'Planned Value': '1,000,000',
            'Difference': '200,000',
            'Difference %': '20.0',
            'Severity': 'HIGH',
            'reasoning': 'Over-delivery of impressions without prior approval',
            'remediation_plan': 'Request credit note or revised invoice'
        },
        {
            'Campaign': 'Back to School Q3',
            'Field': 'Net Cost',
            'Extracted Value': '$52,500',
            'Planned Value': '$45,000',
            'Difference': '$7,500',
            'Difference %': '16.67',
            'Severity': 'CRITICAL',
            'reasoning': 'Significant cost overrun without authorization',
            'remediation_plan': 'Escalate to management, request justification'
        }
    ]
    
    sample_invoice_context = {
        'vendor_name': 'Google DV360',
        'invoice_number': 'INV-2024-1234',
        'invoice_date': '2024-11-01',
        'total_amount': '$125,000'
    }
    
    sample_recipient = {
        'email': 'billing@googledv360.com',
        'name': 'John Doe',
        'company': 'Google DV360',
        'role': 'Billing Manager'
    }
    
    # Generate preview
    result = send_discrepancy_email(
        sample_discrepancies,
        sample_invoice_context,
        sample_recipient,
        send_mode='preview'
    )
    
    print("\n" + "="*60)
    print("EMAIL PREVIEW:")
    print("="*60)
    print(f"\nSubject: {result.get('subject')}")
    print(f"\nMode: {result.get('mode')}")
    print(f"Recipient: {result.get('recipient')}")
    print(f"\nBody (first 500 chars):\n{result.get('body_html', '')[:500]}...")
