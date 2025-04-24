import React, { useEffect, useState } from 'react';
import { useParsonsContext } from '@/contexts/ParsonsContext';
import { loadParsonsWidget, isParsonsWidgetLoaded } from '@/lib/parsonsLoader';
import ParsonsWidgetComponent from './ParsonsWidget';
import FeedbackPanel from './FeedbackPanel';

interface ParsonsPuzzleIntegratedProps {
  problemId?: string;
  title?: string;
  description?: string;
}

const ParsonsPuzzleIntegrated: React.FC<ParsonsPuzzleIntegratedProps> = ({ 
  problemId,
  title = 'Parsons Problem',
  description = 'Rearrange the code blocks to form a correct solution.'
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
  
  const handleSolutionChange = (solution: string[]) => {
    setUserSolution(solution);
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
  
  return (
    <div className="parsons-problem-container">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{title}</h1>
        {description && (
          <p className="text-gray-700">{description}</p>
        )}
      </div>
      
      {currentProblem && (
        <>
          <div className="mb-4">
            <div className="stats flex gap-4 text-sm mb-4">
              {isCorrect !== null && (
                <div className={`stat p-2 rounded ${
                  isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  <span className="font-medium">Status:</span> {isCorrect ? 'Correct' : 'Incorrect'}
                </div>
              )}
            </div>
          </div>
          
          <ParsonsWidgetComponent 
            problemId={problemId}
            onSolutionChange={handleSolutionChange}
          />
          
          <FeedbackPanel />
        </>
      )}
    </div>
  );
};

export default ParsonsPuzzleIntegrated;