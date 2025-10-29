import axios from 'axios';
import { ParsonsSettings, ParsonsGrader } from '@/@types/types';

const API_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NODE_ENV === 'production'
    ? 'https://parsons-tutor.dedyn.io'
    : 'http://localhost:8000';

/**
 * Service for generating Parsons problems from source code
 */
export class ProblemGeneratorService {
  private apiUrl: string;

  constructor(apiUrl: string = API_URL) {
    this.apiUrl = apiUrl;
  }

  /**
   * Generate a Parsons problem from source code using the backend API
   *
   * @param sourceCode The source code to generate a problem from
   * @returns Promise resolving to the generated problem
   */
  async generateProblem(sourceCode: string): Promise<ParsonsSettings> {
    try {
      const response = await axios.post(`/api/problems/generate`, {
        sourceCode,
      });

      return response.data.parsonsSettings;
    } catch (error) {
      console.error('Error generating problem:', error);
      throw new Error('Failed to generate problem');
    }
  }

  /**
   * Generate a Parsons problem locally without API call
   * This is useful for development or when the backend is not available
   *
   * @param sourceCode The source code to generate a problem from
   * @returns Generated problem settings
   */
  generateProblemLocally(sourceCode: string): ParsonsSettings {
    // Parse the source code into lines
    const lines = sourceCode.trim().split('\n');

    // Filter out comments and empty lines
    const codeLines = lines.filter((line) => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith('#');
    });

    // ✅ FIXED: Explicitly type the distractors array
    const distractors: string[] = []; // this.generateSimpleDistractors(codeLines);

    // Create the combined code with distractors
    const combinedCode = [
      ...codeLines,
      ...distractors.map((d) => `${d} #distractor`),
    ].join('\n');

    // Return the problem settings
    return {
      initial: combinedCode,
      options: {
        sortableId: 'sortable',
        trashId: 'sortableTrash',
        max_wrong_lines: distractors.length,
        can_indent: true,
        grader: ParsonsGrader.LineBased,
        exec_limit: 2500,
        show_feedback: true,
      },
    };
  }

  /**
   * Generate simple distractors based on the provided code lines
   *
   * @param codeLines Array of code lines
   * @returns Array of distractor lines
   */
  private generateSimpleDistractors(codeLines: string[]): string[] {
    const distractors: string[] = [];

    // Simple distraction techniques:
    // 1. Missing colons on control structures
    // 2. Typos in variable names
    // 3. Reversed operators

    for (const line of codeLines) {
      const trimmed = line.trim();

      // Control structures with colons
      if (
        trimmed.match(
          /^\s*(if|for|while|def|class|else|elif|try|except|finally|with).*:$/
        )
      ) {
        distractors.push(trimmed.replace(/:\s*$/, ''));
      }

      // Typos in variable names
      const varMatches = trimmed.match(/\b([a-zA-Z_]\w*)\b/g);
      if (varMatches && varMatches.length > 0) {
        for (const varName of varMatches) {
          // Skip common keywords and short variable names
          if (
            [
              'if',
              'for',
              'while',
              'def',
              'class',
              'return',
              'print',
              'import',
              'from',
            ].includes(varName) ||
            varName.length < 3
          ) {
            continue;
          }

          // Create a typo
          const typoName = this.createTypo(varName);
          if (typoName !== varName) {
            const distractor = trimmed.replace(
              new RegExp(`\\b${varName}\\b`),
              typoName
            );
            distractors.push(distractor);
            break; // Only one typo per line
          }
        }
      }

      // Reversed operators
      const operatorMap: Record<string, string> = {
        '==': '!=',
        '!=': '==',
        '>': '<',
        '<': '>',
        '>=': '<=',
        '<=': '>=',
        '+': '-',
        '-': '+',
        '*': '/',
        '/': '*',
      };

      for (const [op, reversed] of Object.entries(operatorMap)) {
        if (trimmed.includes(op)) {
          distractors.push(trimmed.replace(op, reversed));
          break; // Only one reversed operator per line
        }
      }
    }

    // ✅ FIXED: Use Array.from() instead of spread operator with Set
    const uniqueDistractors = Array.from(new Set(distractors));
    const maxDistractors = Math.min(
      uniqueDistractors.length,
      Math.ceil(codeLines.length / 2)
    );

    // Shuffle and return limited set
    return uniqueDistractors
      .sort(() => Math.random() - 0.5)
      .slice(0, maxDistractors);
  }

  /**
   * Create a typo in a variable name
   *
   * @param name Original variable name
   * @returns Variable name with a typo
   */
  private createTypo(name: string): string {
    if (name.length < 3) return name;

    const mutations = [
      // Swap two adjacent characters
      () => {
        const pos = Math.floor(Math.random() * (name.length - 1));
        return (
          name.substring(0, pos) +
          name.charAt(pos + 1) +
          name.charAt(pos) +
          name.substring(pos + 2)
        );
      },
      // Remove a character
      () => {
        const pos = Math.floor(Math.random() * name.length);
        return name.substring(0, pos) + name.substring(pos + 1);
      },
      // Add a duplicate character
      () => {
        const pos = Math.floor(Math.random() * name.length);
        return name.substring(0, pos) + name.charAt(pos) + name.substring(pos);
      },
      // Change case of a character
      () => {
        const pos = Math.floor(Math.random() * name.length);
        const char = name.charAt(pos);
        const newChar =
          char === char.toUpperCase() ? char.toLowerCase() : char.toUpperCase();
        return name.substring(0, pos) + newChar + name.substring(pos + 1);
      },
    ];

    // Select a random mutation
    const mutation = mutations[Math.floor(Math.random() * mutations.length)];
    return mutation();
  }
}

export default ProblemGeneratorService;
