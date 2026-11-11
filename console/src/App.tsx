import React, { useState, useEffect } from 'react';
import { LoginPage } from './components/LoginPage';
import { StudentTestPortal } from './components/StudentTestPortal';
import { FacultyTriageConsole } from './components/FacultyTriageConsole';
import { InteractiveDemoTour } from './components/InteractiveDemoTour';
import { DemoTourProvider, useDemoTour } from './context/DemoTourContext';
import { User } from './types';

const AppContent: React.FC = () => {
  // Authentication state
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('acadza_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const { registerSetUser } = useDemoTour();

  // Register state updater with Demo Tour so it can switch roles dynamically
  useEffect(() => {
    registerSetUser(setCurrentUser);
  }, [registerSetUser]);

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* View routing based on auth state */}
      {!currentUser && <LoginPage onLoginSuccess={handleLoginSuccess} />}

      {currentUser && currentUser.role === 'student' && (
        <StudentTestPortal user={currentUser} onLogout={handleLogout} />
      )}

      {currentUser && (currentUser.role === 'professor' || currentUser.role === 'admin') && (
        <FacultyTriageConsole user={currentUser} onLogout={handleLogout} />
      )}

      {/* Interactive Tour MUST be the last element to guarantee it stays on top of all modals */}
      <InteractiveDemoTour />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <DemoTourProvider>
      <AppContent />
    </DemoTourProvider>
  );
};

export default App;
