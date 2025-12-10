import { createContext, useContext, useState, useEffect } from 'react';
import {
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [session, setSessionState] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            try {
                if (firebaseUser) {
                    setUser(firebaseUser);

                    // Fetch user profile from Firestore
                    try {
                        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                        if (userDoc.exists()) {
                            const profile = userDoc.data();
                            setUserProfile(profile);

                            // For gym clients, check if there's an existing session
                            if (profile.role === 'gymclient') {
                                const sessionDoc = await getDoc(doc(db, 'sessions', firebaseUser.uid));
                                if (sessionDoc.exists()) {
                                    const sessionData = sessionDoc.data();
                                    setSessionState(sessionData);
                                } else {
                                    // No session exists - user needs to select role
                                    setSessionState(null);
                                }
                            }
                        } else {
                            console.warn('User document does not exist in Firestore for UID:', firebaseUser.uid);
                        }
                    } catch (error) {
                        console.error('Error fetching user profile:', error);
                    }
                } else {
                    setUser(null);
                    setUserProfile(null);
                    setSessionState(null);
                }
            } catch (error) {
                console.error('Auth state change error:', error);
            } finally {
                setLoading(false);
            }
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
            // Clear session from Firestore on logout (ignore errors if no permission)
            if (user) {
                try {
                    await deleteDoc(doc(db, 'sessions', user.uid));
                } catch (e) {
                    console.log('Could not delete session, continuing logout');
                }
            }
            setSessionState(null);
            await firebaseSignOut(auth);
            return { success: true };
        } catch (error) {
            console.error('Sign out error:', error);
            return { success: false, error: error.message };
        }
    };

    // Set session - used when role is selected
    const setSession = async (sessionData) => {
        if (!user || !userProfile) return;

        const fullSessionData = {
            userId: user.uid,
            gymId: userProfile.gymId,
            gymName: userProfile.gymName || 'PowerGYM',
            subrole: sessionData.subrole,
            createdAt: new Date().toISOString(),
        };

        setSessionState(fullSessionData);

        // Persist session in Firestore
        await setDoc(doc(db, 'sessions', user.uid), fullSessionData);
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
        setSession,
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

