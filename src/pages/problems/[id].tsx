import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { NextPage } from 'next';
import { fetchProblemById, checkSolution, generateFeedback } from '@/lib/api';
import { useParsonsContext } from '@/contexts/ParsonsContext';
import ParsonsBoard from '@/components/ParsonsBoard';
import FeedbackPanel from '@/components/FeedbackPanel';

const ProblemPage: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { 
    currentProblem, 
    setCurrentProblem, 
    userSolution, 
    setFeedback, 
    setIsCorrect, 
    isCorrect, 
    isLoading, 
    setIsLoading 
  } = useParsonsContext();
  
  const [title, setTitle] = useState('Loading problem...');
  const [description, setDescription] = useState('');
  
  useEffect(() => {
    if (id && typeof id === 'string') {
      const loadProblem = async () => {
        try {
          const data = await fetchProblemById(id);
          setCurrentProblem(data.parsonsSettings);
          setTitle(data.title);
          setDescription(data.description);
        } catch (error) {
          console.error('Failed to fetch problem:', error);
        }
      };
      
      loadProblem();
    }
  }, [id, setCurrentProblem]);
  
  const handleCheckSolution = async () => {
    if (!id || !userSolution.length) return;
    
    setIsLoading(true);
    
    try {
      // First check if the solution is correct
      const checkResult = await checkSolution(id.toString(), userSolution);
      setIsCorrect(checkResult.isCorrect);
      
      // If not correct, get AI feedback
      if (!checkResult.isCorrect) {
        const feedbackText = await generateFeedback(id.toString(), userSolution);
        setFeedback(feedbackText);
      } else {
        setFeedback("Great job! Your solution is correct.");
      }
    } catch (error) {
      console.error('Error checking solution:', error);
      setFeedback("There was an error checking your solution. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">{title}</h1>
      
      {description && (
        <div className="mb-6 p-4 bg-white rounded-md border">
          <h2 className="text-lg font-medium mb-2">Problem Description</h2>
          <p className="text-gray-700">{description}</p>
        </div>
      )}
      
      {currentProblem ? (
        <>
          <ParsonsBoard />
          
          <div className="mt-6 flex gap-4">
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
            
            <button
              onClick={() => router.back()}
              className="px-6 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
            >
              Back to Problems
            </button>
          </div>
          
          <FeedbackPanel />
        </>
      ) : (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}
    </div>
  );
};

export default ProblemPage;