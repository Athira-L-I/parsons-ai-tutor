import axios from 'axios';
import { ParsonsSettings, ParsonsGrader } from '@/@types/types';

const API_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NODE_ENV === 'production'
    ? 'https://parsons-tutor.dedyn.io'
    : 'http://localhost:8000';

/**
 * Service for validating Parsons problem solutions and generating feedback
 */
export class ValidationService {
  private apiUrl: string;

  constructor(apiUrl: string = API_URL) {
    this.apiUrl = apiUrl;
  }

  /**
   * Validate a solution against a problem
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
   * Local validation without API call (useful for development or when backend is unavailable)
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
      correctLines.push(line.trim());
    }

    // Clean user solution lines
    const cleanedUserSolution = solution
      .filter((line) => line.trim())
      .map((line) => line.trim());

    // Check if the solution has the right number of lines
    if (cleanedUserSolution.length !== correctLines.length) {
      return {
        isCorrect: false,
        details: `Your solution has ${cleanedUserSolution.length} lines, but the correct solution has ${correctLines.length} lines.`,
      };
    }

    // Compare each line
    for (let i = 0; i < correctLines.length; i++) {
      if (cleanedUserSolution[i] !== correctLines[i]) {
        return {
          isCorrect: false,
          details: `Line ${i + 1} doesn't match the expected solution.`,
        };
      }
    }

    return {
      isCorrect: true,
      details: 'Your solution is correct!',
    };
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
   * Generate basic feedback locally without API call
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
      correctLines.push(line.trim());
    }

    // Clean user solution lines
    const cleanedUserSolution = solution
      .filter((line) => line.trim())
      .map((line) => line.trim());

    // Generate basic feedback based on issues
    if (cleanedUserSolution.length < correctLines.length) {
      return 'Your solution seems to be missing some code blocks. Have you included all the necessary steps?';
    }

    if (cleanedUserSolution.length > correctLines.length) {
      return "Your solution has extra code blocks. Are there any blocks that shouldn't be part of the solution?";
    }

    // Check for specific misplacements
    for (
      let i = 0;
      i < Math.min(cleanedUserSolution.length, correctLines.length);
      i++
    ) {
      if (cleanedUserSolution[i] !== correctLines[i]) {
        // First wrong line
        if (i === 0) {
          return "The first step in your solution doesn't look right. What should the program do first?";
        }

        // Last line is wrong
        if (i === correctLines.length - 1) {
          return "The last step in your solution doesn't look right. How should the program finish?";
        }

        // Check if the error is an indentation issue
        const userLine = cleanedUserSolution[i].trimStart();
        const correctLine = correctLines[i].trimStart();

        if (userLine === correctLine) {
          return `Line ${
            i + 1
          } seems to have incorrect indentation. Think about the code's structure - which blocks should be nested?`;
        }

        // Check if there's a line out of order
        const lineExistsElsewhere = correctLines.some(
          (line) => line.trim() === cleanedUserSolution[i].trim()
        );
        if (lineExistsElsewhere) {
          return `The line "${cleanedUserSolution[
            i
          ].trim()}" appears to be in the wrong position. Where in the logical flow should this operation happen?`;
        }

        // Generic error for wrong line
        return `Line ${
          i + 1
        } doesn't seem right. Think about what operation should happen at this point in the program.`;
      }
    }

    // Generic fallback
    return "There's an issue with your solution. Try to think about the logical flow of the program and the correct order of operations.";
  }
}
