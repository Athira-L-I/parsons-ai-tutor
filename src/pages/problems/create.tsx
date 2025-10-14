import React, { useEffect } from 'react';
import { NextPage } from 'next';
import { useParsonsContext } from '@/contexts/ParsonsContext';
import ParsonsProblemContainer from '@/components/ParsonsProblemContainer'; 
import EnhancedProblemUploader from '@/components/EnhancedProblemUploader';

const CreateProblemPage: NextPage = () => {
  const { currentProblem, resetContext, setProblemId } = useParsonsContext();
  
  // Reset context when the component mounts and set problemId
  useEffect(() => {
    setProblemId("create");
  }, [setProblemId]);
   
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
          <div className="mb-6 p-4 bg-white rounded-md border">
            <ParsonsProblemContainer problemId="create" />
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateProblemPage;