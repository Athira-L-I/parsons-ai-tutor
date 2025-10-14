# Add to backend/routers/sessions.py

from fastapi.responses import StreamingResponse
from fastapi import APIRouter, HTTPException
import io
import json
import os
from datetime import datetime
from typing import Optional
from services.progsnap2_export import export_to_progsnap2
from models import SessionSnapshot

# Ensure data directory exists
os.makedirs("data/sessions", exist_ok=True)

router = APIRouter()
@router.post("")
async def save_session(snapshot: SessionSnapshot):
    try:
        filename = f"data/sessions/{snapshot.sessionId}.json"
        data = snapshot.dict()
        data['savedAt'] = datetime.now().isoformat()
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2)
        return {"message": "Session saved successfully", "sessionId": snapshot.sessionId}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save session: {str(e)}")

@router.get("/export/progsnap2")
async def export_progsnap2(school: Optional[str] = None):
    """Export all sessions as ProgSnap2 MainTable.csv"""
    try:
        # Load all sessions
        sessions = []
        for filename in os.listdir("data/sessions"):
            if not filename.endswith('.json'):
                continue

            with open(f"data/sessions/{filename}", 'r') as f:
                session = json.load(f)
            
            # Filter by school if specified
            if school and session.get('schoolId') != school:
                continue
            
            sessions.append(session)
        
        # Convert to ProgSnap2 format
        csv_content = export_to_progsnap2(sessions)
        
        # Return as downloadable file
        return StreamingResponse(
            io.StringIO(csv_content),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=parsons-data-progsnap2.csv"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export: {str(e)}")

@router.get("/stats/summary")
async def get_stats_summary():
    """Get session statistics summary"""
    try:
        # Load all sessions
        sessions = []
        session_dir = "data/sessions"
        
        if not os.path.exists(session_dir):
            os.makedirs(session_dir, exist_ok=True)
            
        for filename in os.listdir(session_dir):
            if not filename.endswith('.json'):
                continue
                
            with open(f"{session_dir}/{filename}", 'r') as f:
                session = json.load(f)
                sessions.append(session)
        
        if not sessions:
            return {
                "total_sessions": 0,
                "unique_students": 0,
                "unique_schools": 0,
                "avg_events_per_session": 0,
                "completed_sessions": 0,
                "completion_rate": 0,
                "by_school": {}
            }
        
        # Calculate stats
        total_sessions = len(sessions)
        unique_students = len(set(s.get('studentId', 'unknown') for s in sessions))
        unique_schools = len(set(s.get('schoolId', 'unknown') for s in sessions))
        
        total_events = sum(len(s.get('events', [])) for s in sessions)
        avg_events = total_events / total_sessions if total_sessions > 0 else 0
        
        # Count completed sessions
        completed_sessions = sum(1 for s in sessions 
                               if any(e.get('type') == 'problem_solved' 
                                     for e in s.get('events', [])))
        
        completion_rate = completed_sessions / total_sessions if total_sessions > 0 else 0
        
        # Sessions by school
        by_school = {}
        for session in sessions:
            school = session.get('schoolId', 'unknown')
            by_school[school] = by_school.get(school, 0) + 1
        
        return {
            "total_sessions": total_sessions,
            "unique_students": unique_students,
            "unique_schools": unique_schools,
            "avg_events_per_session": round(avg_events, 1),
            "completed_sessions": completed_sessions,
            "completion_rate": round(completion_rate, 2),
            "by_school": by_school
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating stats: {str(e)}")

@router.get("")
async def get_sessions(school: Optional[str] = None):
    """Get list of sessions with optional school filter"""
    try:
        sessions = []
        session_dir = "data/sessions"
        
        if not os.path.exists(session_dir):
            return []
            
        for filename in os.listdir(session_dir):
            if not filename.endswith('.json'):
                continue
                
            with open(f"{session_dir}/{filename}", 'r') as f:
                session = json.load(f)
                
                # Filter by school if specified
                if school and session.get('schoolId') != school:
                    continue
                
                # Extract summary
                events = session.get('events', [])
                start_time = events[0]['time'] if events else 0
                end_time = events[-1]['time'] if events else start_time
                
                sessions.append({
                    "sessionId": session.get('sessionId', filename.replace('.json', '')),
                    "studentId": session.get('studentId', 'unknown'),
                    "problemId": session.get('problemId', 'unknown'),
                    "schoolId": session.get('schoolId', 'unknown'),
                    "startTime": start_time,
                    "endTime": end_time,
                    "eventCount": len(events),
                    "features": session.get('features', {})
                })
        
        # Sort by start time (most recent first)
        sessions.sort(key=lambda x: x['startTime'], reverse=True)
        return sessions[:50]  # Limit to 50 most recent
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching sessions: {str(e)}")