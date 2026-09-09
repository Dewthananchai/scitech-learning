import { createContext, useContext, type ReactNode } from 'react';
import { useSubjects, useLessons, useQuestions, useQuizzes } from './useStore';
import { GRADES } from '../types';
import type { SubjectUnit, Lesson, Question, Quiz, GradeInfo } from '../types';

interface AppContextType {
  grades: GradeInfo[];
  subjects: SubjectUnit[];
  addSubject: (subject: Omit<SubjectUnit, 'id'>) => SubjectUnit;
  updateSubject: (id: number, updates: Partial<SubjectUnit>) => void;
  deleteSubject: (id: number) => void;
  toggleSubjectActive: (id: number) => void;

  lessons: Lesson[];
  addLesson: (lesson: Omit<Lesson, 'id' | 'view_count'>) => Lesson;
  updateLesson: (id: number, updates: Partial<Lesson>) => void;
  deleteLesson: (id: number) => void;
  togglePublish: (id: number) => void;

  questions: Question[];
  addQuestion: (question: Omit<Question, 'id'>) => Question;
  addQuestionsBatch: (questions: Omit<Question, 'id'>[]) => Question[];
  updateQuestion: (id: number, updates: Partial<Question>) => void;
  deleteQuestion: (id: number) => void;
  deleteQuestionsByCategory: (category: string) => void;

  quizzes: Quiz[];
  addQuiz: (quiz: Omit<Quiz, 'id'>) => Quiz;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const subjectsStore = useSubjects();
  const lessonsStore = useLessons();
  const questionsStore = useQuestions();
  const quizzesStore = useQuizzes();

  return (
    <AppContext.Provider value={{
      grades: GRADES,
      ...subjectsStore,
      ...lessonsStore,
      ...questionsStore,
      ...quizzesStore,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be used within AppProvider');
  return ctx;
}
