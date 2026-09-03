import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import {
  doc,
  getDoc,
} from "firebase/firestore";

import {
  auth,
  db,
} from "../firebase/firebase";

const AuthContext = createContext(null);

async function getStaffProfile(firebaseUser) {
  if (!firebaseUser) {
    return null;
  }

  const staffReference = doc(
    db,
    "staff",
    firebaseUser.uid
  );

  const snapshot = await getDoc(
    staffReference
  );

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [staffProfile, setStaffProfile] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        try {
          if (!firebaseUser) {
            setUser(null);
            setStaffProfile(null);
            setLoading(false);
            return;
          }

          const profile =
            await getStaffProfile(
              firebaseUser
            );

          if (!profile) {
            await signOut(auth);

            setUser(null);
            setStaffProfile(null);
            setLoading(false);
            return;
          }

          setUser(firebaseUser);
          setStaffProfile(profile);
          setLoading(false);
        } catch (error) {
          console.error(
            "Unable to verify staff account:",
            error
          );

          setUser(null);
          setStaffProfile(null);
          setLoading(false);
        }
      }
    );

    return unsubscribe;
  }, []);

  async function login(email, password) {
    await setPersistence(
      auth,
      browserLocalPersistence
    );

    const credential =
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

    const profile =
      await getStaffProfile(
        credential.user
      );

    if (!profile) {
      await signOut(auth);

      throw new Error(
        "This account is not authorized as Wings Arena staff."
      );
    }

    setUser(credential.user);
    setStaffProfile(profile);

    return credential;
  }

  async function logout() {
    await signOut(auth);

    setUser(null);
    setStaffProfile(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        staffProfile,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}