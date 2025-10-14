// src/lib/logging/EventLogger.ts

import {
  ParsonsEvent,
  BehavioralFeatures,
  SessionSnapshot,
  EventType,
} from './types';

/**
 * Captures all Parsons widget events and computes behavioral features in real-time
 */
export class EventLogger {
  private sessionId: string;
  private studentId: string;
  private problemId: string;
  private schoolId: string;
  private events: ParsonsEvent[] = [];
  private features: BehavioralFeatures;
  private stateHistory: Map<string, number> = new Map();
  private sessionStartTime: number;
  private lastEventTime: number;

  constructor(
    sessionId: string,
    studentId: string,
    problemId: string,
    schoolId: string
  ) {
    this.sessionId = sessionId;
    this.studentId = studentId;
    this.problemId = problemId;
    this.schoolId = schoolId;
    this.sessionStartTime = Date.now();
    this.lastEventTime = this.sessionStartTime;
    this.features = this.initializeFeatures();
  }

  private initializeFeatures(): BehavioralFeatures {
    return {
      totalTime: 0,
      timeToFirstFeedback: 0,
      avgTimeBetweenActions: 0,
      manipulationCount: 0,
      feedbackCount: 0,
      manipulationToFeedbackRatio: 0,
      uniqueStates: 0,
      stateChangeRate: 0,
      stateRevisits: 0,
      maxVisitsToState: 0,
      successRate: 0,
      consecutiveFailures: 0,
      incorrectPositionErrors: 0,
      incorrectIndentErrors: 0,
    };
  }

  /**
   * Log an event from Parsons widget
   */
  logEvent(event: ParsonsEvent): void {
    if (!event.time) {
      event.time = Date.now();
    }

    this.events.push(event);
    this.updateFeatures(event);
    this.lastEventTime = event.time;
  }

  /**
   * Incrementally update behavioral features
   */
  private updateFeatures(event: ParsonsEvent): void {
    const timeSinceStart = event.time - this.sessionStartTime;

    // Time-based features
    this.features.totalTime = timeSinceStart;

    if (event.type === 'feedback' && this.features.timeToFirstFeedback === 0) {
      this.features.timeToFirstFeedback = timeSinceStart;
    }

    if (this.events.length > 1) {
      let totalTimeDiff = 0;
      for (let i = 1; i < this.events.length; i++) {
        totalTimeDiff += this.events[i].time - this.events[i - 1].time;
      }
      this.features.avgTimeBetweenActions =
        totalTimeDiff / (this.events.length - 1);
    }

    // Action patterns
    if (
      ['moveOutput', 'addOutput', 'removeOutput', 'moveInput'].includes(
        event.type
      )
    ) {
      this.features.manipulationCount++;
    }

    if (event.type === 'feedback') {
      this.features.feedbackCount++;
    }

    this.features.manipulationToFeedbackRatio =
      this.features.manipulationCount /
      Math.max(1, this.features.feedbackCount);

    // State exploration
    if (event.output) {
      const visitCount = (this.stateHistory.get(event.output) || 0) + 1;
      this.stateHistory.set(event.output, visitCount);

      this.features.uniqueStates = this.stateHistory.size;
      this.features.stateChangeRate =
        this.features.uniqueStates / this.events.length;

      this.features.stateRevisits = Array.from(
        this.stateHistory.values()
      ).filter((count) => count > 1).length;

      const visits = Array.from(this.stateHistory.values());
      this.features.maxVisitsToState =
        visits.length > 0 ? Math.max(...visits) : 0;
    }

    // Success patterns (only on feedback events)
    if (event.type === 'feedback') {
      this.updateSuccessPatterns(event);
    }
  }

  private updateSuccessPatterns(feedbackEvent: ParsonsEvent): void {
    const feedbackEvents = this.events.filter((e) => e.type === 'feedback');
    const successfulAttempts = feedbackEvents.filter(
      (e) => e.metadata?.success === true
    ).length;

    this.features.successRate = successfulAttempts / feedbackEvents.length;

    // Calculate consecutive failures
    let currentStreak = 0;
    let maxStreak = 0;
    for (const event of feedbackEvents) {
      if (event.metadata?.success === false) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }
    this.features.consecutiveFailures = maxStreak;

    // Error patterns
    if (feedbackEvent.metadata?.errors) {
      const errors = feedbackEvent.metadata.errors as any[];
      this.features.incorrectPositionErrors += errors.filter(
        (e) => e.type === 'incorrectPosition'
      ).length;
      this.features.incorrectIndentErrors += errors.filter(
        (e) => e.type === 'incorrectIndent'
      ).length;
    }
  }

  /**
   * Get current session snapshot
   */
  getSessionSnapshot(): SessionSnapshot {
    return {
      sessionId: this.sessionId,
      studentId: this.studentId,
      problemId: this.problemId,
      schoolId: this.schoolId,
      startTime: this.sessionStartTime,
      endTime: this.lastEventTime,
      events: [...this.events],
      features: { ...this.features },
      stateHistory: Object.fromEntries(this.stateHistory),
    };
  }

  /**
   * Get current features (for display)
   */
  getCurrentFeatures(): BehavioralFeatures {
    return { ...this.features };
  }
}
