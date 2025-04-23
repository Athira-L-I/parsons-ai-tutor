from typing import Dict, List, Any

def validate_solution(problem_settings: Dict[str, Any], user_solution: List[str]) -> Dict[str, Any]:
    """
    Validates if the user's solution matches the expected correct solution.
    
    Args:
        problem_settings: The ParsonsSettings of the problem
        user_solution: The user's submitted solution as a list of code lines
    
    Returns:
        A SolutionValidation object with isCorrect flag and optional details
    """
    # Extract the correct solution lines from the problem settings
    initial_code = problem_settings["initial"]
    correct_lines = []
    
    # Process each line in the initial code
    for line in initial_code.split('\n'):
        # Skip empty lines
        if not line.strip():
            continue
        
        # Skip distractor lines (marked with #distractor)
        if '#distractor' in line:
            continue
        
        # Add this line to the correct solution
        correct_lines.append(line.strip())
    
    # Clean user solution lines
    cleaned_user_solution = [line.strip() for line in user_solution if line.strip()]
    
    # Compare the solutions
    is_correct = (len(cleaned_user_solution) == len(correct_lines))
    
    if is_correct:
        # Check each line
        for i, (user_line, correct_line) in enumerate(zip(cleaned_user_solution, correct_lines)):
            # Normalize whitespace and compare
            if user_line.strip() != correct_line.strip():
                is_correct = False
                break
    
    # Return the validation result
    return {
        "isCorrect": is_correct,
        "details": "Solution is correct!" if is_correct else "Solution does not match the expected output."
    }