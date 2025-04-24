import React, { useEffect, useRef, useState } from 'react';
import { useParsonsContext } from '@/contexts/ParsonsContext';
import $ from 'cash-dom';
import { ParsonsSettings } from '@/@types/types';

interface ParsonsPuzzleProps {
  problemId?: string;
  onSolutionChange?: (blocks: string[]) => void;
}

const ParsonsPuzzle: React.FC<ParsonsPuzzleProps> = ({ 
  problemId,
  onSolutionChange 
}) => {
  const { currentProblem, setUserSolution } = useParsonsContext();
  const puzzleRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Initialize the Parsons puzzle when component mounts or problem changes
  useEffect(() => {
    if (typeof window === 'undefined' || !currentProblem || !puzzleRef.current) return;

    // Check if we're already initialized
    if (isInitialized) {
      $(puzzleRef.current).empty();
    }

    try {
      // Create the Parsons puzzle elements
      createParsonsPuzzle(puzzleRef.current, currentProblem);
      setIsInitialized(true);

      // Set up solution tracking
      setupSolutionTracking();
    } catch (error) {
      console.error('Error initializing Parsons puzzle:', error);
    }

    // Cleanup function
    return () => {
      if (puzzleRef.current) {
        const sortableArea = puzzleRef.current.querySelector('.sortable-code-container');
        const trashArea = puzzleRef.current.querySelector('.sortable-trash-container');

        if (sortableArea) sortableArea.remove();
        if (trashArea) trashArea.remove();
      }
    };
  }, [currentProblem]);
  
  // Create the Parsons puzzle UI manually
  const createParsonsPuzzle = (container: HTMLDivElement, settings: ParsonsSettings) => {
    if (typeof document === 'undefined') return;

    const blocks = parseBlocksFromSettings(settings);

    const sortableId = settings.options.sortableId || 'sortable';
    const sortableArea = document.createElement('div');
    sortableArea.id = sortableId;
    sortableArea.className = 'sortable-code-container';
    container.appendChild(sortableArea);

    if (settings.options.trashId) {
      const trashArea = document.createElement('div');
      trashArea.id = settings.options.trashId;
      trashArea.className = 'sortable-trash-container';
      container.appendChild(trashArea);

      blocks.forEach((block, index) => {
        const blockElement = createBlockElement(block, index, settings.options.can_indent);
        trashArea.appendChild(blockElement);
      });
    } else {
      blocks.forEach((block, index) => {
        const blockElement = createBlockElement(block, index, settings.options.can_indent);
        sortableArea.appendChild(blockElement);
      });
    }

    initializeDragAndDrop(sortableId, settings.options.trashId);
  };
  
  // Parse code blocks from the settings
  const parseBlocksFromSettings = (settings: ParsonsSettings): string[] => {
    const lines = settings.initial.split('\n');
    return lines.filter(line => line.trim()).map(line => {
      // Remove distractor marker if present
      return line.replace(/#distractor\s*$/, '');
    });
  };
  
  // Create a draggable block element
  const createBlockElement = (code: string, index: number, canIndent?: boolean): HTMLElement => {
    const block = document.createElement('div');
    block.className = 'parsons-block';
    block.setAttribute('data-index', index.toString());
    block.draggable = true;
    
    // Add code content
    const codeElement = document.createElement('pre');
    codeElement.textContent = code.trim();
    block.appendChild(codeElement);
    
    // Add indent controls if enabled
    if (canIndent) {
      const indentControls = document.createElement('div');
      indentControls.className = 'indent-controls';
      
      const decreaseButton = document.createElement('button');
      decreaseButton.textContent = '←';
      decreaseButton.className = 'indent-decrease';
      decreaseButton.onclick = () => adjustIndentation(block, -1);
      
      const increaseButton = document.createElement('button');
      increaseButton.textContent = '→';
      increaseButton.className = 'indent-increase';
      increaseButton.onclick = () => adjustIndentation(block, 1);
      
      indentControls.appendChild(decreaseButton);
      indentControls.appendChild(increaseButton);
      block.appendChild(indentControls);
    }
    
    return block;
  };
  
  // Adjust the indentation of a block
  const adjustIndentation = (block: HTMLElement, amount: number) => {
    const currentIndent = parseInt(block.getAttribute('data-indent') || '0', 10);
    const newIndent = Math.max(0, currentIndent + amount);
    block.setAttribute('data-indent', newIndent.toString());
    
    // Update visual indentation
    const indentSize = 30; // pixels per indent level
    block.style.paddingLeft = `${newIndent * indentSize}px`;
    
    // Update solution when indentation changes
    updateCurrentSolution();
  };
  
  // Initialize drag and drop functionality
  const initializeDragAndDrop = (sortableId: string, trashId?: string) => {
    const sortableArea = document.getElementById(sortableId);
    const trashArea = trashId ? document.getElementById(trashId) : null;
    
    if (!sortableArea) return;
    
    // A very simple drag and drop implementation
    // In a real app, you'd use a library or more robust implementation
    
    // Add event listeners to all blocks
    const blocks = document.querySelectorAll('.parsons-block');
    blocks.forEach(block => {
      block.addEventListener('dragstart', (e) => {
        if (!(e instanceof DragEvent) || !e.dataTransfer) return;
        e.dataTransfer.setData('text/plain', (block as HTMLElement).getAttribute('data-index') || '');
        setTimeout(() => {
          (block as HTMLElement).classList.add('dragging');
        }, 0);
      });
      
      block.addEventListener('dragend', () => {
        (block as HTMLElement).classList.remove('dragging');
        updateCurrentSolution();
      });
    });
    
    // Make areas droppable
    [sortableArea, trashArea].filter(Boolean).forEach(area => {
      if (!area) return;
      
      area.addEventListener('dragover', (e) => {
        e.preventDefault();
        area.classList.add('drag-over');
      });
      
      area.addEventListener('dragleave', () => {
        area.classList.remove('drag-over');
      });
      
      area.addEventListener('drop', (e) => {
        e.preventDefault();
        area.classList.remove('drag-over');
        
        if (!(e instanceof DragEvent) || !e.dataTransfer) return;
        
        const blockIndex = e.dataTransfer.getData('text/plain');
        const block = document.querySelector(`[data-index="${blockIndex}"]`);
        
        if (block && block.parentNode !== area) {
          area.appendChild(block); // Only append if the block is not already in `area`
          updateCurrentSolution();
        }
      });
    });
  };
  
  // Setup solution tracking
  const setupSolutionTracking = () => {
    // Set initial solution
    setTimeout(() => {
      updateCurrentSolution();
    }, 100);
  };
  
  // Update the current solution based on the arrangement of blocks
  const updateCurrentSolution = () => {
    if (!puzzleRef.current) return;
    
    const sortableId = currentProblem?.options.sortableId || 'sortable';
    const sortableArea = document.getElementById(sortableId);
    
    if (!sortableArea) return;
    
    const blocks = Array.from(sortableArea.querySelectorAll('.parsons-block'));
    const solution = blocks.map(block => {
      const codeElement = block.querySelector('pre');
      const code = codeElement?.textContent || '';
      
      // Get indentation
      const indentLevel = parseInt((block as HTMLElement).getAttribute('data-indent') || '0', 10);
      
      // Return indented code
      return '    '.repeat(indentLevel) + code.trim();
    });
    
    // Update the solution in context
    setUserSolution(solution);
    
    // Call the callback if provided
    if (onSolutionChange) {
      onSolutionChange(solution);
    }
  };
  
  return (
    <div className="parsons-puzzle-container">
      <div className="flex flex-col md:flex-row gap-4">
        {currentProblem?.options.trashId && (
          <div className="border-2 p-4 rounded-md min-h-64 w-full md:w-1/3 border-gray-300">
            <h3 className="text-lg font-semibold mb-2">Available Blocks</h3>
            {/* Trash area will be populated by the puzzle initialization */}
          </div>
        )}
        
        <div className="border-2 p-4 rounded-md min-h-64 flex-1 border-gray-300">
          <h3 className="text-lg font-semibold mb-2">Your Solution</h3>
          <div 
            ref={puzzleRef} 
            className="parsons-puzzle"
          >
            {/* Puzzle will be initialized here */}
            {!isInitialized && currentProblem && (
              <div className="text-center py-4 text-gray-500">
                Initializing puzzle...
              </div>
            )}
            
            {!currentProblem && (
              <div className="text-center py-4 text-gray-500">
                No problem loaded. Please select a problem.
              </div>
            )}
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .parsons-block {
          margin: 8px 0;
          padding: 8px;
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
          cursor: move;
          position: relative;
          display: flex;
          align-items: center;
        }
        
        .parsons-block.dragging {
          opacity: 0.5;
        }
        
        .parsons-block pre {
          margin: 0;
          font-family: monospace;
          flex-grow: 1;
        }
        
        .indent-controls {
          display: flex;
          margin-right: 10px;
        }
        
        .indent-controls button {
          padding: 2px 6px;
          font-size: 12px;
          background: #eee;
          border: 1px solid #ccc;
          margin: 0 2px;
          cursor: pointer;
        }
        
        .sortable-code-container, .sortable-trash-container {
          min-height: 50px;
          padding: 10px;
        }
        
        .drag-over {
          background-color: rgba(59, 130, 246, 0.1);
        }
      `}</style>
    </div>
  );
};

export default ParsonsPuzzle;