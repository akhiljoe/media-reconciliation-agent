"""
Discrepancy Analysis Agent using CrewAI
Provides reasoning and remediation plans for invoice discrepancies
"""

from crewai import Agent, Task, Crew, Process
from langchain_openai import ChatOpenAI
import os
from typing import Dict, List, Any


def get_llm():
    """Get configured LLM for CrewAI agents."""
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        raise ValueError("OPENAI_API_KEY environment variable not set")
    
    return ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.3,
        api_key=api_key
    )


def create_discrepancy_analyst_agent(llm) -> Agent:
    """Create an agent specialized in analyzing billing discrepancies."""
    return Agent(
        role="Media Billing Discrepancy Analyst",
        goal="Analyze invoice discrepancies and provide clear reasoning and remediation plans",
        backstory="""You are an expert media billing analyst with 15+ years of experience 
        in digital advertising reconciliation. You specialize in identifying billing errors, 
        understanding vendor billing patterns, and providing actionable remediation strategies. 
        You have deep knowledge of media buying processes, impression tracking, and financial 
        reconciliation best practices.""",
        verbose=True,
        allow_delegation=False,
        llm=llm
    )


def create_remediation_specialist_agent(llm) -> Agent:
    """Create an agent specialized in remediation planning."""
    return Agent(
        role="Billing Remediation Specialist",
        goal="Develop practical, step-by-step remediation plans for billing discrepancies",
        backstory="""You are a seasoned billing operations specialist who has resolved 
        thousands of media billing disputes. You excel at creating clear, actionable 
        remediation plans that consider vendor relationships, contract terms, and 
        operational efficiency. You understand both the technical and business aspects 
        of billing reconciliation.""",
        verbose=True,
        allow_delegation=False,
        llm=llm
    )


def analyze_single_discrepancy(
    discrepancy: Dict[str, Any],
    invoice_context: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Analyze a single discrepancy and provide reasoning + remediation.
    
    Args:
        discrepancy: Discrepancy data with Campaign, Field, values, severity
        invoice_context: Additional context about the invoice
    
    Returns:
        Dict with reasoning, remediation_plan, priority, and estimated_impact
    """
    try:
        llm = get_llm()
        
        # Create specialized agents
        analyst = create_discrepancy_analyst_agent(llm)
        remediation_specialist = create_remediation_specialist_agent(llm)
        
        # Prepare discrepancy details
        campaign = discrepancy.get('Campaign', 'Unknown')
        field = discrepancy.get('Field', 'Unknown')
        extracted_value = discrepancy.get('Extracted Value', 'N/A')
        planned_value = discrepancy.get('Planned Value', 'N/A')
        difference = discrepancy.get('Difference', 'N/A')
        difference_pct = discrepancy.get('Difference %', 'N/A')
        severity = discrepancy.get('Severity', 'UNKNOWN')
        
        vendor = invoice_context.get('vendor_name', 'Unknown Vendor')
        invoice_number = invoice_context.get('invoice_number', 'N/A')
        
        # Task 1: Analyze the discrepancy
        analysis_task = Task(
            description=f"""Analyze this billing discrepancy with concise bullet points:
            
            **Discrepancy:**
            - Campaign: {campaign}
            - Field: {field}
            - Invoice: {extracted_value} | Expected: {planned_value}
            - Gap: {difference} ({difference_pct}%) | Severity: {severity}
            - Vendor: {vendor} | Invoice #: {invoice_number}
            
            **Provide Analysis in This Format:**
            
            🎯 Root Cause:
            • [Primary reason in one line]
            • [Secondary factor if applicable]
            
            💰 Financial Impact:
            • [Monetary impact or billing effect]
            
            ⚠️ Risk Assessment:
            • [Key risk or concern]
            
            📊 Pattern:
            • [Is this common for this field/vendor?]
            
            Keep each bullet to ONE concise sentence. No fluff or generic statements.""",
            agent=analyst,
            expected_output="Concise bullet-pointed analysis with root cause, impact, risk, and pattern recognition"
        )
        
        # Task 2: Create remediation plan
        remediation_task = Task(
            description=f"""Create a concise action plan for this discrepancy:
            
            **Context:** {severity} severity | {field} | {difference_pct}% gap | {vendor}
            
            **Format Your Plan Exactly Like This:**
            
            ⚡ Immediate Actions (24-48hrs):
            1. [Action - who does what]
            2. [Action - who does what]
            
            📋 Follow-Up (1-2 weeks):
            1. [Action - who does what]
            2. [Action - who does what]
            
            🛡️ Prevention:
            • [One key preventive measure]
            
            🚨 Escalate If:
            • [Condition requiring management involvement]
            
            Each action must be: specific, assignable, and time-bound.
            Maximum 2-3 actions per section. No lengthy explanations.""",
            agent=remediation_specialist,
            expected_output="Structured action plan with immediate steps, follow-up, prevention, and escalation criteria"
        )
        
        # Create crew and execute
        crew = Crew(
            agents=[analyst, remediation_specialist],
            tasks=[analysis_task, remediation_task],
            process=Process.sequential,
            verbose=False
        )
        
        print(f"\n🔍 Analyzing discrepancy for {campaign} - {field}...")
        result = crew.kickoff()
        
        # Extract results from tasks
        reasoning = analysis_task.output.raw_output if hasattr(analysis_task.output, 'raw_output') else str(result)
        remediation = remediation_task.output.raw_output if hasattr(remediation_task.output, 'raw_output') else str(result)
        
        # Calculate priority score
        priority_score = calculate_priority_score(severity, difference_pct)
        
        return {
            'success': True,
            'reasoning': reasoning,
            'remediation_plan': remediation,
            'priority': get_priority_level(priority_score),
            'priority_score': priority_score,
            'severity': severity,
            'estimated_impact': estimate_financial_impact(discrepancy),
            'campaign': campaign,
            'field': field
        }
        
    except Exception as e:
        print(f"❌ Error analyzing discrepancy: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'reasoning': "Unable to generate AI analysis at this time.",
            'remediation_plan': "Please review manually and contact your billing team.",
            'priority': 'MEDIUM',
            'priority_score': 50,
            'severity': severity
        }


def analyze_batch_discrepancies(
    discrepancies: List[Dict[str, Any]],
    invoice_context: Dict[str, Any],
    max_analyses: int = 10
) -> List[Dict[str, Any]]:
    """
    Analyze multiple discrepancies (up to max_analyses for cost control).
    Prioritizes by severity.
    
    Args:
        discrepancies: List of discrepancy records
        invoice_context: Invoice header information
        max_analyses: Maximum number to analyze with AI (cost control)
    
    Returns:
        List of analyzed discrepancies with reasoning and remediation
    """
    if not discrepancies:
        return []
    
    # Sort by severity (CRITICAL > HIGH > MEDIUM > LOW)
    severity_order = {'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3, 'UNKNOWN': 4}
    sorted_discrepancies = sorted(
        discrepancies,
        key=lambda x: severity_order.get(x.get('Severity', 'UNKNOWN'), 4)
    )
    
    # Limit to max_analyses
    to_analyze = sorted_discrepancies[:max_analyses]
    
    print(f"\n🤖 Analyzing top {len(to_analyze)} discrepancies with AI...")
    
    results = []
    for idx, disc in enumerate(to_analyze, 1):
        print(f"\n--- Analysis {idx}/{len(to_analyze)} ---")
        analysis = analyze_single_discrepancy(disc, invoice_context)
        
        # Merge with original discrepancy data
        enriched = {**disc, **analysis}
        results.append(enriched)
    
    # Add remaining discrepancies without AI analysis
    remaining = sorted_discrepancies[max_analyses:]
    for disc in remaining:
        results.append({
            **disc,
            'success': True,
            'reasoning': 'AI analysis not performed (lower priority). Please review manually.',
            'remediation_plan': 'Standard reconciliation process applies.',
            'priority': get_priority_level(50),
            'priority_score': 50
        })
    
    return results


def calculate_priority_score(severity: str, difference_pct: Any) -> int:
    """Calculate priority score (0-100) based on severity and difference percentage."""
    severity_scores = {
        'CRITICAL': 90,
        'HIGH': 70,
        'MEDIUM': 50,
        'LOW': 30,
        'UNKNOWN': 40
    }
    
    base_score = severity_scores.get(severity, 40)
    
    # Adjust based on percentage difference
    try:
        if difference_pct and difference_pct != 'N/A':
            pct_value = abs(float(str(difference_pct).replace('%', '')))
            if pct_value > 50:
                base_score = min(100, base_score + 10)
            elif pct_value > 20:
                base_score = min(100, base_score + 5)
    except (ValueError, TypeError):
        pass
    
    return base_score


def get_priority_level(score: int) -> str:
    """Convert priority score to level."""
    if score >= 80:
        return 'URGENT'
    elif score >= 60:
        return 'HIGH'
    elif score >= 40:
        return 'MEDIUM'
    else:
        return 'LOW'


def estimate_financial_impact(discrepancy: Dict[str, Any]) -> str:
    """Estimate financial impact of the discrepancy."""
    try:
        difference = discrepancy.get('Difference', 'N/A')
        
        if difference and difference != 'N/A':
            # Try to extract numeric value
            diff_str = str(difference).replace('$', '').replace(',', '')
            
            # Check if it's a currency value
            if '$' in str(difference) or 'cost' in discrepancy.get('Field', '').lower():
                try:
                    amount = abs(float(diff_str))
                    if amount > 10000:
                        return f"High Impact (~${amount:,.0f})"
                    elif amount > 1000:
                        return f"Medium Impact (~${amount:,.0f})"
                    else:
                        return f"Low Impact (~${amount:,.0f})"
                except ValueError:
                    pass
        
        # Default based on severity
        severity = discrepancy.get('Severity', 'UNKNOWN')
        if severity == 'CRITICAL':
            return "High Impact (Review Required)"
        elif severity == 'HIGH':
            return "Medium Impact"
        else:
            return "Low Impact"
            
    except Exception:
        return "Impact Unknown"


# Quick test function
if __name__ == "__main__":
    # Test with sample discrepancy
    sample_discrepancy = {
        'Campaign': 'Holiday 2024 Campaign',
        'Field': 'Billed Impressions',
        'Extracted Value': '1,200,000',
        'Planned Value': '1,000,000',
        'Difference': '200,000',
        'Difference %': '20.0',
        'Severity': 'HIGH'
    }
    
    sample_context = {
        'vendor_name': 'Google DV360',
        'invoice_number': 'INV-2024-1234'
    }
    
    result = analyze_single_discrepancy(sample_discrepancy, sample_context)
    
    print("\n" + "="*60)
    print("ANALYSIS RESULT:")
    print("="*60)
    print(f"\nReasoning:\n{result.get('reasoning')}")
    print(f"\n\nRemediation Plan:\n{result.get('remediation_plan')}")
    print(f"\n\nPriority: {result.get('priority')}")
    print(f"Impact: {result.get('estimated_impact')}")
