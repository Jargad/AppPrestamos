// Contact types and interfaces
export interface Contact {
    email: string; // Primary key
    name: string;
    phone?: string;
    notes?: string;
    userId: string; // Owner of the contact
    createdAt: string;
    updatedAt: string;
}

// Storage key
const CONTACTS_KEY = 'loans-app-contacts';

// Get all contacts from localStorage (filtered by current user)
export function getContacts(): Contact[] {
    if (typeof window === 'undefined') return [];

    // Get current user session
    const sessionData = localStorage.getItem('loans-app-session');
    if (!sessionData) return [];

    const session = JSON.parse(sessionData);
    const userId = session.userId;

    const data = localStorage.getItem(CONTACTS_KEY);
    const allContacts: Contact[] = data ? JSON.parse(data) : [];

    // Filter contacts by current user
    return allContacts.filter(contact => contact.userId === userId);
}

// Get all contacts without filtering (for internal use)
function getAllContacts(): Contact[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(CONTACTS_KEY);
    return data ? JSON.parse(data) : [];
}

// Save all contacts to localStorage (internal use)
function saveContacts(contacts: Contact[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
}

// Get contact by email (for current user)
export function getContactByEmail(email: string): Contact | null {
    const contacts = getContacts();
    return contacts.find(c => c.email.toLowerCase() === email.toLowerCase()) || null;
}

// Create a new contact
export function createContact(
    userId: string,
    email: string,
    name: string,
    phone?: string,
    notes?: string
): { success: boolean; contact?: Contact; error?: string } {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { success: false, error: 'Email inválido' };
    }

    // Check if contact already exists for this user
    const existingContact = getContactByEmail(email);
    if (existingContact) {
        return { success: false, error: 'Ya existe un contacto con este email' };
    }

    const contact: Contact = {
        email: email.toLowerCase().trim(),
        name: name.trim(),
        phone: phone?.trim(),
        notes: notes?.trim(),
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    const allContacts = getAllContacts();
    allContacts.push(contact);
    saveContacts(allContacts);

    return { success: true, contact };
}

// Update a contact
export function updateContact(
    email: string,
    updates: { name?: string; phone?: string; notes?: string }
): { success: boolean; error?: string } {
    const allContacts = getAllContacts();
    const contactIndex = allContacts.findIndex(c => c.email.toLowerCase() === email.toLowerCase());

    if (contactIndex === -1) {
        return { success: false, error: 'Contacto no encontrado' };
    }

    const contact = allContacts[contactIndex];

    // Update fields
    if (updates.name !== undefined) contact.name = updates.name.trim();
    if (updates.phone !== undefined) contact.phone = updates.phone.trim();
    if (updates.notes !== undefined) contact.notes = updates.notes.trim();
    contact.updatedAt = new Date().toISOString();

    saveContacts(allContacts);
    return { success: true };
}

// Delete a contact
export function deleteContact(email: string): { success: boolean; error?: string } {
    const allContacts = getAllContacts();
    const filtered = allContacts.filter(c => c.email.toLowerCase() !== email.toLowerCase());

    if (filtered.length === allContacts.length) {
        return { success: false, error: 'Contacto no encontrado' };
    }

    saveContacts(filtered);
    return { success: true };
}

// Search contacts by name or email
export function searchContacts(query: string): Contact[] {
    const contacts = getContacts();
    const lowerQuery = query.toLowerCase();

    return contacts.filter(c =>
        c.name.toLowerCase().includes(lowerQuery) ||
        c.email.toLowerCase().includes(lowerQuery)
    );
}
