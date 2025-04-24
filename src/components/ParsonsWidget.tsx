import React, { useEffect, useRef, useState } from 'react';
import { useParsonsContext } from '@/contexts/ParsonsContext';
import { ParsonsSettings } from '@/@types/types';
import { isParsonsWidgetLoaded } from '@/lib/parsonsLoader';

// Declare the ParsonsWidget type to match the JS library
declare global {
  interface Window {
    ParsonsWidget: any;
    jQuery: any;
    $: any;
    _: any;
    LIS: any; // Added LIS definition
  }
}

// Update the props interface
interface ParsonsWidgetProps {
  problemId?: string;
  onSolutionChange?: (solution: string[]) => void;
  onCheckSolution?: (isCorrect: boolean) => void;
}

// Use the increment function from context
const ParsonsWidgetComponent: React.FC<ParsonsWidgetProps> = ({ 
  problemId,
  onSolutionChange,
  onCheckSolution
}) => {
  const { 
    currentProblem, 
    setUserSolution, 
    setIsCorrect, 
    isCorrect,
    incrementAttempts // Get this from context 
  } = useParsonsContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const [parsonsWidget, setParsonsWidget] = useState<any>(null);
  const sortableId = 'parsons-sortable';
  const trashId = 'parsons-trash';
  
  // Check if all dependencies are properly loaded
  const isDependenciesLoaded = () => {
    return typeof window.jQuery !== 'undefined' && 
           typeof window.jQuery.ui !== 'undefined' && 
           typeof window.jQuery.fn.sortable === 'function' &&
           typeof window.ParsonsWidget !== 'undefined' &&
           typeof window.LIS !== 'undefined';
  };
  
  // Initialize the widget when the component mounts
  useEffect(() => {
    if (!currentProblem) return;
    
    // Ensure all dependencies are loaded
    if (!isDependenciesLoaded()) {
      console.log("Waiting for dependencies to load...");
      const checkInterval = setInterval(() => {
        if (isDependenciesLoaded()) {
          clearInterval(checkInterval);
          initializeWidget();
        }
      }, 100);
      
      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        console.error("Dependencies failed to load in time");
      }, 5000);
      
      return () => clearInterval(checkInterval);
    } else {
      initializeWidget();
    }
  }, [currentProblem]);
  
  // Separate function to initialize the widget
  const initializeWidget = () => {
    // Debug information
    console.log("All dependencies loaded");
    
    // Remove any existing feedback panels
    document.querySelectorAll('.parsons-feedback').forEach(el => el.remove());
    
    // Clean up any previous instances
    if (parsonsWidget) {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    }
    
    
    if (containerRef.current) {
      containerRef.current.innerHTML = `
        <div id="${trashId}" class="trash-container" data-label="Drag from here"></div>
        <div id="${sortableId}" class="sortable-container" data-label="Construct your solution here"></div>
      `;
    }
    
    try {
      // Initialize the widget without labels
      const options = {
        sortableId: sortableId,
        trashId: trashId,
        max_wrong_lines: currentProblem.options.max_wrong_lines || 10,
        can_indent: currentProblem.options.can_indent !== false, // Use correct logic
        x_indent: currentProblem.options.x_indent || 50,
        feedback_cb: (feedback: any) => handleFeedback(feedback),
        lang: currentProblem.options.lang || 'en',
        trash_label: "",
        solution_label: "",
        showFeedback : false
      };
      
      console.log("Initializing ParsonsWidget with options:", options);
      const widget = new window.ParsonsWidget(options);
      widget.init(currentProblem.initial);
      widget.shuffleLines();
      setParsonsWidget(widget);
      
      // Set up a solution change observer
      const observer = new MutationObserver(() => {
        if (!widget) return;
        updateSolution(widget);
      });
      
      const sortableElement = document.getElementById(sortableId);
      if (sortableElement) {
        observer.observe(sortableElement, {
          childList: true,
          subtree: true,
          attributes: true
        });
      }
      
      // Manual fix for the connectWith issue
      setTimeout(() => {
        if (window.jQuery && document.getElementById(`ul-${sortableId}`) && document.getElementById(`ul-${trashId}`)) {
          console.log("Fixing connectWith for existing sortables");
          
          // Just update the connectWith option without recreating the sortables
          window.jQuery(`#ul-${sortableId}`).sortable('option', 'connectWith', `#ul-${trashId}`);
          window.jQuery(`#ul-${trashId}`).sortable('option', 'connectWith', `#ul-${sortableId}`);
        }
      }, 500);
      
    } catch (error) {
      console.error("Error initializing ParsonsWidget:", error);
    }
  };
  
  // Handle feedback from the widget
  const handleFeedback = (feedback: any) => {
    console.log("Feedback received:", feedback);
    if (feedback.success !== undefined) {
      setIsCorrect(feedback.success);
      
      // Add additional feedback info to context if needed
      if (!feedback.success && feedback.errors) {
        console.log("Errors:", feedback.errors);
      }
    }
  };
  
  // Get the current solution from the widget
  const updateSolution = (widget: any) => {
    if (!widget) return;
    
    try {
      // First check if the sortable area exists
      const sortableElement = document.getElementById('ul-' + sortableId);
      if (!sortableElement) {
        console.warn('Sortable element not found');
        return;
      }
      
      // Get the solution with indentation from the widget
      const solution = widget.getModifiedCode("#ul-" + sortableId);
      const solutionLines = solution.map((line: any) => {
        // Use the widget's indentation value
        const indentSpaces = '    '.repeat(line.indent);
        return indentSpaces + line.code;
      });
      
      setUserSolution(solutionLines);
      
      if (onSolutionChange) {
        onSolutionChange(solutionLines);
      }
    } catch (error) {
      console.error('Error updating solution:', error);
    }
  };
  
  // Update checkSolution to increment attempts
  const checkSolution = () => {
    if (!parsonsWidget) return;
    
    try {
      // Increment attempts
      incrementAttempts();
      
      // Get feedback
      const feedback = parsonsWidget.getFeedback();
      console.log("Check solution feedback:", feedback);
      
      // Update application state
      if (feedback.success !== undefined) {
        setIsCorrect(feedback.success);
        
        // Call the onCheckSolution callback
        if (onCheckSolution) {
          onCheckSolution(feedback.success);
        }
      }
    } catch (error) {
      console.error("Error checking solution:", error);
    }
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (containerRef.current) {
        // Remove any observers or event listeners
        const sortableElement = document.getElementById(sortableId);
        if (sortableElement) {
          // Cleanup any jQuery UI sortable instances
          try {
            if (window.jQuery && window.jQuery(sortableElement).sortable) {
              window.jQuery(sortableElement).sortable('destroy');
            }
          } catch (e) {
            console.error('Error cleaning up sortable:', e);
          }
        }
      }
    };
  }, []);
  
  return (
    <div className="parsons-widget-container">
      <div 
        ref={containerRef} 
        className="parsons-puzzle-container"
      ></div>
      
      <div className="mt-6">
        <button
          onClick={checkSolution}
          className="px-6 py-2 rounded-md text-white font-medium bg-blue-600 hover:bg-blue-700"
        >
          Check Solution
        </button>
      </div>
    </div>
  );
};

export default ParsonsWidgetComponent;