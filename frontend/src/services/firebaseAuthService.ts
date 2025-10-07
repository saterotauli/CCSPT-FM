import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  User as FirebaseUser,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'ADMIN' | 'COORDINADOR' | 'OPERARIO' | 'VISOR';
  active: boolean;
  createdAt: any; // Firestore Timestamp
  lastLogin?: any; // Firestore Timestamp
}

class FirebaseAuthService {
  private currentUser: FirebaseUser | null = null;
  private userProfile: UserProfile | null = null;

  constructor() {
    // Escuchar cambios en el estado de autenticación
    onAuthStateChanged(auth, async (user) => {
      this.currentUser = user;
      if (user) {
        await this.loadUserProfile(user.uid);
      } else {
        this.userProfile = null;
      }
    });
  }

  // Enviar email de restablecimiento de contraseña
  async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      throw { message: error?.message || 'No se pudo enviar el correo de restablecimiento', code: error?.code };
    }
  }

  // Registrar nuevo usuario
  async register(email: string, password: string, displayName: string, role: UserProfile['role'] = 'VISOR'): Promise<UserProfile> {
    try {
      // Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Actualizar el perfil con el nombre
      await updateProfile(user, { displayName });

      // Crear perfil en Firestore
      const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email!,
        displayName,
        role,
        active: true,
        createdAt: new Date(),
        lastLogin: new Date()
      };

      await setDoc(doc(db, 'users', user.uid), userProfile);
      this.userProfile = userProfile;

      return userProfile;
    } catch (error: any) {
      // Propagar código de Firebase
      throw { message: error?.message || 'Error en el registro', code: error?.code };
    }
  }

  // Iniciar sesión
  async login(email: string, password: string, remember: boolean = true): Promise<UserProfile> {
    try {
      // Configurar persistencia según preferencia
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await this.loadUserProfile(user.uid);
      // Si no hay perfil en Firestore, creamos uno mínimo por primera vez
      if (!this.userProfile) {
        const displayName = user.displayName || (email.split('@')[0]);
        const bootstrapProfile: UserProfile = {
          uid: user.uid,
          email: user.email || email,
          displayName,
          role: 'VISOR',
          active: true,
          createdAt: new Date(),
          lastLogin: new Date()
        };
        await setDoc(doc(db, 'users', user.uid), bootstrapProfile, { merge: true });
        this.userProfile = bootstrapProfile;
      }
      
      // Actualizar último login
      if (this.userProfile) {
        const updatedProfile = { ...this.userProfile, lastLogin: new Date() };
        await setDoc(doc(db, 'users', user.uid), updatedProfile, { merge: true });
        this.userProfile = updatedProfile;
      }

      return this.userProfile!;
    } catch (error: any) {
      // Propagar código de Firebase
      throw { message: error?.message || 'Error en el login', code: error?.code };
    }
  }

  // Cerrar sesión
  async logout(): Promise<void> {
    try {
      await signOut(auth);
      this.currentUser = null;
      this.userProfile = null;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  // Cargar perfil del usuario desde Firestore
  private async loadUserProfile(uid: string): Promise<void> {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        this.userProfile = userDoc.data() as UserProfile;
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  }

  // Obtener usuario actual
  getCurrentUser(): FirebaseUser | null {
    return this.currentUser;
  }

  // Obtener perfil del usuario
  getUserProfile(): UserProfile | null {
    return this.userProfile;
  }

  // Verificar si está autenticado
  isAuthenticated(): boolean {
    return this.currentUser !== null && this.userProfile !== null;
  }

  // Verificaciones de rol
  isAdmin(): boolean {
    return this.userProfile?.role === 'ADMIN';
  }

  isCoordinador(): boolean {
    return this.userProfile?.role === 'COORDINADOR' || this.isAdmin();
  }

  isOperario(): boolean {
    return ['OPERARIO', 'COORDINADOR', 'ADMIN'].includes(this.userProfile?.role || '');
  }

  isVisor(): boolean {
    return this.userProfile !== null; // Cualquier usuario autenticado puede ver
  }

  // Esperar a que Firebase inicialice
  waitForAuth(): Promise<FirebaseUser | null> {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(user);
      });
    });
  }
}

export const firebaseAuthService = new FirebaseAuthService();
