import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import ProtectedRoute from './components/ProtectedRoute'
import StudentDashboard from './pages/StudentDashboard'
import LessonView from './pages/LessonView'
import QuizPage from './pages/QuizPage'
import AdminDashboard from './pages/AdminDashboard'
import CreateLesson from './pages/CreateLesson'
import EditLesson from './pages/EditLesson'
import AdminLessons from './pages/AdminLessons'
import AdminUnits from './pages/AdminUnits'
import AdminQuestions from './pages/AdminQuestions'
import AdminWorksheets from './pages/AdminWorksheets'
import StudentWorksheets from './pages/StudentWorksheets'
import StudentWorksheetDo from './pages/StudentWorksheetDo'
import AdminQuestionsM1 from './pages/AdminQuestionsM1'
import StudentLessons from './pages/StudentLessons'
import StudentQuizzes from './pages/StudentQuizzes'
import StudentLessonQuizzes from './pages/StudentLessonQuizzes'
import StudentQuizPractice from './pages/StudentQuizPractice'
import StudentONetPractice from './pages/StudentONetPractice'
import AdminAnnouncements from './pages/AdminAnnouncements'
import StudentAnnouncements from './pages/StudentAnnouncements'
import AdminCalendar from './pages/AdminCalendar'
import StudentCalendar from './pages/StudentCalendar'
import AdminAttendance from './pages/AdminAttendance'
import AdminUsers from './pages/AdminUsers'
import StudentAttendance from './pages/StudentAttendance'
import AdminMissions from './pages/AdminMissions'
import StudentM1PracticeSelect from './pages/StudentM1PracticeSelect'
import StudentMissions from './pages/StudentMissions'
import ProfilePage from './pages/ProfilePage'

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/lesson/:id" element={<LessonView />} />
      <Route path="/quiz/:lessonId" element={<QuizPage />} />

      {/* Student routes */}
      <Route path="/dashboard" element={<ProtectedRoute requiredRole="student"><StudentDashboard /></ProtectedRoute>} />
      <Route path="/student/lessons" element={<ProtectedRoute requiredRole="student"><StudentLessons /></ProtectedRoute>} />
      <Route path="/student/quizzes" element={<ProtectedRoute requiredRole="student"><StudentQuizzes /></ProtectedRoute>} />
      <Route path="/student/worksheets" element={<ProtectedRoute requiredRole="student"><StudentWorksheets /></ProtectedRoute>} />
      <Route path="/student/worksheets/:id" element={<ProtectedRoute requiredRole="student"><StudentWorksheetDo /></ProtectedRoute>} />
      <Route path="/student/quizzes/lessons" element={<ProtectedRoute requiredRole="student"><StudentLessonQuizzes /></ProtectedRoute>} />
      <Route path="/student/quiz-practice/onet" element={<ProtectedRoute requiredRole="student"><StudentONetPractice /></ProtectedRoute>} />
      <Route path="/student/quiz-practice/:category" element={<ProtectedRoute requiredRole="student"><StudentQuizPractice /></ProtectedRoute>} />
      <Route path="/student/announcements" element={<ProtectedRoute requiredRole="student"><StudentAnnouncements /></ProtectedRoute>} />
      <Route path="/student/calendar" element={<ProtectedRoute requiredRole="student"><StudentCalendar /></ProtectedRoute>} />
      <Route path="/student/attendance" element={<ProtectedRoute requiredRole="student"><StudentAttendance /></ProtectedRoute>} />
      <Route path="/student/missions" element={<ProtectedRoute requiredRole="student"><StudentMissions /></ProtectedRoute>} />
      <Route path="/student/m1-practice" element={<ProtectedRoute requiredRole="student"><StudentM1PracticeSelect /></ProtectedRoute>} />
      <Route path="/student/profile" element={<ProtectedRoute requiredRole="student"><ProfilePage /></ProtectedRoute>} />

      {/* Admin routes */}
      <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/units" element={<ProtectedRoute requiredRole="admin"><AdminUnits /></ProtectedRoute>} />
      <Route path="/admin/lessons" element={<ProtectedRoute requiredRole="admin"><AdminLessons /></ProtectedRoute>} />
      <Route path="/admin/create-lesson" element={<ProtectedRoute requiredRole="admin"><CreateLesson /></ProtectedRoute>} />
      <Route path="/admin/edit-lesson/:id" element={<ProtectedRoute requiredRole="admin"><EditLesson /></ProtectedRoute>} />
      <Route path="/admin/questions" element={<ProtectedRoute requiredRole="admin"><AdminQuestions /></ProtectedRoute>} />
      <Route path="/admin/worksheets" element={<ProtectedRoute requiredRole="admin"><AdminWorksheets /></ProtectedRoute>} />
      <Route path="/admin/saved-worksheets" element={<ProtectedRoute requiredRole="admin"><AdminWorksheets defaultTab="saved" /></ProtectedRoute>} />
      <Route path="/admin/grade-worksheets" element={<ProtectedRoute requiredRole="admin"><AdminWorksheets defaultTab="grade" /></ProtectedRoute>} />
      <Route path="/admin/announcements" element={<ProtectedRoute requiredRole="admin"><AdminAnnouncements /></ProtectedRoute>} />
      <Route path="/admin/calendar" element={<ProtectedRoute requiredRole="admin"><AdminCalendar /></ProtectedRoute>} />
      <Route path="/admin/attendance" element={<ProtectedRoute requiredRole="admin"><AdminAttendance /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute requiredRole="admin"><AdminUsers /></ProtectedRoute>} />
      <Route path="/admin/missions" element={<ProtectedRoute requiredRole="admin"><AdminMissions /></ProtectedRoute>} />
      <Route path="/admin/profile" element={<ProtectedRoute requiredRole="admin"><ProfilePage /></ProtectedRoute>} />
    </Routes>
  )
}

export default App
