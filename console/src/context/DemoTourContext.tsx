import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { User } from '../types';

export interface TourStep {
  step: number;
  title: string;
  speaker: string;
  speakerRole: 'narrator' | 'student' | 'faculty' | 'ai' | 'dean';
  speakerAvatar: string;
  dialogue: string;
  actionLabel: string;
  actionDescription: string;
  dataFlowNote: string;
  targetSelector: string;
  fallbackSelector?: string;
  preferredSide: 'top' | 'bottom' | 'left' | 'right' | 'center';
  audioFile: string;
  roleRequired?: 'student' | 'professor' | 'admin' | null;
  targetSubject?: string | null;
  executeAction?: () => void;
}

export const TOUR_STEPS: TourStep[] = [
  {
    step: 1,
    title: 'Multi-Role Authentication Gateway',
    speaker: 'Platform Narrator',
    speakerRole: 'narrator',
    speakerAvatar: '🎙️',
    dialogue: "Acadza secures sessions with 256-bit CSPRNG bearer tokens and SHA-256 salted credentials, strictly masking answer keys on the server until submission. We log in as Aarav.",
    actionLabel: '⚡ Auto-Login as Student & Start Exam',
    actionDescription: 'Role-based login: Student, Subject Faculties (Prof A, B, C), and Academic Dean.',
    dataFlowNote: 'SECURITY: Sessions use 256-bit CSPRNG bearer tokens. Answers & solutions are strictly masked server-side until test submission.',
    targetSelector: '#tour-login-card',
    fallbackSelector: '.login-portal-card',
    preferredSide: 'right',
    audioFile: '/audio/step-01.mp3',
    roleRequired: null
  },
  {
    step: 2,
    title: 'Authentic Exam Simulator & Student Attempt',
    speaker: 'Aarav (JEE Aspirant)',
    speakerRole: 'student',
    speakerAvatar: '🎓',
    dialogue: "In the Exam Simulator, students solve authentic entrance questions. The client evaluates answers through an isolated server-side scoring endpoint, preventing client-side inspection.",
    actionLabel: '⚡ Select 50 V (Option A) & Submit Test',
    actionDescription: 'Select Option A (50 V) on the series LCR question and submit test to view live scorecard.',
    dataFlowNote: 'DATA INTEGRITY: Server computes scoring metrics without exposing answer keys in client-side scripts.',
    targetSelector: '#tour-student-test-view',
    fallbackSelector: '#tour-student-question',
    preferredSide: 'right',
    audioFile: '/audio/step-02.mp3',
    roleRequired: 'student'
  },
  {
    step: 3,
    title: 'In-Test Student Doubt Submission',
    speaker: 'Aarav (JEE Aspirant)',
    speakerRole: 'student',
    speakerAvatar: '🎓',
    dialogue: "The student submits a doubt directly from their scorecard. The feedback intake engine captures question metadata and dispatches it directly into SQLite with zero delay.",
    actionLabel: '⚡ Submit Doubt to Physics Faculty Queue',
    actionDescription: 'Auto-fill mathematical explanation and submit doubt into SQLite database.',
    dataFlowNote: 'DISPATCH: Real-time feedback intake writes to SQLite reports table and notifies the Physics queue with zero delay.',
    targetSelector: '#tour-student-report-doubt',
    fallbackSelector: '#tour-doubt-modal',
    preferredSide: 'top',
    audioFile: '/audio/step-03.mp3',
    roleRequired: 'student'
  },
  {
    step: 4,
    title: 'Real-Time Arrival in Physics Queue (Prof A)',
    speaker: 'Platform Narrator',
    speakerRole: 'narrator',
    speakerAvatar: '🎙️',
    dialogue: "Switching to Prof A. Server-side RBAC enforces subject isolation to Physics. The student's doubt arrives deduplicated, timestamp-sorted, and prioritized by urgency score.",
    actionLabel: '⚡ Open Incoming Physics Doubt',
    actionDescription: 'Focus on the freshly submitted LCR doubt at the top of the Physics queue.',
    dataFlowNote: 'RBAC SCOPING: FastAPI require_faculty_or_admin dependency checks auth_user["subject"]. Cross-dept access yields 403 Forbidden.',
    targetSelector: '#tour-faculty-queue-item',
    fallbackSelector: '#tour-faculty-queue',
    preferredSide: 'right',
    audioFile: '/audio/step-04.mp3',
    roleRequired: 'professor',
    targetSubject: 'Physics'
  },
  {
    step: 5,
    title: 'Zen Calm Focus Mode & AI Pre-Triage Diff',
    speaker: 'Prof A (Physics Faculty)',
    speakerRole: 'faculty',
    speakerAvatar: '⚛️',
    dialogue: "Focus Mode presents an AI pre-triage diff. The engine independently verified the solution, detected the answer mismatch, and staged a surgical diff with 98% confidence.",
    actionLabel: '⚡ Inspect AI Derivation & Surgical Diff',
    actionDescription: 'Review the side-by-side Before vs After diff card and independent mathematical proof.',
    dataFlowNote: 'TAXONOMY ENFORCEMENT: Proposed edit is strictly restricted to field: "answer". Guardrails prohibit AI from modifying question stem or inventing options.',
    targetSelector: '#tour-focus-diff-card',
    fallbackSelector: '#tour-focus-diff',
    preferredSide: 'bottom',
    audioFile: '/audio/step-05.mp3',
    roleRequired: 'professor',
    targetSubject: 'Physics'
  },
  {
    step: 6,
    title: 'Voice AI Co-Pilot & Spoken Dictation',
    speaker: 'Prof A (Physics Faculty)',
    speakerRole: 'faculty',
    speakerAvatar: '⚛️',
    dialogue: "Faculty dictate solution notes via Web Speech API. Spoken audio streams in real time and normalizes into structured mathematical expressions without manual typing.",
    actionLabel: '⚡ Stream Spoken Derivation to Co-Pilot',
    actionDescription: 'Stream natural speech dictation into the voice input box for formula validation.',
    dataFlowNote: 'SPEECH PROCESSING: Web Speech API streams real-time speech. Raw spoken math is normalized into clean TeX formulas.',
    targetSelector: '#tour-voice-copilot-modal',
    fallbackSelector: '#tour-voice-copilot-btn',
    preferredSide: 'left',
    audioFile: '/audio/step-06.mp3',
    roleRequired: 'professor',
    targetSubject: 'Physics'
  },
  {
    step: 7,
    title: 'AI Formula Sanity Engine & Discrepancy Prevention',
    speaker: 'AI Verification Engine',
    speakerRole: 'ai',
    speakerAvatar: '🤖',
    dialogue: "The Formula Sanity Engine evaluates dictations using AST and SymPy logic. If an arithmetic slip occurs, the agent questions back before dispatch, preventing faulty updates.",
    actionLabel: '⚡ Verify Mathematical Soundness',
    actionDescription: 'Execute formula sanity checker to confirm physical laws and absence of arithmetic discrepancies.',
    dataFlowNote: 'SAFETY INVARIANT: AST mismatch triggers questionBack with 1-click correction. Clean derivations are marked verified_sound.',
    targetSelector: '#tour-formula-sanity-result',
    fallbackSelector: '#tour-sanity-check-box',
    preferredSide: 'top',
    audioFile: '/audio/step-07.mp3',
    roleRequired: 'professor',
    targetSubject: 'Physics'
  },
  {
    step: 8,
    title: 'Pedagogical Reply Synthesis & 1-Click Approval',
    speaker: 'Prof A (Physics Faculty)',
    speakerRole: 'faculty',
    speakerAvatar: '⚛️',
    dialogue: "The agent synthesizes a clear pedagogical reply. With 1-click or pressing 'A', the question bank patches idempotently, committing an immutable audit log event.",
    actionLabel: '⚡ Approve 1-Click Fix (A) & Patch Database',
    actionDescription: 'Approve fix, patch question bank idempotently, write audit event, and advance queue.',
    dataFlowNote: 'IDEMPOTENT WRITE: apply_question_patch verifies replacement presence to prevent duplicate appends. SQLite commits audit log.',
    targetSelector: '#tour-approve-hero-btn',
    fallbackSelector: '#tour-action-approve-btn',
    preferredSide: 'top',
    audioFile: '/audio/step-08.mp3',
    roleRequired: 'professor',
    targetSubject: 'Physics'
  },
  {
    step: 9,
    title: 'Dean Multi-Department Segmentation Bar',
    speaker: 'Dean of Academics',
    speakerRole: 'dean',
    speakerAvatar: '🏛️',
    dialogue: "The Dean role provides bird's-eye department segmentation, tracking queue backlogs, resolution rates, and SLA compliance across Physics, Zoology, and Botany.",
    actionLabel: '⚡ Inspect All Departments & Physics Triage',
    actionDescription: 'Toggle between All Departments (43), Physics (33), Zoology (6), and Botany (4).',
    dataFlowNote: 'MULTI-DEPARTMENT OVERSIGHT: Dean role (admin) queries aggregated metrics across all faculty subject queues.',
    targetSelector: '#tour-dean-dept-bar',
    fallbackSelector: '#tour-dean-segmentation-bar',
    preferredSide: 'bottom',
    audioFile: '/audio/step-09.mp3',
    roleRequired: 'admin'
  },
  {
    step: 10,
    title: 'Closed-Loop Trust: Student Score Restored',
    speaker: 'Aarav (Student) & Narrator',
    speakerRole: 'student',
    speakerAvatar: '🎓',
    dialogue: "Back in the student portal, the doubt is marked resolved, faculty explanation delivered, and the student's +4 score restored—closing the loop autonomously.",
    actionLabel: '🎉 Complete Walkthrough & Replay',
    actionDescription: 'Verify resolved doubt on student scorecard with full explanation and marks restored (+4).',
    dataFlowNote: 'CLOSED-LOOP VALUE: Transforms negative student frustration into immediate academic trust without regressions.',
    targetSelector: '#tour-student-resolved-card',
    fallbackSelector: '#tour-student-doubts-tab',
    preferredSide: 'center',
    audioFile: '/audio/step-10.mp3',
    roleRequired: 'student'
  }
];

interface DemoTourContextType {
  isActive: boolean;
  currentStepIndex: number;
  currentStep: TourStep;
  totalSteps: number;
  isAutoPlay: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
  audioProgress: number; // 0 to 100
  overrideSide: 'top' | 'bottom' | 'left' | 'right' | null;
  startTour: () => void;
  endTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  jumpToStep: (index: number) => void;
  toggleAutoPlay: () => void;
  toggleMute: () => void;
  replayAudio: () => void;
  flipSide: () => void;
  executeCurrentAction: () => void;
  setUserCallback?: (user: User | null) => void;
  registerSetUser: (cb: (user: User | null) => void) => void;
  demoState: {
    studentAnswers: Record<string, string>;
    studentComment: string;
    copilotNotes: string;
    copilotAnalyzed: boolean;
    fixApproved: boolean;
  };
  setDemoState: React.Dispatch<React.SetStateAction<any>>;
}

const DemoTourContext = createContext<DemoTourContextType | null>(null);

export const DemoTourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isActive, setIsActive] = useState<boolean>(() => {
    return localStorage.getItem('acadza_tour_active') === 'true';
  });
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isAutoPlay, setIsAutoPlay] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [audioProgress, setAudioProgress] = useState<number>(0);
  const [overrideSide, setOverrideSide] = useState<'top' | 'bottom' | 'left' | 'right' | null>(null);

  const setUserRef = useRef<((user: User | null) => void) | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoAdvanceTimerRef = useRef<any>(null);

  const [demoState, setDemoState] = useState({
    studentAnswers: {},
    studentComment: 'Sir, in this series LCR circuit, V_R = 40V, V_L = 60V, V_C = 30V. Total voltage should be sqrt(40^2 + (60-30)^2) = 50 V (Option A). Why is key C marked 130 V?',
    copilotNotes: 'In this series LCR circuit, we apply phasor addition. Resistance voltage is 40 volts. Net reactive voltage is VL minus VC, which is 60 minus 30 equals 30 volts. Total supply voltage is square root of 40 squared plus 30 squared, giving 50 volts. The answer must be Option A, not 130 volts.',
    copilotAnalyzed: false,
    fixApproved: false
  });

  const registerSetUser = useCallback((cb: (user: User | null) => void) => {
    setUserRef.current = cb;
  }, []);

  const currentStep = TOUR_STEPS[currentStepIndex] || TOUR_STEPS[0];

  // Voice narration engine (Audio file first, Web Speech Synthesis fallback)
  const playNarration = useCallback((step: TourStep) => {
    if (isMuted) {
      setIsSpeaking(false);
      return;
    }

    // Stop current speech or audio
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }

    const audio = new Audio();
    audio.src = step.audioFile;
    audio.muted = isMuted;
    audioRef.current = audio;

    let playedViaAudio = false;

    audio.addEventListener('playing', () => {
      setIsSpeaking(true);
      playedViaAudio = true;
    });

    audio.addEventListener('timeupdate', () => {
      if (audio.duration) {
        setAudioProgress((audio.currentTime / audio.duration) * 100);
      }
    });

    const handleAudioEnd = () => {
      setIsSpeaking(false);
      setAudioProgress(100);
      if (isAutoPlay) {
        autoAdvanceTimerRef.current = setTimeout(() => {
          nextStep();
        }, 1500);
      }
    };

    audio.addEventListener('ended', handleAudioEnd);

    audio.addEventListener('error', () => {
      // Audio file not found -> Fallback to Web Speech API Text-to-Speech!
      if (!playedViaAudio && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(step.dialogue);
        utterance.rate = 1.0;
        utterance.pitch = step.speakerRole === 'student' ? 1.05 : step.speakerRole === 'faculty' ? 0.95 : 1.0;
        
        // Pick high quality voice if available
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha')));
        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
          setIsSpeaking(false);
          setAudioProgress(100);
          if (isAutoPlay) {
            autoAdvanceTimerRef.current = setTimeout(() => {
              nextStep();
            }, 1500);
          }
        };
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
      } else {
        setIsSpeaking(false);
      }
    });

    audio.play().catch(() => {
      // Audio play blocked or file missing -> Trigger SpeechSynthesis
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(step.dialogue);
        utterance.rate = 1.0;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
          setIsSpeaking(false);
          setAudioProgress(100);
          if (isAutoPlay) {
            autoAdvanceTimerRef.current = setTimeout(() => {
              nextStep();
            }, 1500);
          }
        };
        window.speechSynthesis.speak(utterance);
      }
    });
  }, [isMuted, isAutoPlay]);

  // Handle step activation & role requirements
  useEffect(() => {
    if (!isActive) return;

    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
    }

    const step = TOUR_STEPS[currentStepIndex];
    if (!step) return;

    setOverrideSide(null);
    setAudioProgress(0);

    // Auto-switch user if step specifies required role
    if (setUserRef.current) {
      if (step.roleRequired === null) {
        // Step 1: Login Page
        setUserRef.current(null);
      } else if (step.roleRequired === 'student') {
        setUserRef.current({
          username: 'student',
          name: 'Aarav Sharma (JEE Aspirant)',
          role: 'student',
          subject: null,
          token: 'tok_demo_student'
        });
      } else if (step.roleRequired === 'professor') {
        setUserRef.current({
          username: 'physics_prof',
          name: 'Prof A',
          role: 'professor',
          subject: 'Physics',
          token: 'tok_demo_physics_prof'
        });
      } else if (step.roleRequired === 'admin') {
        setUserRef.current({
          username: 'admin',
          name: 'Dean of Academics (Admin)',
          role: 'admin',
          subject: null,
          token: 'tok_demo_admin'
        });
      }
    }

    // Play narration after slight delay to allow DOM transition
    const timer = setTimeout(() => {
      playNarration(step);
    }, 400);

    return () => {
      clearTimeout(timer);
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, [isActive, currentStepIndex, playNarration]);

  const startTour = useCallback(() => {
    setIsActive(true);
    setCurrentStepIndex(0);
    localStorage.setItem('acadza_tour_active', 'true');
  }, []);

  const endTour = useCallback(() => {
    setIsActive(false);
    setIsSpeaking(false);
    localStorage.removeItem('acadza_tour_active');
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  }, []);

  const executeCurrentAction = useCallback(() => {
    const step = TOUR_STEPS[currentStepIndex];
    if (!step) return;

    // Execute step-specific live action
    if (step.step === 1) {
      // Step 1 -> Log in as student
      if (setUserRef.current) {
        setUserRef.current({
          username: 'student',
          name: 'Aarav Sharma (JEE Aspirant)',
          role: 'student',
          subject: null,
          token: 'tok_demo_student'
        });
      }
    } else if (step.step === 2) {
      // Step 2 -> Answer 50 V on LCR question
      setDemoState(prev => ({
        ...prev,
        studentAnswers: { ...prev.studentAnswers, '60f744b3f1b9bc7cc7b4a949': 'A' }
      }));
    } else if (step.step === 3) {
      // Step 3 -> Submit doubt
      const existing = localStorage.getItem('acadza_student_doubts');
      const doubts = existing ? JSON.parse(existing) : [];
      doubts.unshift({
        reportId: 'R_DEMO_LCR',
        questionId: '60f744b3f1b9bc7cc7b4a949',
        studentId: 'student',
        subject: 'Physics',
        comment: 'Sir, in this series LCR circuit, V_R = 40V, V_L = 60V, V_C = 30V. Total voltage is sqrt(40^2 + (60-30)^2) = 50 V (Option A). Why is key C (130 V) marked correct?',
        status: 'pending',
        reportedAt: new Date().toISOString()
      });
      localStorage.setItem('acadza_student_doubts', JSON.stringify(doubts));
    } else if (step.step === 4) {
      // Step 4 -> Switch to Prof A (Physics)
      if (setUserRef.current) {
        setUserRef.current({
          username: 'physics_prof',
          name: 'Prof A',
          role: 'professor',
          subject: 'Physics',
          token: 'tok_demo_physics_prof'
        });
      }
    } else if (step.step === 6) {
      // Step 6 -> Set voice copilot text
      setDemoState(prev => ({
        ...prev,
        copilotAnalyzed: true
      }));
    } else if (step.step === 8) {
      // Step 8 -> Approve fix
      setDemoState(prev => ({
        ...prev,
        fixApproved: true
      }));
    } else if (step.step === 9) {
      // Step 9 -> Switch to Dean (admin)
      if (setUserRef.current) {
        setUserRef.current({
          username: 'admin',
          name: 'Dean of Academics (Admin)',
          role: 'admin',
          subject: null,
          token: 'tok_demo_admin'
        });
      }
    } else if (step.step === 10) {
      // Step 10 -> Return to Student
      if (setUserRef.current) {
        setUserRef.current({
          username: 'student',
          name: 'Aarav Sharma (JEE Aspirant)',
          role: 'student',
          subject: null,
          token: 'tok_demo_student'
        });
      }
    }
  }, [currentStepIndex]);

  const nextStep = useCallback(() => {
    try {
      executeCurrentAction();
    } catch (err) {
      console.warn('executeCurrentAction error:', err);
    }
    setCurrentStepIndex(prev => {
      if (prev < TOUR_STEPS.length - 1) {
        return prev + 1;
      }
      return prev;
    });
  }, [executeCurrentAction]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(i => i - 1);
    }
  }, [currentStepIndex]);

  const jumpToStep = useCallback((index: number) => {
    if (index >= 0 && index < TOUR_STEPS.length) {
      setCurrentStepIndex(index);
    }
  }, []);

  const toggleAutoPlay = useCallback(() => {
    setIsAutoPlay(p => !p);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(m => {
      const next = !m;
      if (next) {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        if (audioRef.current) audioRef.current.pause();
      }
      return next;
    });
  }, []);

  const replayAudio = useCallback(() => {
    playNarration(currentStep);
  }, [playNarration, currentStep]);

  const flipSide = useCallback(() => {
    setOverrideSide(prev => {
      const current = prev || currentStep.preferredSide;
      if (current === 'top') return 'bottom';
      if (current === 'bottom') return 'top';
      if (current === 'left') return 'right';
      return 'left';
    });
  }, [currentStep.preferredSide]);

  return (
    <DemoTourContext.Provider
      value={{
        isActive,
        currentStepIndex,
        currentStep,
        totalSteps: TOUR_STEPS.length,
        isAutoPlay,
        isSpeaking,
        isMuted,
        audioProgress,
        overrideSide,
        startTour,
        endTour,
        nextStep,
        prevStep,
        jumpToStep,
        toggleAutoPlay,
        toggleMute,
        replayAudio,
        flipSide,
        executeCurrentAction,
        registerSetUser,
        demoState,
        setDemoState
      }}
    >
      {children}
    </DemoTourContext.Provider>
  );
};

export const useDemoTour = (): DemoTourContextType => {
  const context = useContext(DemoTourContext);
  if (!context) {
    throw new Error('useDemoTour must be used within a DemoTourProvider');
  }
  return context;
};

