import { collection, query, where, orderBy, onSnapshot, addDoc, doc, serverTimestamp, getDoc, updateDoc, limit, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { firebaseAuthService } from './firebaseAuthService';

export interface ConversationDoc {
  id?: string;
  participants: string[]; // array de uids
  lastMessage?: string;
  lastSender?: string; // uid
  updatedAt?: any; // Timestamp
  name?: string; // para grupos
  avatarUrl?: string; // opcional
  unreadFor?: string[]; // uids con mensajes no leídos
  key?: string; // clave única para directos (uids ordenados unidos por '_')
}

export interface MessageDoc {
  id?: string;
  conversationId: string;
  sender: string; // uid
  text: string;
  createdAt?: any; // Timestamp
}

class FirebaseMessagingService {
  listenConversations(cb: (items: ConversationDoc[]) => void) {
    const user = firebaseAuthService.getCurrentUser();
    if (!user) return () => {};
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );
    return onSnapshot(q, (snap) => {
      const arr: ConversationDoc[] = [];
      snap.forEach((d) => arr.push({ id: d.id, ...(d.data() as ConversationDoc) }));
      cb(arr);
    });
  }

  listenMessages(conversationId: string, cb: (items: MessageDoc[]) => void) {
    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('createdAt', 'asc')
    );
    return onSnapshot(q, (snap) => {
      const arr: MessageDoc[] = [];
      snap.forEach((d) => arr.push({ id: d.id, ...(d.data() as MessageDoc) }));
      cb(arr);
    });
  }

  async sendMessage(conversationId: string, text: string) {
    const user = firebaseAuthService.getCurrentUser();
    if (!user) throw new Error('No autenticado');
    const ref = collection(db, 'conversations', conversationId, 'messages');
    await addDoc(ref, {
      conversationId,
      sender: user.uid,
      text,
      createdAt: serverTimestamp(),
    });
    // actualizar conversación
    const convRef = doc(db, 'conversations', conversationId);
    const convSnap = await getDoc(convRef);
    const data = convSnap.data() as ConversationDoc | undefined;
    const participants = data?.participants || [];
    await updateDoc(convRef, {
      lastMessage: text,
      lastSender: user.uid,
      updatedAt: serverTimestamp(),
      unreadFor: participants.filter((p) => p !== user.uid),
    });
  }

  async createOrGetDirectConversation(otherUid: string): Promise<string> {
    const me = firebaseAuthService.getCurrentUser();
    if (!me) throw new Error('No autenticado');
    // clave determinística para conversación directa
    const key = [me.uid, otherUid].sort().join('_');
    const q = query(collection(db, 'conversations'), where('key', '==', key), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) return snap.docs[0].id;
    // crear
    const ref = await addDoc(collection(db, 'conversations'), {
      participants: [me.uid, otherUid],
      key,
      updatedAt: serverTimestamp(),
      lastMessage: '',
      lastSender: '',
      unreadFor: [],
    } as ConversationDoc);
    return ref.id;
  }

  async markConversationAsRead(conversationId: string) {
    const me = firebaseAuthService.getCurrentUser();
    if (!me) return;
    const convRef = doc(db, 'conversations', conversationId);
    await updateDoc(convRef, {
      unreadFor: [],
    });
  }
}

export const firebaseMessagingService = new FirebaseMessagingService();
