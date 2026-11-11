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
    dialogue: "Welcome to Acadza's Autonomous Report-to-Fix Platform. High-stakes entrance exams like JEE and NEET carry negative marking where a single broken question costs a student a 5-mark swing, crushing their rank and confidence. Let's trace how our system automates intake, verification, and surgical repair across the complete student-faculty lifecycle. First, we log in as Aarav, a JEE student.",
    actionLabel: '⚡ Auto-Login as Student & Start Exam',
    actionDescription: 'Observe role-based login personas: Student, Subject Faculties (Prof A, B, C), and Academic Dean.',
    dataFlowNote: 'SECURITY: Sessions use 256-bit CSPRNG bearer tokens (secrets.token_urlsafe) and salted SHA-256 password hashes. Question answers and solutions are strictly masked on the server until submission.',
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
    dialogue: "Here in the Student Assessment Portal, students take authentic exam questions. Question 2 asks for the supply voltage in a series LCR circuit. With resistance 40 volts, inductor 60 volts, and capacitor 30 volts, the net reactive voltage is 30 volts. Total voltage is the square root of 40 squared plus 30 squared, giving 50 volts (Option A). But when the test is submitted, the answer key erroneously marks it wrong and asserts Option C (130 volts)!",
    actionLabel: '⚡ Select 50 V (Option A) & Submit Test',
    actionDescription: 'Select Option A (50 V) on the series LCR question and submit test to view live scorecard.',
    dataFlowNote: 'DATA INTEGRITY: Test submission triggers server-side scoring. Server computes correct vs incorrect answers and generates question performance metrics without exposing answer keys in client-side scripts.',
    targetSelector: '#tour-student-test-view',
    fallbackSelector: '#tour-student-question',
    preferredSide: 'left',
    audioFile: '/audio/step-02.mp3',
    roleRequired: 'student'
  },
  {
    step: 3,
    title: 'In-Test Student Doubt Submission',
    speaker: 'Aarav (JEE Aspirant)',
    speakerRole: 'student',
    speakerAvatar: '🎓',
    dialogue: "The student immediately clicks 'Report Doubt' right from their scorecard. They tap the quick chip 'Answer key seems incorrect' and write: 'Sir, V equals square root of 40 squared plus 30 squared which is 50 volts. Why is official key marked as C (130 volts)?'. Notice that question answers are masked until submission. The moment they hit submit, the report is dispatched into our real-time triage pipeline—no manual support tickets, no lost feedback.",
    actionLabel: '⚡ Submit Doubt to Physics Faculty Queue',
    actionDescription: 'Auto-fill mathematical explanation and submit doubt into SQLite database.',
    dataFlowNote: 'DISPATCH: Real-time feedback intake writes to SQLite reports table, maps question metadata, and notifies the Physics subject queue with zero delay.',
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
    dialogue: "Now, let's step into the faculty console as Prof A, our Physics Faculty Lead. Server-side RBAC ensures Prof A only sees Physics doubts, keeping Zoology and Botany isolated. The student's report has already arrived at the top of the queue—deduplicated, sorted by arrival timestamp, and flagged with a 9.2 urgency score.",
    actionLabel: '⚡ Open Incoming Physics Doubt',
    actionDescription: 'Switch to Prof A (Physics) and focus on the freshly submitted LCR doubt at the top of the queue.',
    dataFlowNote: 'RBAC SCOPING: FastAPI require_faculty_or_admin dependency checks auth_user["subject"]. Any cross-department modification attempts return HTTP 403 Forbidden.',
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
    dialogue: "Instead of an overwhelming spreadsheet, Prof A is greeted by Zen Calm Focus Mode—designed for tired teachers at 10 PM. Our AI Pre-Triage engine has already solved the question independently from first principles. It verified that the stored solution calculated 50 V, caught the answer key mismatch, and prepared a surgical diff replacing C with A.",
    actionLabel: '⚡ Inspect AI Derivation & Surgical Diff',
    actionDescription: 'Review the side-by-side Before vs After diff card and independent mathematical proof.',
    dataFlowNote: 'TAXONOMY ENFORCEMENT: Proposed edit is strictly restricted to field: "answer". Guardrails prohibit AI from modifying question stem or inventing options for answer_key repairs.',
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
    dialogue: "Prof A opens the Voice Co-Pilot to record the official derivation. Prof A speaks: 'In this series LCR circuit, we apply phasor addition. Resistance voltage is 40 volts. Net reactive voltage is VL minus VC, which is 60 minus 30 equals 30 volts. Total supply voltage is square root of 40 squared plus 30 squared, giving 50 volts. The answer must be Option A, not 130 volts.'",
    actionLabel: '⚡ Stream Spoken Derivation to Co-Pilot',
    actionDescription: 'Stream natural speech dictation into the voice input box for formula validation.',
    dataFlowNote: 'SPEECH PROCESSING: Web Speech API streams real-time speech. Raw mathematical entities (square root, squared, minus) are normalized into clean TeX formulas.',
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
    dialogue: "Here is where our agent protects the faculty: the AI Formula Sanity Engine runs an AST and SymPy mathematical check on the professor's speech. If a tired teacher accidentally dictates an arithmetic slip, the AI gently questions back before dispatch. Here, the phasor formulation is verified 100% sound, confirming the 50 V derivation.",
    actionLabel: '⚡ Verify Mathematical Soundness',
    actionDescription: 'Execute formula sanity checker to confirm physical laws and absence of arithmetic discrepancies.',
    dataFlowNote: 'SAFETY INVARIANT: If arithmetic mismatch is found, questionBack is flagged with a 1-click correction pill. Clean derivations are marked verified_sound.',
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
    dialogue: "The agent synthesizes the professor's spoken derivation into an encouraging, student-friendly explanation with clean KaTeX math. Prof A simply presses 'A' or clicks Approve Fix. The question bank is atomically patched in SQLite and JSON with strict idempotency, an immutable audit log entry is recorded, and the doubt is marked resolved.",
    actionLabel: '⚡ Approve 1-Click Fix (A) & Patch Database',
    actionDescription: 'Approve fix, patch question bank idempotently, write audit event, and advance queue.',
    dataFlowNote: 'IDEMPOTENT WRITE: apply_question_patch verifies replacement presence to prevent duplicate appends. SQLite audit_log table commits timestamp, actor, action, and payload.',
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
    dialogue: "Now let's switch to the Dean of Academics. The Dean has an institutional bird's-eye view with the Department Segmentation Bar. In one click, the Dean can filter Physics, Zoology, or Botany, monitoring department backlogs, resolution rates, and SLA compliance across the entire organization.",
    actionLabel: '⚡ Inspect All Departments & Physics Triage',
    actionDescription: 'Toggle between All Departments (43), Physics (33), Zoology (6), and Botany (4).',
    dataFlowNote: 'MULTI-DEPARTMENT OVERSIGHT: Dean role (admin) bypasses single-subject restrictions, querying aggregated counts across all faculty queues.',
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
    dialogue: "Finally, we return to Aarav's student portal. The student sees their doubt marked 'Resolved'. They read Prof A's clear explanation: 'You were right! The answer key has been updated to Option A, and your 5 marks have been restored.' The entire loop—from student complaint to verified fix and score correction—closed autonomously in minutes without a single hallucination.",
    actionLabel: '🎉 Complete Walkthrough & Replay',
    actionDescription: 'Verify resolved doubt on student scorecard with full explanation and marks restored (+4).',
    dataFlowNote: 'CLOSED-LOOP VALUE: Transforms negative student frustration into immediate academic trust. FERR threshold monitoring prevents secondary regressions.',
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
    executeCurrentAction();
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex(i => i + 1);
    } else {
      // End tour or show completion
      setCurrentStepIndex(TOUR_STEPS.length - 1);
    }
  }, [currentStepIndex, executeCurrentAction]);

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
