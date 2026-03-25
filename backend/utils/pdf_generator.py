from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from datetime import datetime
import io

def generate_meeting_summary_pdf(meeting_data, participants, patients, agenda_items, decisions):
    """
    Generate a comprehensive PDF summary for a meeting
    
    Args:
        meeting_data: Dictionary containing meeting information
        participants: List of participant dictionaries
        patients: List of patient dictionaries
        agenda_items: List of agenda item dictionaries (with treatment plans)
        decisions: List of decision dictionaries
    
    Returns:
        BytesIO object containing the PDF
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    
    # Container for the 'Flowable' objects
    elements = []
    
    # Define styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#0b0b30'),
        spaceAfter=30,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#3b6658'),
        spaceAfter=12,
        spaceBefore=20,
        fontName='Helvetica-Bold'
    )
    
    subheading_style = ParagraphStyle(
        'CustomSubHeading',
        parent=styles['Heading3'],
        fontSize=14,
        textColor=colors.HexColor('#694e20'),
        spaceAfter=10,
        spaceBefore=15,
        fontName='Helvetica-Bold'
    )
    
    normal_style = styles['Normal']
    
    # Title
    title = Paragraph(f"<b>Meeting Summary Report</b>", title_style)
    elements.append(title)
    elements.append(Spacer(1, 0.2*inch))
    
    # Meeting Information Section
    elements.append(Paragraph("<b>Meeting Information</b>", heading_style))
    
    meeting_info = [
        ['Meeting Title:', meeting_data.get('title', 'N/A')],
        ['Date:', meeting_data.get('meeting_date', 'N/A')],
        ['Time:', f"{meeting_data.get('start_time', 'N/A')} - {meeting_data.get('end_time', 'N/A')}"],
        ['Type:', meeting_data.get('meeting_type', 'N/A').title()],
        ['Location:', meeting_data.get('location', 'Virtual Meeting') if meeting_data.get('meeting_type') == 'in_person' else 'Virtual Meeting'],
        ['Status:', meeting_data.get('status', 'N/A').replace('_', ' ').title()],
        ['Organizer:', meeting_data.get('organizer_name', 'N/A')],
    ]
    
    if meeting_data.get('description'):
        meeting_info.append(['Description:', meeting_data.get('description', '')])
    
    meeting_table = Table(meeting_info, colWidths=[2*inch, 5*inch])
    meeting_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e8e8f5')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ]))
    elements.append(meeting_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # Participants Section
    if participants:
        elements.append(Paragraph("<b>Participants</b>", heading_style))
        
        participant_data = [['Name', 'Role', 'Specialty', 'Response']]
        for p in participants:
            participant_data.append([
                p.get('name', 'N/A'),
                p.get('role', 'N/A').title(),
                p.get('specialty', 'N/A'),
                p.get('response_status', 'pending').replace('_', ' ').title()
            ])
        
        participant_table = Table(participant_data, colWidths=[2*inch, 1.5*inch, 2*inch, 1.5*inch])
        participant_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3b6658')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
        ]))
        elements.append(participant_table)
        elements.append(Spacer(1, 0.3*inch))
    
    # Patients Section
    if patients:
        elements.append(Paragraph("<b>Patients Discussed</b>", heading_style))
        
        patient_data = [['Patient Name', 'ID', 'Age', 'Department', 'Primary Diagnosis']]
        for patient in patients:
            patient_data.append([
                f"{patient.get('first_name', '')} {patient.get('last_name', '')}",
                patient.get('patient_id_number', 'N/A'),
                f"{patient.get('age', 'N/A')} yrs" if patient.get('age') else 'N/A',
                patient.get('department_name', 'N/A'),
                patient.get('primary_diagnosis', 'N/A')[:30] + '...' if patient.get('primary_diagnosis') and len(patient.get('primary_diagnosis', '')) > 30 else patient.get('primary_diagnosis', 'N/A')
            ])
        
        patient_table = Table(patient_data, colWidths=[1.8*inch, 1*inch, 0.8*inch, 1.5*inch, 1.9*inch])
        patient_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#694e20')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
        ]))
        elements.append(patient_table)
        elements.append(Spacer(1, 0.3*inch))
    
    # Agenda Items & Treatment Plans Section
    if agenda_items:
        elements.append(Paragraph("<b>Agenda Items & Treatment Plans</b>", heading_style))
        
        for idx, item in enumerate(agenda_items, 1):
            # Only show title if it exists
            if item.get('title'):
                elements.append(Paragraph(f"<b>{idx}. {item.get('title')}</b>", subheading_style))
            else:
                elements.append(Paragraph(f"<b>Agenda Item {idx}</b>", subheading_style))
            
            if item.get('description'):
                elements.append(Paragraph(f"<i>Description:</i> {item.get('description', '')}", normal_style))
                elements.append(Spacer(1, 0.1*inch))
            
            # Show patient name and MRN together
            if item.get('patient_name') or item.get('patient_mrn'):
                patient_info = []
                if item.get('patient_name'):
                    patient_info.append(item.get('patient_name'))
                if item.get('patient_mrn'):
                    patient_info.append(f"MRN: {item.get('patient_mrn')}")
                elements.append(Paragraph(f"<i>Patient:</i> {' - '.join(patient_info)}", normal_style))
                elements.append(Spacer(1, 0.1*inch))
            
            if item.get('presenter'):
                elements.append(Paragraph(f"<i>Presenter:</i> {item.get('presenter', '')}", normal_style))
                elements.append(Spacer(1, 0.1*inch))
            
            if item.get('duration'):
                elements.append(Paragraph(f"<i>Duration:</i> {item.get('duration', '')} minutes", normal_style))
                elements.append(Spacer(1, 0.1*inch))
            
            # Treatment Plan with patient info
            if item.get('treatment_plan'):
                elements.append(Paragraph("<b><u>Treatment Plan:</u></b>", normal_style))
                elements.append(Spacer(1, 0.05*inch))
                
                # Add patient info in treatment plan section if available
                if item.get('patient_name') or item.get('patient_mrn'):
                    patient_header = []
                    if item.get('patient_name'):
                        patient_header.append(f"<b>Patient:</b> {item.get('patient_name')}")
                    if item.get('patient_mrn'):
                        patient_header.append(f"<b>MRN:</b> {item.get('patient_mrn')}")
                    elements.append(Paragraph(' | '.join(patient_header), normal_style))
                    elements.append(Spacer(1, 0.05*inch))
                
                treatment_text = item.get('treatment_plan', '').replace('\n', '<br/>')
                elements.append(Paragraph(treatment_text, normal_style))
            
            elements.append(Spacer(1, 0.15*inch))
    
    # Decisions Section
    if decisions:
        elements.append(PageBreak())
        elements.append(Paragraph("<b>Meeting Decisions</b>", heading_style))
        
        for idx, decision in enumerate(decisions, 1):
            elements.append(Paragraph(f"<b>Decision #{idx}</b>", subheading_style))
            elements.append(Paragraph(f"<i>Title:</i> {decision.get('title', 'Untitled Decision')}", normal_style))
            elements.append(Spacer(1, 0.05*inch))
            
            if decision.get('description'):
                decision_text = decision.get('description', '').replace('\n', '<br/>')
                elements.append(Paragraph(f"<i>Description:</i><br/>{decision_text}", normal_style))
                elements.append(Spacer(1, 0.05*inch))
            
            if decision.get('decision_maker'):
                elements.append(Paragraph(f"<i>Decision Maker:</i> {decision.get('decision_maker', '')}", normal_style))
            
            if decision.get('created_at'):
                elements.append(Paragraph(f"<i>Recorded On:</i> {decision.get('created_at', '')}", normal_style))
            
            elements.append(Spacer(1, 0.2*inch))
    
    # Footer
    elements.append(Spacer(1, 0.5*inch))
    footer_text = f"<i>Report generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}</i>"
    footer = Paragraph(footer_text, ParagraphStyle('Footer', parent=normal_style, fontSize=8, textColor=colors.grey, alignment=TA_CENTER))
    elements.append(footer)
    
    # Build PDF
    doc.build(elements)
    
    # Get the value of the BytesIO buffer and return it
    pdf = buffer.getvalue()
    buffer.close()
    return pdf
