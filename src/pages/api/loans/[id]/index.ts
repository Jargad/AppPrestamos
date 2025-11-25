import type { APIRoute } from 'astro';
import { getLoanById, deleteLoan } from '../../../../../db/index';

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

export const DELETE: APIRoute = async ({ params, cookies }) => {
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

        // Verify user is the lender (only lender can delete)
        if (loan.lender_id !== session.userId) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Solo el prestamista puede eliminar el préstamo'
            }), { status: 403 });
        }

        // Only allow deletion of pending or rejected loans
        if (loan.status !== 'pending' && loan.status !== 'rejected') {
            return new Response(JSON.stringify({
                success: false,
                error: 'Solo se pueden eliminar préstamos pendientes o rechazados'
            }), { status: 400 });
        }

        // Delete loan
        const success = deleteLoan(loanId);
        if (!success) {
            return new Response(JSON.stringify({
                success: false,
                error: 'No se pudo eliminar el préstamo'
            }), { status: 400 });
        }

        return new Response(JSON.stringify({
            success: true
        }), { status: 200 });

    } catch (error: any) {
        console.error('Delete loan error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Error al eliminar préstamo'
        }), { status: 500 });
    }
};
