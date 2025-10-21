import React, { useState } from 'react';
import { useParsonsContext } from '@/contexts/ParsonsContext';
import { ValidationService } from '@/lib/validationService';
import {
  applyPositionFeedback,
  applyIndentationFeedback,
} from '@/lib/parsonsFeedback';

interface SolutionCheckerProps {
  problemId?: string;
  onCheckComplete?: (isCorrect: boolean) => void;
}

const SolutionChecker: React.FC<SolutionCheckerProps> = ({
  problemId,
  onCheckComplete,
}) => {
  const {
    currentProblem,
    userSolution,
    setFeedback,
    setIsCorrect,
    isCorrect,
    isLoading,
    setIsLoading,
  } = useParsonsContext();

  const [validationService] = useState(() => new ValidationService());

  const handleCheckSolution = async () => {
    if (!userSolution.length) {
      setFeedback(
        'Please arrange some code blocks before checking your solution.'
      );
      return;
    }

    setIsLoading(true);

    try {
      let checkResult;

      if (problemId) {
        // Use backend validation
        checkResult = await validationService.validateSolution(
          problemId,
          userSolution
        );
        setIsCorrect(checkResult.isCorrect);

        // Apply visual feedback
        if (currentProblem) {
          const positionFeedback = applyPositionFeedback(
            userSolution,
            currentProblem.initial.split('\n')
          );
          const indentFeedback = applyIndentationFeedback(
            userSolution,
            currentProblem.initial.split('\n')
          );
          // Apply feedback to DOM elements...
        }

        // Generate Socratic feedback if incorrect
        if (!checkResult.isCorrect) {
          const feedbackText = await validationService.generateFeedback(
            problemId,
            userSolution
          );
          setFeedback(feedbackText);
        } else {
          setFeedback('Great job! Your solution is correct.');
        }
      } else if (currentProblem) {
        // Use local validation
        checkResult = validationService.validateSolutionLocally(
          currentProblem,
          userSolution
        );
        setIsCorrect(checkResult.isCorrect);

        // Generate local feedback
        if (!checkResult.isCorrect) {
          const feedbackText = validationService.generateLocalFeedback(
            currentProblem,
            userSolution
          );
          setFeedback(feedbackText);
        } else {
          setFeedback('Great job! Your solution is correct.');
        }
      } else {
        setFeedback('No problem is currently loaded.');
        checkResult = { isCorrect: false };
        setIsCorrect(false);
      }

      // Call the callback if provided with the correct result
      if (onCheckComplete) {
        onCheckComplete(checkResult.isCorrect);
      }
    } catch (error) {
      console.error('Error checking solution:', error);
      setFeedback(
        'There was an error checking your solution. Please try again.'
      );
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
          Arrange code blocks to build your solution, then click "Check
          Solution".
        </p>
      )}
    </div>
  );
};

export default SolutionChecker;
