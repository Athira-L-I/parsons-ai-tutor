from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import problems, solutions, feedback, sessions  

app = FastAPI(title="Parsons Problem Tutor API")

# Setup CORS
origins = [
    "http://localhost:3000",  # Next.js frontend
    "https://parsons-problem-tutor.vercel.app",  # Production frontend (example)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(problems.router, prefix="/api/problems", tags=["problems"])
app.include_router(solutions.router, prefix="/api/solutions", tags=["solutions"])
app.include_router(feedback.router, prefix="/api/feedback", tags=["feedback"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["sessions"])

@app.get("/")
async def root():
    return {"message": "Welcome to Parsons Problem Tutor API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)