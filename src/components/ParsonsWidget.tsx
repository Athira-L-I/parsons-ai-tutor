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
      // Save session before switching to new problem
      if (widgetAdapter && !isProblemSolved) {
        console.log('[Session] Saving session due to problem switch');
        saveSession(widgetAdapter.getSessionSnapshot());
      }
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

          // ✅ FIXED: Create adapter after widget initialization, not in dependency array
          if (parsonsWidgetRef.current) {
            const adapterInstance = new ParsonsWidgetAdapter(
              parsonsWidgetRef.current,
              sessionId,
              studentId,
              problemId || 'unknown',
              schoolId
            );
            setWidgetAdapter(adapterInstance);

            // ✅ FIXED: Set up page close listener here, once per widget
            const handleBeforeUnload = () => {
              if (adapterInstance && !isProblemSolved) {
                console.log('[Session] Saving session due to page close/leave');
                saveSession(adapterInstance.getSessionSnapshot());
              }
            };

            window.addEventListener('beforeunload', handleBeforeUnload);

            // Return cleanup function for this specific instance
            return () => {
              window.removeEventListener('beforeunload', handleBeforeUnload);
            };
          }
        } catch (error) {
          console.error('Error loading dependencies:', error);
        }
      })();
    }
  }, [
    // ✅ FIXED: Removed functions from dependencies to prevent loops
    currentProblem,
    problemId,
    sessionId,
    studentId,
    schoolId,
    isStudentIdSet,
    isProblemSolved,
    // ✅ REMOVED: cleanupWidget, initializeWidget, widgetAdapter, saveSession
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupWidget();
    };
  }, [cleanupWidget]);

  // Check solution function
  const checkSolution = () => {
    console.log('🔥 CHECK SOLUTION BUTTON CLICKED!');

    if (!parsonsWidgetRef.current || isProblemSolved) return;

    try {
      incrementAttempts();
      const feedback = parsonsWidgetRef.current.getFeedback();

      console.log('[DEBUG] Raw feedback:', feedback);
      console.log('[DEBUG] feedback.success:', feedback.success);
      console.log('[DEBUG] feedback.feedback:', feedback.feedback); // ✅ The correct property!
      console.log('[DEBUG] feedback.errors:', feedback.errors);
      console.log('[DEBUG] feedback.log_errors:', feedback.log_errors);

      if (feedback.success !== undefined) {
        setIsCorrect(feedback.success);

        // ✅ FIXED: Extract message using the correct property name
        let displayMessage = '';

        if (feedback.html) {
          // For other graders that return HTML
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = feedback.html;
          displayMessage = tempDiv.textContent || tempDiv.innerText || '';
          setFeedback(displayMessage);
        } else if (feedback.feedback && Array.isArray(feedback.feedback)) {
          // ✅ FIXED: Use feedback.feedback (not feedback.errors) for LineBasedGrader
          const errorMessages = feedback.feedback
            .map((err: any) => {
              if (typeof err === 'string') return err;
              if (err.message) return err.message;
              return JSON.stringify(err);
            })
            .join('\n');

          displayMessage = errorMessages;
          setFeedback(errorMessages); // ✅ Set the exact error message
        } else if (feedback.errors && Array.isArray(feedback.errors)) {
          // Fallback for other graders
          const errorMessages = feedback.errors
            .map((err: any) => {
              if (typeof err === 'string') return err;
              if (err.message) return err.message;
              return JSON.stringify(err);
            })
            .join('\n');

          displayMessage = errorMessages;
          setFeedback(errorMessages);
        } else if (feedback.message) {
          displayMessage = feedback.message;
          setFeedback(feedback.message);
        }

        console.log('[DEBUG] Display message extracted:', displayMessage);

        // ✅ Log widget hint using the SAME message shown in UI
        if (widgetAdapter && !feedback.success && displayMessage) {
          console.log('[DEBUG] ✅ SHOULD LOG WIDGET HINT NOW');
          console.log('[DEBUG] Widget hint message:', displayMessage);

          const errorType =
            feedback.log_errors?.[0]?.type || 'incorrectPosition';
          const errorLines =
            feedback.log_errors?.map((e: any) => e.lines).flat() || [];

          try {
            widgetAdapter.logManualEvent('X-Hint.Widget', {
              'X-HintData': {
                hintType: errorType,
                message: displayMessage, // ✅ Use exact message shown to user
                errorLines: errorLines,
                fromState: getCurrentPuzzleState(),
              },
            });
            console.log('[DEBUG] ✅ Widget hint logged successfully');
          } catch (e) {
            console.error('[DEBUG] ❌ Widget hint logging failed:', e);
          }
        } else {
          console.log('[DEBUG] ❌ Widget hint NOT logged because:');
          console.log('  - widgetAdapter:', !!widgetAdapter);
          console.log('  - !feedback.success:', !feedback.success);
          console.log('  - displayMessage:', displayMessage);
        }

        if (feedback.success) {
          // Success handling...
          console.log('[Widget] Problem solved successfully!');
          setIsProblemSolved(true);

          if (widgetAdapter) {
            widgetAdapter.logManualEvent('problem_solved', {
              success: true,
              completedAt: Date.now(),
            });
            const finalSnapshot = widgetAdapter.getSessionSnapshot();
            saveSession(finalSnapshot);
          }

          setSocraticFeedback(null);
          setTimeout(() => {
            setFeedback('Problem completed successfully!');
          }, 1000);
        } else {
          // ✅ PRESERVED: Socratic feedback for incorrect solutions
          console.log('[DEBUG] Getting socratic feedback...');

          const solution = parsonsWidgetRef.current
            .getModifiedCode('#ul-parsons-sortable')
            .map((line: any) => {
              const indentSpaces = '    '.repeat(line.indent);
              return indentSpaces + line.code;
            });

          setIsLoading(true);

          api
            .generateFeedback(problemId || '', solution)
            .then((socraticFeedbackResult) => {
              console.log(
                '[DEBUG] ✅ Socratic feedback received:',
                socraticFeedbackResult
              );
              setSocraticFeedback(socraticFeedbackResult);
              setIsLoading(false);

              if (widgetAdapter && socraticFeedbackResult) {
                widgetAdapter.logManualEvent('X-Hint.Socratic', {
                  'X-HintData': {
                    message: socraticFeedbackResult,
                    hintType: 'suggestion',
                    conversationContext: `problem-${problemId}-${Date.now()}`,
                  },
                });
                console.log('[DEBUG] ✅ Socratic hint logged successfully');
              }
            })
            .catch((error) => {
              console.error('[DEBUG] ❌ Socratic feedback API error:', error);
              setSocraticFeedback('Error fetching feedback. Please try again.');
              setIsLoading(false);
            });
        }
      }
    } catch (error) {
      console.error('Error checking solution:', error);
    }
  };

  // ✅ Helper function to get current puzzle state
  const getCurrentPuzzleState = () => {
    if (!parsonsWidgetRef.current) return ''; // ✅ FIXED: Use parsonsWidgetRef.current
    try {
      return (
        parsonsWidgetRef.current.solutionHash() ||
        parsonsWidgetRef.current
          .getModifiedCode('#ul-parsons-sortable')
          .join('-')
      ); // ✅ FIXED: Use parsonsWidgetRef.current
    } catch (e) {
      console.warn('[DEBUG] getCurrentPuzzleState failed:', e);
      return '';
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
    </div>
  );
};

export default ParsonsWidgetComponent;
