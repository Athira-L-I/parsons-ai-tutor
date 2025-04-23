import React, { useEffect, useState } from 'react';
import { useParsonsContext } from '@/contexts/ParsonsContext';
import dynamic from 'next/dynamic';
import SolutionChecker from './SolutionChecker';
import FeedbackPanel from './FeedbackPanel';
import EnhancedProblemUploader from './EnhancedProblemUploader';
import { ParsonsSettings } from '@/@types/types';

const ParsonsPuzzle = dynamic(() => {
  const component = import('./ParsonsPuzzle');
  console.log(component); // Should log the module with ParsonsPuzzle
  return component;
}, { ssr: false });

interface ParsonsProblemContainerProps {
  problemId?: string;
  initialProblem?: ParsonsSettings;
  title?: string;
  description?: string;
  showUploader?: boolean;
}

/**
 * Main container component that brings together all Parsons Problem components
 */
const ParsonsProblemContainer: React.FC<ParsonsProblemContainerProps> = ({
  problemId,
  initialProblem,
  title = 'Parsons Problem',
  description = 'Rearrange the code blocks below to form a correct solution.',
  showUploader = false
}) => {
  const { 
    currentProblem, 
    setCurrentProblem, 
    userSolution, 
    isCorrect, 
    feedback 
  } = useParsonsContext();
  
  const [attempts, setAttempts] = useState(0);
  
  // Initialize with the provided problem if available
  useEffect(() => {
    if (initialProblem && !currentProblem) {
      setCurrentProblem(initialProblem);
    }
  }, [initialProblem, currentProblem, setCurrentProblem]);
  
  // Handle completion of the check
  const handleCheckComplete = (isCorrect: boolean) => {
    setAttempts(prev => prev + 1);
  };
  
  return (
    <div className="parsons-problem-container">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{title}</h1>
        {description && (
          <p className="text-gray-700">{description}</p>
        )}
      </div>
      
      {showUploader && !currentProblem && (
        <EnhancedProblemUploader />
      )}
      
      {currentProblem && (
        <>
          <div className="mb-4">
            <div className="stats flex gap-4 text-sm mb-4">
              <div className="stat bg-gray-100 p-2 rounded">
                <span className="font-medium">Attempts:</span> {attempts}
              </div>
              {isCorrect !== null && (
                <div className={`stat p-2 rounded ${
                  isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  <span className="font-medium">Status:</span> {isCorrect ? 'Correct' : 'Incorrect'}
                </div>
              )}
            </div>
          </div>
          
          <ParsonsPuzzle problemId={problemId} />
          
          <SolutionChecker 
            problemId={problemId} 
            onCheckComplete={handleCheckComplete} 
          />
          
          <FeedbackPanel />
          
          {userSolution.length > 0 && (
            <div className="mt-6 p-4 border rounded-md bg-gray-50">
              <h3 className="text-lg font-semibold mb-2">Current Solution</h3>
              <pre className="bg-white p-3 rounded border font-mono text-sm overflow-x-auto">
                {userSolution.join('\n')}
              </pre>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ParsonsProblemContainer;