// src/hooks/useSimpleStorage.ts - FIXED VERSION

import { useState, useEffect, useCallback, useRef } from 'react';
import { SessionSnapshot } from '@/lib/logging/types';

/**
 * Simple session storage with prompt-based student ID entry
 * Session = One problem attempt (problemId included in sessionId)
 */
export function useSimpleStorage(problemId: string) {
  // ✅ ADD problemId parameter
  // ✅ FIXED: Regenerate sessionId when problemId changes
  const [sessionId, setSessionId] = useState(() =>
    generateSessionId(problemId)
  );

  const [studentId, setStudentId] = useState<string | null>(() => {
    // Always start with null - no persistence across page loads
    return null;
  });

  const [schoolId, setSchoolId] = useState<string>('research-study');

  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);

  // ✅ FIXED: Include problemId in session ID generation
  function generateSessionId(problemId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `session-${problemId}-${timestamp}-${random}`;
  }

  // ✅ NEW: Regenerate session when problem changes
  useEffect(() => {
    setSessionId(generateSessionId(problemId));
    console.log(`[Storage] New session created for problem: ${problemId}`);
  }, [problemId]);

  const isValidStudentId = useCallback((id: string): boolean => {
    const cleaned = id.trim().toUpperCase();
    return cleaned.length >= 3 && cleaned.length <= 20;
  }, []);

  const promptForStudentInfo = useCallback(() => {
    let attempts = 0;
    const maxAttempts = 3;

    const askForId = (): string | null => {
      attempts++;

      const enteredId = prompt(
        `Enter your assigned Student ID (attempt ${attempts}/${maxAttempts}):`
      );

      if (!enteredId) {
        if (attempts < maxAttempts) {
          alert('Student ID is required to continue with the study.');
          return askForId();
        } else {
          alert(
            'Cannot proceed without a valid Student ID. Please contact your instructor.'
          );
          return null;
        }
      }

      const cleanedId = enteredId.trim().toUpperCase();

      if (!isValidStudentId(cleanedId)) {
        if (attempts < maxAttempts) {
          alert(
            'Invalid Student ID format. Please check with your instructor and try again.'
          );
          return askForId();
        } else {
          alert(
            'Cannot proceed without a valid Student ID. Please contact your instructor.'
          );
          return null;
        }
      }

      return cleanedId;
    };

    const validId = askForId();

    if (validId) {
      setStudentId(validId);

      // Optional: Ask for school/class info
      const school = prompt('Enter your school or class code (optional):');
      if (school?.trim()) {
        setSchoolId(school.trim());
      }

      console.log(`[Storage] Student ID set: ${validId}`);
      return validId;
    }

    return null;
  }, [isValidStudentId]);

  // Auto-prompt on first load if no student ID
  useEffect(() => {
    if (!studentId) {
      const timer = setTimeout(() => {
        promptForStudentInfo();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [studentId, promptForStudentInfo]);

  useEffect(() => {
    isSavingRef.current = isSaving;
  }, [isSaving]);

  /**
   * Save session to backend
   */
  const saveSession = useCallback(async (snapshot: SessionSnapshot) => {
    if (isSavingRef.current) return;

    isSavingRef.current = true;
    setIsSaving(true);

    try {
      const response = await fetch(`/api/sessions/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshot),
      });

      if (!response.ok) {
        throw new Error('Failed to save session');
      }

      console.log('Session saved:', snapshot.sessionId);
    } catch (error) {
      console.error('Failed to save session:', error);
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, []);

  /**
   * End current session (clear student info for next student)
   */
  const endSession = useCallback(() => {
    console.log(`[Storage] Ending session for student: ${studentId}`);

    // Reset state for next student
    setStudentId(null);
    setSchoolId('research-study');
  }, [studentId]);

  return {
    sessionId,
    studentId: studentId || 'pending',
    schoolId,
    saveSession,
    updateStudentInfo: promptForStudentInfo,
    isStudentIdSet: !!studentId,
    endSession, // NEW: Add endSession function
    isSaving,
  };
}
