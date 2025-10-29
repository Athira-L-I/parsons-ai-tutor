import axios from 'axios';
import { ParsonsSettings } from '@/@types/types';
import { isParsonsWidgetLoaded } from './parsonsLoader';

const API_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NODE_ENV === 'production'
    ? 'https://parsons-tutor.dedyn.io'
    : 'http://localhost:8000';

/**
 * Enhanced service for validating Parsons problem solutions
 * Integrates with both the API and the Parsons widget
 */
export class ValidationService {
  private apiUrl: string;

  constructor(apiUrl: string = API_URL) {
    this.apiUrl = apiUrl;
  }

  /**
   * Validate a solution against a problem using the backend API
   *
   * @param problemId The ID of the problem to validate against
   * @param solution The user's solution as an array of code lines
   * @returns Promise resolving to the validation result
   */
  async validateSolution(
    problemId: string,
    solution: string[]
  ): Promise<{ isCorrect: boolean; details: string }> {
    try {
      const response = await axios.post(`/api/solutions/validate`, {
        problemId,
        solution,
      });

      return response.data;
    } catch (error) {
      console.error('Error validating solution:', error);
      throw new Error('Failed to validate solution');
    }
  }

  /**
   * Validate a solution locally using the Parsons widget grader
   *
   * @param settings The problem settings
   * @param solution The user's solution as an array of code lines
   * @param sortableId The ID of the sortable element (optional)
   * @returns Validation result
   */
  validateSolutionWithParsonsWidget(
    settings: ParsonsSettings,
    solution: string[],
    sortableId: string = 'parsons-sortable'
  ): { isCorrect: boolean; details: string } {
    // Check if the Parsons widget is loaded
    if (!isParsonsWidgetLoaded() || !window.ParsonsWidget) {
      return this.validateSolutionLocally(settings, solution);
    }

    try {
      // Create a temporary instance of the Parsons widget for validation
      const widget = new window.ParsonsWidget({
        sortableId: sortableId,
        max_wrong_lines: settings.options.max_wrong_lines || 0,
        can_indent: settings.options.can_indent !== false,
        x_indent: settings.options.x_indent || 50,
      });

      // Initialize the widget with the problem
      widget.init(settings.initial.split('\n'));

      // Use the LineBasedGrader to check the solution
      const grader = new window.ParsonsWidget._graders.LineBasedGrader(widget);

      // Get the current state of the solution from the DOM
      const feedback = grader.grade(sortableId);

      return {
        isCorrect: feedback.success,
        details:
          feedback.errors.length > 0
            ? feedback.errors.join('\n')
            : 'Your solution is correct!',
      };
    } catch (error) {
      console.error('Error using Parsons widget for validation:', error);
      // Fall back to local validation if the widget fails
      return this.validateSolutionLocally(settings, solution);
    }
  }

  /**
   * Fallback local validation without API call or Parsons widget
   *
   * @param settings The problem settings
   * @param solution The user's solution as an array of code lines
   * @returns Validation result
   */
  validateSolutionLocally(
    settings: ParsonsSettings,
    solution: string[]
  ): { isCorrect: boolean; details: string } {
    // Extract the correct solution lines from the problem settings
    const initialCode = settings.initial;
    const correctLines: string[] = [];

    // Process each line in the initial code
    for (const line of initialCode.split('\n')) {
      // Skip empty lines
      if (!line.trim()) continue;

      // Skip distractor lines (marked with #distractor)
      if (line.includes('#distractor')) continue;

      // Add this line to the correct solution
      correctLines.push(line);
    }

    // Check if the solution has the right number of lines
    if (solution.length !== correctLines.length) {
      return {
        isCorrect: false,
        details: `Your solution has ${solution.length} lines, but the correct solution has ${correctLines.length} lines.`,
      };
    }

    // Compare each line with proper indentation checking
    for (let i = 0; i < correctLines.length; i++) {
      const userLine = solution[i];
      const correctLine = correctLines[i];

      // Check if the text content (ignoring indentation) matches
      if (userLine.trim() !== correctLine.trim()) {
        return {
          isCorrect: false,
          details: `Line ${i + 1} doesn't match the expected solution.`,
        };
      }

      // If we have indentation enabled, check indentation levels
      if (settings.options.can_indent) {
        const userIndent = this.getIndentLevel(userLine);
        const correctIndent = this.getIndentLevel(correctLine);

        if (userIndent !== correctIndent) {
          return {
            isCorrect: false,
            details: `Line ${
              i + 1
            } has incorrect indentation. Expected ${correctIndent} levels but got ${userIndent}.`,
          };
        }
      }
    }

    return {
      isCorrect: true,
      details: 'Your solution is correct!',
    };
  }

  /**
   * Calculate the indentation level of a line
   * @param line The code line to analyze
   * @returns The indentation level (number of indent units)
   */
  private getIndentLevel(line: string): number {
    const leadingSpaces = line.match(/^(\s*)/)?.[1].length || 0;
    // Assuming 4 spaces per indent level (standard for Python)
    return Math.floor(leadingSpaces / 4);
  }

  /**
   * Generate Socratic feedback for a solution
   *
   * @param problemId The ID of the problem
   * @param solution The user's solution as an array of code lines
   * @returns Promise resolving to feedback string
   */
  async generateFeedback(
    problemId: string,
    solution: string[]
  ): Promise<string> {
    try {
      const response = await axios.post(`/api/feedback`, {
        problemId,
        userSolution: solution,
      });

      return response.data.feedback;
    } catch (error) {
      console.error('Error generating feedback:', error);
      throw new Error('Failed to generate feedback');
    }
  }

  /**
   * Generate basic feedback locally
   *
   * @param settings The problem settings
   * @param solution The user's solution as an array of code lines
   * @returns Feedback string
   */
  generateLocalFeedback(settings: ParsonsSettings, solution: string[]): string {
    // Validate the solution first
    const validationResult = this.validateSolutionLocally(settings, solution);

    if (validationResult.isCorrect) {
      return 'Great job! Your solution is correct.';
    }

    // Return the validation details as feedback
    return validationResult.details;
  }
}
