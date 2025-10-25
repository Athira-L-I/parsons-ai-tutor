import axios from 'axios';
import { ParsonsSettings } from '@/@types/types';

const API_URL =
  process.env.BACKEND_URL ||
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8000');

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchProblems = async () => {
  try {
    const response = await apiClient.get(`/api/problems`);
    return response.data;
  } catch (error) {
    console.error('Error fetching problems:', error);
    throw error;
  }
};

export const fetchProblemById = async (id: string) => {
  try {
    const response = await apiClient.get(`/api/problems/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching problem ${id}:`, error);
    throw error;
  }
};

export const checkSolution = async (problemId: string, solution: string[]) => {
  try {
    const response = await apiClient.post(`/api/solutions/validate`, {
      problemId,
      solution,
    });
    return response.data;
  } catch (error) {
    console.error('Error checking solution:', error);
    throw error;
  }
};

export const generateFeedback = async (
  problemId: string,
  solution: string[],
  errorContext?: {
    errorType: string;
    errorLines: number[];
    widgetMessage: string;
    rawErrors: any[];
    rawLogErrors: any[];
  }
) => {
  try {
    const response = await apiClient.post(`/api/feedback`, {
      problemId,
      userSolution: solution,
      errorContext: errorContext,
    });
    return response.data.feedback;
  } catch (error) {
    console.error('Error generating feedback:', error);
    throw error;
  }
};

export const generateProblem = async (sourceCode: string) => {
  try {
    const response = await apiClient.post(`/api/problems/generate`, {
      sourceCode,
    });
    return response.data;
  } catch (error) {
    console.error('Error generating problem:', error);
    throw error;
  }
};

export default apiClient;
