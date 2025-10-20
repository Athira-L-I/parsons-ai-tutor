import os
import openai
from dotenv import load_dotenv
from pathlib import Path
from typing import Dict, List, Any

# Get the current file's directory
current_dir = Path(__file__).parent

# Construct the relative path to .env.local
dotenv_path = current_dir.parent.parent / ".env.local"

# Load the .env.local file
load_dotenv(dotenv_path=dotenv_path)

# Configure OpenAI API
openai.api_key = os.getenv("OPENAI_API_KEY")

def generate_feedback(problem_settings: Dict[str, Any], user_solution: List[str], error_context: Dict[str, Any] = None) -> str:
    """
    Generates Socratic feedback for a student's solution attempt using AI.
    
    Args:
        problem_settings: The ParsonsSettings of the problem
        user_solution: The user's submitted solution as a list of code lines
        error_context: Information about the specific error from the widget
    
    Returns:
        A string containing Socratic-style feedback
    """
    # Extract the correct solution and user solution
    initial_code = problem_settings["initial"]
    correct_lines = [line for line in initial_code.split('\n') if line.strip() and '#distractor' not in line]
    
    # Clean user solution lines
    cleaned_user_solution = [line.strip() for line in user_solution if line.strip()]
    
    # If no OpenAI API key is available, use a fallback method
    if not openai.api_key:
        return generate_fallback_feedback(correct_lines, cleaned_user_solution, error_context)
    
    try:
        # ✅ ENHANCED: Include error context in prompt
        error_info = ""
        if error_context:
            error_type = error_context.get('errorType', 'unknown')
            error_lines = error_context.get('errorLines', [])
            widget_message = error_context.get('widgetMessage', '')
            
            if error_type == 'incorrectPosition' and error_lines:
                error_info = f"""
                
        The widget detected that line {error_lines[0]} is in the wrong position.
        The widget told the student: "{widget_message}"
        
        Focus your Socratic questioning on helping them understand the logical order of operations.
        Ask them to think about what should happen before and after this step.
                """
            elif error_type == 'incorrectIndent' and error_lines:
                error_info = f"""
                
        The widget detected that line {error_lines[0]} has incorrect indentation.
        The widget told the student: "{widget_message}"
        
        Focus your Socratic questioning on helping them understand Python's indentation rules and code block structure.
                """
            elif error_type == 'tooFewLines':
                error_info = f"""
                
        The widget detected that the student's solution has too few lines.
        The widget told the student: "{widget_message}"
        
        Focus your Socratic questioning on helping them identify missing code blocks.
                """

        # Create a prompt for the AI
        prompt = f"""
        I'm helping a student learn programming through Parsons problems (code reordering exercises).
        
        The correct solution is:
        ```python
        {"\n".join(correct_lines)}
        ```
        
        The student's current attempt is:
        ```python
        {"\n".join(cleaned_user_solution)}
        ```
        
        {error_info}
        
        Please provide Socratic-style feedback - guide the student with questions rather than giving away the answer.
        Focus on the specific error type mentioned above and help them discover the issue through questioning.
        
        Important:
        - Don't directly tell them the correct order
        - Ask thought-provoking questions that lead them to discover errors
        - Focus on the specific error mentioned in the error context
        - Be encouraging and positive
        - Keep your response brief and targeted (2-3 sentences, with 1-2 questions)
        """
        
        # Call the OpenAI API
        client = openai.OpenAI()
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",  # Can be configured based on needs
            messages=[
                {"role": "system", "content": "You are a helpful programming tutor using the Socratic method."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=200,  # Keep responses concise
            temperature=0.7,  # Some creativity but not too random
        )
        
        # Extract and return the generated feedback
        feedback = response.choices[0].message.content.strip()
        return feedback
    
    except Exception as e:
        # If API call fails, use the fallback method
        print(f"OpenAI API error: {str(e)}")
        return generate_fallback_feedback(correct_lines, cleaned_user_solution, error_context)

def generate_fallback_feedback(correct_lines: List[str], user_solution: List[str], error_context: Dict[str, Any] = None) -> str:
    """
    Generates simple feedback without using AI when the API is unavailable.
    
    Args:
        correct_lines: The correct solution lines
        user_solution: The user's submitted solution lines
        error_context: Information about the specific error from the widget
    
    Returns:
        A string containing simple feedback
    """
    # ✅ FIXED: Use error context instead of generic line count check
    if error_context:
        error_type = error_context.get('errorType', 'unknown')
        error_lines = error_context.get('errorLines', [])
        
        if error_type == 'incorrectPosition' and error_lines:
            return f"I notice that line {error_lines[0]} might not be in the right place. What should happen before this step in your program?"
        elif error_type == 'incorrectIndent' and error_lines:
            return f"I notice line {error_lines[0]} has an indentation issue. In Python, which lines should be indented together as a group?"
        elif error_type == 'tooFewLines':
            return "It looks like you might be missing some code blocks. Have you included all the necessary statements for this program?"
        elif error_type == 'tooManyLines':
            return "It seems like you might have extra code blocks. Are all the lines you've included necessary for this program?"
    
    # ✅ FALLBACK: Generic feedback when no error context
    if len(user_solution) != len(correct_lines):
        return "I notice your solution has a different number of lines than expected. Have you included all the necessary code blocks? Are there any blocks that might not belong?"
    
    # Find the first mismatch
    for i, (user_line, correct_line) in enumerate(zip(user_solution, correct_lines)):
        if user_line != correct_line:
            # Try to give a hint based on the type of mismatch
            if i == 0:
                return "I'm looking at the very first line of your solution. Is this the right place to start? What should happen first in this program?"
            
            # Check if it's a control structure mismatch
            if any(keyword in correct_line for keyword in ["if", "for", "while", "def"]):
                return f"Take a look at line {i+1} of your solution. Should this be a control structure? What would be the logical flow at this point in the program?"
            
            # Check if it's likely a logic/algorithm step
            if "=" in correct_line or "return" in correct_line:
                return f"Consider line {i+1}. What operation needs to happen at this point in the program? What values do we need to calculate or return?"
            
            # Generic feedback
            return f"I'm noticing an issue around line {i+1}. What do you think should happen at this point in the program flow?"
    
    # Should not reach here if validation determined the solution is incorrect
    return "I see some issues with your solution. Can you review the logical flow of your program? What should happen first, and what operations follow?"