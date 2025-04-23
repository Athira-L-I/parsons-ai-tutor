import React, { useEffect, useState } from 'react';
import { NextPage } from 'next';
import Link from 'next/link';
import { fetchProblems } from '@/lib/api';

interface Problem {
  id: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  completed: boolean;
}

const ProblemsPage: NextPage = () => {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  
  useEffect(() => {
    const loadProblems = async () => {
      try {
        const data = await fetchProblems();
        setProblems(data);
      } catch (error) {
        console.error('Failed to fetch problems:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadProblems();
  }, []);
  
  const filteredProblems = filter === 'all' 
    ? problems 
    : filter === 'completed'
      ? problems.filter(p => p.completed)
      : problems.filter(p => !p.completed);
  
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Practice Problems</h1>
      
      <div className="flex flex-wrap gap-4 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-md ${
            filter === 'all' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }`}
        >
          All Problems
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-md ${
            filter === 'completed' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }`}
        >
          Completed
        </button>
        <button
          onClick={() => setFilter('incomplete')}
          className={`px-4 py-2 rounded-md ${
            filter === 'incomplete' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }`}
        >
          Incomplete
        </button>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProblems.length > 0 ? (
            filteredProblems.map((problem) => (
              <Link 
                href={`/problems/${problem.id}`} 
                key={problem.id}
                className="block"
              >
                <div className="border rounded-lg p-5 bg-white hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-medium text-lg">{problem.title}</h3>
                    {problem.completed && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                        Completed
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center mb-3">
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                      problem.difficulty === 'easy'
                        ? 'bg-green-100 text-green-800'
                        : problem.difficulty === 'medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                    }`}>
                      {problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {problem.tags.map((tag, index) => (
                      <span key={index} className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="col-span-full text-center py-10 text-gray-500">
              No problems found matching your criteria.
            </div>
          )}
        </div>
      )}
      
      <div className="mt-8 text-center">
        <Link 
          href="/problems/create" 
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Create Your Own Problem
        </Link>
      </div>
    </div>
  );
};

export default ProblemsPage;