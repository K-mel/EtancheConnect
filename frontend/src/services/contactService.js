import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const submitContactForm = async (formData) => {
  try {
    const contactsRef = collection(db, 'contacts');
    const newContact = {
      ...formData,
      status: 'unread',
      createdAt: serverTimestamp(),
      readAt: null
    };
    
    const docRef = await addDoc(contactsRef, newContact);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error submitting contact form:', error);
    throw error;
  }
};
