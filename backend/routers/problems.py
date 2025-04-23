from fastapi import APIRouter, HTTPException
from models import Problem, SourceCodeUpload, ParsonsSettings
from services.problem_generator import generate_parsons_problem
import uuid
from datetime import datetime
import json
import os

router = APIRouter()

# Sample data storage (would be replaced with a proper database)
PROBLEMS_FILE = "data/problems.json"

def load_problems():
    if not os.path.exists("data"):
        os.makedirs("data")
    
    if not os.path.exists(PROBLEMS_FILE):
        with open(PROBLEMS_FILE, "w") as f:
            json.dump([], f)
        return []
    
    with open(PROBLEMS_FILE, "r") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return []

def save_problems(problems):
    with open(PROBLEMS_FILE, "w") as f:
        json.dump(problems, f, indent=2)

@router.get("/")
async def get_all_problems():
    """
    Get all available Parsons problems
    """
    problems = load_problems()
    
    # Add a random completed status for frontend demo
    import random
    for problem in problems:
        if "completed" not in problem:
            problem["completed"] = random.choice([True, False])
    
    return problems

@router.get("/{problem_id}")
async def get_problem(problem_id: str):
    """
    Get a specific Parsons problem by ID
    """
    problems = load_problems()
    problem = next((p for p in problems if p["id"] == problem_id), None)
    
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    return problem

@router.post("/generate")
async def create_problem(source_code: SourceCodeUpload):
    """
    Generate a new Parsons problem from source code
    """
    try:
        # Generate the problem using the service
        parsons_settings = generate_parsons_problem(source_code.sourceCode)
        
        # Create problem metadata
        now = datetime.now().isoformat()
        problem = {
            "id": str(uuid.uuid4()),
            "title": "Generated Problem",
            "description": "This problem was automatically generated from provided source code.",
            "difficulty": "medium",
            "tags": ["python", "generated"],
            "parsonsSettings": parsons_settings,
            "createdAt": now,
            "updatedAt": now
        }
        
        # Save the problem
        problems = load_problems()
        problems.append(problem)
        save_problems(problems)
        
        return problem
    
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to generate problem: {str(e)}"
        )

@router.delete("/{problem_id}")
async def delete_problem(problem_id: str):
    """
    Delete a Parsons problem
    """
    problems = load_problems()
    filtered_problems = [p for p in problems if p["id"] != problem_id]
    
    if len(problems) == len(filtered_problems):
        raise HTTPException(status_code=404, detail="Problem not found")
    
    save_problems(filtered_problems)
    return {"message": "Problem deleted successfully"}