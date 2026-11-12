import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  User as FirebaseUser,
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { UserProfile, UserRole } from '../types';

const ADMIN_EMAIL = 'amiruddin@smpialwasi-maros.sch.id';
const SCHOOL_DOMAIN = '@smpialwasi-maros.sch.id';

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

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  firebaseUser: null,
  loading: true,
  loginWithGoogle: async () => {},
  logout: async () => {},
  switchRole: () => {},
  canAccessBK: false,
  canManageSettings: false,
  canManageMasterData: false,
  canInputGrades: false,
  canInputAttendance: false,
});

function isAllowedSchoolAccount(user: FirebaseUser): boolean {
  const email = user.email?.toLowerCase() || '';
  const isGoogleAccount = user.providerData.some(item => item.providerId === 'google.com');
  return Boolean(user.emailVerified && isGoogleAccount && email.endsWith(SCHOOL_DOMAIN));
}

async function buildSchoolProfile(user: FirebaseUser): Promise<UserProfile> {
  const email = (user.email || '').toLowerCase();
  const isAdmin = email === ADMIN_EMAIL;
  const profileRef = doc(db, 'users', user.uid);
  const profileSnapshot = await getDoc(profileRef);
  const previous = profileSnapshot.exists() ? profileSnapshot.data() : {};
  const profile: UserProfile = {
    ...previous,
    uid: user.uid,
    email,
    displayName: user.displayName || previous.displayName || 'Guru SMP Islam Al-Wasi’',
    role: isAdmin ? 'super_admin' : 'guru',
  };
  await setDoc(profileRef, profile, { merge: true });
  return profile;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async user => {
      if (!active) return;
      setFirebaseUser(user);
      setCurrentUser(null);

      if (!user) {
        setLoading(false);
        return;
      }

      if (user.isAnonymous) {
        setLoading(false);
        return;
      }

      if (!isAllowedSchoolAccount(user)) {
        await signOut(auth);
        if (active) {
          setFirebaseUser(null);
          setCurrentUser(null);
          setLoading(false);
          alert('Akses SIMPATIK hanya untuk akun Google sekolah yang terverifikasi (@smpialwasi-maros.sch.id).');
        }
        return;
      }

      try {
        const profile = await buildSchoolProfile(user);
        if (active) setCurrentUser(profile);
      } catch (error) {
        console.error('Gagal memuat profil akun sekolah:', error);
        if (active) {
          setCurrentUser(null);
          alert('Login berhasil, tetapi profil SIMPATIK belum dapat disiapkan. Periksa koneksi dan Firestore Rules.');
        }
      } finally {
        if (active) setLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        hd: 'smpialwasi-maros.sch.id',
        prompt: 'select_account',
      });
      await setPersistence(auth, browserLocalPersistence);
      const result = await signInWithPopup(auth, provider);
      if (!isAllowedSchoolAccount(result.user)) {
        await signOut(auth);
        throw new Error('Gunakan akun Google sekolah terverifikasi dengan domain @smpialwasi-maros.sch.id.');
      }
    } catch (error) {
      console.error('Google Sign In Error:', error);
      alert(error instanceof Error ? error.message : 'Login Google gagal. Periksa koneksi internet dan coba kembali.');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setFirebaseUser(null);
      setCurrentUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      alert('Gagal keluar dari akun. Silakan coba kembali.');
    }
  };

  const switchRole = (_newRole: UserRole) => {
    // Hak akses berasal dari identitas Firebase, bukan pilihan lokal pengguna.
  };

  const role = currentUser?.role || '';
  const isAuthenticatedSchoolUser = Boolean(firebaseUser && !firebaseUser.isAnonymous && currentUser);
  const canAccessBK = isAuthenticatedSchoolUser && ['super_admin', 'kepala_sekolah', 'guru_bk'].includes(role);
  const canManageSettings = isAuthenticatedSchoolUser && ['super_admin', 'operator'].includes(role);
  const canManageMasterData = isAuthenticatedSchoolUser && ['super_admin', 'operator', 'kepala_sekolah'].includes(role);
  const canInputGrades = isAuthenticatedSchoolUser && ['super_admin', 'guru', 'wali_kelas'].includes(role);
  const canInputAttendance = isAuthenticatedSchoolUser && ['super_admin', 'guru', 'wali_kelas', 'operator'].includes(role);

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
