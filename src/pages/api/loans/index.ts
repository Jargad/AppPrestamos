import type { APIRoute } from 'astro';
import {
    createLoan as dbCreateLoan,
    getLoansAsLender,
    getLoansAsBorrower,
    getPendingLoansForEmail,
    getUserById,
    getContactByEmail,
    createContact,
    getPaymentsByLoanId
} from '../../../../db/index';
import { sendLoanInvitation } from '../../../utils/email';
import { notifyLoanInvitation } from '../../../utils/whatsapp';

// Helper to get session
function getSession(cookies: any) {
    const sessionCookie = cookies.get('session');
    if (!sessionCookie) return null;
    try {
        return JSON.parse(sessionCookie.value);
    } catch {
        return null;
    }
}

export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        const session = getSession(cookies);
        if (!session) {
            return new Response(JSON.stringify({
                success: false,
                error: 'No autenticado'
            }), { status: 401 });
        }

        const body = await request.json();
        const { borrowerEmail, borrowerName, borrowerPhone, amount, description, isPersonal } = body;

        // Validate input
        if (!amount || !description) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Monto y descripción son requeridos'
            }), { status: 400 });
        }

        // For personal loans, borrowerEmail and borrowerName are optional
        if (!isPersonal && (!borrowerEmail || !borrowerName)) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Email y nombre del prestatario son requeridos para préstamos con contacto'
            }), { status: 400 });
        }

        // Create loan
        const loanId = crypto.randomUUID();
        const invitationToken = crypto.randomUUID();

        const loan = dbCreateLoan(
            loanId,
            session.userId,
            borrowerEmail || session.email,
            borrowerName || 'Préstamo Personal',
            amount,
            description,
            invitationToken,
            isPersonal || false
        );

        // Skip contact creation and notifications for personal loans
        if (isPersonal) {
            return new Response(JSON.stringify({
                success: true,
                loan,
                notificationSent: false,
                notificationMethod: 'none'
            }), { status: 201 });
        }

        // Add borrower as contact for lender (if not already)
        const existingContact = getContactByEmail(session.userId, borrowerEmail);
        if (!existingContact) {
            try {
                createContact(session.userId, borrowerEmail, borrowerName, borrowerPhone);
            } catch (error) {
                console.error('Error creating contact:', error);
                // Don't fail loan creation if contact creation fails
            }
        }

        // Get lender info
        const lender = getUserById(session.userId);
        if (!lender) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Usuario no encontrado'
            }), { status: 404 });
        }

        const appUrl = import.meta.env.APP_URL || 'http://localhost:4321';
        const invitationUrl = `${appUrl}/invitation/${invitationToken}`;

        let notificationSent = false;
        let notificationMethod = 'none';

        // Try WhatsApp first if phone is provided
        if (borrowerPhone) {
            const whatsappResult = await notifyLoanInvitation({
                lenderName: lender.username,
                borrowerPhone,
                borrowerName,
                amount,
                description,
                invitationUrl
            });

            if (whatsappResult.success) {
                notificationSent = true;
                notificationMethod = 'whatsapp';
                console.log('✅ WhatsApp notification sent successfully');
            } else {
                console.error('❌ WhatsApp notification failed:', whatsappResult.error);
            }
        }

        // Fallback to email if WhatsApp failed or no phone provided
        if (!notificationSent) {
            const emailResult = await sendLoanInvitation({
                lenderName: lender.username,
                borrowerEmail,
                borrowerName,
                amount,
                description,
                invitationUrl
            });

            if (emailResult.success) {
                notificationSent = true;
                notificationMethod = 'email';
                console.log('✅ Email notification sent successfully');
            } else {
                console.error('❌ Email notification failed:', emailResult.error);
            }
        }

        return new Response(JSON.stringify({
            success: true,
            loan,
            notificationSent,
            notificationMethod
        }), { status: 201 });

    } catch (error: any) {
        console.error('Create loan error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Error al crear préstamo'
        }), { status: 500 });
    }
};

export const GET: APIRoute = async ({ cookies }) => {
    try {
        const session = getSession(cookies);
        if (!session) {
            return new Response(JSON.stringify({
                success: false,
                error: 'No autenticado'
            }), { status: 401 });
        }

        // Get loans where user is lender
        const loansAsLender = getLoansAsLender(session.userId);

        // Get loans where user is borrower
        const loansAsBorrower = getLoansAsBorrower(session.userId);

        // Get pending loans for user's email (not yet accepted)
        const pendingLoans = getPendingLoansForEmail(session.email);

        // Add pending payments count to lender loans
        const loansAsLenderWithPayments = loansAsLender.map(loan => {
            const payments = getPaymentsByLoanId(loan.id);
            const pendingPaymentsCount = payments.filter(p => p.status === 'pending').length;
            return {
                ...loan,
                pendingPaymentsCount
            };
        });

        return new Response(JSON.stringify({
            success: true,
            loansAsLender: loansAsLenderWithPayments,
            loansAsBorrower,
            pendingLoans
        }), { status: 200 });

    } catch (error: any) {
        console.error('Get loans error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Error al obtener préstamos'
        }), { status: 500 });
    }
};
