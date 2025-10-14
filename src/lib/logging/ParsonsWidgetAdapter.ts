// src/lib/logging/ParsonsWidgetAdapter.ts - FIXED VERSION

import { EventLogger } from './EventLogger';
import { ParsonsEvent, SessionSnapshot } from './types';

/**
 * FIXED: Properly intercepts Parsons widget events
 * Works with native js-parsons widget
 */
export class ParsonsWidgetAdapter {
  private logger: EventLogger;
  private widgetInstance: any;

  constructor(
    widgetInstance: any,
    sessionId: string,
    studentId: string,
    problemId: string,
    schoolId: string
  ) {
    this.widgetInstance = widgetInstance;
    this.logger = new EventLogger(sessionId, studentId, problemId, schoolId);
    this.attachListeners();
  }

  /**
   * FIXED: Multiple interception strategies
   */
  private attachListeners(): void {
    console.log('[Adapter] Attaching listeners to Parsons widget...');

    // Strategy 1: Intercept addLogEntry (if it exists)
    if (this.widgetInstance.addLogEntry) {
      this.interceptAddLogEntry();
    } else {
      console.warn('[Adapter] Widget has no addLogEntry method');
    }

    // Strategy 2: Listen to user_actions array changes
    this.monitorUserActions();

    // Strategy 3: Hook into getFeedback
    this.interceptGetFeedback();

    // Capture initial state
    this.logInitialState();
  }

  /**
   * Strategy 1: Intercept addLogEntry method
   */
  private interceptAddLogEntry(): void {
    const originalAddLogEntry = this.widgetInstance.addLogEntry.bind(
      this.widgetInstance
    );

    this.widgetInstance.addLogEntry = (entry: any) => {
      console.log('[Adapter] addLogEntry called:', entry);

      // Let native widget do its thing
      originalAddLogEntry(entry);

      // Capture for our logger
      this.captureWidgetEvent(entry);
    };

    console.log('[Adapter] Intercepted addLogEntry method');
  }

  /**
   * Strategy 2: Monitor user_actions array (polling)
   * This is a fallback if addLogEntry doesn't work
   */
  private monitorUserActions(): void {
    let lastLength = 0;

    const checkActions = () => {
      if (!this.widgetInstance.user_actions) return;

      const currentLength = this.widgetInstance.user_actions.length;

      if (currentLength > lastLength) {
        // New actions added
        for (let i = lastLength; i < currentLength; i++) {
          const action = this.widgetInstance.user_actions[i];
          console.log('[Adapter] New action detected:', action);
          this.captureWidgetEvent(action);
        }
        lastLength = currentLength;
      }
    };

    // Poll every 500ms
    setInterval(checkActions, 500);
    console.log('[Adapter] Started monitoring user_actions array');
  }

  /**
   * Strategy 3: Intercept getFeedback method
   */
  private interceptGetFeedback(): void {
    if (!this.widgetInstance.getFeedback) {
      console.warn('[Adapter] Widget has no getFeedback method');
      return;
    }

    const originalGetFeedback = this.widgetInstance.getFeedback.bind(
      this.widgetInstance
    );

    this.widgetInstance.getFeedback = () => {
      console.log('[Adapter] getFeedback called');

      // Get feedback from original method
      const feedback = originalGetFeedback();

      // Log feedback event
      this.logger.logEvent({
        time: Date.now(),
        type: 'feedback',
        output: this.widgetInstance.solutionHash(),
        input: this.widgetInstance.options.trashId
          ? this.widgetInstance.trashHash()
          : undefined,
        metadata: {
          success: feedback.success,
          errors: feedback.log_errors || [],
        },
      });

      console.log('[Adapter] Logged feedback event');

      return feedback;
    };

    console.log('[Adapter] Intercepted getFeedback method');
  }

  /**
   * Log initial state (only once)
   */
  private logInitialState(): void {
    // Check if already logged an init event
    const snapshot = this.logger.getSessionSnapshot();
    const hasInit = snapshot.events.some((e) => e.type === 'init');

    if (hasInit) {
      console.log('[Adapter] Init event already logged, skipping');
      return;
    }

    this.logger.logEvent({
      time: Date.now(),
      type: 'init',
      output: this.widgetInstance.solutionHash(),
      input: this.widgetInstance.options.trashId
        ? this.widgetInstance.trashHash()
        : undefined,
      metadata: {
        initialCode: this.widgetInstance.options.initial,
        canIndent: this.widgetInstance.options.can_indent,
        maxWrongLines: this.widgetInstance.options.max_wrong_lines,
      },
    });

    console.log('[Adapter] Logged initial state');
  }

  /**
   * Convert native widget log entry to our ParsonsEvent format
   */
  private captureWidgetEvent(widgetLogEntry: any): void {
    // Determine event type
    let eventType = widgetLogEntry.type;

    // Handle different action formats
    if (!eventType && widgetLogEntry.action) {
      eventType = this.mapActionToType(widgetLogEntry.action);
    }

    const event: ParsonsEvent = {
      time: widgetLogEntry.time?.getTime() || Date.now(),
      type: eventType || 'unknown',
      target: widgetLogEntry.target,
      output: widgetLogEntry.output || this.widgetInstance.solutionHash(),
      input:
        widgetLogEntry.input ||
        (this.widgetInstance.options.trashId
          ? this.widgetInstance.trashHash()
          : undefined),
      metadata: {},
    };

    // Add type-specific metadata
    if (eventType === 'feedback') {
      event.metadata = {
        success: widgetLogEntry.success,
        errors: widgetLogEntry.errors || widgetLogEntry.log_errors || [],
      };
    }

    console.log('[Adapter] Captured event:', event.type);
    this.logger.logEvent(event);
  }

  /**
   * Map action string to event type
   */
  private mapActionToType(action: string): string {
    const actionLower = action.toLowerCase();

    if (actionLower.includes('move')) return 'moveOutput';
    if (actionLower.includes('add')) return 'addOutput';
    if (actionLower.includes('remove') || actionLower.includes('delete'))
      return 'removeOutput';
    if (actionLower.includes('feedback') || actionLower.includes('check'))
      return 'feedback';

    return 'unknown';
  }

  /**
   * Manual event logging (fallback)
   * Call this from component when widget interactions happen
   */
  public logManualEvent(eventType: string, metadata?: any): void {
    this.logger.logEvent({
      time: Date.now(),
      type: eventType as any,
      output: this.widgetInstance.solutionHash(),
      input: this.widgetInstance.options.trashId
        ? this.widgetInstance.trashHash()
        : undefined,
      metadata,
    });

    console.log('[Adapter] Manually logged event:', eventType);
  }

  /**
   * Get logger instance
   */
  getLogger(): EventLogger {
    return this.logger;
  }

  /**
   * Get session snapshot for saving
   */
  getSessionSnapshot(): SessionSnapshot {
    const baseSnapshot = this.logger.getSessionSnapshot();

    // ADD: Capture original Parsons widget logs
    const originalLog = {
      user_actions: this.widgetInstance.user_actions || [],
      state_path: this.widgetInstance.state_path || [],
      states: this.widgetInstance.states || {},
      initial_code: this.widgetInstance.options?.initial || '',
      solution_code: this.widgetInstance.options?.sortableId || '',
    };

    return {
      ...baseSnapshot,
      originalLog,
    };
  }

  /**
   * Get current features (for display/debugging)
   */
  getCurrentFeatures() {
    return this.logger.getCurrentFeatures();
  }

  /**
   * Get event count (for debugging)
   */
  getEventCount(): number {
    return this.logger.getSessionSnapshot().events.length;
  }
}
