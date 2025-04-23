import React, { useEffect, useRef } from 'react';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import CodeBlock from './CodeBlock';
import { useParsonsContext } from '@/contexts/ParsonsContext';

interface BlockItem {
  id: string;
  text: string;
  indentation: number;
}

const ParsonsBoard: React.FC = () => {
  const { 
    currentProblem, 
    userSolution, 
    setUserSolution,
    isCorrect
  } = useParsonsContext();
  
  const [blocks, setBlocks] = React.useState<BlockItem[]>([]);
  const [sortableBlocks, setSortableBlocks] = React.useState<BlockItem[]>([]);
  const [trashBlocks, setTrashBlocks] = React.useState<BlockItem[]>([]);
  
  // Initialize blocks from the current problem
  useEffect(() => {
    if (!currentProblem) return;
    
    const lines = currentProblem.initial.split('\n').filter(line => line.trim());
    
    const initialBlocks = lines.map((line, index) => {
      // Detect if the line is a distractor
      const isDistractor = line.includes('#distractor');
      const cleanLine = isDistractor ? line.replace(/#distractor\s*$/, '') : line;
      
      // Calculate initial indentation level
      const indentMatch = cleanLine.match(/^\s*/);
      const indentLevel = indentMatch ? Math.floor(indentMatch[0].length / 4) : 0;
      
      return {
        id: `block-${index}`,
        text: cleanLine.trimStart(),
        indentation: 0, // Start with zero indentation
        isDistractor
      };
    });
    
    // Shuffle the blocks
    const shuffledBlocks = [...initialBlocks].sort(() => Math.random() - 0.5);
    
    if (currentProblem.options.trashId) {
      // If trash is enabled, place blocks in sortable and trash areas
      const distractors = shuffledBlocks.filter(b => (b as any).isDistractor);
      const nonDistractors = shuffledBlocks.filter(b => !(b as any).isDistractor);
      
      setSortableBlocks([]);
      setTrashBlocks([...shuffledBlocks]);
    } else {
      // If no trash, all blocks go to sortable area
      setSortableBlocks([...shuffledBlocks]);
      setTrashBlocks([]);
    }
  }, [currentProblem]);
  
  const moveBlock = (dragIndex: number, hoverIndex: number, sourceArea: 'sortable' | 'trash', targetArea: 'sortable' | 'trash') => {
    if (sourceArea === targetArea && sourceArea === 'sortable') {
      // Moving within sortable area
      const result = Array.from(sortableBlocks);
      const [removed] = result.splice(dragIndex, 1);
      result.splice(hoverIndex, 0, removed);
      
      setSortableBlocks(result);
      setUserSolution(result.map(block => block.text));
    } else if (sourceArea === 'trash' && targetArea === 'sortable') {
      // Moving from trash to sortable
      const draggedBlock = trashBlocks[dragIndex];
      
      setTrashBlocks(trashBlocks.filter((_, index) => index !== dragIndex));
      
      const newSortableBlocks = [...sortableBlocks];
      newSortableBlocks.splice(hoverIndex, 0, draggedBlock);
      
      setSortableBlocks(newSortableBlocks);
      setUserSolution(newSortableBlocks.map(block => block.text));
    } else if (sourceArea === 'sortable' && targetArea === 'trash') {
      // Moving from sortable to trash
      const draggedBlock = sortableBlocks[dragIndex];
      
      setSortableBlocks(sortableBlocks.filter((_, index) => index !== dragIndex));
      
      const newTrashBlocks = [...trashBlocks];
      newTrashBlocks.splice(hoverIndex, 0, draggedBlock);
      
      setTrashBlocks(newTrashBlocks);
      setUserSolution(sortableBlocks.filter((_, index) => index !== dragIndex).map(block => block.text));
    }
  };
  
  const changeIndentation = (index: number, newIndent: number) => {
    if (!currentProblem?.options.can_indent) return;
    
    const updatedBlocks = [...sortableBlocks];
    updatedBlocks[index] = { ...updatedBlocks[index], indentation: newIndent };
    
    setSortableBlocks(updatedBlocks);
  };
  
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col md:flex-row gap-4 w-full">
        {/* Trash area */}
        {currentProblem?.options.trashId && (
          <div 
            className={`border-2 p-4 rounded-md min-h-64 w-full md:w-1/3 ${
              isCorrect === false ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <h3 className="text-lg font-semibold mb-2">Available Blocks</h3>
            <div className="space-y-2">
              {trashBlocks.map((block, index) => (
                <CodeBlock
                  key={block.id}
                  id={block.id}
                  index={index}
                  text={block.text}
                  indentation={block.indentation}
                  area="trash"
                  moveBlock={moveBlock}
                  changeIndentation={changeIndentation}
                  canIndent={false}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Solution area */}
        <div 
          className={`border-2 p-4 rounded-md min-h-64 flex-1 ${
            isCorrect === true ? 'border-green-300' : isCorrect === false ? 'border-red-300' : 'border-gray-300'
          }`}
        >
          <h3 className="text-lg font-semibold mb-2">Your Solution</h3>
          <div className="space-y-2">
            {sortableBlocks.map((block, index) => (
              <CodeBlock
                key={block.id}
                id={block.id}
                index={index}
                text={block.text}
                indentation={block.indentation}
                area="sortable"
                moveBlock={moveBlock}
                changeIndentation={changeIndentation}
                canIndent={currentProblem?.options.can_indent || false}
                indentSize={currentProblem?.options.x_indent || 50}
              />
            ))}
            {sortableBlocks.length === 0 && (
              <div className="p-4 text-gray-500 border border-dashed rounded">
                Drag code blocks here to build your solution
              </div>
            )}
          </div>
        </div>
      </div>
    </DndProvider>
  );
};

export default ParsonsBoard;