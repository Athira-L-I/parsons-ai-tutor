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
}

const ParsonsPuzzle: React.FC<ParsonsPuzzleProps> = ({ 
  problemId,
  onSolutionChange 
}) => {
  const { currentProblem, setUserSolution } = useParsonsContext();
  const [codeBlocks, setCodeBlocks] = useState<CodeBlock[]>([]);
  const [sortableBlocks, setSortableBlocks] = useState<CodeBlock[]>([]);
  const [trashBlocks, setTrashBlocks] = useState<CodeBlock[]>([]);
  const [draggedBlock, setDraggedBlock] = useState<CodeBlock | null>(null);
  const sortableRef = useRef<HTMLDivElement>(null);
  const trashRef = useRef<HTMLDivElement>(null);
  
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
        area: 'trash'  // Start all blocks in trash area
      };
    });
  };
  
  // Handle drag start
  const handleDragStart = (block: CodeBlock) => {
    setDraggedBlock(block);
  };
  
  // Handle drag over
  const handleDragOver = (e: React.DragEvent, targetArea: 'sortable' | 'trash') => {
    e.preventDefault();
    // Add visual indication for drop zone if needed
  };
  
  // Handle drop
  const handleDrop = (e: React.DragEvent, targetArea: 'sortable' | 'trash', index: number = -1) => {
    e.preventDefault();

    if (!draggedBlock) return;

    const sourceArea = draggedBlock.area;

    // Remove block from source area
    if (sourceArea === 'sortable') {
      setSortableBlocks(prev => prev.filter(b => b.id !== draggedBlock.id));
    } else {
      setTrashBlocks(prev => prev.filter(b => b.id !== draggedBlock.id));
    }

    // Calculate indentation based on horizontal drop position
    let indentation = 0;
    if (targetArea === 'sortable') {
      const container = sortableRef.current?.getBoundingClientRect();
      if (container) {
        const relativeX = e.clientX - container.left;
        indentation = Math.max(0, Math.floor(relativeX / 40)); // Adjust `40` for indentation width
      }
    }

    // Add block to target area with updated indentation
    const updatedBlock = { ...draggedBlock, area: targetArea, indentation };

    if (targetArea === 'sortable') {
      if (index >= 0) {
        // Insert at specific position
        setSortableBlocks(prev => {
          const newBlocks = [...prev];
          newBlocks.splice(index, 0, updatedBlock);
          return newBlocks;
        });
      } else {
        // Add to end
        setSortableBlocks(prev => [...prev, updatedBlock]);
      }
    } else {
      if (index >= 0) {
        // Insert at specific position
        setTrashBlocks(prev => {
          const newBlocks = [...prev];
          newBlocks.splice(index, 0, updatedBlock);
          return newBlocks;
        });
      } else {
        // Add to end
        setTrashBlocks(prev => [...prev, updatedBlock]);
      }
    }

    setDraggedBlock(null);
  };
  
  // Adjust block indentation
  const adjustIndentation = (blockId: string, delta: number) => {
    setSortableBlocks(blocks => blocks.map(block => {
      if (block.id === blockId) {
        const newIndent = Math.max(0, block.indentation + delta);
        return { ...block, indentation: newIndent };
      }
      return block;
    }));
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
  
  // Handle drag over specific position
  const getDropIndex = (e: React.DragEvent, blocks: CodeBlock[]) => {
    if (!blocks.length) return 0;
    
    const container = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - container.top;
    const blockHeight = container.height / blocks.length;
    const index = Math.floor(y / blockHeight);
    
    return Math.max(0, Math.min(index, blocks.length));
  };
  
  return (
    <div className="parsons-puzzle-container">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Trash area */}
        {currentProblem?.options.trashId && (
          <div className="border-2 p-4 rounded-md min-h-64 w-full md:w-1/3 border-gray-300">
            <h3 className="text-lg font-semibold mb-2">Available Blocks</h3>
            <div 
              ref={trashRef}
              className="min-h-32 p-2"
              onDragOver={(e) => handleDragOver(e, 'trash')}
              onDrop={(e) => handleDrop(e, 'trash', getDropIndex(e, trashBlocks))}
            >
              {trashBlocks.map((block, index) => (
                <div
                  key={block.id}
                  draggable
                  onDragStart={() => handleDragStart(block)}
                  className="bg-white border p-3 rounded mb-2 cursor-move"
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
        <div className="border-2 p-4 rounded-md min-h-64 flex-1 border-gray-300">
          <h3 className="text-lg font-semibold mb-2">Your Solution</h3>
          <div 
            ref={sortableRef}
            className="min-h-32 p-2"
            onDragOver={(e) => handleDragOver(e, 'sortable')}
            onDrop={(e) => handleDrop(e, 'sortable', getDropIndex(e, sortableBlocks))}
          >
            {sortableBlocks.map((block, index) => (
              <div
                key={block.id}
                draggable
                onDragStart={() => handleDragStart(block)}
                className="bg-white border p-3 rounded mb-2 cursor-move flex items-center"
                style={{ paddingLeft: `${block.indentation * 2 + 0.75}rem` }} // Indentation based on `block.indentation`
              >
                <pre className="font-mono text-sm m-0 flex-1">{block.text}</pre>
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
    </div>
  );
};

export default ParsonsPuzzle;