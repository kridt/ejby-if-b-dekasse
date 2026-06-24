"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { UserProfile } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  signup: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(u: User) {
    const ref = doc(db, "users", u.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      setProfile({ uid: u.uid, ...(snap.data() as Omit<UserProfile, "uid">) });
    } else {
      setProfile(null);
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await loadProfile(u);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  async function signup(name: string, email: string, password: string) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });

    // Første bruger i klubben bliver automatisk admin
    const adminFlagRef = doc(db, "settings", "bootstrap");
    const adminFlagSnap = await getDoc(adminFlagRef);
    const isFirstUser = !adminFlagSnap.exists();

    const profileData: Omit<UserProfile, "uid"> = {
      displayName: name,
      email,
      role: isFirstUser ? "admin" : "member",
    };

    await setDoc(doc(db, "users", cred.user.uid), {
      ...profileData,
      createdAt: serverTimestamp(),
    });

    if (isFirstUser) {
      await setDoc(adminFlagRef, {
        firstAdminUid: cred.user.uid,
        createdAt: serverTimestamp(),
      });
    }

    await loadProfile(cred.user);
  }

  async function login(email: string, password: string) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await loadProfile(cred.user);
  }

  async function logout() {
    await signOut(auth);
  }

  async function refreshProfile() {
    if (user) await loadProfile(user);
  }

  const value: AuthContextValue = {
    user,
    profile,
    loading,
    isAdmin: profile?.role === "admin",
    signup,
    login,
    logout,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth skal bruges inde i AuthProvider");
  return ctx;
}
