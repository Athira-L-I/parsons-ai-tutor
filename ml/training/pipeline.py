# ml/training/pipeline.py

"""
Transfer Learning Pipeline
Compare three approaches: Baseline, Transfer, Joint
"""

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import numpy as np

class TransferLearningPipeline:
    """
    Three-approach comparison for transfer learning
    
    Approaches:
    1. Baseline: Train only on Parsons data (small dataset)
    2. Transfer: Pre-train on iSNAP, fine-tune on Parsons
    3. Joint: Train on combined iSNAP + Parsons data
    """
    
    def __init__(self, random_state=42):
        self.random_state = random_state
        self.results = {}
    
    def prepare_data(
        self,
        isnap_features: np.ndarray,
        isnap_labels: np.ndarray,
        parsons_features: np.ndarray,
        parsons_labels: np.ndarray,
        test_size: float = 0.2
    ):
        """Prepare train/test splits"""
        # Split Parsons data (our test set)
        self.X_parsons_train, self.X_parsons_test, \
        self.y_parsons_train, self.y_parsons_test = train_test_split(
            parsons_features, parsons_labels,
            test_size=test_size, random_state=self.random_state
        )
        
        # iSNAP data (all for pre-training)
        self.X_isnap = isnap_features
        self.y_isnap = isnap_labels
        
        print(f"Parsons train: {len(self.X_parsons_train)} samples")
        print(f"Parsons test: {len(self.X_parsons_test)} samples")
        print(f"iSNAP: {len(self.X_isnap)} samples")
    
    def train_baseline(self):
        """Approach 1: Train only on Parsons data"""
        print("\n=== Training Baseline Model ===")
        
        model = RandomForestClassifier(
            n_estimators=100,
            random_state=self.random_state
        )
        
        model.fit(self.X_parsons_train, self.y_parsons_train)
        predictions = model.predict(self.X_parsons_test)
        
        self.results['baseline'] = {
            'model': model,
            'accuracy': accuracy_score(self.y_parsons_test, predictions),
            'precision': precision_score(self.y_parsons_test, predictions, zero_division=0),
            'recall': recall_score(self.y_parsons_test, predictions, zero_division=0),
            'f1': f1_score(self.y_parsons_test, predictions, zero_division=0)
        }
        
        print(f"Baseline Accuracy: {self.results['baseline']['accuracy']:.3f}")
        return model
    
    def train_transfer(self):
        """Approach 2: Pre-train on iSNAP, fine-tune on Parsons"""
        print("\n=== Training Transfer Learning Model ===")
        
        # Step 1: Pre-train on iSNAP
        print("Pre-training on iSNAP data...")
        pretrained = RandomForestClassifier(
            n_estimators=100,
            random_state=self.random_state,
            warm_start=True
        )
        pretrained.fit(self.X_isnap, self.y_isnap)
        
        # Step 2: Fine-tune on Parsons
        print("Fine-tuning on Parsons data...")
        pretrained.n_estimators = 150
        pretrained.fit(self.X_parsons_train, self.y_parsons_train)
        
        predictions = pretrained.predict(self.X_parsons_test)
        
        self.results['transfer'] = {
            'model': pretrained,
            'accuracy': accuracy_score(self.y_parsons_test, predictions),
            'precision': precision_score(self.y_parsons_test, predictions, zero_division=0),
            'recall': recall_score(self.y_parsons_test, predictions, zero_division=0),
            'f1': f1_score(self.y_parsons_test, predictions, zero_division=0)
        }
        
        print(f"Transfer Accuracy: {self.results['transfer']['accuracy']:.3f}")
        return pretrained
    
    def train_joint(self):
        """Approach 3: Train on combined iSNAP + Parsons data"""
        print("\n=== Training Joint Model ===")
        
        # Combine training data
        X_combined = np.vstack([self.X_isnap, self.X_parsons_train])
        y_combined = np.concatenate([self.y_isnap, self.y_parsons_train])
        
        model = RandomForestClassifier(
            n_estimators=100,
            random_state=self.random_state
        )
        
        model.fit(X_combined, y_combined)
        predictions = model.predict(self.X_parsons_test)
        
        self.results['joint'] = {
            'model': model,
            'accuracy': accuracy_score(self.y_parsons_test, predictions),
            'precision': precision_score(self.y_parsons_test, predictions, zero_division=0),
            'recall': recall_score(self.y_parsons_test, predictions, zero_division=0),
            'f1': f1_score(self.y_parsons_test, predictions, zero_division=0)
        }
        
        print(f"Joint Accuracy: {self.results['joint']['accuracy']:.3f}")
        return model
    
    def compare_approaches(self):
        """Compare all three approaches"""
        print("\n=== Comparison Results ===")
        print("-" * 70)
        print(f"{'Approach':<15} {'Accuracy':<12} {'Precision':<12} {'Recall':<12} {'F1':<12}")
        print("-" * 70)
        
        for approach in ['baseline', 'transfer', 'joint']:
            if approach not in self.results:
                continue
            
            r = self.results[approach]
            print(f"{approach.capitalize():<15} "
                  f"{r['accuracy']:.3f}        "
                  f"{r['precision']:.3f}        "
                  f"{r['recall']:.3f}        "
                  f"{r['f1']:.3f}")
        
        # Calculate improvements
        if 'baseline' in self.results and 'transfer' in self.results:
            improvement = (self.results['transfer']['accuracy'] - 
                          self.results['baseline']['accuracy']) * 100
            print("-" * 70)
            print(f"Transfer learning improvement: {improvement:+.1f}%")
        
        return self.results
    
    def analyze_feature_importance(self, approach='transfer'):
        """Analyze which features are most important"""
        if approach not in self.results:
            raise ValueError(f"No results for approach: {approach}")
        
        model = self.results[approach]['model']
        importances = model.feature_importances_
        
        return importances

# Usage:
# pipeline = TransferLearningPipeline()
# pipeline.prepare_data(isnap_features, isnap_labels, parsons_features, parsons_labels)
# pipeline.train_baseline()
# pipeline.train_transfer()
# pipeline.train_joint()
# results = pipeline.compare_approaches()
# importances = pipeline.analyze_feature_importance('transfer')