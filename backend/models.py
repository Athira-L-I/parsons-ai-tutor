from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class SessionSnapshot(BaseModel):
    sessionId: str
    studentId: str
    problemId: str
    schoolId: str
    startTime: int
    endTime: int
    events: List[Dict[str, Any]]
    features: Dict[str, Any]
    stateHistory: Dict[str, int]

class ParsonsOptions(BaseModel):
    sortableId: Optional[str] = None
    trashId: Optional[str] = None
    max_wrong_lines: Optional[int] = None
    can_indent: Optional[bool] = None
    vartests: Optional[List[Dict[str, Any]]] = None
    grader: Optional[str] = None
    executable_code: Optional[str] = None
    programmingLang: Optional[str] = None
    unittests: Optional[str] = None
    x_indent: Optional[int] = None
    exec_limit: Optional[int] = None
    unittest_code_prepend: Optional[str] = None
    show_feedback: Optional[bool] = None
    lang: Optional[str] = None

class ParsonsSettings(BaseModel):
    initial: str
    options: ParsonsOptions

class Problem(BaseModel):
    id: str
    title: str
    description: str
    difficulty: str
    tags: List[str]
    parsonsSettings: ParsonsSettings
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

class ProblemList(BaseModel):
    problems: List[Problem]

class SourceCodeUpload(BaseModel):
    sourceCode: str

class SolutionSubmission(BaseModel):
    problemId: str
    solution: List[str]

class SolutionValidation(BaseModel):
    isCorrect: bool
    details: Optional[str] = None

class FeedbackRequest(BaseModel):
    problemId: str
    userSolution: List[str]

class FeedbackResponse(BaseModel):
    feedback: str