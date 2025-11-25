import type { APIRoute } from 'astro';
import { getLoanById, updateLoanStatus } from '../../../../../db/index';

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

        // Verify user is the lender (only lender can mark as returned)
        if (loan.lender_id !== session.userId) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Solo el prestamista puede marcar el préstamo como devuelto'
            }), { status: 403 });
        }

        // Verify loan is in accepted status
        if (loan.status !== 'accepted') {
            return new Response(JSON.stringify({
                success: false,
                error: 'Solo se pueden marcar como devueltos los préstamos aceptados'
            }), { status: 400 });
        }

        // Mark as returned
        const success = updateLoanStatus(loanId, 'returned');
        if (!success) {
            return new Response(JSON.stringify({
                success: false,
                error: 'No se pudo marcar el préstamo como devuelto'
            }), { status: 400 });
        }

        return new Response(JSON.stringify({
            success: true
        }), { status: 200 });

    } catch (error: any) {
        console.error('Mark as returned error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Error al marcar préstamo como devuelto'
        }), { status: 500 });
    }
};
