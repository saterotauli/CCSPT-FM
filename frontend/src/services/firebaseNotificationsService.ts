import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { firebaseAuthService } from './firebaseAuthService';

export interface NotificationDoc {
  id?: string;
  uid: string; // destinatario
  title: string;
  body: string;
  type?: string;
  createdAt?: any; // Timestamp
  read?: boolean;
}

class FirebaseNotificationsService {
  listenUnreadCount(cb: (count: number) => void) {
    const me = firebaseAuthService.getCurrentUser();
    if (!me) return () => {};
    const q = query(
      collection(db, 'notifications'),
      where('uid', '==', me.uid),
      where('read', '==', false)
    );
    return onSnapshot(q, (snap) => cb(snap.size));
  }

  listenAll(cb: (items: NotificationDoc[]) => void) {
    const me = firebaseAuthService.getCurrentUser();
    if (!me) return () => {};
    const q = query(
      collection(db, 'notifications'),
      where('uid', '==', me.uid),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snap) => {
      const arr: NotificationDoc[] = [];
      snap.forEach((d) => arr.push({ id: d.id, ...(d.data() as NotificationDoc) }));
      cb(arr);
    });
  }

  async markAllAsRead() {
    const me = firebaseAuthService.getCurrentUser();
    if (!me) return;
    const q = query(
      collection(db, 'notifications'),
      where('uid', '==', me.uid),
      where('read', '==', false)
    );
    const snap = await getDocs(q);
    const updates = snap.docs.map((d) => updateDoc(doc(db, 'notifications', d.id), { read: true }));
    await Promise.all(updates);
  }
}

export const firebaseNotificationsService = new FirebaseNotificationsService();
