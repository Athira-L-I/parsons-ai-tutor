import React, { useEffect, useState } from 'react';
import { useParsonsContext } from '@/contexts/ParsonsContext';
import { loadParsonsWidget, isParsonsWidgetLoaded } from '@/lib/parsonsLoader';
import ParsonsWidgetComponent from './ParsonsWidget';
import FeedbackPanel from './FeedbackPanel';

// Update the component's props interface
interface ParsonsPuzzleIntegratedProps {
  problemId?: string;
  title?: string;
  description?: string;
  onCheckSolution?: (isCorrect: boolean) => void;
}

const ParsonsPuzzleIntegrated: React.FC<ParsonsPuzzleIntegratedProps> = ({ 
  problemId,
  title = 'Parsons Problem',
  description = 'Rearrange the code blocks to form a correct solution.',
  onCheckSolution 
}) => {
  const { currentProblem, isCorrect, setUserSolution } = useParsonsContext();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Load the Parsons widget dependencies
  useEffect(() => {
    if (!isParsonsWidgetLoaded()) {
      setIsLoading(true);
      
      loadParsonsWidget()
        .then((success) => {
          if (!success) {
            setLoadError('Failed to load Parsons widget dependencies');
          }
          setIsLoading(false);
        })
        .catch((error) => {
          console.error('Error loading Parsons widget:', error);
          setLoadError('Error loading Parsons widget: ' + error.message);
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);
  
  // Add this to call onCheckSolution when solution is checked
  const handleSolutionChange = (solution: string[]) => {
    setUserSolution(solution);
    // No need to call onCheckSolution here, it will be called after checking the solution
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (loadError) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p><strong>Error:</strong> {loadError}</p>
        <p>Please try refreshing the page or contact support if the problem persists.</p>
      </div>
    );
  }
  
  // Pass onCheckSolution to ParsonsWidget
  return (
    <div className="parsons-puzzle-integrated">
      {/* No title or description here - these are handled by the parent container */}
      
      {currentProblem && (
        <>
          {/* No status information here either */}
          
          <ParsonsWidgetComponent 
            problemId={problemId}
            onSolutionChange={handleSolutionChange}
            onCheckSolution={onCheckSolution}
          />
          
          {/* No FeedbackPanel here */}
        </>
      )}
    </div>
  );
};

export default ParsonsPuzzleIntegrated;