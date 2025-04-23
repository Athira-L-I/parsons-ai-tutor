import $ from 'cash-dom';
import { ParsonsSettings, ParsonsGrader, ParsonsOptions } from '@/@types/types';
import { convertParsonsGraderFuncToEnum } from './converters';

/**
 * Adapter class to bridge between the ParsonsUI library and modern browser/React environments
 */
export class ParsonsAdapter {
  private container: HTMLElement;
  private settings: ParsonsSettings;
  private initialized: boolean = false;
  
  constructor(containerId: string, settings: ParsonsSettings) {
    this.container = document.getElementById(containerId) || document.body;
    this.settings = settings;
  }
  
  /**
   * Initialize the Parsons puzzle with the current settings
   */
  initialize(): void {
    if (this.initialized) return;
    
    // Create the necessary DOM structure
    this.createDomStructure();
    
    // Set initial code and options
    this.updateCode(this.settings.initial);
    this.updateOptions(this.settings.options);
    
    this.initialized = true;
  }
  
  /**
   * Create the DOM structure required by the ParsonsUI library
   */
  private createDomStructure(): void {
    // Clear container
    $(this.container).empty();
    
    // Create the basic structure
    const structure = `
      <div class="ParsonsUI">
        <div class="code-blocks-container">
          <div class="code-blocks-ta-container fieldset">
            <label for="initial">Code to Become Blocks</label>
            <textarea id="initial" rows="7"></textarea>
          </div>
          <div class="contain-html-container fieldset">
            <input id="code-contain-html" type="checkbox" />
            <label for="code-contain-html" class="code-contain-html-label">Code blocks contain HTML?</label>
          </div>
        </div>
        
        <div class="distractor-blocks-container">
          <div class="distractor-blocks-ta-container fieldset">
            <label for="distractors">Code to Become Distractor Blocks</label>
            <textarea id="distractors" rows="6"></textarea>
          </div>
          <div class="distractor-blocks-max-container fieldset">
            <label for="max-distractors">Max Distractors</label>
            <input id="max-distractors" type="number" value="10" />
          </div>
        </div>
        
        <div class="common-settings-container">
          <div class="grader-container fieldset">
            <label for="grader">Grader</label>
            <select id="grader"></select>
          </div>
          <div class="show-feedback-container fieldset">
            <label for="show-feedback">Show feedback</label>
            <input id="show-feedback" type="checkbox" checked />
          </div>
          <div class="dragging-container fieldset">
            <label for="require-dragging">Require dragging?</label>
            <input id="require-dragging" type="checkbox" />
          </div>
          <div class="indenting-container fieldset">
            <label for="disable-indent">Disable indentation?</label>
            <input id="disable-indent" type="checkbox" />
          </div>
          <div class="indent-size-container fieldset">
            <label for="indent-size">Indent Size(px)</label>
            <input id="indent-size" type="text" value="50" />
          </div>
          <div class="exec-limit-container fieldset">
            <label for="exec-limit">Exec Limit(ms)</label>
            <input id="exec-limit" type="text" value="2500" />
          </div>
        </div>
        
        <!-- Grader specific containers will be added dynamically -->
      </div>
    `;
    
    $(this.container).append(structure);
    
    // Initialize grader dropdown
    const graderSelect = $(this.container).find('#grader');
    graderSelect.append(`<option value="${ParsonsGrader.LineBased}">LineBasedGrader</option>`);
    graderSelect.append(`<option value="${ParsonsGrader.VariableCheck}">VariableCheckGrader</option>`);
    graderSelect.append(`<option value="${ParsonsGrader.UnitTest}">UnitTestGrader</option>`);
    graderSelect.append(`<option value="${ParsonsGrader.LanguageTranslation}">LanguageTranslationGrader</option>`);
    graderSelect.append(`<option value="${ParsonsGrader.Turtle}">TurtleGrader</option>`);
  }
  
  /**
   * Update the initial code in the editor
   */
  updateCode(codeString: string): void {
    // Split code into regular blocks and distractors
    const lines = codeString.split('\n');
    const codeBlocks: string[] = [];
    const distractors: string[] = [];
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      if (line.includes('#distractor')) {
        distractors.push(line.replace(/#distractor\s*$/, ''));
      } else {
        codeBlocks.push(line);
      }
    }
    
    // Update the textareas
    $(this.container).find('#initial').val(codeBlocks.join('\n'));
    $(this.container).find('#distractors').val(distractors.join('\n'));
  }
  
  /**
   * Update the Parsons options
   */
  updateOptions(options: ParsonsOptions): void {
    // Set grader
    if (options.grader) {
      const graderValue = typeof options.grader === 'string' 
        ? options.grader 
        : options.grader.name || ParsonsGrader.LineBased;
      
      $(this.container).find('#grader').val(convertParsonsGraderFuncToEnum(graderValue));
    }
    
    // Set max distractors
    if (options.max_wrong_lines !== undefined) {
      $(this.container).find('#max-distractors').val(options.max_wrong_lines.toString());
    }
    
    // Set indentation options
    if (options.can_indent !== undefined) {
      $(this.container).find('#disable-indent').prop('checked', !options.can_indent);
    }
    
    if (options.x_indent !== undefined) {
      $(this.container).find('#indent-size').val(options.x_indent.toString());
    }
    
    // Set execution limit
    if (options.exec_limit !== undefined) {
      $(this.container).find('#exec-limit').val(options.exec_limit.toString());
    }
    
    // Set dragging requirement
    if (options.trashId) {
      $(this.container).find('#require-dragging').prop('checked', true);
    }
    
    // Set feedback visibility
    if (options.show_feedback !== undefined) {
      $(this.container).find('#show-feedback').prop('checked', options.show_feedback);
    }
    
    // TODO: Set grader-specific options based on the selected grader
  }
  
  /**
   * Get the current settings from the UI
   */
  getCurrentSettings(): ParsonsSettings {
    // In a real implementation, this would extract all the values from the form
    // For now, we'll just return the original settings
    return this.settings;
  }
  
  /**
   * Destroy the Parsons UI and clean up resources
   */
  destroy(): void {
    if (!this.initialized) return;
    
    // Clean up event listeners and DOM elements
    $(this.container).empty();
    this.initialized = false;
  }
}

export default ParsonsAdapter;