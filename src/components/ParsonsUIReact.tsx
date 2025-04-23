import React, { useRef, useEffect, useState } from 'react';
import { ParsonsUI } from '@/lib/ParsonsUI';
import { ParsonsSettings } from '@/@types/types';

interface ParsonsUIReactProps {
  initialSettings: ParsonsSettings;
  containerId: string;
  onSettingsChange?: (settings: ParsonsSettings) => void;
}

const ParsonsUIReact: React.FC<ParsonsUIReactProps> = ({ 
  initialSettings, 
  containerId,
  onSettingsChange
}) => {
  const [parsonsUI, setParsonsUI] = useState<ParsonsUI | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef(initialSettings);

  // Keep settingsRef updated when props change
  useEffect(() => {
    settingsRef.current = initialSettings;
  }, [initialSettings]);

  // Initialize ParsonsUI
  useEffect(() => {
    // Only initialize once and when the container is available
    if (!parsonsUI && containerRef.current) {
      const uiInstance = new ParsonsUI(`#${containerId}`, initialSettings);
      setParsonsUI(uiInstance);
      
      // Set up interval to check for changes
      const intervalId = setInterval(() => {
        if (onSettingsChange) {
          const currentSettings = uiInstance.export();
          // Deep comparison would be better in a real implementation
          if (JSON.stringify(currentSettings) !== JSON.stringify(settingsRef.current)) {
            onSettingsChange(currentSettings);
          }
        }
      }, 500);
      
      // Clean up interval on unmount
      return () => clearInterval(intervalId);
    }
  }, [parsonsUI, containerId, initialSettings, onSettingsChange]);

  return (
    <div id={containerId} ref={containerRef} className="parsons-ui-container">
      {/* ParsonsUI will render here */}
    </div>
  );
};

export default ParsonsUIReact;