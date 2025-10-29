from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import problems, solutions, feedback, sessions  

app = FastAPI(title="Parsons Problem Tutor API", redirect_slashes=False)

# Setup CORS
origins = [
    "http://localhost:3000",  # Next.js frontend
    "https://parsons-tutor.vercel.app",  # Production frontend
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add a health check endpoint
@app.get("/health")
async def health():
    return {"status": "healthy", "message": "Parsons API is running"}

# Include routers
app.include_router(problems.router, prefix="/api/problems/", tags=["problems"])
app.include_router(solutions.router, prefix="/api/solutions/", tags=["solutions"])
app.include_router(feedback.router, prefix="/api/feedback/", tags=["feedback"])
app.include_router(sessions.router, prefix="/api/sessions/", tags=["sessions"])

@app.get("/")
async def root():
    return {"message": "Welcome to Parsons Problem Tutor API"}

@app.get("/api")
async def api_root():
    return {"message": "Parsons Problem Tutor API - /api endpoint"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)