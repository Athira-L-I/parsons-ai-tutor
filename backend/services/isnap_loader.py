# backend/services/isnap_loader.py

"""
Simple iSNAP data loader
Manual download from PSLC DataShop, then parse
"""

import pandas as pd
from typing import List, Dict
import json

def load_isnap_data(filepath='data/isnap/polygonmakerLab.tsv'):
    """
    Load manually downloaded iSNAP data
    
    Download from: https://pslcdatashop.web.cmu.edu/DatasetInfo?datasetId=321
    Export as tab-delimited and save to filepath
    """
    df = pd.read_csv(filepath, sep='\t')
    print(f"Loaded {len(df)} rows from iSNAP dataset")
    print(f"Columns: {df.columns.tolist()}")
    return df

def parse_sessions(df: pd.DataFrame) -> List[Dict]:
    """
    Group iSNAP data by session
    
    Returns list of sessions with events
    """
    sessions = []
    
    for session_id, group in df.groupby('Session Id'):
        # Sort by time
        group = group.sort_values('Time')
        
        # Extract events
        events = []
        for _, row in group.iterrows():
            event = {
                'time': int(row['Time']),
                'action': row['Action'],
                'selection': row['Selection'] if pd.notna(row['Selection']) else None,
                'step_name': row['Step Name'],
                'response_type': row['Student Response Type'],
                'ast': row['CF (AST)'] if pd.notna(row['CF (AST)']) else None,
                'feedback': row['Feedback Text'] if pd.notna(row['Feedback Text']) else None
            }
            events.append(event)
        
        session = {
            'session_id': session_id,
            'student_id': group.iloc[0]['Anon Student Id'],
            'problem_name': group.iloc[0]['Problem Name'],
            'events': events,
            'start_time': int(group['Time'].min()),
            'end_time': int(group['Time'].max())
        }
        sessions.append(session)
    
    print(f"Parsed {len(sessions)} sessions")
    return sessions

def save_parsed_sessions(sessions: List[Dict], output_file='data/isnap/parsed_sessions.json'):
    """Save parsed sessions to JSON"""
    with open(output_file, 'w') as f:
        json.dump(sessions, f, indent=2)
    print(f"Saved {len(sessions)} sessions to {output_file}")

# Usage:
# df = load_isnap_data('data/isnap/polygonmakerLab.tsv')
# sessions = parse_sessions(df)
# save_parsed_sessions(sessions)