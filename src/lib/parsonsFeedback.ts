// src/lib/parsonsFeedback.ts

export interface BlockFeedback {
  isCorrect?: boolean;
  isIncorrect?: boolean;
  isCorrectIndent?: boolean;
  isIncorrectIndent?: boolean;
}

export const applyPositionFeedback = (
  studentCode: string[], 
  modelSolution: string[]
): BlockFeedback[] => {
  const feedback: BlockFeedback[] = studentCode.map(() => ({}));
  
  // Apply position feedback logic
  // This is a simplified version - you'd need to adapt the LIS algorithm 
  // from the original parser
  
  for (let i = 0; i < Math.min(studentCode.length, modelSolution.length); i++) {
    const studentLine = studentCode[i].trim();
    const modelLine = modelSolution[i].trim();
    
    if (studentLine === modelLine) {
      feedback[i].isCorrect = true;
    } else {
      feedback[i].isIncorrect = true;
    }
  }
  
  return feedback;
};

export const applyIndentationFeedback = (
  studentCode: string[], 
  modelSolution: string[]
): BlockFeedback[] => {
  const feedback: BlockFeedback[] = studentCode.map(() => ({}));
  
  // Apply indentation feedback logic
  for (let i = 0; i < Math.min(studentCode.length, modelSolution.length); i++) {
    const studentIndent = getIndentLevel(studentCode[i]);
    const modelIndent = getIndentLevel(modelSolution[i]);
    
    if (studentIndent === modelIndent) {
      feedback[i].isCorrectIndent = true;
    } else {
      feedback[i].isIncorrectIndent = true;
    }
  }
  
  return feedback;
};

const getIndentLevel = (line: string): number => {
  const match = line.match(/^(\s*)/);
  if (!match) return 0;
  return Math.floor(match[1].length / 4); // Assuming 4 spaces per indent
};