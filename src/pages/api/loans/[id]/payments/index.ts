import type { APIRoute } from 'astro';
import {
    getLoanById,
    getPaymentsByLoanId,
    createPayment,
    getLoanBalance,
    getUserById
} from '@db/index';
import { sendPaymentNotification } from '../../../../../utils/email';

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

// GET - Get all payments for a loan
export const GET: APIRoute = async ({ params, cookies }) => {
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

        // Verify user is lender or borrower
        if (loan.lender_id !== session.userId && loan.borrower_id !== session.userId) {
            return new Response(JSON.stringify({
                success: false,
                error: 'No tienes permiso para ver estos pagos'
            }), { status: 403 });
        }

        const payments = getPaymentsByLoanId(loanId);
        const balance = getLoanBalance(loanId);

        return new Response(JSON.stringify({
            success: true,
            payments,
            balance
        }), { status: 200 });

    } catch (error: any) {
        console.error('Get payments error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Error al obtener pagos'
        }), { status: 500 });
    }
};

// POST - Create new payment
export const POST: APIRoute = async ({ params, request, cookies }) => {
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
        if (loan.borrower_id !== session.userId) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Solo el prestatario puede registrar pagos'
            }), { status: 403 });
        }

        // Verify loan is accepted
        if (loan.status !== 'accepted') {
            return new Response(JSON.stringify({
                success: false,
                error: 'Solo se pueden registrar pagos en préstamos aceptados'
            }), { status: 400 });
        }

        const body = await request.json();
        const { amount, paymentType, evidenceUrl, notes } = body;

        // Validate input
        if (!amount || !paymentType || !evidenceUrl) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Monto, tipo de pago y evidencia son requeridos'
            }), { status: 400 });
        }

        // Validate payment type
        if (paymentType !== 'partial' && paymentType !== 'full') {
            return new Response(JSON.stringify({
                success: false,
                error: 'Tipo de pago inválido'
            }), { status: 400 });
        }

        // Get current balance
        const balance = getLoanBalance(loanId);

        // Validate amount doesn't exceed balance
        if (amount > balance.balance) {
            return new Response(JSON.stringify({
                success: false,
                error: `El monto excede el saldo pendiente (${balance.balance})`
            }), { status: 400 });
        }

        // Create payment
        const paymentId = crypto.randomUUID();
        const payment = createPayment(
            paymentId,
            loanId,
            amount,
            paymentType,
            evidenceUrl,
            session.userId,
            notes
        );

        // Send email notification to lender
        const lender = getUserById(loan.lender_id);
        if (lender) {
            const emailResult = await sendPaymentNotification({
                lenderEmail: lender.email,
                lenderName: lender.username,
                borrowerName: session.username,
                loanAmount: loan.amount,
                paymentAmount: amount,
                paymentType,
                loanId,
                notes
            });

            if (!emailResult.success) {
                console.error('Failed to send payment notification:', emailResult.error);
                // Don't fail the payment creation, just log the error
            }
        }

        return new Response(JSON.stringify({
            success: true,
            payment
        }), { status: 201 });

    } catch (error: any) {
        console.error('Create payment error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Error al crear pago'
        }), { status: 500 });
    }
};
