# backend/services/isnap_features.py

"""
Extract 13 behavioral features from iSNAP sessions
Must match Parsons feature definitions for transfer learning
"""

from typing import List, Dict
import statistics

class ISNAPFeatureExtractor:
    """Extract behavioral features matching Parsons definitions"""
    
    def extract_features(self, session: Dict) -> Dict[str, float]:
        """
        Extract all 13 behavioral features from iSNAP session
        """
        events = session['events']
        
        if len(events) < 2:
            return self._empty_features()
        
        features = {
            # Time-based (3)
            'totalTime': self._total_time(session),
            'timeToFirstFeedback': self._time_to_first_feedback(events),
            'avgTimeBetweenActions': self._avg_time_between(events),
            
            # Action patterns (3)
            'manipulationCount': self._count_manipulations(events),
            'feedbackCount': self._count_feedback(events),
            'manipulationToFeedbackRatio': 0,  # Calculated below
            
            # State exploration (4)
            'uniqueStates': self._count_unique_states(events),
            'stateChangeRate': 0,  # Calculated below
            'stateRevisits': self._count_state_revisits(events),
            'maxVisitsToState': self._max_visits_to_state(events),
            
            # Success patterns (2)
            'successRate': self._calculate_success_rate(events),
            'consecutiveFailures': self._max_consecutive_failures(events),
            
            # Error patterns (2)
            'incorrectPositionErrors': self._estimate_position_errors(events),
            'incorrectIndentErrors': self._estimate_indent_errors(events)
        }
        
        # Calculate derived features
        features['manipulationToFeedbackRatio'] = (
            features['manipulationCount'] / max(1, features['feedbackCount'])
        )
        features['stateChangeRate'] = (
            features['uniqueStates'] / max(1, len(events))
        )
        
        return features
    
    def _total_time(self, session: Dict) -> float:
        """Total session duration in milliseconds"""
        return session['end_time'] - session['start_time']
    
    def _time_to_first_feedback(self, events: List[Dict]) -> float:
        """Time until first hint request"""
        start_time = events[0]['time']
        
        for event in events:
            if event['response_type'] == 'HINT_REQUEST':
                return event['time'] - start_time
        
        return 0  # No feedback requested
    
    def _avg_time_between(self, events: List[Dict]) -> float:
        """Average time between consecutive actions"""
        if len(events) < 2:
            return 0
        
        time_diffs = []
        for i in range(1, len(events)):
            time_diffs.append(events[i]['time'] - events[i-1]['time'])
        
        return statistics.mean(time_diffs)
    
    def _count_manipulations(self, events: List[Dict]) -> int:
        """
        Count block manipulation actions
        Maps to Parsons: moveOutput, addOutput, removeOutput
        """
        manipulation_keywords = [
            'add', 'move', 'delete', 'remove', 'insert', 'connect', 'edit', 'change'
        ]
        count = 0
        for event in events:
            action = event['action'].lower()
            if any(keyword in action for keyword in manipulation_keywords):
                count += 1
        return count
    
    def _count_feedback(self, events: List[Dict]) -> int:
        """Count feedback/hint requests"""
        return sum(1 for e in events if e['response_type'] == 'HINT_REQUEST')
    
    def _count_unique_states(self, events: List[Dict]) -> int:
        """Count unique AST states"""
        states = set()
        for event in events:
            if event['ast']:
                states.add(event['ast'])
        return len(states)
    
    def _count_state_revisits(self, events: List[Dict]) -> int:
        """Count states visited more than once"""
        state_visits = {}
        for event in events:
            if event['ast']:
                state_visits[event['ast']] = state_visits.get(event['ast'], 0) + 1
        
        return sum(1 for count in state_visits.values() if count > 1)
    
    def _max_visits_to_state(self, events: List[Dict]) -> int:
        """Maximum visits to any single state"""
        state_visits = {}
        for event in events:
            if event['ast']:
                state_visits[event['ast']] = state_visits.get(event['ast'], 0) + 1
        
        return max(state_visits.values()) if state_visits else 0
    
    def _calculate_success_rate(self, events: List[Dict]) -> float:
        """
        Success rate: hints that led to progress
        """
        hint_events = [e for e in events if e['response_type'] == 'HINT_REQUEST']
        
        if not hint_events:
            return 0
        
        # Check if AST changed after hint
        successful = 0
        for i, hint in enumerate(hint_events):
            hint_index = events.index(hint)
            if hint_index < len(events) - 1:
                before_ast = hint['ast']
                after_ast = events[hint_index + 1]['ast']
                if after_ast != before_ast:
                    successful += 1
        
        return successful / len(hint_events)
    
    def _max_consecutive_failures(self, events: List[Dict]) -> int:
        """Maximum consecutive attempts without progress"""
        max_streak = 0
        current_streak = 0
        last_ast = None
        
        for event in events:
            current_ast = event['ast']
            
            # No progress
            if current_ast == last_ast and event['response_type'] != 'HINT_REQUEST':
                current_streak += 1
                max_streak = max(max_streak, current_streak)
            else:
                current_streak = 0
            
            last_ast = current_ast
        
        return max_streak
    
    def _estimate_position_errors(self, events: List[Dict]) -> int:
        """Estimate position errors from hints"""
        position_errors = 0
        
        for event in events:
            if event['response_type'] == 'HINT_REQUEST' and event['feedback']:
                feedback = str(event['feedback']).lower()
                if any(word in feedback for word in ['order', 'position', 'sequence', 'before', 'after']):
                    position_errors += 1
        
        return position_errors
    
    def _estimate_indent_errors(self, events: List[Dict]) -> int:
        """Estimate indentation errors from hints"""
        indent_errors = 0
        
        for event in events:
            if event['response_type'] == 'HINT_REQUEST' and event['feedback']:
                feedback = str(event['feedback']).lower()
                if any(word in feedback for word in ['indent', 'nest', 'inside', 'block', 'structure']):
                    indent_errors += 1
        
        return indent_errors
    
    def _empty_features(self) -> Dict[str, float]:
        """Empty feature dict for invalid sessions"""
        return {
            'totalTime': 0,
            'timeToFirstFeedback': 0,
            'avgTimeBetweenActions': 0,
            'manipulationCount': 0,
            'feedbackCount': 0,
            'manipulationToFeedbackRatio': 0,
            'uniqueStates': 0,
            'stateChangeRate': 0,
            'stateRevisits': 0,
            'maxVisitsToState': 0,
            'successRate': 0,
            'consecutiveFailures': 0,
            'incorrectPositionErrors': 0,
            'incorrectIndentErrors': 0
        }

# Usage:
# extractor = ISNAPFeatureExtractor()
# features = extractor.extract_features(session)