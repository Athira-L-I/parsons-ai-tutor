# Parsons Problem Tutor

A modern learning platform that helps students learn programming through code reordering exercises with AI-based Socratic feedback.

## Features

- **Interactive Parsons Problem Solver**: Students solve programming tasks by rearranging jumbled code blocks into the correct order.
- **Drag-and-Drop Interface**: User-friendly UI for code rearrangement with indentation control.
- **AI-Based Socratic Feedback**: Provides hints in the form of questions to stimulate critical thinking.
- **Adaptive Problem Generator**: Automatically create problems from existing code or templates.
- **Progress Tracking**: Monitor learning progress and performance over time.

## Tech Stack

### Frontend

- **Next.js & React**: Core application framework
- **Tailwind CSS**: Utility-first styling
- **React DnD**: Drag-and-drop functionality
- **Zustand**: State management

### Backend

- **FastAPI**: High-performance API framework
- **Uvicorn**: ASGI server
- **OpenAI API**: AI-powered feedback generation

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- Python 3.8+
- OpenAI API key (for AI feedback)

### Installation

#### Frontend Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/parsons-problem-tutor.git
cd parsons-problem-tutor

# Install dependencies
npm install

# Create .env.local file
cp .env.example .env.local
# Edit .env.local to add your environment variables

# Start the development server
npm run dev
```

#### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export OPENAI_API_KEY=your_api_key_here  # On Windows: set OPENAI_API_KEY=your_api_key_here

# Start the backend server
uvicorn main:app --reload
```

## Project Structure

```
parsons-problem-tutor/
├── src/               # Frontend source code
│   ├── @types/        # TypeScript type definitions
│   ├── components/    # React components
│   ├── contexts/      # React context providers
│   ├── lib/           # Utility functions and API clients
│   ├── pages/         # Next.js pages
│   └── styles/        # Global styles
├── backend/           # Backend source code
│   ├── routers/       # API route handlers
│   ├── services/      # Business logic
│   └── main.py        # FastAPI entry point
└── public/            # Static assets
```

## Deployment

### Frontend

The Next.js frontend can be deployed on Vercel:

```bash
vercel
```

### Backend

The FastAPI backend can be deployed on platforms like Railway or Render:

```bash
# Example for Railway
railway up
```

## Documentation

- **[Hint Logging Evolution](docs/HINT_LOGGING_EVOLUTION.md)**: Complete guide for evolving from simple socratic hints to full conversational chat, maintaining ProgSnap2 compliance and backwards compatibility.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- This project was inspired by the [codio/parsons-puzzle-ui](https://github.com/codio/parsons-puzzle-ui) library.
