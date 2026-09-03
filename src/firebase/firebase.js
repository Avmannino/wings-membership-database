import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDs3ylmo5SdF_e5kS6J-x2lkoG9hT_y5vs",
  authDomain: "wings-membership-database.firebaseapp.com",
  projectId: "wings-membership-database",
  storageBucket: "wings-membership-database.firebasestorage.app",
  messagingSenderId: "133864100849",
  appId: "1:133864100849:web:aee1105e73b9da3aa7aa50",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;