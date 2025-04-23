import React, { useState, useEffect } from 'react';
import ParsonsUIReact from './ParsonsUIReact';
import { useParsonsContext } from '@/contexts/ParsonsContext';
import { ParsonsSettings, ParsonsGrader } from '@/@types/types';

interface ParsonsEditorProps {
  onSolutionChange?: (solution: string[]) => void;
}

const defaultSettings: ParsonsSettings = {
  initial: 'def example():\n    print("Hello, world!")',
  options: {
    sortableId: 'sortable',
    trashId: 'sortableTrash',
    max_wrong_lines: 10,
    can_indent: true,
    grader: ParsonsGrader.LineBased,
    exec_limit: 2500,
    show_feedback: true
  }
};

const ParsonsEditor: React.FC<ParsonsEditorProps> = ({ onSolutionChange }) => {
  const { currentProblem, setCurrentProblem, setUserSolution } = useParsonsContext();
  const [settings, setSettings] = useState<ParsonsSettings>(currentProblem || defaultSettings);
  const editorId = 'parsons-editor-container';

  // Update local settings when context problem changes
  useEffect(() => {
    if (currentProblem) {
      setSettings(currentProblem);
    }
  }, [currentProblem]);

  // Handle settings changes from the UI
  const handleSettingsChange = (newSettings: ParsonsSettings) => {
    setSettings(newSettings);
    setCurrentProblem(newSettings);
    
    // Extract the current solution to update the context
    if (onSolutionChange) {
      // Parse the solution from the current arrangement
      // This is a simplified version - in a real implementation,
      // you would need to extract the solution based on DOM elements
      const solution = extractCurrentSolution();
      onSolutionChange(solution);
      setUserSolution(solution);
    }
  };
  
  // Extract current solution from the DOM
  // In a real implementation, this would interact with the Parsons UI
  const extractCurrentSolution = (): string[] => {
    // This is a placeholder - you'd need to implement actual DOM parsing
    // based on how the ParsonsUI library structures its elements
    const sortableElement = document.getElementById('sortable');
    if (!sortableElement) return [];
    
    // Extract text from the sortable area
    const codeBlocks = Array.from(sortableElement.querySelectorAll('.block'));
    return codeBlocks.map(block => {
      const codeText = block.textContent || '';
      // Calculate indentation by checking class or style
      const indentMatch = block.getAttribute('style')?.match(/margin-left: (\d+)px/);
      const indentLevel = indentMatch ? Math.floor(parseInt(indentMatch[1], 10) / 50) : 0;
      
      // Add appropriate indentation to the code
      return '    '.repeat(indentLevel) + codeText.trim();
    });
  };

  return (
    <div className="parsons-editor-wrapper">
      <ParsonsUIReact
        initialSettings={settings}
        containerId={editorId}
        onSettingsChange={handleSettingsChange}
      />
      
      {/* Additional UI controls can be added here */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => {
            const solution = extractCurrentSolution();
            if (onSolutionChange) {
              onSolutionChange(solution);
            }
            setUserSolution(solution);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Update Solution
        </button>
      </div>
    </div>
  );
};

export default ParsonsEditor;