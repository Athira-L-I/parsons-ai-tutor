# backend/services/progsnap2_export.py

"""
Simplified ProgSnap2 exporter - 8 essential columns
"""

import csv
import io
import json
from typing import List, Dict, Any
from datetime import datetime

def export_to_progsnap2(sessions: List[Dict[str, Any]]) -> str:
    """
    Export sessions to ProgSnap2 MainTable.csv format
    
    Columns (8 essential):
    - EventType: Type of event (Session.Start, File.Edit, Run.Program)
    - SessionID: Session identifier
    - Order: Sequential order of events
    - SubjectID: Student identifier
    - ProblemID: Problem identifier
    - CodeStateID: Hash of code state
    - Timestamp: When event occurred
    - EventData: Full event metadata (JSON)
    """
    rows = []
    
    for session in sessions:
        session_id = session['sessionId']
        subject_id = session['studentId']
        problem_id = session['problemId']
        
        for i, event in enumerate(session.get('events', [])):
            # Map event type to ProgSnap2 standard
            event_type = map_event_type(event['type'])
            
            # Timestamp
            timestamp = datetime.fromtimestamp(event['time'] / 1000).isoformat()
            
            # Extract X-HintData for hint events
            hint_data = ''
            if event['type'].startswith('X-Hint.'):
                metadata = event.get('metadata', {})
                if 'X-HintData' in metadata:
                    hint_data = json.dumps(metadata['X-HintData'])
            
            row = {
                'EventType': event_type,
                'SessionID': session_id,
                'Order': i,
                'SubjectID': subject_id,
                'ProblemID': problem_id,
                'CodeStateID': event.get('output', ''),
                'Timestamp': timestamp,
                'EventData': json.dumps(event),
                'X-HintData': hint_data
            }
            rows.append(row)
    
    # Convert to CSV string
    if not rows:
        return "EventType,SessionID,Order,SubjectID,ProblemID,CodeStateID,Timestamp,EventData,X-HintData\n"
    
    output = io.StringIO()
    fieldnames = [
        'EventType', 'SessionID', 'Order', 'SubjectID', 
        'ProblemID', 'CodeStateID', 'Timestamp', 'EventData', 'X-HintData'
    ]
    
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)
    
    return output.getvalue()

def map_event_type(event_type: str) -> str:
    """Map Parsons event types to ProgSnap2 standard"""
    mapping = {
        'init': 'Session.Start',
        'moveOutput': 'File.Edit',
        'addOutput': 'File.Edit',
        'removeOutput': 'File.Edit',
        'moveInput': 'File.Edit',
        'feedback': 'Run.Program',
        'toggle': 'File.Edit',
        'X-Hint.Widget': 'X-Hint.Widget',
        'X-Hint.Socratic': 'X-Hint.Socratic',
        'problem_solved': 'Session.End'
    }
    return mapping.get(event_type, 'X-Unknown')