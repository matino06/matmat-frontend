import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyCTyxM8OygHlhNlKva6G2JSfUbk-1AT2Bo",
    authDomain: "edu-sprint-61d87.firebaseapp.com",
    projectId: "edu-sprint-61d87",
    storageBucket: "edu-sprint-61d87.firebasestorage.app",
    messagingSenderId: "221075632416",
    appId: "1:221075632416:web:0ca28fb68055066a912745",
    measurementId: "G-RSV0PLQ27E"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider };
