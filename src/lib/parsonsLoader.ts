/**
 * Utility to load the Parsons widget JavaScript dependencies
 */

// Keep track of loading state
let isLoading = false;
let isLoaded = false;
let loadPromise: Promise<boolean> | null = null;

// Dependencies required by the Parsons widget
const dependencies = [
  // JQuery (required by the Parsons widget)
  'https://code.jquery.com/jquery-3.6.0.min.js',
  // jQuery UI (provides the sortable functionality)
  'https://code.jquery.com/ui/1.13.2/jquery-ui.min.js',
  // Lodash (used as _ in the Parsons widget)
  'https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js',
  // Google Code Prettify for syntax highlighting
  'https://cdn.jsdelivr.net/gh/google/code-prettify@master/loader/run_prettify.js',
  // LIS module for Longest Increasing Subsequence algorithm
  '/js/lis.js',
  // Parsons widget itself
  '/js/parsons.js'
];

/**
 * Loads a JavaScript file asynchronously
 */
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

// Add this function to dynamically load CSS
function loadCSS(href: string): Promise<void> {
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = () => resolve();
    document.head.appendChild(link);
  });
}

/**
 * Loads all necessary dependencies for the Parsons widget
 * Returns a promise that resolves when all scripts are loaded
 */
export function loadParsonsWidget(): Promise<boolean> {
  // Return existing promise if already loading
  if (isLoading && loadPromise) {
    return loadPromise;
  }
  
  // Return resolved promise if already loaded
  if (isLoaded) {
    return Promise.resolve(true);
  }
  
  isLoading = true;
  
  // Load CSS before loading scripts
  return loadCSS('https://code.jquery.com/ui/1.13.2/themes/base/jquery-ui.css')
    .then(() => {
      // Load dependencies one after another
      loadPromise = dependencies.reduce(
        (promise, script) => promise.then(() => loadScript(script)),
        Promise.resolve()
      )
        .then(() => {
          isLoaded = true;
          isLoading = false;
          return true;
        })
        .catch((error) => {
          console.error('Error loading Parsons widget dependencies:', error);
          isLoading = false;
          return false;
        });
      
      return loadPromise;
    });
}

/**
 * Check if the Parsons widget is loaded
 */
export function isParsonsWidgetLoaded(): boolean {
  return isLoaded && typeof window.ParsonsWidget !== 'undefined';
}