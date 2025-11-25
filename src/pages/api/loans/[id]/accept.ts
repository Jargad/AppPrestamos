import type { APIRoute } from 'astro';
import {
    getLoanById,
    acceptLoan,
    getUserById,
    getContactByEmail,
    createContact
} from '../../../../../db/index';

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

export const POST: APIRoute = async ({ params, cookies }) => {
    try {
        const session = getSession(cookies);
        if (!session) {
            return new Response(JSON.stringify({
                success: false,
                error: 'No autenticado'
            }), { status: 401 });
        }

        const loanId = params.id;
        if (!loanId) {
            return new Response(JSON.stringify({
                success: false,
                error: 'ID de préstamo requerido'
            }), { status: 400 });
        }

        // Get loan
        const loan = getLoanById(loanId);
        if (!loan) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Préstamo no encontrado'
            }), { status: 404 });
        }

        // Verify user is the borrower
        if (loan.borrower_email.toLowerCase() !== session.email.toLowerCase()) {
            return new Response(JSON.stringify({
                success: false,
                error: 'No tienes permiso para aceptar este préstamo'
            }), { status: 403 });
        }

        // Accept loan
        const success = acceptLoan(loanId, session.userId);
        if (!success) {
            return new Response(JSON.stringify({
                success: false,
                error: 'No se pudo aceptar el préstamo'
            }), { status: 400 });
        }

        // Add lender as contact for borrower (if not already)
        const lender = getUserById(loan.lender_id);
        if (lender) {
            const existingContact = getContactByEmail(session.userId, lender.email);
            if (!existingContact) {
                try {
                    createContact(session.userId, lender.email, lender.username);
                } catch (error) {
                    console.error('Error creating contact:', error);
                    // Don't fail if contact creation fails
                }
            }
        }

        return new Response(JSON.stringify({
            success: true
        }), { status: 200 });

    } catch (error: any) {
        console.error('Accept loan error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Error al aceptar préstamo'
        }), { status: 500 });
    }
};
