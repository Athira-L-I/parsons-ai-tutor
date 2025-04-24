import React, { useEffect } from 'react';
import { useParsonsContext } from '@/contexts/ParsonsContext';

const FeedbackPanel: React.FC = () => {
  // Use both feedback types from context
  const { feedback, socraticFeedback, isCorrect, isLoading } = useParsonsContext();

  // Add debug logging
  useEffect(() => {
    console.log("FeedbackPanel state:", { 
      feedback: feedback ? "present" : "null", 
      socraticFeedback: socraticFeedback ? "present" : "null",
      isCorrect, 
      isLoading 
    });
  }, [feedback, socraticFeedback, isCorrect, isLoading]);

  return (
    <div className="mt-6 p-4 border rounded-md">
      <h3 className="text-lg font-semibold mb-2">Feedback</h3>
      
      {/* Optional: Add debug info */}
      <div className="text-xs text-gray-400 mb-2">
        Debug: feedback={feedback ? "yes" : "no"}, 
        socraticFeedback={socraticFeedback ? "yes" : "no"}
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-24">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div>
          {isCorrect === true && (
            <div className="p-3 bg-parsons-correct text-green-800 rounded mb-3">
              <span className="font-bold">Correct!</span> Your solution is right.
            </div>
          )}
          
          {isCorrect === false && (
            <div>
              <div className="p-3 bg-parsons-incorrect text-red-800 rounded mb-3">
                <span className="font-bold">Not quite right.</span> Try again with the hints below.
              </div>
              
              {/* Parsons Widget Feedback */}
              {feedback && (
                <div className="prose max-w-none mb-4">
                  <h4 className="text-md font-medium mb-2">Technical Issues:</h4>
                  <div 
                    className="bg-white p-3 rounded border text-sm"
                    dangerouslySetInnerHTML={{ __html: feedback }}
                  />
                </div>
              )}
              
              {/* Socratic Feedback */}
              {socraticFeedback && (
                <div className="prose max-w-none">
                  <h4 className="text-md font-medium mb-2">Learning Hint:</h4>
                  <div 
                    className="bg-white p-3 rounded border text-sm border-blue-200 bg-blue-50"
                    dangerouslySetInnerHTML={{ __html: socraticFeedback }}
                  />
                </div>
              )}
              
              {!feedback && !socraticFeedback && (
                <p className="text-gray-500 italic">
                  Check your code ordering and indentation for errors.
                </p>
              )}
            </div>
          )}
          
          {isCorrect === null && (
            <p className="text-gray-500 italic">
              Submit your solution to get feedback
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default FeedbackPanel;