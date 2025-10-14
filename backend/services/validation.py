# backend/services/validation.py

"""Simple session validation - pass/fail only"""

import numpy as np
from typing import List, Dict, Tuple

def validate_session(session: Dict) -> Tuple[bool, List[str]]:
    """
    Simple validation - yes/no
    Returns (is_valid, list_of_issues)
    """
    issues = []
    
    # Check 1: Has enough events
    events = session.get('events', [])
    if len(events) < 5:
        issues.append(f"Too few events: {len(events)} (minimum 5)")
    elif len(events) > 500:
        issues.append(f"Too many events: {len(events)} (maximum 500, possible error)")
    
    # Check 2: Has all required features
    features = session.get('features', {})
    required = [
        'totalTime', 'manipulationCount', 'feedbackCount', 
        'uniqueStates', 'successRate', 'consecutiveFailures'
    ]
    for feature in required:
        if feature not in features:
            issues.append(f"Missing feature: {feature}")
    
    # Check 3: No NaN/Inf values
    for feature, value in features.items():
        if value is None:
            issues.append(f"Null feature: {feature}")
        elif isinstance(value, (int, float)):
            if np.isnan(value) or np.isinf(value):
                issues.append(f"Invalid value for {feature}: {value}")
    
    # Check 4: stateHistory exists
    if 'stateHistory' not in session:
        issues.append("Missing stateHistory")
    
    return len(issues) == 0, issues

def validate_dataset(sessions: List[Dict]) -> Dict:
    """
    Check all sessions and return summary
    """
    if not sessions:
        return {
            'total': 0,
            'valid': 0,
            'invalid': 0,
            'pass_rate': 0,
            'common_issues': []
        }
    
    valid_count = 0
    all_issues = []
    invalid_sessions = []
    
    for session in sessions:
        is_valid, issues = validate_session(session)
        if is_valid:
            valid_count += 1
        else:
            invalid_sessions.append({
                'sessionId': session.get('sessionId'),
                'issues': issues
            })
            all_issues.extend(issues)
    
    # Count common issues
    from collections import Counter
    issue_counts = Counter(all_issues)
    
    return {
        'total': len(sessions),
        'valid': valid_count,
        'invalid': len(sessions) - valid_count,
        'pass_rate': valid_count / len(sessions),
        'common_issues': [
            {'issue': issue, 'count': count}
            for issue, count in issue_counts.most_common(5)
        ],
        'invalid_sessions': invalid_sessions[:10]  # First 10 only
    }