// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyALWlZRYY49KZhS4G_kmdMbM8L6CbGiEK4",
  authDomain: "vertex-870b9.firebaseapp.com",
  projectId: "vertex-870b9",
  storageBucket: "vertex-870b9.appspot.com",
  messagingSenderId: "5935141806",
  appId: "1:5935141806:web:39463bb92bcdc0a814ee3f",
  measurementId: "G-ZSZHGH5KCH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;