import { createContext, useContext, useState, useEffect } from 'react';
import {
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [session, setSessionState] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);

                // Real-time listener for User Profile
                const userRef = doc(db, 'users', firebaseUser.uid);
                const unsubscribeProfile = onSnapshot(userRef, async (docSnap) => {
                    if (docSnap.exists()) {
                        const profile = docSnap.data();
                        setUserProfile(profile);

                        // If user is gymclient/owner, check session
                        // Note: For now, we still fetch session once. 
                        // If we needed session to be matching profile changes strictly, we might move this.
                        // But gymName is usually in profile.
                        if (profile.role === 'gymclient') {
                            const sessionDoc = await getDoc(doc(db, 'sessions', firebaseUser.uid));
                            if (sessionDoc.exists()) {
                                setSessionState(sessionDoc.data());
                            } else {
                                setSessionState(null);
                            }
                        }
                    } else {
                        console.warn('User document does not exist');
                    }
                    setLoading(false);
                }, (error) => {
                    console.error("Profile listener error:", error);
                    setLoading(false);
                });

                return () => unsubscribeProfile();

            } else {
                setUser(null);
                setUserProfile(null);
                setSessionState(null);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const signIn = async (email, password) => {
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);

            // Sync email from Firebase Auth to Firestore (in case it was changed via verification)
            try {
                const syncUserEmail = httpsCallable(functions, 'syncUserEmail');
                await syncUserEmail();
            } catch (syncError) {
                console.warn('Email sync failed (non-critical):', syncError);
            }

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

