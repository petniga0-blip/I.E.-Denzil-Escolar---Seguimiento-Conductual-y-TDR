import React, { useState, useEffect, useTransition } from 'react';
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
import { OfficialReportsHub } from './components/OfficialReportsHub';
import { OfficialReportModal } from './components/OfficialReportModal';
import { GoogleAccountModal } from './components/GoogleAccountModal';
import { GoogleDriveSyncModal } from './components/GoogleDriveSyncModal';

export default function App() {
  // Theme State (Dark mode defaults or system preference)
  const [isDark, setIsDark] = useState<boolean>(() => {
    return localStorage.getItem('denzil_theme_mode') === 'dark';
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

  // App Tab Navigation
  const [currentTab, setCurrentTab] = useState<'students' | 'matrix' | 'abc' | 'reports'>('matrix');

  // Core Data States
  const [students, setStudents] = useState<Student[]>(() => getStoredStudents());
  const [scores, setScores] = useState<DailyCriterionScore[]>(() => getStoredScores());
  const [incidents, setIncidents] = useState<ABCIncident[]>(() => getStoredIncidents());
  const [teacher, setTeacher] = useState<TeacherProfile>(() => getStoredTeacher());

  // Modal States
  const [selectedIncidentForReport, setSelectedIncidentForReport] = useState<ABCIncident | null>(null);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<Student | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [isDriveSyncModalOpen, setIsDriveSyncModalOpen] = useState(false);
  const [preselectedStudentForABC, setPreselectedStudentForABC] = useState<string | undefined>();

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
    // Also remove from scores
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

    // Open report modal for immediate review/print
    const targetStudent = students.find((s) => s.id === newIncident.studentId);
    if (targetStudent) {
      setSelectedStudentForReport(targetStudent);
      setSelectedIncidentForReport(newIncident);
      setIsReportModalOpen(true);
    }
  };

  // Shortcuts across views
  const handleOpenTDRForStudent = (student: Student) => {
    setSelectedStudentForReport(student);
    const studentIncident = incidents.find((inc) => inc.studentId === student.id);
    setSelectedIncidentForReport(studentIncident || null);
    setIsReportModalOpen(true);
  };

  const handleOpenABCForStudent = (student: Student) => {
    setPreselectedStudentForABC(student.id);
    setCurrentTab('abc');
  };

  const handleOpenReportFromIncident = (incident: ABCIncident) => {
    const targetStudent = students.find((s) => s.id === incident.studentId);
    if (targetStudent) {
      setSelectedStudentForReport(targetStudent);
      setSelectedIncidentForReport(incident);
      setIsReportModalOpen(true);
    }
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
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b1329] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Institutional Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        teacher={teacher}
        onOpenGoogleModal={() => setIsGoogleModalOpen(true)}
        onOpenSyncModal={() => setIsDriveSyncModalOpen(true)}
        onExportBackup={exportBackupJSON}
        onImportBackup={handleImportBackup}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
          <OfficialReportsHub
            students={students}
            incidents={incidents}
            scores={scores}
            teacher={teacher}
            onSyncDrive={() => setIsDriveSyncModalOpen(true)}
          />
        )}
      </main>

      {/* Official TDR Report Modal (Pop-up preview with Word & PDF downloads) */}
      {selectedStudentForReport && (
        <OfficialReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          student={selectedStudentForReport}
          incident={selectedIncidentForReport || undefined}
          dailyScore={scores.find(
            (sc) =>
              sc.studentId === selectedStudentForReport.id &&
              sc.date === (selectedIncidentForReport?.date || new Date().toISOString().split('T')[0])
          )}
          teacher={teacher}
          onSyncToGoogleDrive={() => setIsDriveSyncModalOpen(true)}
        />
      )}

      {/* Google Account & Teacher Profile Modal */}
      <GoogleAccountModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        teacher={teacher}
        onUpdateTeacher={setTeacher}
        onSyncDrive={() => setIsDriveSyncModalOpen(true)}
      />

      {/* Google Drive & Storage Sync Modal */}
      <GoogleDriveSyncModal
        isOpen={isDriveSyncModalOpen}
        onClose={() => setIsDriveSyncModalOpen(false)}
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
    </div>
  );
}
