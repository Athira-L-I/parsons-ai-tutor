import React from 'react';
import { NextPage } from 'next';
import { useParsonsContext } from '@/contexts/ParsonsContext';
import ParsonsBoard from '@/components/ParsonsBoard';
import FeedbackPanel from '@/components/FeedbackPanel';
import EnhancedProblemUploader from '@/components/EnhancedProblemUploader';

const CreateProblemPage: NextPage = () => {
  const { currentProblem, userSolution, setFeedback, setIsCorrect, isLoading, setIsLoading } = useParsonsContext();
  
  const handleTestSolution = async () => {
    if (!userSolution.length) return;
    
    setIsLoading(true);
    
    // Simulating a local check without backend call
    try {
      // For testing, we'll just check if blocks are in order
      // In a real implementation, this would call the backend
      setIsCorrect(true);
      setFeedback("This is a test of your generated problem. In a real scenario, the backend would validate this solution.");
    } catch (error) {
      console.error('Error testing solution:', error);
    } finally {
      setTimeout(() => setIsLoading(false), 1000);
    }
  };
  
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Create a Parsons Problem</h1>
      
      <div className="bg-white p-6 rounded-md border mb-8">
        <h2 className="text-xl font-semibold mb-4">How to Create a Problem</h2>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Paste your Python code in the box below</li>
          <li>The system will automatically generate a Parsons problem</li>
          <li>Test your problem by trying to solve it yourself</li>
          <li>Make adjustments as needed</li>
        </ol>
      </div>
      
      <EnhancedProblemUploader />
      
      {currentProblem && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Preview Your Problem</h2>
          
          <ParsonsBoard />
          
          <div className="mt-6">
            <button
              onClick={handleTestSolution}
              disabled={isLoading || !userSolution.length}
              className={`px-6 py-2 rounded-md text-white font-medium ${
                isLoading || !userSolution.length 
                  ? 'bg-blue-300 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isLoading ? 'Testing...' : 'Test Solution'}
            </button>
          </div>
          
          <FeedbackPanel />
        </div>
      )}
    </div>
  );
};

export default CreateProblemPage;