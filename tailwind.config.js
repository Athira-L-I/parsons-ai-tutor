/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        parsons: {
          area: '#efefff',
          block: '#EFEFEF',
          incorrect: '#FFBABA',
          incorrectBg: '#ffefef',
          correct: '#DFF2BF',
          correctBg: '#efffef',
          output: '#FFA'
        }
      },
      borderWidth: {
        '6': '6px',
      }
    }
  },
  plugins: [
    function({ addComponents }) {
      addComponents({
        '.parsons-block': {
          borderRadius: '10px',
          backgroundColor: '#EFEFEF',
          border: '1px solid lightgray',
          padding: '10px',
          marginTop: '5px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          cursor: 'move',
          boxSizing: 'content-box',
          '&:hover': {
            overflow: 'visible'
          }
        },
        '.parsons-area': {
          backgroundColor: '#efefff',
          paddingBottom: '10px',
          paddingLeft: '0',
          border: '1px solid #efefff',
          fontFamily: 'monospace',
          fontSize: '120%'
        },
        '.parsons-toggle': {
          padding: '0 15px',
          display: 'inline-block',
          border: '1px dashed black',
          zIndex: '500',
          cursor: 'pointer',
          minWidth: '10px',
          minHeight: '15px',
          '&:empty': {
            borderColor: 'red',
            '&:before': {
              content: '"??"',
              display: 'block',
              color: 'red'
            }
          }
        }
      })
    }
  ]
};