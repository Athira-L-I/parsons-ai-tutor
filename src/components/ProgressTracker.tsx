import React from 'react';

interface ProgressTrackerProps {
  totalProblems: number;
  solvedProblems: number;
  currentProblemIndex: number;
  navigateToProblem: (index: number) => void;
}

const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  totalProblems,
  solvedProblems,
  currentProblemIndex,
  navigateToProblem,
}) => {
  const progress = Math.round((solvedProblems / totalProblems) * 100);

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium">Your Progress</h3>
        <span className="text-sm text-gray-600">
          {solvedProblems} of {totalProblems} problems solved ({progress}%)
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
        <div
          className="bg-blue-600 h-2.5 rounded-full"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      {/* Problem navigation */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: totalProblems }, (_, i) => (
          <button
            key={i}
            onClick={() => navigateToProblem(i)}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              i === currentProblemIndex
                ? 'bg-blue-600 text-white'
                : i < solvedProblems
                ? 'bg-green-100 text-green-800 border border-green-300'
                : 'bg-gray-100 text-gray-600 border border border-gray-300'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ProgressTracker;