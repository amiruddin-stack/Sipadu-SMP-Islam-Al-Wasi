import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import {
  initialAssessments,
  initialAttendances,
  initialBehaviors,
  initialClasses,
  initialCounseling,
  initialJournals,
  initialSchoolSetting,
  initialStudents,
  initialSubjects,
  initialTeachers,
} from '../data/initialData';
import {
  Assessment,
  AttendanceRecord,
  BehaviorRecord,
  CounselingRecord,
  Journal,
  SchoolSetting,
  Student,
  Teacher,
} from '../types';

interface DataContextType {
  students: Student[];
  teachers: Teacher[];
  classes: string[];
  subjects: string[];
  attendances: AttendanceRecord[];
  journals: Journal[];
  behaviors: BehaviorRecord[];
  counselings: CounselingRecord[];
  assessments: Assessment[];
  settings: SchoolSetting;
  isSyncing: boolean;
  saveAttendance: (record: AttendanceRecord) => Promise<void>;
  addJournal: (journal: Omit<Journal, 'id' | 'createdAt'>) => Promise<void>;
  updateJournal: (id: string, partial: Partial<Journal>) => Promise<void>;
  deleteJournal: (id: string) => Promise<void>;
  addBehavior: (behavior: Omit<BehaviorRecord, 'id'>) => Promise<void>;
  updateBehavior: (id: string, partial: Partial<BehaviorRecord>) => Promise<void>;
  deleteBehavior: (id: string) => Promise<void>;
  addCounseling: (counseling: Omit<CounselingRecord, 'id'>) => Promise<void>;
  updateCounseling: (id: string, partial: Partial<CounselingRecord>) => Promise<void>;
  deleteCounseling: (id: string) => Promise<void>;
  saveAssessment: (assessment: Assessment) => Promise<void>;
  addStudent: (student: Omit<Student, 'id'>) => Promise<void>;
  updateStudent: (id: string, partial: Partial<Student>) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  updateSettings: (partial: Partial<SchoolSetting>) => Promise<void>;
  refreshData: () => void;
}

const DataContext = createContext<DataContextType | null>(null);

function loadLocal<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(`sipadu_${key}`);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function saveLocal<T>(key: string, data: T) {
  try {
    localStorage.setItem(`sipadu_${key}`, JSON.stringify(data));
  } catch (e) {
    console.error('LocalStorage write error:', e);
  }
}

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [students, setStudents] = useState<Student[]>(() => loadLocal('students', initialStudents));
  const [teachers, setTeachers] = useState<Teacher[]>(() => loadLocal('teachers', initialTeachers));
  const [classes] = useState<string[]>(initialClasses);
  const [subjects] = useState<string[]>(initialSubjects);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>(() =>
    loadLocal('attendances', initialAttendances)
  );
  const [journals, setJournals] = useState<Journal[]>(() =>
    loadLocal('journals', initialJournals)
  );
  const [behaviors, setBehaviors] = useState<BehaviorRecord[]>(() =>
    loadLocal('behaviors', initialBehaviors)
  );
  const [counselings, setCounselings] = useState<CounselingRecord[]>(() =>
    loadLocal('counselings', initialCounseling)
  );
  const [assessments, setAssessments] = useState<Assessment[]>(() =>
    loadLocal('assessments', initialAssessments)
  );
  const [settings, setSettings] = useState<SchoolSetting>(() =>
    loadLocal('settings', initialSchoolSetting)
  );
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync with Firestore in real-time if online
  useEffect(() => {
    setIsSyncing(true);

    // Listen to Attendance collection
    const unsubAttendance = onSnapshot(
      collection(db, 'attendance'),
      (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map((d) => d.data() as AttendanceRecord);
          setAttendances(list);
          saveLocal('attendances', list);
        }
      },
      (error) => {
        console.warn('Firestore attendance snapshot offline mode:', error.message);
      }
    );

    // Listen to Journals
    const unsubJournals = onSnapshot(
      collection(db, 'journals'),
      (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map((d) => d.data() as Journal);
          setJournals(list);
          saveLocal('journals', list);
        }
      },
      (error) => {
        console.warn('Firestore journals snapshot offline mode:', error.message);
      }
    );

    // Listen to Behaviors
    const unsubBehaviors = onSnapshot(
      collection(db, 'behaviors'),
      (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map((d) => d.data() as BehaviorRecord);
          setBehaviors(list);
          saveLocal('behaviors', list);
        }
      },
      (error) => {
        console.warn('Firestore behaviors snapshot offline mode:', error.message);
      }
    );

    // Listen to Counseling
    const unsubCounseling = onSnapshot(
      collection(db, 'counseling'),
      (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map((d) => d.data() as CounselingRecord);
          setCounselings(list);
          saveLocal('counselings', list);
        }
      },
      (error) => {
        console.warn('Firestore counseling snapshot offline mode:', error.message);
      }
    );

    // Listen to Assessments
    const unsubAssessments = onSnapshot(
      collection(db, 'assessments'),
      (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map((d) => d.data() as Assessment);
          setAssessments(list);
          saveLocal('assessments', list);
        }
      },
      (error) => {
        console.warn('Firestore assessments snapshot offline mode:', error.message);
      }
    );

    // Listen to Students
    const unsubStudents = onSnapshot(
      collection(db, 'students'),
      (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map((d) => d.data() as Student);
          setStudents(list);
          saveLocal('students', list);
        }
      },
      (error) => {
        console.warn('Firestore students snapshot offline mode:', error.message);
      }
    );

    setIsSyncing(false);

    return () => {
      unsubAttendance();
      unsubJournals();
      unsubBehaviors();
      unsubCounseling();
      unsubAssessments();
      unsubStudents();
    };
  }, []);

  // Save Attendance
  const saveAttendance = async (record: AttendanceRecord) => {
    setAttendances((prev) => {
      const idx = prev.findIndex((a) => a.id === record.id);
      const updated = idx >= 0 ? prev.map((a, i) => (i === idx ? record : a)) : [record, ...prev];
      saveLocal('attendances', updated);
      return updated;
    });

    try {
      await setDoc(doc(db, 'attendance', record.id), record);
    } catch (e) {
      console.warn('Saved attendance to local storage (offline mode):', e);
    }
  };

  // Journals
  const addJournal = async (journalData: Omit<Journal, 'id' | 'createdAt'>) => {
    const newJournal: Journal = {
      ...journalData,
      id: `jrn-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setJournals((prev) => {
      const updated = [newJournal, ...prev];
      saveLocal('journals', updated);
      return updated;
    });

    try {
      await setDoc(doc(db, 'journals', newJournal.id), newJournal);
    } catch (e) {
      console.warn('Saved journal locally (offline mode):', e);
    }
  };

  const updateJournal = async (id: string, partial: Partial<Journal>) => {
    setJournals((prev) => {
      const updated = prev.map((j) => (j.id === id ? { ...j, ...partial } : j));
      saveLocal('journals', updated);
      return updated;
    });

    try {
      await setDoc(doc(db, 'journals', id), partial, { merge: true });
    } catch (e) {
      console.warn('Updated journal locally:', e);
    }
  };

  const deleteJournal = async (id: string) => {
    setJournals((prev) => {
      const updated = prev.filter((j) => j.id !== id);
      saveLocal('journals', updated);
      return updated;
    });

    try {
      await deleteDoc(doc(db, 'journals', id));
    } catch (e) {
      console.warn('Deleted journal locally:', e);
    }
  };

  // Behavior Records
  const addBehavior = async (behaviorData: Omit<BehaviorRecord, 'id'>) => {
    const newRec: BehaviorRecord = {
      ...behaviorData,
      id: `beh-${Date.now()}`,
    };
    setBehaviors((prev) => {
      const updated = [newRec, ...prev];
      saveLocal('behaviors', updated);
      return updated;
    });

    try {
      await setDoc(doc(db, 'behaviors', newRec.id), newRec);
    } catch (e) {
      console.warn('Saved behavior locally:', e);
    }
  };

  const updateBehavior = async (id: string, partial: Partial<BehaviorRecord>) => {
    setBehaviors((prev) => {
      const updated = prev.map((b) => (b.id === id ? { ...b, ...partial } : b));
      saveLocal('behaviors', updated);
      return updated;
    });

    try {
      await setDoc(doc(db, 'behaviors', id), partial, { merge: true });
    } catch (e) {
      console.warn('Updated behavior locally:', e);
    }
  };

  const deleteBehavior = async (id: string) => {
    setBehaviors((prev) => {
      const updated = prev.filter((b) => b.id !== id);
      saveLocal('behaviors', updated);
      return updated;
    });

    try {
      await deleteDoc(doc(db, 'behaviors', id));
    } catch (e) {
      console.warn('Deleted behavior locally:', e);
    }
  };

  // Counseling Records
  const addCounseling = async (counselingData: Omit<CounselingRecord, 'id'>) => {
    const newRec: CounselingRecord = {
      ...counselingData,
      id: `cns-${Date.now()}`,
    };
    setCounselings((prev) => {
      const updated = [newRec, ...prev];
      saveLocal('counselings', updated);
      return updated;
    });

    try {
      await setDoc(doc(db, 'counseling', newRec.id), newRec);
    } catch (e) {
      console.warn('Saved counseling locally:', e);
    }
  };

  const updateCounseling = async (id: string, partial: Partial<CounselingRecord>) => {
    setCounselings((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, ...partial } : c));
      saveLocal('counselings', updated);
      return updated;
    });

    try {
      await setDoc(doc(db, 'counseling', id), partial, { merge: true });
    } catch (e) {
      console.warn('Updated counseling locally:', e);
    }
  };

  const deleteCounseling = async (id: string) => {
    setCounselings((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      saveLocal('counselings', updated);
      return updated;
    });

    try {
      await deleteDoc(doc(db, 'counseling', id));
    } catch (e) {
      console.warn('Deleted counseling locally:', e);
    }
  };

  // Assessments
  const saveAssessment = async (assessment: Assessment) => {
    setAssessments((prev) => {
      const idx = prev.findIndex((a) => a.id === assessment.id);
      const updated = idx >= 0 ? prev.map((a, i) => (i === idx ? assessment : a)) : [assessment, ...prev];
      saveLocal('assessments', updated);
      return updated;
    });

    try {
      await setDoc(doc(db, 'assessments', assessment.id), assessment);
    } catch (e) {
      console.warn('Saved assessment locally:', e);
    }
  };

  // Students
  const addStudent = async (studentData: Omit<Student, 'id'>) => {
    const newStudent: Student = {
      ...studentData,
      id: `std-${Date.now()}`,
    };
    setStudents((prev) => {
      const updated = [...prev, newStudent];
      saveLocal('students', updated);
      return updated;
    });

    try {
      await setDoc(doc(db, 'students', newStudent.id), newStudent);
    } catch (e) {
      console.warn('Saved student locally:', e);
    }
  };

  const updateStudent = async (id: string, partial: Partial<Student>) => {
    setStudents((prev) => {
      const updated = prev.map((s) => (s.id === id ? { ...s, ...partial } : s));
      saveLocal('students', updated);
      return updated;
    });

    try {
      await setDoc(doc(db, 'students', id), partial, { merge: true });
    } catch (e) {
      console.warn('Updated student locally:', e);
    }
  };

  const deleteStudent = async (id: string) => {
    setStudents((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      saveLocal('students', updated);
      return updated;
    });

    try {
      await deleteDoc(doc(db, 'students', id));
    } catch (e) {
      console.warn('Deleted student locally:', e);
    }
  };

  // Settings
  const updateSettings = async (partial: Partial<SchoolSetting>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...partial };
      saveLocal('settings', updated);
      return updated;
    });

    try {
      await setDoc(doc(db, 'settings', 'main-setting'), partial, { merge: true });
    } catch (e) {
      console.warn('Updated settings locally:', e);
    }
  };

  const refreshData = () => {
    setStudents(loadLocal('students', initialStudents));
    setAttendances(loadLocal('attendances', initialAttendances));
    setJournals(loadLocal('journals', initialJournals));
    setBehaviors(loadLocal('behaviors', initialBehaviors));
    setCounselings(loadLocal('counselings', initialCounseling));
    setAssessments(loadLocal('assessments', initialAssessments));
    setSettings(loadLocal('settings', initialSchoolSetting));
  };

  return (
    <DataContext.Provider
      value={{
        students,
        teachers,
        classes,
        subjects,
        attendances,
        journals,
        behaviors,
        counselings,
        assessments,
        settings,
        isSyncing,
        saveAttendance,
        addJournal,
        updateJournal,
        deleteJournal,
        addBehavior,
        updateBehavior,
        deleteBehavior,
        addCounseling,
        updateCounseling,
        deleteCounseling,
        saveAssessment,
        addStudent,
        updateStudent,
        deleteStudent,
        updateSettings,
        refreshData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
};
