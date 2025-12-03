// Firebase Configuration File
// Replace these values with your Firebase project credentials

const firebaseConfig = {
  apiKey: "AIzaSyBH7XzzkGqe5IvlDpzsSxK_SZIFPi3MJS0",
  authDomain: "jyotishapp-f33bd.firebaseapp.com",
  projectId: "jyotishapp-f33bd",
  storageBucket: "jyotishapp-f33bd.firebasestorage.app",
  messagingSenderId: "526268888766",
  appId: "1:526268888766:web:92bc61186ebaf687c650ef"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore Database
const db = firebase.firestore();

// Initialize Authentication
const auth = firebase.auth();

// Enable offline persistence for PWA functionality (updated method)
firebase.firestore().settings({
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
});

firebase.firestore().enablePersistence({ synchronizeTabs: true })
    .catch((err) => {
        if (err.code === 'failed-precondition') {
            console.log('Persistence failed: Multiple tabs open');
        } else if (err.code === 'unimplemented') {
            console.log('Persistence not supported by browser');
        }
    });

console.log('Firebase initialized successfully');