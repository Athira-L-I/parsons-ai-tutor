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
      widgetHintCount: 0,
      socraticHintCount: 0,
      totalHintCount: 0,
      hintsPerAction: 0,
      timeToFirstHint: 0,
      avgTimeBetweenHints: 0,
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
   * Get the actual session start time from events (earliest timestamp)
   */
  private getActualStartTime(): number {
    if (this.events.length === 0) {
      return this.sessionStartTime;
    }

    // Find all init events and use the earliest timestamp
    const initEvents = this.events.filter((e) => e.type === 'init');
    if (initEvents.length > 0) {
      return Math.min(...initEvents.map((e) => e.time));
    }

    // If no init events, use the earliest event timestamp
    return Math.min(...this.events.map((e) => e.time));
  }

  /**
   * Incrementally update behavioral features
   */
  private updateFeatures(event: ParsonsEvent): void {
    // Use actual start time from events, not constructor time
    const actualStartTime = this.getActualStartTime();
    const timeSinceStart = event.time - actualStartTime;

    // Time-based features
    this.features.totalTime = timeSinceStart;

    // Fix timeToFirstFeedback calculation
    if (event.type === 'feedback' && this.features.timeToFirstFeedback === 0) {
      this.features.timeToFirstFeedback = timeSinceStart;

      // Validation: warn if negative (shouldn't happen now)
      if (this.features.timeToFirstFeedback < 0) {
        console.warn(
          `[EventLogger] Negative timeToFirstFeedback: ${this.features.timeToFirstFeedback}ms`
        );
        console.warn(
          `Event time: ${event.time}, Start time: ${actualStartTime}`
        );
      }
    }

    // Fix avgTimeBetweenActions to use consistent reference
    if (this.events.length > 1) {
      // Calculate based on actual event sequence, not session start
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

    // Hint patterns
    this.updateHintFeatures(event, actualStartTime);
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

  private updateHintFeatures(
    event: ParsonsEvent,
    actualStartTime: number
  ): void {
    // Count hint events
    if (event.type === 'X-Hint.Widget') {
      this.features.widgetHintCount++;
    } else if (event.type === 'X-Hint.Socratic') {
      this.features.socraticHintCount++;
    }

    // Update total hint count
    this.features.totalHintCount =
      this.features.widgetHintCount + this.features.socraticHintCount;

    // Calculate hints per action ratio
    const actionEvents = this.events.filter((e) =>
      [
        'moveOutput',
        'addOutput',
        'removeOutput',
        'moveInput',
        'feedback',
        'toggle',
      ].includes(e.type)
    );
    this.features.hintsPerAction =
      actionEvents.length > 0
        ? this.features.totalHintCount / actionEvents.length
        : 0;

    // Time to first hint
    if (
      (event.type === 'X-Hint.Widget' || event.type === 'X-Hint.Socratic') &&
      this.features.timeToFirstHint === 0
    ) {
      this.features.timeToFirstHint = event.time - actualStartTime;
    }

    // Average time between hints
    const hintEvents = this.events.filter(
      (e) => e.type === 'X-Hint.Widget' || e.type === 'X-Hint.Socratic'
    );
    if (hintEvents.length > 1) {
      let totalTimeDiff = 0;
      for (let i = 1; i < hintEvents.length; i++) {
        totalTimeDiff += hintEvents[i].time - hintEvents[i - 1].time;
      }
      this.features.avgTimeBetweenHints =
        totalTimeDiff / (hintEvents.length - 1);
    }
  }

  /**
   * Get current session snapshot with corrected startTime
   */
  getSessionSnapshot(): SessionSnapshot {
    const actualStartTime = this.getActualStartTime();

    return {
      sessionId: this.sessionId,
      studentId: this.studentId,
      problemId: this.problemId,
      schoolId: this.schoolId,
      startTime: actualStartTime, // Use actual start time from events
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
