import { getAuth } from 'firebase/auth';
import { app } from './firebase.ts';

const auth = getAuth(app);

export { auth };
