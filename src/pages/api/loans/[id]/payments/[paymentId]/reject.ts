import type { APIRoute } from 'astro';
import {
    getLoanById,
    getPaymentById,
    rejectPayment
} from '../../../../../../../db/index';

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

export const POST: APIRoute = async ({ params, request, cookies }) => {
    try {
        const session = getSession(cookies);
        if (!session) {
            return new Response(JSON.stringify({
                success: false,
                error: 'No autenticado'
            }), { status: 401 });
        }

        const { id: loanId, paymentId } = params;
        if (!loanId || !paymentId) {
            return new Response(JSON.stringify({
                success: false,
                error: 'IDs requeridos'
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

        // Verify user is the lender
        if (loan.lender_id !== session.userId) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Solo el prestamista puede rechazar pagos'
            }), { status: 403 });
        }

        // Get payment
        const payment = getPaymentById(paymentId);
        if (!payment) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Pago no encontrado'
            }), { status: 404 });
        }

        // Verify payment belongs to this loan
        if (payment.loan_id !== loanId) {
            return new Response(JSON.stringify({
                success: false,
                error: 'El pago no pertenece a este préstamo'
            }), { status: 400 });
        }

        const body = await request.json();
        const { reason } = body;

        if (!reason) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Debe proporcionar una razón para rechazar'
            }), { status: 400 });
        }

        // Reject payment
        const success = rejectPayment(paymentId, reason);
        if (!success) {
            return new Response(JSON.stringify({
                success: false,
                error: 'No se pudo rechazar el pago'
            }), { status: 400 });
        }

        return new Response(JSON.stringify({
            success: true
        }), { status: 200 });

    } catch (error: any) {
        console.error('Reject payment error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Error al rechazar pago'
        }), { status: 500 });
    }
};
