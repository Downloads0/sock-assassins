import { initializeApp } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDQt7q5CAPyMpQkei34yM9_FERXcyAOOEk",
  authDomain: "sock-assassins.firebaseapp.com",
  projectId: "sock-assassins",
  storageBucket: "sock-assassins.firebasestorage.app",
  messagingSenderId: "797140418755",
  appId: "1:797140418755:web:49f94413cf2e2b520b2276"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);