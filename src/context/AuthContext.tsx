import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  currentUser: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => void;
  canAccessBK: boolean;
  canManageSettings: boolean;
  canManageMasterData: boolean;
  canInputGrades: boolean;
  canInputAttendance: boolean;
}

const defaultAdminUser: UserProfile = {
  uid: 'admin-amiruddin',
  email: 'amiruddin@smpialwasi-maros.sch.id',
  displayName: 'H. Amiruddin, S.Pd.I., M.Pd.',
  role: 'super_admin',
  nip: '197805142005011003',
  subject: 'Kepala Sekolah & PAI',
};

const AuthContext = createContext<AuthContextType>({
  currentUser: defaultAdminUser,
  firebaseUser: null,
  loading: false,
  loginWithGoogle: async () => {},
  logout: async () => {},
  switchRole: () => {},
  canAccessBK: true,
  canManageSettings: true,
  canManageMasterData: true,
  canInputGrades: true,
  canInputAttendance: true,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('sipadu_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return defaultAdminUser;
      }
    }
    return defaultAdminUser;
  });
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            setCurrentUser(data);
            localStorage.setItem('sipadu_user', JSON.stringify(data));
          } else {
            // Check if user is the bootstrapped admin
            const isBootstrappedAdmin =
              user.email?.toLowerCase() === 'amiruddin@smpialwasi-maros.sch.id';
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email || 'user@smpialwasi-maros.sch.id',
              displayName: user.displayName || 'Pegawai Al-Wasi’',
              role: isBootstrappedAdmin ? 'super_admin' : 'guru',
              nip: isBootstrappedAdmin ? '197805142005011003' : '199001012020011001',
            };
            await setDoc(userDocRef, newProfile);
            setCurrentUser(newProfile);
            localStorage.setItem('sipadu_user', JSON.stringify(newProfile));
          }
        } catch (e) {
          console.warn('Using offline/local auth profile:', e);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Google Sign In Error:', error);
      alert('Gagal login via Google. Silakan periksa koneksi atau pop-up browser.');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      // Reset to default guest or administrator state
      setCurrentUser(defaultAdminUser);
      localStorage.setItem('sipadu_user', JSON.stringify(defaultAdminUser));
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  const switchRole = (newRole: UserRole) => {
    if (!currentUser) return;
    const roleNames: Record<UserRole, string> = {
      super_admin: 'H. Amiruddin, S.Pd.I., M.Pd. (Super Admin)',
      kepala_sekolah: 'H. Amiruddin, S.Pd.I., M.Pd. (Kepala Sekolah)',
      operator: 'Faisal Akbar, S.Kom. (Operator)',
      guru: 'Ustadz Ilham Pratama, M.Pd. (Guru Mapel)',
      wali_kelas: 'Ustadzah Nur Asma, S.Pd.I. (Wali Kelas VII-A)',
      guru_bk: 'Siti Rahmawati, S.Psi. (Guru BK)',
    };

    const updated: UserProfile = {
      ...currentUser,
      role: newRole,
      displayName: roleNames[newRole] || currentUser.displayName,
      assignedClass: newRole === 'wali_kelas' ? 'VII-A' : undefined,
      subject:
        newRole === 'guru'
          ? 'Matematika'
          : newRole === 'guru_bk'
          ? 'Bimbingan Konseling (BK)'
          : currentUser.subject,
    };
    setCurrentUser(updated);
    localStorage.setItem('sipadu_user', JSON.stringify(updated));
  };

  const role = currentUser?.role || 'super_admin';
  const canAccessBK = ['super_admin', 'kepala_sekolah', 'guru_bk'].includes(role);
  const canManageSettings = ['super_admin', 'operator'].includes(role);
  const canManageMasterData = ['super_admin', 'operator', 'kepala_sekolah'].includes(role);
  const canInputGrades = ['super_admin', 'guru', 'wali_kelas'].includes(role);
  const canInputAttendance = ['super_admin', 'guru', 'wali_kelas', 'operator'].includes(role);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        loading,
        loginWithGoogle,
        logout,
        switchRole,
        canAccessBK,
        canManageSettings,
        canManageMasterData,
        canInputGrades,
        canInputAttendance,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
