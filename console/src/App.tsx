import React, { useState, useEffect } from 'react';
import { LoginPage } from './components/LoginPage';
import { StudentTestPortal } from './components/StudentTestPortal';
import { FacultyTriageConsole } from './components/FacultyTriageConsole';
import { User } from './types';

export const App: React.FC = () => {
  // Authentication state
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('acadza_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Ensure Light Mode is strictly enforced
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('acadza_current_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('acadza_current_user');
  };

  // If no user is signed in, show the clean LoginPage with role selection
  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // If logged in as Student
  if (currentUser.role === 'student') {
    return <StudentTestPortal user={currentUser} onLogout={handleLogout} />;
  }

  // If logged in as Professor or Admin
  return <FacultyTriageConsole user={currentUser} onLogout={handleLogout} />;
};

export default App;
