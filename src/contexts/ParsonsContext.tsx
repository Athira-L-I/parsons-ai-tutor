import React, { createContext, useContext, ReactNode, useState, useCallback, useRef, useEffect } from 'react';
import { ParsonsSettings, ParsonsOptions } from '@/@types/types';

interface ParsonsContextType {
  currentProblem: ParsonsSettings | null;
  setCurrentProblem: (problem: ParsonsSettings) => void;
  userSolution: string[];
  setUserSolution: (solution: string[]) => void;
  feedback: string | null;
  socraticFeedback: string | null;
  setFeedback: (feedback: string | null) => void;
  setSocraticFeedback: (socraticFeedback: string | null) => void;
  isCorrect: boolean | null;
  setIsCorrect: (isCorrect: boolean | null) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  attempts: number;
  incrementAttempts: () => void;
  handleFeedback: (feedback: any) => void;
  resetContext: () => void;
  problemId: string | undefined; // Track which problem the state belongs to
  setProblemId: (id: string | undefined) => void; // Update the problem ID
}

const defaultContext: ParsonsContextType = {
  currentProblem: null,
  setCurrentProblem: () => {},
  userSolution: [],
  setUserSolution: () => {},
  feedback: null,
  socraticFeedback: null,
  setFeedback: () => {},
  setSocraticFeedback: () => {},
  isCorrect: null,
  setIsCorrect: () => {},
  isLoading: false,
  setIsLoading: () => {},
  attempts: 0,
  incrementAttempts: () => {},
  handleFeedback: () => {},
  resetContext: () => {},
  problemId: undefined,
  setProblemId: () => {},
};

const ParsonsContext = createContext<ParsonsContextType>(defaultContext);

export const useParsonsContext = () => useContext(ParsonsContext);

interface ParsonsProviderProps {
  children: ReactNode;
  problemId?: string; // Optional problemId prop
}

export const ParsonsProvider = ({ children, problemId: initialProblemId }: ParsonsProviderProps) => {
  const [currentProblem, setCurrentProblem] = useState<ParsonsSettings | null>(null);
  const [userSolution, setUserSolution] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [socraticFeedback, setSocraticFeedback] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [attempts, setAttempts] = useState<number>(0);
  const [problemId, setProblemId] = useState<string | undefined>(initialProblemId);

  const incrementAttempts = useCallback(() => {
    setAttempts(prev => prev + 1);
  }, []);

  // Reset function to clear all state values
  const resetContext = useCallback(() => {
    setCurrentProblem(null);
    setUserSolution([]);
    setFeedback(null);
    setSocraticFeedback(null);
    setIsCorrect(null);
    setIsLoading(false);
    setAttempts(0);
  }, []);
  
  // Track the previous problemId to detect changes
  const previousProblemIdRef = useRef<string | undefined>(problemId);
  
  // Automatically reset context when problemId changes
  useEffect(() => {
    // Only reset if problemId has changed and is not the first render
    if (previousProblemIdRef.current !== undefined && 
        problemId !== previousProblemIdRef.current) {
      resetContext();
    }
    
    // Update the ref
    previousProblemIdRef.current = problemId;
  }, [problemId, resetContext]);

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
        socraticFeedback,
        setSocraticFeedback,
        isCorrect,
        setIsCorrect,
        isLoading,
        setIsLoading,
        attempts,
        incrementAttempts,
        handleFeedback,
        resetContext,
        problemId,
        setProblemId,
      }}
    >
      {children}
    </ParsonsContext.Provider>
  );
};