import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParsonsContext } from '@/contexts/ParsonsContext';
import { ParsonsSettings } from '@/@types/types';
import { loadParsonsWidget } from '@/lib/parsonsLoader';
import { ParsonsWidgetAdapter } from '@/lib/logging/ParsonsWidgetAdapter';
import { useSimpleStorage } from '@/hooks/useSimpleStorage';

import * as api from '@/lib/api';

// Declare the ParsonsWidget type to match the JS library
declare global {
  interface Window {
    ParsonsWidget: any;
    jQuery: any;
    $: any;
    _: any;
    LIS: any;
  }
}

// Props interface
interface ParsonsWidgetProps {
  problemId?: string;
  onSolutionChange?: (solution: string[]) => void;
  onCheckSolution?: (isCorrect: boolean) => void;
}

// Main component
const ParsonsWidgetComponent: React.FC<ParsonsWidgetProps> = ({
  problemId,
  onSolutionChange,
  onCheckSolution,
}) => {
  // Get context values
  const {
    currentProblem,
    setUserSolution,
    setIsCorrect,
    incrementAttempts,
    setFeedback,
    setSocraticFeedback,
    setIsLoading,
  } = useParsonsContext();

  // Refs to track the widget and DOM container
  const containerRef = useRef<HTMLDivElement>(null);
  const parsonsWidgetRef = useRef<any>(null);
  const lastProblemRef = useRef<ParsonsSettings | null>(null);
  const lastProblemIdRef = useRef<string | undefined>(problemId);
  const lastStateRef = useRef<string>('');

  const [widgetAdapter, setWidgetAdapter] =
    useState<ParsonsWidgetAdapter | null>(null);

  // NEW: Track if problem is solved
  const [isProblemSolved, setIsProblemSolved] = useState(false);

  const {
    sessionId,
    studentId,
    schoolId,
    saveSession,
    isStudentIdSet,
    updateStudentInfo,
    endSession, // NEW: Get endSession function
  } = useSimpleStorage(problemId || 'unknown-problem');

  // Update solution from the widget
  const updateSolution = useCallback(
    (widget: any, sortableId?: string) => {
      if (!widget) return;

      try {
        // Use the provided sortableId or fallback to default with problemId
        const uniqueId = problemId || 'default';
        const ulSortableId = sortableId || `ul-parsons-sortable-${uniqueId}`;

        // Check if the sortable area exists
        const sortableElement = document.getElementById(ulSortableId);
        if (!sortableElement) {
          console.warn(`Sortable element not found: ${ulSortableId}`);
          return;
        }

        // Get the solution with indentation from the widget
        const solution = widget.getModifiedCode(`#${ulSortableId}`);
        const solutionLines = solution.map((line: any) => {
          const indentSpaces = '    '.repeat(line.indent);
          return indentSpaces + line.code;
        });

        setUserSolution(solutionLines);

        if (onSolutionChange) {
          onSolutionChange(solutionLines);
        }
      } catch (error) {
        console.error('Error updating solution:', error);
      }
    },
    [setUserSolution, onSolutionChange]
  );

  // Handle feedback from the widget
  const handleFeedback = useCallback(
    (feedback: any) => {
      if (!feedback || feedback.success === undefined) return;

      setIsCorrect(feedback.success);

      if (feedback.html) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = feedback.html;
        const feedbackText = tempDiv.textContent || tempDiv.innerText || '';
        setFeedback(feedbackText);
      } else if (feedback.message) {
        setFeedback(feedback.message);
      } else {
        setFeedback(feedback.success ? 'Your solution is correct!' : '');
      }

      // Add detailed errors if available
      if (
        !feedback.success &&
        feedback.errors &&
        Array.isArray(feedback.errors)
      ) {
        const errorMessages = feedback.errors
          .map((err: any) => {
            if (typeof err === 'string') return err;
            if (err.message) return err.message;
            return JSON.stringify(err);
          })
          .join('\n');

        setFeedback(
          `${feedback.success ? '' : feedback.message || ''}\n${errorMessages}`
        );
      }
    },
    [setIsCorrect, setFeedback]
  );

  // Cleanup the widget
  const cleanupWidget = useCallback(() => {
    if (!parsonsWidgetRef.current) return;

    try {
      // Get unique IDs based on problemId
      const uniqueId = problemId || 'default';
      const ulTrashId = `ul-parsons-trash-${uniqueId}`;
      const ulSortableId = `ul-parsons-sortable-${uniqueId}`;

      // Remove feedback panels
      document
        .querySelectorAll('.parsons-feedback')
        .forEach((el) => el.remove());

      // Clean up jQuery sortable instances
      if (window.jQuery) {
        try {
          window.jQuery(`#${ulSortableId}`).sortable('destroy');
          window.jQuery(`#${ulTrashId}`).sortable('destroy');
        } catch (e) {
          console.log('Error cleaning up sortable:', e);
        }
      }

      // Remove UI elements completely
      const ulSortable = document.getElementById(ulSortableId);
      const ulTrash = document.getElementById(ulTrashId);

      if (ulSortable) ulSortable.remove();
      if (ulTrash) ulTrash.remove();

      // Clear container
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }

      // Reset the widget reference
      parsonsWidgetRef.current = null;
    } catch (error) {
      console.error('Error cleaning up widget:', error);
    }
  }, []);

  // Initialize the widget
  const initializeWidget = useCallback(() => {
    if (!currentProblem) return;

    // Clean up existing instances first
    cleanupWidget();

    // Create unique IDs based on problemId to ensure isolation between widgets
    const uniqueId = problemId || 'default';
    const trashId = `parsons-trash-${uniqueId}`;
    const sortableId = `parsons-sortable-${uniqueId}`;

    // Create fresh containers with unique IDs
    if (containerRef.current) {
      containerRef.current.innerHTML = `
        <div id="${trashId}" class="trash-container" data-label="Drag from here"></div>
        <div id="${sortableId}" class="sortable-container" data-label="Construct your solution here"></div>
      `;
    } else {
      return; // Can't initialize without container
    }

    // Store the unique IDs in a data attribute for later use
    if (containerRef.current) {
      containerRef.current.setAttribute('data-trash-id', trashId);
      containerRef.current.setAttribute('data-sortable-id', sortableId);
      // Add class to container to help with styling
      containerRef.current.classList.add('parsons-widget-initialized');
    }

    try {
      // Initialize the widget with the unique IDs
      const options = {
        sortableId: sortableId,
        trashId: trashId,
        max_wrong_lines: currentProblem.options.max_wrong_lines || 10,
        can_indent: currentProblem.options.can_indent !== false,
        x_indent: currentProblem.options.x_indent || 50,
        feedback_cb: handleFeedback,
        lang: currentProblem.options.lang || 'en',
        trash_label: '',
        solution_label: '',
        first_error_only: false, // Show all errors, not just the first one
        show_feedback: true, // Enable showing feedback
      };

      const widget = new window.ParsonsWidget(options);

      widget.init(currentProblem.initial);
      widget.shuffleLines();
      parsonsWidgetRef.current = widget;

      // The ParsonsWidget library prefixes 'ul-' to the IDs we provided
      const uniqueId = problemId || 'default';
      const ulTrashId = `ul-parsons-trash-${uniqueId}`;
      const ulSortableId = `ul-parsons-sortable-${uniqueId}`;

      // Set up observer for solution changes
      const observer = new MutationObserver(() => {
        if (parsonsWidgetRef.current) {
          updateSolution(parsonsWidgetRef.current, ulSortableId);
        }
      });

      const sortableElement = document.getElementById(ulSortableId);
      if (sortableElement) {
        observer.observe(sortableElement, {
          childList: true,
          subtree: true,
          attributes: true,
        });
      }

      // Fix for jQuery UI connectWith
      setTimeout(() => {
        if (window.jQuery) {
          const ulSortable = document.getElementById(ulSortableId);
          const ulTrash = document.getElementById(ulTrashId);

          if (ulSortable && ulTrash) {
            window
              .jQuery(`#${ulSortableId}`)
              .sortable('option', 'connectWith', `#${ulTrashId}`);
            window
              .jQuery(`#${ulTrashId}`)
              .sortable('option', 'connectWith', `#${ulSortableId}`);
          }
        }
      }, 500);
    } catch (error) {
      console.error('Error initializing ParsonsWidget:', error);
    }
  }, [currentProblem, cleanupWidget, updateSolution, handleFeedback]);

  // Effect to initialize or re-initialize widget
  useEffect(() => {
    if (!currentProblem || !isStudentIdSet || isProblemSolved) return;

    console.log(`[Widget] Initializing for student: ${studentId}`);

    // Check if the problem has changed
    const problemChanged =
      lastProblemRef.current !== currentProblem ||
      problemId !== lastProblemIdRef.current;

    // Update tracking refs
    lastProblemRef.current = currentProblem;
    lastProblemIdRef.current = problemId;

    // Always clean up the widget when the problem changes
    if (problemChanged && parsonsWidgetRef.current) {
      cleanupWidget();
    }

    // If there's no widget or the problem changed, create a new one
    if (!parsonsWidgetRef.current || problemChanged) {
      // First ensure dependencies are loaded
      (async () => {
        try {
          // Check if dependencies are loaded
          const dependenciesLoaded =
            typeof window !== 'undefined' &&
            window.jQuery &&
            window.jQuery.ui &&
            window.jQuery.fn.sortable &&
            window.ParsonsWidget &&
            window.LIS;

          if (!dependenciesLoaded) {
            await loadParsonsWidget();
          }

          // Initialize the widget
          initializeWidget();
        } catch (error) {
          console.error('Error loading dependencies:', error);
        }
      })();
    }

    // Create adapter only if widget was initialized
    let adapterInstance: ParsonsWidgetAdapter | null = null;
    if (parsonsWidgetRef.current) {
      adapterInstance = new ParsonsWidgetAdapter(
        parsonsWidgetRef.current,
        sessionId,
        studentId,
        problemId || 'unknown',
        schoolId
      );
      setWidgetAdapter(adapterInstance);
    }

    const saveInterval = setInterval(() => {
      if (adapterInstance && !isProblemSolved) {
        saveSession(adapterInstance.getSessionSnapshot());
      } else if (parsonsWidgetRef.current && !isProblemSolved) {
        // fallback: build a temporary snapshot if adapter wasn't created for some reason
        try {
          const tempAdapter = new ParsonsWidgetAdapter(
            parsonsWidgetRef.current,
            sessionId,
            studentId,
            problemId || 'unknown',
            schoolId
          );
          saveSession(tempAdapter.getSessionSnapshot());
        } catch (e) {
          console.warn('No adapter available to save session yet.');
        }
      }
    }, 30000);

    // Cleanup on unmount or before reinitializing
    return () => {
      // Cleanup handled separately in cleanupWidget
      clearInterval(saveInterval);
    };
  }, [
    currentProblem,
    problemId,
    sessionId,
    studentId,
    schoolId,
    isStudentIdSet,
    isProblemSolved,
    cleanupWidget,
    initializeWidget,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupWidget();
    };
  }, [cleanupWidget]);

  // Check solution function
  const checkSolution = () => {
    const widget = parsonsWidgetRef.current;
    if (!widget || isProblemSolved) return; // Prevent interaction after success

    try {
      // Increment attempts counter
      incrementAttempts();

      // Get feedback from widget
      const feedback = widget.getFeedback();

      // Log widget hint event for incorrect solutions
      if (feedback.success === false && widgetAdapter && feedback.html) {
        widgetAdapter.logManualEvent('widgetHint', {
          hintType: 'widget',
          hintContent: feedback.html,
          isCorrect: false,
        });
      }

      // Update application state
      if (feedback.success !== undefined) {
        setIsCorrect(feedback.success);

        if (feedback.html) {
          setFeedback(feedback.html);
        } else if (feedback.message) {
          setFeedback(feedback.message);
        }

        // If incorrect, get socratic feedback
        if (!feedback.success) {
          // Get unique sortable ID based on problemId
          const uniqueId = problemId || 'default';
          const ulSortableId = `ul-parsons-sortable-${uniqueId}`;

          // Get current solution using the unique ID
          const solution = widget
            .getModifiedCode(`#${ulSortableId}`)
            .map((line: any) => {
              const indentSpaces = '    '.repeat(line.indent);
              return indentSpaces + line.code;
            });

          // Get API feedback
          setIsLoading(true);
          api
            .generateFeedback(problemId || '', solution)
            .then((result) => {
              setSocraticFeedback(result);
              
              // Log socratic hint event
              if (widgetAdapter && result) {
                widgetAdapter.logManualEvent('socraticHint', {
                  hintType: 'socratic',
                  hintContent: result,
                  isCorrect: false,
                  solution: solution,
                });
              }
              
              setIsLoading(false);
            })
            .catch((error) => {
              console.error('Error fetching feedback:', error);
              setSocraticFeedback('Error fetching feedback. Please try again.');
              setIsLoading(false);
            });
        } else {
          // Handle successful solution
          console.log('[Widget] Problem solved successfully!');

          // Mark as solved immediately
          setIsProblemSolved(true);

          // Log success and save final session
          if (widgetAdapter) {
            widgetAdapter.logManualEvent('problem_solved', {
              success: true,
              completedAt: Date.now(),
            });

            const finalSnapshot = widgetAdapter.getSessionSnapshot();
            saveSession(finalSnapshot);
          }

          // Clear feedback when correct
          setSocraticFeedback(null);

          // Session ends naturally - no UI disruption
          console.log('[Widget] Session completed - problem solved');

          // Optional: Could add a subtle completion message to feedback
          setTimeout(() => {
            setFeedback('Problem completed successfully!');
          }, 1000);
        }

        // Call callback if provided
        if (onCheckSolution) {
          onCheckSolution(feedback.success);
        }
      }
    } catch (error) {
      console.error('Error checking solution:', error);
      setFeedback('An error occurred while checking your solution.');
    }
  };

  const setupDragListeners = (widget: any, adapter: ParsonsWidgetAdapter) => {
    // Uses MutationObserver to watch DOM changes
    const observer = new MutationObserver(() => {
      const newState = widget.solutionHash();
      if (newState !== lastStateRef.current) {
        adapter.logManualEvent('moveOutput', {
          /* ... */
        });
      }
    });
  };

  // Show loading/prompt screen while waiting for student ID
  if (!isStudentIdSet) {
    return (
      <div className="flex items-center justify-center min-h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center p-8">
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Student Identification Required
          </h3>
          <p className="text-gray-600 mb-6">
            Please enter your assigned student ID to begin the programming
            exercise.
          </p>
          <button
            onClick={updateStudentInfo}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Enter Student ID
          </button>
          <p className="text-xs text-gray-500 mt-4">
            If you don't have a student ID, please contact your instructor.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="parsons-widget-container">
      <div ref={containerRef} className="parsons-puzzle-container"></div>

      <div className="mt-6">
        <button
          onClick={checkSolution}
          className="px-6 py-2 rounded-md text-white font-medium bg-blue-600 hover:bg-blue-700"
        >
          Check Solution
        </button>
      </div>

      {/* Enhanced debug info */}
      {process.env.NODE_ENV === 'development' && widgetAdapter && (
        <div className="mt-4 p-4 bg-gray-100 rounded text-xs font-mono">
          <div className="font-bold mb-2">🐛 Debug Info:</div>
          <div>Session: {sessionId}</div>
          <div>Student: {studentId}</div>
          <div>School: {schoolId}</div>
          <div className="mt-2 font-bold">
            Events Logged: {widgetAdapter?.getEventCount() || 0}
          </div>
          <div className="text-xs text-gray-600">
            {(widgetAdapter?.getEventCount() || 0) === 1 &&
              '⚠️ Only init event - try dragging blocks'}
          </div>
          <div className="mt-2">
            <details>
              <summary className="cursor-pointer font-semibold">
                Current Features
              </summary>
              <pre className="mt-2 text-xs overflow-auto max-h-40">
                {JSON.stringify(
                  widgetAdapter?.getCurrentFeatures() || {},
                  null,
                  2
                )}
              </pre>
            </details>
          </div>
          <div className="mt-2">
            <details>
              <summary className="cursor-pointer font-semibold">
                Full Session
              </summary>
              <pre className="mt-2 text-xs overflow-auto max-h-60">
                {JSON.stringify(
                  widgetAdapter?.getSessionSnapshot() || {},
                  null,
                  2
                )}
              </pre>
            </details>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParsonsWidgetComponent;
