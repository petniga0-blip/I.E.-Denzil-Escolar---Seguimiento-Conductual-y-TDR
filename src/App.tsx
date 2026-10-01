import React, { useState, useEffect, Suspense } from 'react';
import {
  Student,
  DailyCriterionScore,
  ABCIncident,
  TeacherProfile,
  ScoreLevel,
} from './types';
import {
  getStoredStudents,
  saveStoredStudents,
  getStoredScores,
  saveStoredScores,
  getStoredIncidents,
  saveStoredIncidents,
  getStoredTeacher,
  saveStoredTeacher,
  exportBackupJSON,
  importBackupJSON,
} from './utils/storage';
import { Header } from './components/Header';
import { StudentManagement } from './components/StudentManagement';
import { BehaviorMatrix } from './components/BehaviorMatrix';
import { ABCFormAndTDR } from './components/ABCFormAndTDR';
import { GoogleAccountModal } from './components/GoogleAccountModal';
import { GoogleDriveSyncModal } from './components/GoogleDriveSyncModal';
import { ReportSkeleton } from './components/LoadingSkeleton';
import { YacitaCoachProvider, useYacitaCoach, YacitaFloatingAvatar } from './coach';

const OfficialReportsHub = React.lazy(() => import('./components/OfficialReportsHub'));
const OfficialReportModal = React.lazy(() => import('./components/OfficialReportModal'));

function MainAppContent({
  isDark,
  toggleTheme,
  teacher,
  setTeacher,
  students,
  setStudents,
  scores,
  setScores,
  incidents,
  setIncidents,
  handleAddStudent,
  handleUpdateStudent,
  handleDeleteStudent,
  handleUpdateScore,
  handleUpdateNotes,
  handleSetAllStudentsScore,
  handleSaveIncident,
  handleImportBackup,
}: {
  isDark: boolean;
  toggleTheme: () => void;
  teacher: TeacherProfile;
  setTeacher: React.Dispatch<React.SetStateAction<TeacherProfile>>;
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  scores: DailyCriterionScore[];
  setScores: React.Dispatch<React.SetStateAction<DailyCriterionScore[]>>;
  incidents: ABCIncident[];
  setIncidents: React.Dispatch<React.SetStateAction<ABCIncident[]>>;
  handleAddStudent: (studentData: Omit<Student, 'id' | 'createdAt'>) => void;
  handleUpdateStudent: (updatedStudent: Student) => void;
  handleDeleteStudent: (id: string) => void;
  handleUpdateScore: (studentId: string, date: string, criterionKey: 'c1' | 'c2' | 'c3' | 'c4', level: ScoreLevel) => void;
  handleUpdateNotes: (studentId: string, date: string, notes: string) => void;
  handleSetAllStudentsScore: (date: string, studentIds: string[], level: ScoreLevel) => void;
  handleSaveIncident: (incidentData: Omit<ABCIncident, 'id' | 'createdAt'>) => void;
  handleImportBackup: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const { notifyTabChange, notifyModalOpen, notifyModalClose } = useYacitaCoach();

  // App Tab Navigation
  const [currentTab, setCurrentTab] = useState<'students' | 'matrix' | 'abc' | 'reports'>('matrix');

  const handleSelectTab = (tab: 'students' | 'matrix' | 'abc' | 'reports') => {
    setCurrentTab(tab);
    notifyTabChange(tab);
  };

  // Modal States
  const [selectedIncidentForReport, setSelectedIncidentForReport] = useState<ABCIncident | null>(null);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<Student | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [isDriveSyncModalOpen, setIsDriveSyncModalOpen] = useState(false);
  const [preselectedStudentForABC, setPreselectedStudentForABC] = useState<string | undefined>();

  // Shortcuts across views
  const handleOpenTDRForStudent = (student: Student) => {
    setSelectedStudentForReport(student);
    const studentIncident = incidents.find((inc) => inc.studentId === student.id);
    setSelectedIncidentForReport(studentIncident || null);
    setIsReportModalOpen(true);
    notifyModalOpen('tdr_report');
  };

  const handleOpenABCForStudent = (student: Student) => {
    setPreselectedStudentForABC(student.id);
    handleSelectTab('abc');
  };

  const handleOpenReportFromIncident = (incident: ABCIncident) => {
    const targetStudent = students.find((s) => s.id === incident.studentId);
    if (targetStudent) {
      setSelectedStudentForReport(targetStudent);
      setSelectedIncidentForReport(incident);
      setIsReportModalOpen(true);
      notifyModalOpen('tdr_report');
    }
  };

  const openGoogleModal = () => {
    setIsGoogleModalOpen(true);
    notifyModalOpen('google_account');
  };

  const closeGoogleModal = () => {
    setIsGoogleModalOpen(false);
    notifyModalClose();
  };

  const openDriveSyncModal = () => {
    setIsDriveSyncModalOpen(true);
    notifyModalOpen('drive_sync');
  };

  const closeDriveSyncModal = () => {
    setIsDriveSyncModalOpen(false);
    notifyModalClose();
  };

  return (
    <div className="min-h-[100dvh] bg-slate-100 text-slate-900 dark:bg-[#070e20] dark:text-slate-100 flex flex-col font-sans transition-colors overflow-x-hidden">
      {/* Institutional Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        teacher={teacher}
        onOpenGoogleModal={openGoogleModal}
        onOpenSyncModal={openDriveSyncModal}
        onExportBackup={exportBackupJSON}
        onImportBackup={handleImportBackup}
      />

      {/* Main Content Area with exact safe clearance for mobile fixed bars and landscape rail */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-4 landscape:pt-2.5 landscape:pl-20 pb-36 sm:pb-40">
        {currentTab === 'students' && (
          <StudentManagement
            students={students}
            onAddStudent={handleAddStudent}
            onUpdateStudent={handleUpdateStudent}
            onDeleteStudent={handleDeleteStudent}
            onOpenTDRForStudent={handleOpenTDRForStudent}
          />
        )}

        {currentTab === 'matrix' && (
          <BehaviorMatrix
            students={students}
            scores={scores}
            onUpdateScore={handleUpdateScore}
            onUpdateNotes={handleUpdateNotes}
            onSetAllStudentsScore={handleSetAllStudentsScore}
            onOpenABCForStudent={handleOpenABCForStudent}
          />
        )}

        {currentTab === 'abc' && (
          <ABCFormAndTDR
            students={students}
            incidents={incidents}
            teacher={teacher}
            preselectedStudentId={preselectedStudentForABC}
            onSaveIncident={handleSaveIncident}
            onOpenReportModal={handleOpenReportFromIncident}
          />
        )}

        {currentTab === 'reports' && (
          <Suspense fallback={<ReportSkeleton />}>
            <OfficialReportsHub
              students={students}
              incidents={incidents}
              scores={scores}
              teacher={teacher}
              onSyncDrive={openDriveSyncModal}
            />
          </Suspense>
        )}
      </main>

      {/* Official TDR Report Modal */}
      {selectedStudentForReport && (
        <Suspense fallback={null}>
          <OfficialReportModal
            isOpen={isReportModalOpen}
            onClose={() => {
              setIsReportModalOpen(false);
              notifyModalClose();
            }}
            student={selectedStudentForReport}
            incident={selectedIncidentForReport || undefined}
            dailyScore={scores.find(
              (sc) =>
                sc.studentId === selectedStudentForReport.id &&
                sc.date === (selectedIncidentForReport?.date || new Date().toISOString().split('T')[0])
            )}
            teacher={teacher}
            onSyncToGoogleDrive={openDriveSyncModal}
          />
        </Suspense>
      )}

      {/* Google Account & Teacher Profile Modal */}
      <GoogleAccountModal
        isOpen={isGoogleModalOpen}
        onClose={closeGoogleModal}
        teacher={teacher}
        onUpdateTeacher={setTeacher}
        onSyncDrive={openDriveSyncModal}
      />

      {/* Google Drive & Storage Sync Modal */}
      <GoogleDriveSyncModal
        isOpen={isDriveSyncModalOpen}
        onClose={closeDriveSyncModal}
        teacher={teacher}
        onExportBackup={exportBackupJSON}
        onImportBackup={handleImportBackup}
      />

      {/* Institutional Footer (Screen Only) */}
      <footer className="no-print mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f1a38] py-4 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Institución Educativa Denzil Escolar · Riohacha, La Guajira · 2026
          </span>
          <span className="font-medium text-emerald-700 dark:text-emerald-400">
            Progreso · Paz · Sabiduría · Cultura
          </span>
        </div>
      </footer>

      {/* Yacita Floating Companion (Always Anchored Bubble, 7s auto-close, min-avatar, z-index 9999) */}
      <YacitaFloatingAvatar />
    </div>
  );
}

export default function App() {
  // Theme State: prefers-color-scheme as initial value if no preference is stored
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('denzil_theme_mode');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('denzil_theme_mode', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('denzil_theme_mode', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  // Core Data States
  const [students, setStudents] = useState<Student[]>(() => getStoredStudents());
  const [scores, setScores] = useState<DailyCriterionScore[]>(() => getStoredScores());
  const [incidents, setIncidents] = useState<ABCIncident[]>(() => getStoredIncidents());
  const [teacher, setTeacher] = useState<TeacherProfile>(() => getStoredTeacher());

  // Synchronize localStorage
  useEffect(() => {
    saveStoredStudents(students);
  }, [students]);

  useEffect(() => {
    saveStoredScores(scores);
  }, [scores]);

  useEffect(() => {
    saveStoredIncidents(incidents);
  }, [incidents]);

  useEffect(() => {
    saveStoredTeacher(teacher);
  }, [teacher]);

  // Student CRUD
  const handleAddStudent = (studentData: Omit<Student, 'id' | 'createdAt'>) => {
    const newStudent: Student = {
      ...studentData,
      id: 'std-' + Date.now().toString(36),
      createdAt: new Date().toISOString(),
    };
    setStudents((prev) => [newStudent, ...prev]);
  };

  const handleUpdateStudent = (updatedStudent: Student) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s))
    );
  };

  const handleDeleteStudent = (id: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
    setScores((prev) => prev.filter((sc) => sc.studentId !== id));
  };

  // Matrix Scoring
  const handleUpdateScore = (
    studentId: string,
    date: string,
    criterionKey: 'c1' | 'c2' | 'c3' | 'c4',
    level: ScoreLevel
  ) => {
    setScores((prev) => {
      const existingIndex = prev.findIndex(
        (sc) => sc.studentId === studentId && sc.date === date
      );
      if (existingIndex >= 0) {
        const copy = [...prev];
        copy[existingIndex] = {
          ...copy[existingIndex],
          [criterionKey]: level,
          updatedAt: new Date().toISOString(),
        };
        return copy;
      } else {
        const newScore: DailyCriterionScore = {
          studentId,
          date,
          c1: 3,
          c2: 3,
          c3: 3,
          c4: 3,
          [criterionKey]: level,
          updatedAt: new Date().toISOString(),
        };
        return [...prev, newScore];
      }
    });
  };

  const handleUpdateNotes = (studentId: string, date: string, notes: string) => {
    setScores((prev) => {
      const existingIndex = prev.findIndex(
        (sc) => sc.studentId === studentId && sc.date === date
      );
      if (existingIndex >= 0) {
        const copy = [...prev];
        copy[existingIndex] = { ...copy[existingIndex], notes };
        return copy;
      } else {
        const newScore: DailyCriterionScore = {
          studentId,
          date,
          c1: 3,
          c2: 3,
          c3: 3,
          c4: 3,
          notes,
        };
        return [...prev, newScore];
      }
    });
  };

  const handleSetAllStudentsScore = (
    date: string,
    studentIds: string[],
    level: ScoreLevel
  ) => {
    setScores((prev) => {
      const scoreMap = new Map<string, DailyCriterionScore>();
      for (const sc of prev) {
        scoreMap.set(`${sc.studentId}_${sc.date}`, sc);
      }
      for (const id of studentIds) {
        const key = `${id}_${date}`;
        const existing = scoreMap.get(key);
        scoreMap.set(key, {
          studentId: id,
          date,
          c1: level,
          c2: level,
          c3: level,
          c4: level,
          notes: existing?.notes || '',
          updatedAt: new Date().toISOString(),
        });
      }
      return Array.from(scoreMap.values());
    });
  };

  // ABC Incident Saving
  const handleSaveIncident = (incidentData: Omit<ABCIncident, 'id' | 'createdAt'>) => {
    const newIncident: ABCIncident = {
      ...incidentData,
      id: 'inc-' + Date.now().toString(36),
      createdAt: new Date().toISOString(),
    };
    setIncidents((prev) => [newIncident, ...prev]);
  };

  // Backup & Restore
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importBackupJSON(
        file,
        () => {
          setStudents(getStoredStudents());
          setScores(getStoredScores());
          setIncidents(getStoredIncidents());
          setTeacher(getStoredTeacher());
          alert('¡Copia de seguridad restaurada con éxito!');
        },
        (err) => alert(err)
      );
    }
  };

  return (
    <YacitaCoachProvider teacher={teacher} initialTab="matrix">
      <MainAppContent
        isDark={isDark}
        toggleTheme={toggleTheme}
        teacher={teacher}
        setTeacher={setTeacher}
        students={students}
        setStudents={setStudents}
        scores={scores}
        setScores={setScores}
        incidents={incidents}
        setIncidents={setIncidents}
        handleAddStudent={handleAddStudent}
        handleUpdateStudent={handleUpdateStudent}
        handleDeleteStudent={handleDeleteStudent}
        handleUpdateScore={handleUpdateScore}
        handleUpdateNotes={handleUpdateNotes}
        handleSetAllStudentsScore={handleSetAllStudentsScore}
        handleSaveIncident={handleSaveIncident}
        handleImportBackup={handleImportBackup}
      />
    </YacitaCoachProvider>
  );
}
