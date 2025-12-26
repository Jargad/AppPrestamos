import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { join, dirname as pathDirname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { schema } from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database path - uses environment variable for Railway, falls back to local path
const dbPath = process.env.DB_PATH || join(__dirname, 'loans.db');

console.log('🔍 Initializing database...');
console.log('📁 Database path:', dbPath);
console.log('📂 Current directory:', __dirname);

// Ensure directory exists (for Railway volume)
const dbDir = pathDirname(dbPath);
console.log('📂 Database directory:', dbDir);

try {
    if (!existsSync(dbDir)) {
        console.log('📁 Creating database directory...');
        mkdirSync(dbDir, { recursive: true });
        console.log('✅ Database directory created');
    } else {
        console.log('✅ Database directory already exists');
    }
} catch (err) {
    console.error('❌ Error creating database directory:', err);
    throw err;
}

// Initialize database
console.log('🗄️ Opening database connection...');
const db = new Database(dbPath);
console.log('✅ Database connection opened');

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize schema
console.log('🔧 Executing schema...');
db.exec(schema);
console.log('✅ Schema executed successfully');

console.log('✅ Database initialized at:', dbPath);

// ===== USER FUNCTIONS =====

export interface User {
    id: string;
    username: string;
    email: string;
    phone: string | null;
    password: string;
    created_at: string;
    updated_at: string;
}

export function createUser(id: string, username: string, email: string, password: string, phone?: string): User {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
    INSERT INTO users (id, username, email, phone, password, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

    stmt.run(id, username, email.toLowerCase(), phone || null, password, now, now);

    return { id, username, email: email.toLowerCase(), phone: phone || null, password, created_at: now, updated_at: now };
}

export function getUserByEmail(email: string): User | null {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email.toLowerCase()) as User | null;
}

export function getUserById(id: string): User | null {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id) as User | null;
}

export function getUserByUsername(username: string): User | null {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    return stmt.get(username) as User | null;
}

// ===== CONTACT FUNCTIONS =====

export interface Contact {
    email: string;
    user_id: string;
    name: string;
    phone?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}

export function createContact(userId: string, email: string, name: string, phone?: string, notes?: string): Contact {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
    INSERT INTO contacts (email, user_id, name, phone, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

    stmt.run(email.toLowerCase(), userId, name, phone || null, notes || null, now, now);

    return {
        email: email.toLowerCase(),
        user_id: userId,
        name,
        phone,
        notes,
        created_at: now,
        updated_at: now
    };
}

export function getContactsByUserId(userId: string): Contact[] {
    const stmt = db.prepare('SELECT * FROM contacts WHERE user_id = ? ORDER BY name');
    return stmt.all(userId) as Contact[];
}

export function getContactByEmail(userId: string, email: string): Contact | null {
    const stmt = db.prepare('SELECT * FROM contacts WHERE user_id = ? AND email = ?');
    return stmt.get(userId, email.toLowerCase()) as Contact | null;
}

export function updateContact(userId: string, email: string, updates: { name?: string; phone?: string; notes?: string }): boolean {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
        fields.push('name = ?');
        values.push(updates.name);
    }
    if (updates.phone !== undefined) {
        fields.push('phone = ?');
        values.push(updates.phone || null);
    }
    if (updates.notes !== undefined) {
        fields.push('notes = ?');
        values.push(updates.notes || null);
    }

    if (fields.length === 0) return false;

    fields.push('updated_at = ?');
    values.push(now);
    values.push(userId, email.toLowerCase());

    const stmt = db.prepare(`UPDATE contacts SET ${fields.join(', ')} WHERE user_id = ? AND email = ?`);
    const result = stmt.run(...values);

    return result.changes > 0;
}

export function deleteContact(userId: string, email: string): boolean {
    const stmt = db.prepare('DELETE FROM contacts WHERE user_id = ? AND email = ?');
    const result = stmt.run(userId, email.toLowerCase());
    return result.changes > 0;
}

// ===== LOAN FUNCTIONS =====

export interface Loan {
    id: string;
    lender_id: string;
    borrower_email: string;
    borrower_id: string | null;
    borrower_name: string;
    amount: number;
    description: string;
    status: 'pending' | 'accepted' | 'rejected' | 'returned' | 'edit-pending';
    evidence: string | null;
    invitation_token: string | null;
    is_personal: number;
    created_at: string;
    updated_at: string;
}

export function createLoan(
    id: string,
    lenderId: string,
    borrowerEmail: string,
    borrowerName: string,
    amount: number,
    description: string,
    invitationToken: string,
    isPersonal: boolean = false
): Loan {
    const now = new Date().toISOString();
    const status = isPersonal ? 'accepted' : 'pending';
    const borrowerId = isPersonal ? lenderId : null;
    const isPersonalInt = isPersonal ? 1 : 0;

    const stmt = db.prepare(`
    INSERT INTO loans (id, lender_id, borrower_email, borrower_id, borrower_name, amount, description, status, evidence, invitation_token, is_personal, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)
  `);

    stmt.run(id, lenderId, borrowerEmail.toLowerCase(), borrowerId, borrowerName, amount, description, status, invitationToken, isPersonalInt, now, now);

    return {
        id,
        lender_id: lenderId,
        borrower_email: borrowerEmail.toLowerCase(),
        borrower_id: borrowerId,
        borrower_name: borrowerName,
        amount,
        description,
        status,
        evidence: null,
        invitation_token: invitationToken,
        is_personal: isPersonalInt,
        created_at: now,
        updated_at: now
    };
}

export function getLoanById(id: string): Loan | null {
    const stmt = db.prepare('SELECT * FROM loans WHERE id = ?');
    return stmt.get(id) as Loan | null;
}

export function getLoanByToken(token: string): Loan | null {
    const stmt = db.prepare('SELECT * FROM loans WHERE invitation_token = ?');
    return stmt.get(token) as Loan | null;
}

export function getLoansAsLender(lenderId: string): Loan[] {
    const stmt = db.prepare('SELECT * FROM loans WHERE lender_id = ? ORDER BY created_at DESC');
    return stmt.all(lenderId) as Loan[];
}

export function getLoansAsBorrower(borrowerId: string): any[] {
    const stmt = db.prepare(`
        SELECT 
            loans.*,
            users.username as lender_name,
            users.email as lender_email
        FROM loans
        LEFT JOIN users ON loans.lender_id = users.id
        WHERE loans.borrower_id = ? 
        ORDER BY loans.created_at DESC
    `);
    return stmt.all(borrowerId) as any[];
}

export function getPendingLoansForEmail(email: string): Loan[] {
    const stmt = db.prepare('SELECT * FROM loans WHERE borrower_email = ? AND status = ? ORDER BY created_at DESC');
    return stmt.all(email.toLowerCase(), 'pending') as Loan[];
}


export function acceptLoan(loanId: string, borrowerId: string): boolean {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
    UPDATE loans 
    SET status = 'accepted', borrower_id = ?, updated_at = ?
    WHERE id = ? AND status = 'pending'
  `);
    const result = stmt.run(borrowerId, now, loanId);
    return result.changes > 0;
}

export function rejectLoan(loanId: string): boolean {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
    UPDATE loans 
    SET status = 'rejected', updated_at = ?
    WHERE id = ? AND status = 'pending'
  `);
    const result = stmt.run(now, loanId);
    return result.changes > 0;
}

export function updateLoanStatus(loanId: string, status: Loan['status']): boolean {
    const now = new Date().toISOString();
    const stmt = db.prepare('UPDATE loans SET status = ?, updated_at = ? WHERE id = ?');
    const result = stmt.run(status, now, loanId);
    return result.changes > 0;
}

export function addLoanEvidence(loanId: string, evidence: string): boolean {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
    UPDATE loans 
    SET evidence = ?, status = 'returned', updated_at = ?
    WHERE id = ?
  `);
    const result = stmt.run(evidence, now, loanId);
    return result.changes > 0;
}

export function deleteLoan(loanId: string): boolean {
    const stmt = db.prepare('DELETE FROM loans WHERE id = ?');
    const result = stmt.run(loanId);
    return result.changes > 0;
}

// ===== PAYMENT FUNCTIONS =====

export interface Payment {
    id: string;
    loan_id: string;
    amount: number;
    payment_type: 'partial' | 'full';
    evidence_url: string;
    status: 'pending' | 'confirmed' | 'rejected';
    notes: string | null;
    rejection_reason: string | null;
    created_by: string;
    confirmed_by: string | null;
    created_at: string;
    confirmed_at: string | null;
}

export function createPayment(
    id: string,
    loanId: string,
    amount: number,
    paymentType: 'partial' | 'full',
    evidenceUrl: string,
    createdBy: string,
    notes?: string
): Payment {
    const now = new Date().toISOString();

    // Check if loan is personal
    const loan = getLoanById(loanId);
    const isPersonal = loan?.is_personal === 1;

    // Auto-confirm if personal loan
    const status: 'pending' | 'confirmed' | 'rejected' = isPersonal ? 'confirmed' : 'pending';
    const confirmedBy = isPersonal ? createdBy : null;
    const confirmedAt = isPersonal ? now : null;

    const stmt = db.prepare(`
        INSERT INTO payments (id, loan_id, amount, payment_type, evidence_url, status, notes, rejection_reason, created_by, confirmed_by, created_at, confirmed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)
    `);

    stmt.run(id, loanId, amount, paymentType, evidenceUrl, status, notes || null, createdBy, confirmedBy, now, confirmedAt);

    const payment: Payment = {
        id,
        loan_id: loanId,
        amount,
        payment_type: paymentType,
        evidence_url: evidenceUrl,
        status,
        notes: notes || null,
        rejection_reason: null,
        created_by: createdBy,
        confirmed_by: confirmedBy,
        created_at: now,
        confirmed_at: confirmedAt
    };

    // Check if loan should be marked as returned (for personal loans)
    if (isPersonal) {
        checkAndUpdateLoanStatus(loanId);
    }

    return payment;
}

export function getPaymentsByLoanId(loanId: string): Payment[] {
    const stmt = db.prepare('SELECT * FROM payments WHERE loan_id = ? ORDER BY created_at DESC');
    return stmt.all(loanId) as Payment[];
}

export function getPaymentById(paymentId: string): Payment | null {
    const stmt = db.prepare('SELECT * FROM payments WHERE id = ?');
    return stmt.get(paymentId) as Payment | null;
}

export function confirmPayment(paymentId: string, confirmedBy: string): boolean {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
        UPDATE payments 
        SET status = 'confirmed', confirmed_by = ?, confirmed_at = ?
        WHERE id = ? AND status = 'pending'
    `);
    const result = stmt.run(confirmedBy, now, paymentId);

    if (result.changes > 0) {
        // Check if loan should be marked as returned
        const payment = getPaymentById(paymentId);
        if (payment) {
            checkAndUpdateLoanStatus(payment.loan_id);
        }
        return true;
    }
    return false;
}

export function rejectPayment(paymentId: string, rejectionReason: string): boolean {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
        UPDATE payments 
        SET status = 'rejected', rejection_reason = ?, confirmed_at = ?
        WHERE id = ? AND status = 'pending'
    `);
    const result = stmt.run(rejectionReason, now, paymentId);
    return result.changes > 0;
}

export function getLoanBalance(loanId: string): { total: number; paid: number; pending: number; balance: number } {
    const loan = getLoanById(loanId);
    if (!loan) {
        return { total: 0, paid: 0, pending: 0, balance: 0 };
    }

    const confirmedStmt = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM payments 
        WHERE loan_id = ? AND status = 'confirmed'
    `);
    const confirmedResult = confirmedStmt.get(loanId) as { total: number };
    const paid = confirmedResult.total;

    const pendingStmt = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM payments 
        WHERE loan_id = ? AND status = 'pending'
    `);
    const pendingResult = pendingStmt.get(loanId) as { total: number };
    const pending = pendingResult.total;

    const balance = loan.amount - paid;

    return {
        total: loan.amount,
        paid,
        pending,
        balance: balance > 0 ? balance : 0
    };
}

// Helper function to check if loan should be marked as returned
function checkAndUpdateLoanStatus(loanId: string): void {
    const balance = getLoanBalance(loanId);

    // If balance is 0 (all payments confirmed equal total), mark as returned
    if (balance.balance === 0 && balance.paid >= balance.total) {
        updateLoanStatus(loanId, 'returned');
    }
}

// ===== EXPENSE FUNCTIONS =====

export interface Expense {
    id: string;
    user_id: string;
    description: string;
    amount: number;
    category: string;
    expense_date: string;
    is_recurring: number;
    recurrence_day: number | null;
    created_at: string;
}

export function createExpense(
    id: string,
    userId: string,
    description: string,
    amount: number,
    category: string,
    expenseDate: string,
    isRecurring: boolean = false,
    recurrenceDay: number | null = null
): Expense {
    const now = new Date().toISOString();
    const isRecurringInt = isRecurring ? 1 : 0;
    const stmt = db.prepare(`
        INSERT INTO expenses (id, user_id, description, amount, category, expense_date, is_recurring, recurrence_day, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, userId, description, amount, category, expenseDate, isRecurringInt, recurrenceDay, now);

    return {
        id,
        user_id: userId,
        description,
        amount,
        category,
        expense_date: expenseDate,
        is_recurring: isRecurringInt,
        recurrence_day: recurrenceDay,
        created_at: now
    };
}

export function getExpensesByUserId(userId: string, year?: number, month?: number): Expense[] {
    let query = 'SELECT * FROM expenses WHERE user_id = ?';
    const params: any[] = [userId];

    if (year !== undefined) {
        query += ' AND strftime(\'%Y\', expense_date) = ?';
        params.push(year.toString());
    }

    if (month !== undefined) {
        query += ' AND strftime(\'%m\', expense_date) = ?';
        params.push(month.toString().padStart(2, '0'));
    }

    query += ' ORDER BY expense_date DESC, created_at DESC';

    const stmt = db.prepare(query);
    return stmt.all(...params) as Expense[];
}

export function updateExpense(
    expenseId: string,
    userId: string,
    updates: {
        description?: string;
        amount?: number;
        category?: string;
        expenseDate?: string;
        isRecurring?: boolean;
        recurrenceDay?: number | null;
    }
): boolean {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.description !== undefined) {
        fields.push('description = ?');
        values.push(updates.description);
    }
    if (updates.amount !== undefined) {
        fields.push('amount = ?');
        values.push(updates.amount);
    }
    if (updates.category !== undefined) {
        fields.push('category = ?');
        values.push(updates.category);
    }
    if (updates.expenseDate !== undefined) {
        fields.push('expense_date = ?');
        values.push(updates.expenseDate);
    }
    if (updates.isRecurring !== undefined) {
        fields.push('is_recurring = ?');
        values.push(updates.isRecurring ? 1 : 0);
    }
    if (updates.recurrenceDay !== undefined) {
        fields.push('recurrence_day = ?');
        values.push(updates.recurrenceDay);
    }

    if (fields.length === 0) return false;

    values.push(expenseId, userId);

    const stmt = db.prepare(`UPDATE expenses SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`);
    const result = stmt.run(...values);

    return result.changes > 0;
}

export function deleteExpense(expenseId: string, userId: string): boolean {
    const stmt = db.prepare('DELETE FROM expenses WHERE id = ? AND user_id = ?');
    const result = stmt.run(expenseId, userId);
    return result.changes > 0;
}

export default db;
