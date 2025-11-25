// User types and interfaces
export interface User {
    id: string;
    username: string;
    email: string;
    password: string; // Hashed password
    createdAt: string;
}

export interface Session {
    userId: string;
    username: string;
    email: string;
}

// Storage keys
const USERS_KEY = 'loans-app-users';
const SESSION_KEY = 'loans-app-session';

// Simple hash function (NOT secure for production - use bcrypt in real apps)
function hashPassword(password: string): string {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
}

// Get all users from localStorage
function getUsers(): User[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
}

// Save users to localStorage
function saveUsers(users: User[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// Get current session
function getSession(): Session | null {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
}

// Save session
function saveSession(session: Session | null): void {
    if (typeof window === 'undefined') return;
    if (session) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
        localStorage.removeItem(SESSION_KEY);
    }
}

// Register a new user
export function register(username: string, email: string, password: string): { success: boolean; error?: string } {
    const users = getUsers();

    // Check if user already exists
    if (users.some(u => u.email === email)) {
        return { success: false, error: 'El email ya está registrado' };
    }

    if (users.some(u => u.username === username)) {
        return { success: false, error: 'El nombre de usuario ya está en uso' };
    }

    // Create new user
    const user: User = {
        id: crypto.randomUUID(),
        username,
        email,
        password: hashPassword(password),
        createdAt: new Date().toISOString(),
    };

    users.push(user);
    saveUsers(users);

    // Auto login after registration
    const session: Session = {
        userId: user.id,
        username: user.username,
        email: user.email,
    };
    saveSession(session);

    return { success: true };
}

// Login user
export function login(email: string, password: string): { success: boolean; error?: string } {
    const users = getUsers();
    const hashedPassword = hashPassword(password);

    const user = users.find(u => u.email === email && u.password === hashedPassword);

    if (!user) {
        return { success: false, error: 'Email o contraseña incorrectos' };
    }

    // Create session
    const session: Session = {
        userId: user.id,
        username: user.username,
        email: user.email,
    };
    saveSession(session);

    return { success: true };
}

// Logout user
export function logout(): void {
    saveSession(null);
}

// Get current user
export function getCurrentUser(): Session | null {
    return getSession();
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
    return getSession() !== null;
}

// Redirect to auth page if not authenticated
export function requireAuth(): void {
    if (typeof window === 'undefined') return;
    if (!isAuthenticated()) {
        window.location.href = '/auth';
    }
}

// Redirect to home if already authenticated
export function redirectIfAuthenticated(): void {
    if (typeof window === 'undefined') return;
    if (isAuthenticated()) {
        window.location.href = '/';
    }
}
