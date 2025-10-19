// Vite env type declaration for TypeScript
interface ImportMetaEnv {
    VITE_FIREBASE_API_KEY: string;
    VITE_FIREBASE_AUTH_DOMAIN: string;
    VITE_FIREBASE_PROJECT_ID: string;
    VITE_FIREBASE_STORAGE_BUCKET: string;
    VITE_FIREBASE_MESSAGING_SENDER_ID: string;
    VITE_FIREBASE_APP_ID: string;
    VITE_FIREBASE_MEASUREMENT_ID: string;
}

interface ImportMeta {
    env: ImportMetaEnv;
}

// --- Type Re-export for compatibility ---
// This allows other files to import the User type consistently.
export type User = FirebaseUser;

// --- Configuration ---
// Vite exposes env variables on `import.meta.env`.
// These variables should be set in a `.env.local` file at the root of the project.
// Example: VITE_FIREBASE_API_KEY="AIza..."
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut as firebaseSignOut, setPersistence, browserLocalPersistence, onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { getFirestore, collection, addDoc, query, where, orderBy, getDocs } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCf_7fIn3it0uZyvXQ9UghdAikCPIAzHuk",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "smartlocalai-b092a.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "smartlocalai-b092a",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "smartlocalai-b092a.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "74298326501",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:74298326501:web:ba9fd38e11570306bf030c",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-CDZ5YYQ7HG"
};

let firebaseError: string | null = null;
if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes("xxxxxxxxxx")) {
    firebaseError = "Firebase API Key is not configured correctly. Please set VITE_FIREBASE_API_KEY in your environment.";
} else if (!firebaseConfig.projectId) {
    firebaseError = "Firebase Project ID is not configured. Please set VITE_FIREBASE_PROJECT_ID in your environment.";
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);
let analytics;
if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
}

// Set auth persistence to LOCAL for faster subsequent loads
setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.warn("Failed to set auth persistence:", error);
});
// --- Local Emulator Connections ---
if (import.meta.env.DEV) {
    // Connect Auth emulator
    // (default port: 9099)
    // Connect Firestore emulator
    // (default port: 8080)
    // Connect Functions emulator
    // (default port: 5001)
    // Only run in local dev
    // @ts-ignore
    import('firebase/auth').then(({ connectAuthEmulator }) => {
        connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
    });
    import('firebase/firestore').then(({ connectFirestoreEmulator }) => {
        // Use 8088 to avoid conflict with local Express AI server on 8080
        connectFirestoreEmulator(db, "localhost", 8088);
    });
    import('firebase/functions').then(({ connectFunctionsEmulator }) => {
        connectFunctionsEmulator(functions, "localhost", 5001);
    });
}

// Validate configuration
if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes("xxxxxxxxxx")) {
    firebaseError = "Firebase API Key is not configured correctly. Please set VITE_FIREBASE_API_KEY in your environment.";
} else if (!firebaseConfig.projectId) {
    firebaseError = "Firebase Project ID is not configured. Please set VITE_FIREBASE_PROJECT_ID in your environment.";
}

// --- Authentication Functions ---
const provider = new GoogleAuthProvider();


const signInWithGoogle = async () => {
    try {
        await signInWithPopup(auth, provider);
    } catch (error: any) {
        console.error("Google Sign-In Error:", error);
        if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
            try {
                await signInWithRedirect(auth, provider);
            } catch (redirectError: any) {
                alert(`Sign-in failed: ${redirectError.message}`);
            }
        } else {
            alert(`An error occurred during sign-in: ${error.message}`);
        }
    }
};

const signOut = async () => {
    await firebaseSignOut(auth);
};

export {
    app,
    auth,
    db,
    collection,
    addDoc,
    query,
    where,
    orderBy,
    getDocs,
    functions,
    httpsCallable,
    analytics,
    firebaseError,
    signInWithGoogle,
    signOut,
    onAuthStateChanged
};