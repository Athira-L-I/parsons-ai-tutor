import React from 'react';
import { useParsonsContext } from '@/contexts/ParsonsContext';

const FeedbackPanel: React.FC = () => {
  const { feedback, isCorrect, isLoading } = useParsonsContext();

  return (
    <div className="mt-6 p-4 border rounded-md">
      <h3 className="text-lg font-semibold mb-2">Feedback</h3>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-24">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div>
          {isCorrect === true && (
            <div className="p-3 bg-green-100 text-green-800 rounded mb-3">
              <span className="font-bold">Correct!</span> Your solution is right.
            </div>
          )}
          
          {isCorrect === false && (
            <div className="p-3 bg-red-100 text-red-800 rounded mb-3">
              <span className="font-bold">Not quite right.</span> Try again with the hints below.
            </div>
          )}
          
          {feedback ? (
            <div className="prose max-w-none">
              <h4 className="text-md font-medium mb-2">Hint:</h4>
              <p className="text-gray-700 whitespace-pre-line">{feedback}</p>
            </div>
          ) : (
            <p className="text-gray-500 italic">
              {isCorrect === null ? 
                "Submit your solution to get feedback" : 
                "No specific hints available at this time"
              }
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default FeedbackPanel;