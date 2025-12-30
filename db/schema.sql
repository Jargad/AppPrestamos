-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
    email TEXT NOT NULL,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (email, user_id),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Loans table
CREATE TABLE IF NOT EXISTS loans (
    id TEXT PRIMARY KEY,
    lender_id TEXT NOT NULL,
    borrower_email TEXT NOT NULL,
    borrower_id TEXT,
    borrower_name TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL CHECK (
        status IN (
            'pending',
            'accepted',
            'rejected',
            'returned',
            'edit-pending'
        )
    ),
    evidence TEXT,
    invitation_token TEXT UNIQUE,
    is_personal INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (lender_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (borrower_id) REFERENCES users (id) ON DELETE SET NULL
);

-- Loan edit history (for edit-pending status)
CREATE TABLE IF NOT EXISTS loan_edits (
    id TEXT PRIMARY KEY,
    loan_id TEXT NOT NULL,
    original_amount REAL NOT NULL,
    original_description TEXT NOT NULL,
    new_amount REAL NOT NULL,
    new_description TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (loan_id) REFERENCES loans (id) ON DELETE CASCADE
);

-- Payments table (for partial and full payments)
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    loan_id TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_type TEXT NOT NULL CHECK (
        payment_type IN ('partial', 'full')
    ),
    evidence_url TEXT,
    status TEXT NOT NULL CHECK (
        status IN (
            'pending',
            'confirmed',
            'rejected'
        )
    ),
    notes TEXT,
    rejection_reason TEXT,
    created_by TEXT NOT NULL,
    confirmed_by TEXT,
    created_at TEXT NOT NULL,
    confirmed_at TEXT,
    FOREIGN KEY (loan_id) REFERENCES loans (id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (confirmed_by) REFERENCES users (id) ON DELETE SET NULL
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_loans_lender ON loans (lender_id);

CREATE INDEX IF NOT EXISTS idx_loans_borrower ON loans (borrower_id);

CREATE INDEX IF NOT EXISTS idx_loans_borrower_email ON loans (borrower_email);

CREATE INDEX IF NOT EXISTS idx_loans_status ON loans (status);

CREATE INDEX IF NOT EXISTS idx_loans_token ON loans (invitation_token);

CREATE INDEX IF NOT EXISTS idx_loans_is_personal ON loans (is_personal);

CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts (user_id);

CREATE INDEX IF NOT EXISTS idx_payments_loan ON payments (loan_id);

CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);