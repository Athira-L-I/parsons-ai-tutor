# ml/experiments/run_experiment.py

"""
Complete transfer learning experiment
Run this after collecting both iSNAP and Parsons data
"""

import json
import numpy as np
import sys
import os

# Add parent directories to path
sys.path.append('backend')
from services.isnap_loader import load_isnap_data, parse_sessions
from services.isnap_features import ISNAPFeatureExtractor
from services.feature_alignment import align_features
from training.pipeline import TransferLearningPipeline

def create_struggle_labels(features_list):
    """
    Create struggle labels based on behavioral features
    1 = struggling, 0 = not struggling
    
    Definition of struggling:
    - Low success rate (< 0.5)
    - High consecutive failures (>= 3)
    - High manipulation to feedback ratio (> 10)
    """
    labels = []
    for f in features_list:
        is_struggling = (
            f['successRate'] < 0.5 and
            f['consecutiveFailures'] >= 3 and
            f['manipulationToFeedbackRatio'] > 10
        )
        labels.append(1 if is_struggling else 0)
    return np.array(labels)

def main():
    print("=" * 70)
    print("Transfer Learning Experiment: iSNAP → Parsons")
    print("=" * 70)
    
    # Step 1: Load iSNAP data
    print("\n[1/6] Loading iSNAP data...")
    df = load_isnap_data('data/isnap/polygonmakerLab.tsv')
    isnap_sessions = parse_sessions(df)
    print(f"Loaded {len(isnap_sessions)} iSNAP sessions")
    
    # Step 2: Extract iSNAP features
    print("\n[2/6] Extracting iSNAP features...")
    extractor = ISNAPFeatureExtractor()
    isnap_features_list = []
    for session in isnap_sessions:
        features = extractor.extract_features(session)
        isnap_features_list.append(features)
    print(f"Extracted features for {len(isnap_features_list)} sessions")
    
    # Step 3: Load Parsons data
    print("\n[3/6] Loading Parsons data...")
    parsons_features_list = []
    sessions_dir = 'backend/data/sessions'
    for filename in os.listdir(sessions_dir):
        if not filename.endswith('.json'):
            continue
        with open(f"{sessions_dir}/{filename}", 'r') as f:
            session = json.load(f)
            parsons_features_list.append(session['features'])
    print(f"Loaded {len(parsons_features_list)} Parsons sessions")
    
    # Step 4: Align features
    print("\n[4/6] Aligning features...")
    isnap_normalized, parsons_normalized, feature_names = align_features(
        isnap_features_list,
        parsons_features_list
    )
    print(f"Normalized {len(feature_names)} features")
    
    # Step 5: Create labels
    print("\n[5/6] Creating struggle labels...")
    isnap_labels = create_struggle_labels(isnap_features_list)
    parsons_labels = create_struggle_labels(parsons_features_list)
    print(f"iSNAP struggling: {isnap_labels.sum()}/{len(isnap_labels)} "
          f"({isnap_labels.mean()*100:.1f}%)")
    print(f"Parsons struggling: {parsons_labels.sum()}/{len(parsons_labels)} "
          f"({parsons_labels.mean()*100:.1f}%)")
    
    # Step 6: Run transfer learning experiment
    print("\n[6/6] Running transfer learning experiment...")
    pipeline = TransferLearningPipeline()
    
    pipeline.prepare_data(
        isnap_normalized, isnap_labels,
        parsons_normalized, parsons_labels,
        test_size=0.2
    )
    
    # Train all three approaches
    pipeline.train_baseline()
    pipeline.train_transfer()
    pipeline.train_joint()
    
    # Compare results
    results = pipeline.compare_approaches()
    
    # Analyze feature importance
    print("\n=== Feature Importance (Transfer Model) ===")
    importances = pipeline.analyze_feature_importance('transfer')
    feature_importance = sorted(
        zip(feature_names, importances),
        key=lambda x: x[1],
        reverse=True
    )
    
    for i, (feature, importance) in enumerate(feature_importance[:10], 1):
        print(f"{i:2}. {feature:30} {importance:.3f}")
    
    # Save results
    print("\n=== Saving Results ===")
    output_dir = 'ml/results'
    os.makedirs(output_dir, exist_ok=True)
    
    with open(f'{output_dir}/transfer_learning_results.json', 'w') as f:
        json.dump({
            'baseline': {k: v for k, v in results['baseline'].items() if k != 'model'},
            'transfer': {k: v for k, v in results['transfer'].items() if k != 'model'},
            'joint': {k: v for k, v in results['joint'].items() if k != 'model'},
            'feature_importance': [
                {'feature': f, 'importance': float(i)}
                for f, i in feature_importance
            ],
            'dataset_info': {
                'isnap_sessions': len(isnap_sessions),
                'parsons_sessions': len(parsons_features_list),
                'isnap_struggling': int(isnap_labels.sum()),
                'parsons_struggling': int(parsons_labels.sum())
            }
        }, f, indent=2)
    
    print(f"Results saved to {output_dir}/transfer_learning_results.json")
    print("\n✓ Experiment complete!")

if __name__ == '__main__':
    main()