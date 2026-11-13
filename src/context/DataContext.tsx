import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { useAuth } from './AuthContext';
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
  extracurriculars: string[];
  addTeacher: (teacher: Omit<Teacher, 'id'>) => Promise<void>;
  updateTeacher: (id: string, partial: Partial<Teacher>) => Promise<void>;
  deleteTeacher: (id: string) => Promise<void>;
  addClass: (name: string) => Promise<void>;
  deleteClass: (name: string) => Promise<void>;
  addSubject: (name: string) => Promise<void>;
  deleteSubject: (name: string) => Promise<void>;
  addExtracurricular: (name: string) => Promise<void>;
  deleteExtracurricular: (name: string) => Promise<void>;
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
  const { firebaseUser, currentUser } = useAuth();
  const [students, setStudents] = useState<Student[]>(() => loadLocal('students', initialStudents));
  const [teachers, setTeachers] = useState<Teacher[]>(() => loadLocal('teachers', initialTeachers));
  const [classes, setClasses] = useState<string[]>(() => loadLocal('classes', initialClasses));
  const [subjects, setSubjects] = useState<string[]>(() => loadLocal('subjects', initialSubjects));
  const [extracurriculars, setExtracurriculars] = useState<string[]>(() => loadLocal('extracurriculars', ['Pramuka', 'Tahfidz', 'Hadroh', 'Olahraga']));
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

  // Sync with Firestore only after a verified school account has logged in
  useEffect(() => {
    if (!firebaseUser || firebaseUser.isAnonymous || !currentUser) {
      setIsSyncing(false);
      return;
    }
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

    const unsubTeachers = onSnapshot(collection(db, 'teachers'), (snapshot) => {
      if (!snapshot.empty) { const list = snapshot.docs.map((d) => d.data() as Teacher); setTeachers(list); saveLocal('teachers', list); }
    }, (error) => console.warn('Firestore teachers snapshot:', error.message));
    const unsubClasses = onSnapshot(collection(db, 'master_classes'), (snapshot) => {
      if (!snapshot.empty) { const list = snapshot.docs.map((d) => String(d.data().name)); setClasses(list); saveLocal('classes', list); }
    }, (error) => console.warn('Firestore classes snapshot:', error.message));
    const unsubSubjects = onSnapshot(collection(db, 'master_subjects'), (snapshot) => {
      if (!snapshot.empty) { const list = snapshot.docs.map((d) => String(d.data().name)); setSubjects(list); saveLocal('subjects', list); }
    }, (error) => console.warn('Firestore subjects snapshot:', error.message));
    const unsubExtracurriculars = onSnapshot(collection(db, 'extracurriculars'), (snapshot) => {
      if (!snapshot.empty) { const list = snapshot.docs.map((d) => String(d.data().name)); setExtracurriculars(list); saveLocal('extracurriculars', list); }
    }, (error) => console.warn('Firestore extracurriculars snapshot:', error.message));

    // Listen to Students
    const unsubStudents = onSnapshot(
      collection(db, 'students'),
      (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as Student));
          setStudents(list);
          saveLocal('students', list);
          void (async () => {
            try {
              const activeRoster = list.filter(student => student.status === 'Aktif' && student.name?.trim() && student.className?.trim());
              const directoryRef = collection(db, 'studentExamDirectory');
              const existing = await getDocs(directoryRef);
              const activeIds = new Set(activeRoster.map(student => student.id));
              await Promise.all(existing.docs.filter(item => !activeIds.has(item.id)).map(item => deleteDoc(item.ref)));
              await Promise.all(activeRoster.map(student => setDoc(doc(db, 'studentExamDirectory', student.id), {
                studentId: student.id,
                name: student.name.trim().toUpperCase(),
                className: student.className.trim(),
              })));
            } catch (error) {
              console.warn('Sinkronisasi daftar siswa ruang ujian:', error);
            }
          })();
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
      unsubTeachers();
      unsubClasses();
      unsubSubjects();
      unsubExtracurriculars();
    };
  }, [firebaseUser?.uid, firebaseUser?.isAnonymous, currentUser?.role]);

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
      try {
        await setDoc(doc(db, 'attendance_history', `${record.id}-${Date.now()}`), { ...record, submittedAt: new Date().toISOString() });
      } catch (historyError) {
        console.warn('Attendance history could not be saved:', historyError);
      }
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

  const addTeacher = async (data: Omit<Teacher, 'id'>) => {
    const item: Teacher = { ...data, id: `tch-${Date.now()}` };
    const updated = [...teachers, item]; setTeachers(updated); saveLocal('teachers', updated);
    try { await setDoc(doc(db, 'teachers', item.id), item); } catch (e) { console.warn('Saved teacher locally:', e); }
  };
  const updateTeacher = async (id: string, partial: Partial<Teacher>) => {
    const updated = teachers.map((t) => t.id === id ? { ...t, ...partial } : t); setTeachers(updated); saveLocal('teachers', updated);
    try { await setDoc(doc(db, 'teachers', id), partial, { merge: true }); } catch (e) { console.warn('Updated teacher locally:', e); }
  };
  const deleteTeacher = async (id: string) => {
    const updated = teachers.filter((t) => t.id !== id); setTeachers(updated); saveLocal('teachers', updated);
    try { await deleteDoc(doc(db, 'teachers', id)); } catch (e) { console.warn('Deleted teacher locally:', e); }
  };
  const saveMasterList = async (key: 'classes' | 'subjects' | 'extracurriculars', values: string[]) => {
    if (key === 'classes') { setClasses(values); saveLocal(key, values); }
    if (key === 'subjects') { setSubjects(values); saveLocal(key, values); }
    if (key === 'extracurriculars') { setExtracurriculars(values); saveLocal(key, values); }
    const collectionName = key === 'classes' ? 'master_classes' : key === 'subjects' ? 'master_subjects' : 'extracurriculars';
    try {
      const snap = await import('firebase/firestore').then(({ getDocs }) => getDocs(collection(db, collectionName)));
      await Promise.all(snap.docs.map((item) => deleteDoc(item.ref)));
      await Promise.all(values.map((name) => setDoc(doc(db, collectionName, encodeURIComponent(name)), { name })));
    } catch (e) { console.warn('Saved master list locally:', e); }
  };
  const addClass = async (name: string) => { if (name.trim() && !classes.includes(name.trim())) await saveMasterList('classes', [...classes, name.trim()]); };
  const deleteClass = async (name: string) => { if (students.some((s) => s.className === name)) { alert('Kelas masih digunakan oleh data siswa. Pindahkan siswa terlebih dahulu.'); return; } await saveMasterList('classes', classes.filter((x) => x !== name)); };
  const addSubject = async (name: string) => { if (name.trim() && !subjects.includes(name.trim())) await saveMasterList('subjects', [...subjects, name.trim()]); };
  const deleteSubject = async (name: string) => { await saveMasterList('subjects', subjects.filter((x) => x !== name)); };
  const addExtracurricular = async (name: string) => { if (name.trim() && !extracurriculars.includes(name.trim())) await saveMasterList('extracurriculars', [...extracurriculars, name.trim()]); };
  const deleteExtracurricular = async (name: string) => { await saveMasterList('extracurriculars', extracurriculars.filter((x) => x !== name)); };

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
    await setDoc(doc(db, 'students', id), partial, { merge: true });
    setStudents((prev) => {
      const updated = prev.map((s) => (s.id === id ? { ...s, ...partial } : s));
      saveLocal('students', updated);
      return updated;
    });
  };

  const deleteStudent = async (id: string) => {
    await deleteDoc(doc(db, 'students', id));
    setStudents((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      saveLocal('students', updated);
      return updated;
    });
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
        extracurriculars,
        addTeacher, updateTeacher, deleteTeacher,
        addClass, deleteClass, addSubject, deleteSubject,
        addExtracurricular, deleteExtracurricular,
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
