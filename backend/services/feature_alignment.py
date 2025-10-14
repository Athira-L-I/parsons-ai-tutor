# backend/services/feature_alignment.py

"""
Simple feature alignment between iSNAP and Parsons
Just normalize to 0-1 range
"""

from sklearn.preprocessing import MinMaxScaler
import numpy as np
from typing import List, Dict, Tuple

def align_features(
    isnap_features: List[Dict], 
    parsons_features: List[Dict]
) -> Tuple[np.ndarray, np.ndarray, List[str]]:
    """
    Normalize features from both datasets to 0-1 range
    
    Returns:
    - isnap_normalized: Normalized iSNAP feature matrix
    - parsons_normalized: Normalized Parsons feature matrix
    - feature_names: List of feature names (ordered)
    """
    # Feature names in consistent order
    feature_names = [
        'totalTime', 'timeToFirstFeedback', 'avgTimeBetweenActions',
        'manipulationCount', 'feedbackCount', 'manipulationToFeedbackRatio',
        'uniqueStates', 'stateChangeRate', 'stateRevisits', 'maxVisitsToState',
        'successRate', 'consecutiveFailures',
        'incorrectPositionErrors', 'incorrectIndentErrors'
    ]
    
    # Convert to matrices
    isnap_matrix = dict_list_to_matrix(isnap_features, feature_names)
    parsons_matrix = dict_list_to_matrix(parsons_features, feature_names)
    
    # Fit scaler on combined data
    combined = np.vstack([isnap_matrix, parsons_matrix])
    scaler = MinMaxScaler()
    scaler.fit(combined)
    
    # Normalize both datasets
    isnap_normalized = scaler.transform(isnap_matrix)
    parsons_normalized = scaler.transform(parsons_matrix)
    
    return isnap_normalized, parsons_normalized, feature_names

def dict_list_to_matrix(feature_dicts: List[Dict], feature_names: List[str]) -> np.ndarray:
    """Convert list of feature dicts to numpy matrix"""
    matrix = []
    for features in feature_dicts:
        row = [features.get(name, 0) for name in feature_names]
        matrix.append(row)
    return np.array(matrix)

def check_alignment(isnap_features: np.ndarray, parsons_features: np.ndarray):
    """Quick sanity check - print means and stds"""
    print("\n=== Feature Alignment Check ===")
    print(f"iSNAP samples: {len(isnap_features)}")
    print(f"Parsons samples: {len(parsons_features)}")
    print(f"\niSNAP feature means: {isnap_features.mean(axis=0)[:5]}...")
    print(f"Parsons feature means: {parsons_features.mean(axis=0)[:5]}...")
    print(f"\niSNAP feature stds: {isnap_features.std(axis=0)[:5]}...")
    print(f"Parsons feature stds: {parsons_features.std(axis=0)[:5]}...")
    
    # Check if scales are similar (should be close after normalization)
    scale_diff = np.abs(isnap_features.std(axis=0) - parsons_features.std(axis=0)).mean()
    print(f"\nAverage scale difference: {scale_diff:.3f}")
    print(f"Scales aligned: {'✓ Yes' if scale_diff < 0.5 else '✗ No, check data'}")

# Usage:
# isnap_normalized, parsons_normalized, feature_names = align_features(
#     isnap_feature_dicts,
#     parsons_feature_dicts
# )
# check_alignment(isnap_normalized, parsons_normalized)