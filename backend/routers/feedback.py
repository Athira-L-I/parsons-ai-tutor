from fastapi import APIRouter, HTTPException
from models import FeedbackRequest, FeedbackResponse
from services.feedback_generator import generate_feedback
from routers.problems import load_problems

router = APIRouter()

@router.post("", response_model=FeedbackResponse)
async def get_feedback(request: FeedbackRequest):
    """
    Generate AI-based Socratic feedback for a student's solution attempt
    """
    # Get the problem
    problems = load_problems()
    problem = next((p for p in problems if p["id"] == request.problemId), None)
    
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Generate feedback
    try:
        feedback = generate_feedback(
            problem["parsonsSettings"], 
            request.userSolution
        )
        
        return {"feedback": feedback}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate feedback: {str(e)}"
        )