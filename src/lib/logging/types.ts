// src/lib/logging/types.ts

export type EventType =
  | 'init'
  | 'moveOutput'
  | 'addOutput'
  | 'removeOutput'
  | 'moveInput'
  | 'feedback'
  | 'toggle'
  | 'X-Hint.Widget'
  | 'X-Hint.Socratic'
  | 'problem_solved';

export interface ParsonsEvent {
  time: number; // Unix timestamp (milliseconds)
  type: EventType;
  target?: string; // Element ID (without prefix)
  output: string; // Solution hash (e.g., "0_0-1_1-2_0")
  input?: string; // Trash hash (if enabled)
  metadata?: Record<string, any>;
}

export interface BehavioralFeatures {
  // Time-based (3)
  totalTime: number;
  timeToFirstFeedback: number;
  avgTimeBetweenActions: number;

  // Action patterns (3)
  manipulationCount: number;
  feedbackCount: number;
  manipulationToFeedbackRatio: number;

  // State exploration (4)
  uniqueStates: number;
  stateChangeRate: number;
  stateRevisits: number;
  maxVisitsToState: number;

  // Success patterns (2)
  successRate: number;
  consecutiveFailures: number;

  // Error patterns (2)
  incorrectPositionErrors: number;
  incorrectIndentErrors: number;

  // Hint patterns (6)
  widgetHintCount: number;
  socraticHintCount: number;
  totalHintCount: number;
  hintsPerAction: number;
  timeToFirstHint: number;
  avgTimeBetweenHints: number;
}

export interface SessionSnapshot {
  sessionId: string;
  studentId: string;
  problemId: string;
  schoolId: string;
  startTime: number;
  endTime: number;

  // Your computed data
  events: ParsonsEvent[];
  features: BehavioralFeatures;
  stateHistory: Record<string, number>;

  // Original Parsons widget logs (for validation & reproducibility)
  originalLog?: {
    user_actions: any[]; // Native widget's complete event log
    state_path: string[]; // Sequence of states visited
    states: Record<string, any>; // Full state snapshots
    initial_code: string; // Initial problem code
    solution_code: string; // Correct solution
  };
}
