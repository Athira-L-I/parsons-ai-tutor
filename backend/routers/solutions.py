from fastapi import APIRouter, HTTPException
from models import SolutionSubmission, SolutionValidation
from services.solution_validator import validate_solution
from routers.problems import load_problems

router = APIRouter()

@router.post("/validate")
async def check_solution(submission: SolutionSubmission) -> SolutionValidation:
    """
    Validate a submitted solution for a Parsons problem
    """
    # Get the problem
    problems = load_problems()
    problem = next((p for p in problems if p["id"] == submission.problemId), None)
    
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Validate the solution
    try:
        result = validate_solution(problem["parsonsSettings"], submission.solution)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to validate solution: {str(e)}"
        )