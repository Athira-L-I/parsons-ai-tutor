import { createContext, useContext, ReactNode, useState } from 'react';
import { ParsonsSettings, ParsonsOptions } from '@/@types/types';

interface ParsonsContextType {
  currentProblem: ParsonsSettings | null;
  setCurrentProblem: (problem: ParsonsSettings) => void;
  userSolution: string[];
  setUserSolution: (solution: string[]) => void;
  feedback: string;
  setFeedback: (feedback: string) => void;
  isCorrect: boolean | null;
  setIsCorrect: (isCorrect: boolean | null) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
}

const defaultContext: ParsonsContextType = {
  currentProblem: null,
  setCurrentProblem: () => {},
  userSolution: [],
  setUserSolution: () => {},
  feedback: '',
  setFeedback: () => {},
  isCorrect: null,
  setIsCorrect: () => {},
  isLoading: false,
  setIsLoading: () => {},
};

const ParsonsContext = createContext<ParsonsContextType>(defaultContext);

export const useParsonsContext = () => useContext(ParsonsContext);

interface ParsonsProviderProps {
  children: ReactNode;
}

export const ParsonsProvider = ({ children }: ParsonsProviderProps) => {
  const [currentProblem, setCurrentProblem] = useState<ParsonsSettings | null>(null);
  const [userSolution, setUserSolution] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string>('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleFeedback = (feedback: any) => {
    console.log("Feedback received:", feedback);
    if (feedback.success !== undefined) {
      setIsCorrect(feedback.success);
      
      // Store the feedback HTML in the context
      if (feedback.html) {
        setFeedback(feedback.html);
      }
      
      // Add additional feedback info to context if needed
      if (!feedback.success && feedback.errors) {
        console.log("Errors:", feedback.errors);
      }
    }
  };

  return (
    <ParsonsContext.Provider
      value={{
        currentProblem,
        setCurrentProblem,
        userSolution,
        setUserSolution,
        feedback,
        setFeedback,
        isCorrect,
        setIsCorrect,
        isLoading,
        setIsLoading,
        handleFeedback,
      }}
    >
      {children}
    </ParsonsContext.Provider>
  );
};