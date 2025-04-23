import React, { useEffect, useRef, useState } from 'react';
import { useParsonsContext } from '@/contexts/ParsonsContext';
import { ParsonsSettings } from '@/@types/types';

interface ParsonsPuzzleProps {
  problemId?: string;
  onSolutionChange?: (blocks: string[]) => void;
}

interface CodeBlock {
  id: string;
  text: string;
  indentation: number;
  area: 'sortable' | 'trash';
  isCorrect?: boolean;
  isIncorrect?: boolean;
  isCorrectIndent?: boolean;
  isIncorrectIndent?: boolean;
}

const ParsonsPuzzle: React.FC<ParsonsPuzzleProps> = ({ 
  problemId,
  onSolutionChange 
}) => {
  const { currentProblem, setUserSolution, isCorrect } = useParsonsContext();
  const [codeBlocks, setCodeBlocks] = useState<CodeBlock[]>([]);
  const [sortableBlocks, setSortableBlocks] = useState<CodeBlock[]>([]);
  const [trashBlocks, setTrashBlocks] = useState<CodeBlock[]>([]);
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [isDraggingHorizontally, setIsDraggingHorizontally] = useState(false);
  const sortableRef = useRef<HTMLDivElement>(null);
  const trashRef = useRef<HTMLDivElement>(null);
  
  // X-indent size in pixels (from the original Parsons widget)
  const X_INDENT = currentProblem?.options.x_indent || 50;
  
  // Initialize blocks from the problem
  useEffect(() => {
    if (!currentProblem) return;
    
    const blocks = parseBlocksFromSettings(currentProblem);
    setCodeBlocks(blocks);
    
    // Initialize blocks in sortable or trash area based on problem settings
    if (currentProblem.options.trashId) {
      setSortableBlocks([]);
      setTrashBlocks(blocks);
    } else {
      setSortableBlocks(blocks);
      setTrashBlocks([]);
    }
  }, [currentProblem]);
  
  // Update solution whenever blocks change
  useEffect(() => {
    updateSolution();
  }, [sortableBlocks]);
  
  // Parse code blocks from the problem settings
  const parseBlocksFromSettings = (settings: ParsonsSettings): CodeBlock[] => {
    const lines = settings.initial.split('\n').filter(line => line.trim());
    
    return lines.map((line, index) => {
      // Remove distractor marker if present
      const isDistractor = line.includes('#distractor');
      const cleanedLine = isDistractor ? line.replace(/#distractor\s*$/, '') : line;
      
      return {
        id: `block-${index}`,
        text: cleanedLine.trim(),
        indentation: 0,
        area: 'trash'
      };
    });
  };
  
  // Handle drag start
  const handleDragStart = (e: React.DragEvent, block: CodeBlock, index: number) => {
    // Store initial horizontal position for indentation calculation
    setDragStartX(e.clientX);
    setDraggingIndex(index);
    setIsDraggingHorizontally(false);
    
    // Set transfer data for the drag operation
    e.dataTransfer.setData("text/plain", block.id);
    
    // Set the drag image (the element being dragged)
    const draggedElement = e.currentTarget as HTMLElement;
    if (draggedElement) {
      const rect = draggedElement.getBoundingClientRect();
      e.dataTransfer.setDragImage(draggedElement, rect.width / 2, rect.height / 2);
    }
  };
  
  // Handle drag over - detect horizontal movement for indentation
  const handleDragOver = (e: React.DragEvent, area: 'sortable' | 'trash') => {
    e.preventDefault();
    
    // Only handle indentation in the sortable area when indentation is allowed
    if (area === 'sortable' && currentProblem?.options.can_indent && 
        dragStartX !== null && draggingIndex !== null) {
      
      const horizontalMovement = e.clientX - dragStartX;
      
      // If horizontal movement exceeds threshold, consider it as indentation adjustment
      if (Math.abs(horizontalMovement) > 20 && !isDraggingHorizontally) {
        setIsDraggingHorizontally(true);
      }
      
      if (isDraggingHorizontally) {
        const indentChange = Math.floor(horizontalMovement / X_INDENT);
        if (indentChange !== 0) {
          // Update indentation of the dragged block
          adjustIndentation(draggingIndex, indentChange);
          // Reset drag start position to prevent continuous indentation
          setDragStartX(e.clientX);
        }
      }
    }
  };
  
  // Adjust indentation of a block
  const adjustIndentation = (blockIndex: number, indentChange: number) => {
    if (!currentProblem?.options.can_indent) return;
    
    setSortableBlocks(blocks => {
      return blocks.map((block, idx) => {
        if (idx === blockIndex) {
          // Calculate new indentation level - minimum 0
          const newIndent = Math.max(0, block.indentation + indentChange);
          return { ...block, indentation: newIndent };
        }
        return block;
      });
    });
  };
  
  // Handle drop of a code block
  const handleDrop = (e: React.DragEvent, targetArea: 'sortable' | 'trash') => {
    e.preventDefault();
    
    // Reset drag state
    setDragStartX(null);
    setDraggingIndex(null);
    setIsDraggingHorizontally(false);
    
    const blockId = e.dataTransfer.getData("text/plain");
    if (!blockId) return;
    
    // Find the block in either area
    const block = [...sortableBlocks, ...trashBlocks].find(b => b.id === blockId);
    if (!block) return;
    
    // Handle vertical placement
    const dropY = e.clientY;
    const targetContainer = targetArea === 'sortable' ? sortableRef.current : trashRef.current;
    
    if (!targetContainer) return;
    
    const containerRect = targetContainer.getBoundingClientRect();
    const containerBlocks = targetArea === 'sortable' ? sortableBlocks : trashBlocks;
    const blockElements = targetContainer.querySelectorAll('.parsons-block');
    
    // Determine drop index based on Y position
    let dropIndex = containerBlocks.length;
    
    for (let i = 0; i < blockElements.length; i++) {
      const rect = blockElements[i].getBoundingClientRect();
      const blockMiddle = rect.top + (rect.height / 2);
      
      if (dropY < blockMiddle) {
        dropIndex = i;
        break;
      }
    }
    
    // Source and target areas could be different
    const sourceArea = block.area;
    const newBlock = { ...block, area: targetArea };
    
    // Remove from source
    if (sourceArea === 'sortable') {
      setSortableBlocks(blocks => blocks.filter(b => b.id !== blockId));
    } else {
      setTrashBlocks(blocks => blocks.filter(b => b.id !== blockId));
    }
    
    // Add to target at the drop index
    if (targetArea === 'sortable') {
      setSortableBlocks(blocks => {
        const newBlocks = [...blocks];
        newBlocks.splice(dropIndex, 0, newBlock);
        return newBlocks;
      });
    } else {
      // Reset indentation when moving to trash
      newBlock.indentation = 0;
      setTrashBlocks(blocks => {
        const newBlocks = [...blocks];
        newBlocks.splice(dropIndex, 0, newBlock);
        return newBlocks;
      });
    }
    
    // Log movement for context
    if (sourceArea !== targetArea) {
      console.log(`Moved block from ${sourceArea} to ${targetArea}`);
    } else {
      console.log(`Reordered block within ${targetArea}`);
    }
  };
  
  // Handle drag end
  const handleDragEnd = () => {
    // Reset all drag state
    setDragStartX(null);
    setDraggingIndex(null);
    setIsDraggingHorizontally(false);
    
    // Update solution after drag operation completes
    updateSolution();
  };
  
  // Update solution based on current block arrangement
  const updateSolution = () => {
    const solution = sortableBlocks.map(block => {
      const indentSpaces = '    '.repeat(block.indentation);
      return `${indentSpaces}${block.text}`;
    });
    
    setUserSolution(solution);
    
    if (onSolutionChange) {
      onSolutionChange(solution);
    }
  };
  
  return (
    <div className="parsons-puzzle-container">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Trash area */}
        {currentProblem?.options.trashId && (
          <div 
            className={`border-2 p-4 rounded-md min-h-64 w-full md:w-4/12 ${
              isCorrect === false ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <h3 className="text-lg font-semibold mb-2">Available Blocks</h3>
            <div 
              ref={trashRef}
              className="parsons-area min-h-32 p-2 w-full bg-gray-50"
              onDragOver={(e) => handleDragOver(e, 'trash')}
              onDrop={(e) => handleDrop(e, 'trash')}
            >
              {trashBlocks.map((block, index) => (
                <div
                  key={block.id}
                  id={block.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, block, index)}
                  onDragEnd={handleDragEnd}
                  className="parsons-block bg-white border border-gray-200 rounded-lg p-3 mb-2 cursor-move"
                >
                  <pre className="font-mono text-sm m-0">{block.text}</pre>
                </div>
              ))}
              {trashBlocks.length === 0 && (
                <div className="text-gray-400 text-center p-4">
                  All blocks are in use
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Sortable area */}
        <div 
          className={`flex-1 border-2 p-4 rounded-md min-h-64 ${
            isCorrect === true ? 'border-green-300' : 
            isCorrect === false ? 'border-red-300' : 'border-gray-300'
          }`}
        >
          <h3 className="text-lg font-semibold mb-2">Your Solution</h3>
          <div 
            ref={sortableRef}
            className={`parsons-area min-h-32 p-2 ${
              isCorrect === true ? 'bg-green-50' : 
              isCorrect === false ? 'bg-red-50' : 'bg-blue-50'
            }`}
            onDragOver={(e) => handleDragOver(e, 'sortable')}
            onDrop={(e) => handleDrop(e, 'sortable')}
          >
            {sortableBlocks.map((block, index) => (
              <div
                key={block.id}
                id={block.id}
                draggable
                onDragStart={(e) => handleDragStart(e, block, index)}
                onDragEnd={handleDragEnd}
                className={`parsons-block bg-white border rounded-lg p-3 mb-2 cursor-move ${
                  // Add feedback classes based on block state
                  block.isCorrect ? 'bg-green-100 border-green-500' :
                  block.isIncorrect ? 'bg-red-100 border-red-500' :
                  block.isIncorrectIndent ? 'border-l-4 border-l-red-500' :
                  block.isCorrectIndent ? 'border-l-4 border-l-green-500' : ''
                }`}
                style={{ 
                  marginLeft: `${block.indentation * (X_INDENT / 16)}rem` 
                }}
              >
                <pre className="font-mono text-sm m-0">{block.text}</pre>
              </div>
            ))}
            {sortableBlocks.length === 0 && (
              <div className="text-gray-400 text-center p-4 border-2 border-dashed rounded">
                Drag code blocks here to build your solution
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Add a hint about horizontal dragging */}
      {currentProblem?.options.can_indent && sortableBlocks.length > 0 && (
        <div className="mt-2 text-sm text-gray-500 italic">
          Tip: Drag blocks horizontally to adjust indentation
        </div>
      )}
    </div>
  );
};

export default ParsonsPuzzle;