import re
import random
from typing import Dict, Any

def generate_parsons_problem(source_code: str) -> Dict[str, Any]:
    """
    Generates a Parsons problem from source code.
    
    This function:
    1. Parses the source code into logical blocks
    2. Adds distractor lines (incorrect options)
    3. Returns the ParsonsSettings object
    """
    # Clean the source code
    lines = source_code.strip().split('\n')
    cleaned_lines = [line for line in lines if line.strip() and not line.strip().startswith('#')]
    
    # Create code blocks based on logical grouping
    code_blocks = []
    current_block = []
    indent_level = 0
    
    for line in cleaned_lines:
        # Check indentation level
        whitespace = len(line) - len(line.lstrip())
        line_indent = whitespace // 4  # Assuming 4 spaces per indent level
        
        # If this line is less indented than previous, it's a new logical block
        if line_indent < indent_level:
            if current_block:
                code_blocks.append('\n'.join(current_block))
                current_block = []
        
        current_block.append(line)
        indent_level = line_indent
    
    # Add the last block if it exists
    if current_block:
        code_blocks.append('\n'.join(current_block))
    
    # Generate distractor lines (incorrect options)
    distractors = [] # generate_distractors(code_blocks)
    
    # Combine regular blocks and distractor blocks for the initial field
    initial_code = '\n'.join(code_blocks)
    initial_with_distractors = initial_code + '\n' + '\n'.join([f"{d} #distractor" for d in distractors])
    
    # Create ParsonsSettings
    settings = {
        "initial": initial_with_distractors,
        "options": {
            "sortableId": "sortable",
            "trashId": "sortableTrash",
            "max_wrong_lines": len(distractors),
            "grader": "ParsonsWidget._graders.LineBasedGrader",
            "can_indent": True,
            "x_indent": 50,
            "exec_limit": 2500,
            "feedback_cb": True,
            "show_feedback": True
        }
    }
    
    return settings

def generate_distractors(code_blocks: list) -> list:
    """
    Generates distractor lines based on the original code blocks.
    
    Strategies for distractors:
    1. Syntax errors (missing colons, incorrect indentation)
    2. Off-by-one errors
    3. Incorrect variable names
    4. Swapped operators
    5. Missing function arguments
    """
    distractors = []
    used_distractors = set()
    
    # Common variable name replacements
    var_replacements = {
        'i': ['j', 'k', 'index'],
        'j': ['i', 'k', 'index'],
        'x': ['y', 'val', 'value'],
        'y': ['x', 'val', 'value'],
        'data': ['values', 'items', 'records'],
        'result': ['output', 'results', 'ret'],
        'list': ['lst', 'array', 'items'],
        'dict': ['map', 'dictionary', 'table'],
        'string': ['str', 'text', 'word'],
        'count': ['total', 'sum', 'counter'],
        'value': ['val', 'item', 'element']
    }
    
    # Operator replacements
    operator_replacements = {
        '==': ['!=', '>=', '<='],
        '!=': ['==', '>=', '<='],
        '>': ['<', '>=', '=='],
        '<': ['>', '<=', '=='],
        '>=': ['<=', '>', '=='],
        '<=': ['>=', '<', '=='],
        '+': ['-', '*', '/'],
        '-': ['+', '*', '/'],
        '*': ['+', '-', '/'],
        '/': ['*', '+', '-'],
        '+=': ['-=', '*=', '='],
        '-=': ['+=', '*=', '='],
        'and': ['or', 'not'],
        'or': ['and', 'not'],
        'in': ['not in'],
        'not in': ['in']
    }
    
    def add_distractor(distractor):
        # Only add if it's not already in the set and not empty
        if distractor and distractor not in used_distractors:
            distractors.append(distractor)
            used_distractors.add(distractor)
    
    # Process each code block to create distractors
    for block in code_blocks:
        lines = block.split('\n')
        
        for line in lines:
            original_line = line.strip()
            if not original_line or original_line.startswith('#'):
                continue
            
            # 1. Missing colon for control structures
            if re.search(r'(if|for|while|def|class|with|try|except|finally).*:$', original_line):
                add_distractor(original_line.replace(':', ''))
            
            # 2. Variable name replacements
            for var, replacements in var_replacements.items():
                pattern = rf'\b{var}\b'
                if re.search(pattern, original_line):
                    for replacement in replacements:
                        distractor = re.sub(pattern, replacement, original_line)
                        add_distractor(distractor)
            
            # 3. Operator replacements
            for op, replacements in operator_replacements.items():
                if op in original_line:
                    for replacement in replacements:
                        distractor = original_line.replace(op, replacement)
                        add_distractor(distractor)
            
            # 4. Off-by-one errors for numbers
            for number in re.finditer(r'\b(\d+)\b', original_line):
                num_val = int(number.group(1))
                distractor1 = original_line[:number.start(1)] + str(num_val + 1) + original_line[number.end(1):]
                distractor2 = original_line[:number.start(1)] + str(num_val - 1) + original_line[number.end(1):]
                add_distractor(distractor1)
                add_distractor(distractor2)
            
            # 5. Missing or extra arguments in function calls
            func_call = re.search(r'(\w+)\((.*?)\)', original_line)
            if func_call:
                func_name = func_call.group(1)
                args = func_call.group(2).split(',')
                
                if args and args[0]:
                    # Remove an argument
                    removed_args = args[1:] if len(args) > 1 else []
                    distractor = original_line.replace(f"{func_name}({func_call.group(2)})", 
                                                      f"{func_name}({', '.join(removed_args)})")
                    add_distractor(distractor)
    
    # Cap the number of distractors to avoid overwhelming the student
    max_distractors = min(len(code_blocks) + 2, 10)
    random.shuffle(distractors)
    return distractors[:max_distractors]