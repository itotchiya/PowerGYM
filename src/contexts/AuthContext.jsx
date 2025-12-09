import { createContext, useContext, useState, useEffect } from 'react';
import {
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);

                // Fetch user profile from Firestore
                const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                if (userDoc.exists()) {
                    setUserProfile(userDoc.data());
                }
            } else {
                setUser(null);
                setUserProfile(null);
                setSession(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const signIn = async (email, password) => {
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            return { success: true, user: result.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const signOut = async () => {
        try {
            setSession(null);
            await firebaseSignOut(auth);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const setUserSession = async (subrole) => {
        if (!user || !userProfile) return;

        const sessionData = {
            userId: user.uid,
            gymId: userProfile.gymId,
            subrole: subrole,
            createdAt: new Date().toISOString(),
        };

        setSession(sessionData);

        // Persist session in Firestore
        await setDoc(doc(db, 'sessions', user.uid), sessionData);
    };

    const isSuperAdmin = () => {
        return userProfile?.role === 'superadmin';
    };

    const isGymClient = () => {
        return userProfile?.role === 'gymclient';
    };

    const isOwner = () => {
        return isGymClient() && session?.subrole === 'owner';
    };

    const isManager = () => {
        return isGymClient() && session?.subrole === 'manager';
    };

    const value = {
        user,
        userProfile,
        session,
        loading,
        signIn,
        signOut,
        setUserSession,
        isSuperAdmin,
        isGymClient,
        isOwner,
        isManager,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
