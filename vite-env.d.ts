/// <reference types="vite/client" />

declare interface ImportMetaEnv {
    VITE_FIREBASE_API_KEY: string;
    VITE_FIREBASE_AUTH_DOMAIN: string;
    VITE_FIREBASE_PROJECT_ID: string;
    VITE_FIREBASE_STORAGE_BUCKET: string;
    VITE_FIREBASE_MESSAGING_SENDER_ID: string;
    VITE_FIREBASE_APP_ID: string;
    VITE_FIREBASE_MEASUREMENT_ID: string;
    VITE_GOOGLE_MAPS_API_KEY: string;
    // Google Maps
    VITE_GOOGLE_MAPS_MAP_ID?: string;
    // AI service configuration
    VITE_LOCAL_AI_URL?: string;
    VITE_DEFAULT_AI_PROVIDER?: string;
    VITE_DEFAULT_AI_MODEL?: string;
    VITE_REQUEST_TIMEOUT?: string | number;
    VITE_MAX_RETRIES?: string | number;
    VITE_ADMIN_EMAIL?: string;
}

declare interface ImportMeta {
    readonly env: ImportMetaEnv;
}
