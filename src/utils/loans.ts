// Loan types and interfaces
export interface Loan {
    id: string;
    userId: string; // User who created the loan
    borrowerName: string;
    contactEmail?: string; // Email of the contact (optional for backwards compatibility)
    amount: number;
    description: string;
    status: 'pending' | 'accepted' | 'rejected' | 'returned' | 'edit-pending';
    createdAt: string;
    updatedAt: string;
    evidence?: string;
    originalLoan?: Loan; // For edit-pending status
}

// Storage key
const STORAGE_KEY = 'loans-app-data';

// Get all loans from localStorage (filtered by current user)
export function getLoans(): Loan[] {
    if (typeof window === 'undefined') return [];

    // Import getCurrentUser dynamically to avoid circular dependency
    const sessionData = localStorage.getItem('loans-app-session');
    if (!sessionData) return [];

    const session = JSON.parse(sessionData);
    const userId = session.userId;

    const data = localStorage.getItem(STORAGE_KEY);
    const allLoans: Loan[] = data ? JSON.parse(data) : [];

    // Filter loans by current user
    return allLoans.filter(loan => loan.userId === userId);
}

// Get all loans without filtering (for internal use)
function getAllLoans(): Loan[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

// Save all loans to localStorage (internal use)
function saveLoans(loans: Loan[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loans));
}

// Create a new loan
export function createLoan(userId: string, borrowerName: string, amount: number, description: string, contactEmail?: string): Loan {
    const loan: Loan = {
        id: crypto.randomUUID(),
        userId,
        borrowerName,
        contactEmail,
        amount,
        description,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    const allLoans = getAllLoans();
    allLoans.unshift(loan);
    saveLoans(allLoans);

    return loan;
}

// Update loan status
export function updateLoanStatus(id: string, status: Loan['status']): void {
    const allLoans = getAllLoans();
    const loan = allLoans.find(l => l.id === id);
    if (loan) {
        loan.status = status;
        loan.updatedAt = new Date().toISOString();
        saveLoans(allLoans);
    }
}

// Add evidence to a loan
export function addEvidence(id: string, evidence: string): void {
    const allLoans = getAllLoans();
    const loan = allLoans.find(l => l.id === id);
    if (loan) {
        loan.evidence = evidence;
        loan.status = 'returned';
        loan.updatedAt = new Date().toISOString();
        saveLoans(allLoans);
    }
}

// Create edit request
export function createEditRequest(id: string, newAmount: number, newDescription: string): void {
    const allLoans = getAllLoans();
    const loan = allLoans.find(l => l.id === id);
    if (loan) {
        // Store original loan data
        loan.originalLoan = { ...loan };
        loan.amount = newAmount;
        loan.description = newDescription;
        loan.status = 'edit-pending';
        loan.updatedAt = new Date().toISOString();
        saveLoans(allLoans);
    }
}

// Accept edit
export function acceptEdit(id: string): void {
    const allLoans = getAllLoans();
    const loan = allLoans.find(l => l.id === id);
    if (loan) {
        delete loan.originalLoan;
        loan.status = 'accepted';
        loan.updatedAt = new Date().toISOString();
        saveLoans(allLoans);
    }
}

// Reject edit (revert to original)
export function rejectEdit(id: string): void {
    const allLoans = getAllLoans();
    const loan = allLoans.find(l => l.id === id);
    if (loan && loan.originalLoan) {
        loan.amount = loan.originalLoan.amount;
        loan.description = loan.originalLoan.description;
        delete loan.originalLoan;
        loan.status = 'accepted';
        loan.updatedAt = new Date().toISOString();
        saveLoans(allLoans);
    }
}

// Delete a loan
export function deleteLoan(id: string): void {
    const allLoans = getAllLoans();
    const filtered = allLoans.filter(l => l.id !== id);
    saveLoans(filtered);
}

// Format currency
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(amount);
}

// Format date
export function formatDate(dateString: string): string {
    return new Intl.DateTimeFormat('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(dateString));
}
