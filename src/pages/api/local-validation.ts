import type { NextApiRequest, NextApiResponse } from 'next';
import { ParsonsSettings } from '@/@types/types';

type ValidationRequest = {
  settings: ParsonsSettings;
  solution: string[];
};

type ValidationResponse = {
  isCorrect: boolean;
  details: string;
};

/**
 * API route for local validation of Parsons problem solutions
 * This is useful for development or when the backend is not available
 */
export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ValidationResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { settings, solution } = req.body as ValidationRequest;

    if (!settings || !solution) {
      return res.status(400).json({ error: 'Missing required parameters' });
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
    const cleanedUserSolution = solution.map(line => line.trim()).filter(line => line);
    
    // Check if the solution has the right number of lines
    if (cleanedUserSolution.length !== correctLines.length) {
      return res.status(200).json({
        isCorrect: false,
        details: `Your solution has ${cleanedUserSolution.length} lines, but the correct solution has ${correctLines.length} lines.`
      });
    }
    
    // Compare each line
    for (let i = 0; i < correctLines.length; i++) {
      if (cleanedUserSolution[i] !== correctLines[i]) {
        return res.status(200).json({
          isCorrect: false,
          details: `Line ${i + 1} doesn't match the expected solution.`
        });
      }
    }
    
    return res.status(200).json({
      isCorrect: true,
      details: 'Your solution is correct!'
    });
  } catch (error) {
    console.error('Error in local validation:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}