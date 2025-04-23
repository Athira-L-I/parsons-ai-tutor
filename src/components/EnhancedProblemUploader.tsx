import React, { useState } from 'react';
import { useParsonsContext } from '@/contexts/ParsonsContext';
import ProblemGeneratorService from '@/lib/problemGeneratorService';

/**
 * Enhanced version of the ProblemUploader component that integrates with the
 * existing codebase and properly generates Parsons problems
 */
const EnhancedProblemUploader: React.FC = () => {
  const [sourceCode, setSourceCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isUsingBackend, setIsUsingBackend] = useState(false);
  const { setCurrentProblem } = useParsonsContext();
  
  // Create problem generator service
  const [generatorService] = useState(() => new ProblemGeneratorService());
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sourceCode.trim()) {
      setError('Please enter some source code');
      return;
    }
    
    setError('');
    setIsLoading(true);
    
    try {
      // Attempt to generate the problem (using backend or local generation)
      const problem = isUsingBackend
        ? await generatorService.generateProblem(sourceCode)
        : generatorService.generateProblemLocally(sourceCode);
      
      // Update the context with the new problem
      setCurrentProblem(problem);
      
      // Clear the input after successful generation
      setSourceCode('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(`Failed to generate problem: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-6 p-6 border rounded-md bg-white shadow-sm">
      <h3 className="text-xl font-semibold mb-4">Create New Problem from Code</h3>
      
      <div className="mb-4">
        <div className="flex items-center mb-2">
          <label htmlFor="backend-toggle" className="mr-2 text-sm text-gray-700">Use Backend API</label>
          <div className="relative inline-block w-10 mr-2 align-middle select-none">
            <input 
              id="backend-toggle" 
              type="checkbox" 
              checked={isUsingBackend}
              onChange={() => setIsUsingBackend(!isUsingBackend)}
              className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
            />
            <label 
              htmlFor="backend-toggle" 
              className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${
                isUsingBackend ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            ></label>
          </div>
          <span className="text-xs text-gray-500">
            {isUsingBackend 
              ? 'Using server-side generation (better quality)' 
              : 'Using client-side generation (faster, works offline)'}
          </span>
        </div>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="sourceCode" className="block text-sm font-medium text-gray-700 mb-1">
            Source Code (Python)
          </label>
          <textarea
            id="sourceCode"
            className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            value={sourceCode}
            onChange={(e) => setSourceCode(e.target.value)}
            placeholder={`# Enter Python code to convert to a Parsons problem\n# Example:\n\ndef calculate_average(numbers):\n    if not numbers:\n        return 0\n    total = sum(numbers)\n    return total / len(numbers)`}
          />
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">
            {error}
          </div>
        )}
        
        <button
          type="submit"
          disabled={isLoading}
          className={`px-4 py-2 rounded-md text-white ${
            isLoading ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isLoading ? 'Generating...' : 'Generate Problem'}
        </button>
      </form>
      
      <style jsx>{`
        .toggle-checkbox:checked {
          right: 0;
          border-color: #3b82f6;
        }
        .toggle-checkbox:checked + .toggle-label {
          background-color: #3b82f6;
        }
        .toggle-label {
          transition: background-color 0.3s ease;
        }
      `}</style>
    </div>
  );
};

export default EnhancedProblemUploader;