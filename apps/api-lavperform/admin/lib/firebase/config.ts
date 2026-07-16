import { initializeApp } from 'firebase/app'
import { Analytics, getAnalytics, isSupported } from 'firebase/analytics'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: 'AIzaSyB9Ya2rPJBh0yynUMrnIAi4Gz_Iixo0EGc',
  authDomain: 'overfood-foodcrm.firebaseapp.com',
  projectId: 'overfood-foodcrm',
  storageBucket: 'overfood-foodcrm.firebasestorage.app',
  messagingSenderId: '497437540956',
  appId: '1:497437540956:web:85d6c0b31e04e3281d1c99',
  measurementId: 'G-T27ZYKKE3T',
}

const app = initializeApp(firebaseConfig)
export const storage = getStorage(app)

let analytics: Analytics | null = null

isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app)
  }
})

export { analytics }
