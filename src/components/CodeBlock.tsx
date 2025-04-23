import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';

interface CodeBlockProps {
  id: string;
  index: number;
  text: string;
  indentation: number;
  area: 'sortable' | 'trash';
  moveBlock: (dragIndex: number, hoverIndex: number, sourceArea: 'sortable' | 'trash', targetArea: 'sortable' | 'trash') => void;
  changeIndentation: (index: number, newIndent: number) => void;
  canIndent: boolean;
  indentSize?: number;
}

interface DragItem {
  id: string;
  index: number;
  area: 'sortable' | 'trash';
  type: string;
}

const ItemTypes = {
  CODE_BLOCK: 'codeBlock',
};

const CodeBlock: React.FC<CodeBlockProps> = ({ 
  id, 
  index, 
  text, 
  indentation, 
  area, 
  moveBlock, 
  changeIndentation, 
  canIndent,
  indentSize = 50
}) => {
  const ref = useRef<HTMLDivElement>(null);
  
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.CODE_BLOCK,
    item: { id, index, area, type: ItemTypes.CODE_BLOCK },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });
  
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ItemTypes.CODE_BLOCK,
    hover: (item: DragItem, monitor) => {
      if (!ref.current) return;
      
      const dragIndex = item.index;
      const hoverIndex = index;
      const dragArea = item.area;
      const hoverArea = area;
      
      // Don't replace items with themselves
      if (dragIndex === hoverIndex && dragArea === hoverArea) return;
      
      // Determine rectangle on screen
      const hoverBoundingRect = ref.current.getBoundingClientRect();
      
      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      
      // Determine mouse position
      const clientOffset = monitor.getClientOffset();
      
      // Get pixels to the top
      const hoverClientY = clientOffset ? clientOffset.y - hoverBoundingRect.top : 0;
      
      // Only perform the move when the mouse has crossed half of the item's height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%
      
      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      
      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;
      
      // Perform the move
      moveBlock(dragIndex, hoverIndex, dragArea, hoverArea);
      
      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
      item.area = hoverArea;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });
  
  const handleIndentDecrease = () => {
    if (indentation > 0) {
      changeIndentation(index, indentation - 1);
    }
  };
  
  const handleIndentIncrease = () => {
    changeIndentation(index, indentation + 1);
  };
  
  const opacity = isDragging ? 0.4 : 1;
  const calculatedIndent = indentation * (indentSize / 16); // Converting to rem units
  
  // Connect drag and drop refs
  drag(drop(ref));
  
  return (
    <div 
      ref={ref}
      className={`flex items-center p-2 bg-white rounded shadow cursor-move ${
        isOver && canDrop ? 'border-2 border-blue-500' : 'border border-gray-200'
      }`}
      style={{ opacity, paddingLeft: `${calculatedIndent + 8}px` }}
    >
      {canIndent && area === 'sortable' && (
        <div className="flex space-x-1 mr-2">
          <button
            type="button"
            onClick={handleIndentDecrease}
            disabled={indentation === 0}
            className={`px-2 py-0.5 text-xs rounded ${
              indentation === 0 ? 'bg-gray-200 text-gray-500' : 'bg-gray-300 hover:bg-gray-400'
            }`}
          >
            ←
          </button>
          <button
            type="button"
            onClick={handleIndentIncrease}
            className="px-2 py-0.5 text-xs bg-gray-300 hover:bg-gray-400 rounded"
          >
            →
          </button>
        </div>
      )}
      <pre className="font-mono text-sm flex-1">{text}</pre>
    </div>
  );
};

export default CodeBlock;