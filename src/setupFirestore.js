// Firestore Database Setup Script
// Run this once to create initial users and gym data
// Usage: Open browser console at http://localhost:5173 and paste this code

import { doc, setDoc } from 'firebase/firestore';
import { db } from './lib/firebase';

export async function setupFirestore() {
    console.log('Setting up Firestore database...');

    try {
        // Create Super Admin user
        const superAdminId = 'YOUR_SUPER_ADMIN_UID'; // Replace with actual UID from Firebase Auth
        await setDoc(doc(db, 'users', superAdminId), {
            email: 'admin@gymmaster.com',
            role: 'superadmin',
            gymId: null,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
        });
        console.log('✅ Super Admin user created');

        // Create a test gym
        await setDoc(doc(db, 'gyms', 'gym001'), {
            name: 'PowerGYM Test Location',
            city: 'Casablanca',
            status: 'active',
            ownerId: 'YOUR_GYM_CLIENT_UID', // Replace with actual UID
            createdAt: new Date().toISOString(),
            insuranceFee: 100, // 100 MAD
        });
        console.log('✅ Test gym created');

        // Create Gym Client user
        const gymClientId = 'YOUR_GYM_CLIENT_UID'; // Replace with actual UID from Firebase Auth
        await setDoc(doc(db, 'users', gymClientId), {
            email: 'owner@gymtest.com',
            role: 'gymclient',
            gymId: 'gym001',
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
        });
        console.log('✅ Gym Client user created');

        // Create a sample membership plan
        await setDoc(doc(db, 'gyms/gym001/plans', 'plan001'), {
            name: 'Monthly Membership',
            duration: 30,
            price: 300,
            benefits: ['Gym Access', 'Locker', 'Shower'],
            isActive: true,
            createdAt: new Date().toISOString(),
        });
        console.log('✅ Sample plan created');

        console.log('✨ Firestore setup complete!');
        return { success: true };
    } catch (error) {
        console.error('❌ Error setting up Firestore:', error);
        return { success: false, error: error.message };
    }
}

// To run this script, call: setupFirestore()
