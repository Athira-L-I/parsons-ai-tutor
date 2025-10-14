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