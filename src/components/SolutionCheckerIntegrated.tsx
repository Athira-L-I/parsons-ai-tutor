import React, { useState } from 'react';
import { useParsonsContext } from '@/contexts/ParsonsContext';
import { ValidationService } from '@/lib/validationServiceIntegrated';
import { isParsonsWidgetLoaded } from '@/lib/parsonsLoader';

interface SolutionCheckerProps {
  problemId?: string;
  onCheckComplete?: (isCorrect: boolean) => void;
}

const SolutionCheckerIntegrated: React.FC<SolutionCheckerProps> = ({ 
  problemId,
  onCheckComplete
}) => {
  const { 
    currentProblem, 
    userSolution, 
    setFeedback, 
    setIsCorrect, 
    isCorrect,
    isLoading, 
    setIsLoading 
  } = useParsonsContext();
  
  const [validationService] = useState(() => new ValidationService());
  
  const handleCheckSolution = async () => {
    if (!userSolution.length) {
      setFeedback("Please arrange some code blocks before checking your solution.");
      return;
    }
    
    setIsLoading(true);
    
    try {
      let checkResult;
      
      // First, try to use the Parsons widget if available
      if (isParsonsWidgetLoaded() && currentProblem) {
        checkResult = validationService.validateSolutionWithParsonsWidget(
          currentProblem, 
          userSolution
        );
        setIsCorrect(checkResult.isCorrect);
        
        if (checkResult.isCorrect) {
          setFeedback("Great job! Your solution is correct.");
        } else {
          // Generate better feedback
          if (problemId) {
            try {
              const feedbackText = await validationService.generateFeedback(problemId, userSolution);
              setFeedback(feedbackText);
            } catch (err) {
              setFeedback(checkResult.details);
            }
          } else {
            setFeedback(checkResult.details);
          }
        }
      } 
      // If Parsons widget is not loaded, try API validation
      else if (problemId) {
        checkResult = await validationService.validateSolution(problemId, userSolution);
        setIsCorrect(checkResult.isCorrect);
        
        if (checkResult.isCorrect) {
          setFeedback("Great job! Your solution is correct.");
        } else {
          const feedbackText = await validationService.generateFeedback(problemId, userSolution);
          setFeedback(feedbackText);
        }
      } 
      // Fallback to local validation if neither API nor Parsons widget is available
      else if (currentProblem) {
        checkResult = validationService.validateSolutionLocally(currentProblem, userSolution);
        setIsCorrect(checkResult.isCorrect);
        
        if (checkResult.isCorrect) {
          setFeedback("Great job! Your solution is correct.");
        } else {
          const feedbackText = validationService.generateLocalFeedback(currentProblem, userSolution);
          setFeedback(feedbackText);
        }
      } else {
        setFeedback("No problem is currently loaded.");
        checkResult = { isCorrect: false, details: "No problem loaded" };
        setIsCorrect(false);
      }
      
      // Call the callback if provided
      if (onCheckComplete && checkResult) {
        onCheckComplete(checkResult.isCorrect);
      }
    } catch (error) {
      console.error('Error checking solution:', error);
      setFeedback("There was an error checking your solution. Please try again.");
      setIsCorrect(false);
      
      // Call the callback with false in case of error
      if (onCheckComplete) {
        onCheckComplete(false);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="mt-6">
      <button
        onClick={handleCheckSolution}
        disabled={isLoading || !userSolution.length}
        className={`px-6 py-2 rounded-md text-white font-medium ${
          isLoading || !userSolution.length 
            ? 'bg-blue-300 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {isLoading ? 'Checking...' : 'Check Solution'}
      </button>
      
      {userSolution.length === 0 && (
        <p className="mt-2 text-sm text-gray-500">
          Arrange code blocks to build your solution, then click "Check Solution".
        </p>
      )}
    </div>
  );
};

export default SolutionCheckerIntegrated;