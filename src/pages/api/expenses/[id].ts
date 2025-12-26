import type { APIRoute } from 'astro';
import { deleteExpense, updateExpense } from '../../../../db/index.js';

export const PUT: APIRoute = async ({ params, request, cookies }) => {
    try {
        // Check authentication
        const sessionCookie = cookies.get('session');
        if (!sessionCookie) {
            return new Response(JSON.stringify({ success: false, error: 'No autenticado' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        let session;
        try {
            session = JSON.parse(sessionCookie.value);
        } catch {
            return new Response(JSON.stringify({ success: false, error: 'Sesión inválida' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const expenseId = params.id;
        if (!expenseId) {
            return new Response(JSON.stringify({ success: false, error: 'ID de gasto no proporcionado' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Parse request body
        const body = await request.json();
        const updates: any = {};

        if (body.description !== undefined) updates.description = body.description;
        if (body.amount !== undefined) {
            const amountNum = parseFloat(body.amount);
            if (isNaN(amountNum) || amountNum <= 0) {
                return new Response(JSON.stringify({ success: false, error: 'Monto inválido' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            updates.amount = amountNum;
        }
        if (body.category !== undefined) updates.category = body.category;
        if (body.expenseDate !== undefined) updates.expenseDate = body.expenseDate;
        if (body.isRecurring !== undefined) {
            updates.isRecurring = body.isRecurring;
            if (body.isRecurring && body.recurrenceDay !== undefined) {
                const recurrenceDayNum = parseInt(body.recurrenceDay);
                if (isNaN(recurrenceDayNum) || recurrenceDayNum < 1 || recurrenceDayNum > 31) {
                    return new Response(JSON.stringify({ success: false, error: 'Día de recurrencia debe estar entre 1 y 31' }), {
                        status: 400,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
                updates.recurrenceDay = recurrenceDayNum;
            } else if (!body.isRecurring) {
                updates.recurrenceDay = null;
            }
        }

        // Update expense
        const updated = updateExpense(expenseId, session.userId, updates);

        if (!updated) {
            return new Response(JSON.stringify({ success: false, error: 'Gasto no encontrado o no autorizado' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error updating expense:', error);
        return new Response(JSON.stringify({ success: false, error: 'Error al actualizar gasto' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

export const DELETE: APIRoute = async ({ params, cookies }) => {
    try {
        // Check authentication
        const sessionCookie = cookies.get('session');
        if (!sessionCookie) {
            return new Response(JSON.stringify({ success: false, error: 'No autenticado' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        let session;
        try {
            session = JSON.parse(sessionCookie.value);
        } catch {
            return new Response(JSON.stringify({ success: false, error: 'Sesión inválida' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const expenseId = params.id;
        if (!expenseId) {
            return new Response(JSON.stringify({ success: false, error: 'ID de gasto no proporcionado' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Delete expense (only if it belongs to the user)
        const deleted = deleteExpense(expenseId, session.userId);

        if (!deleted) {
            return new Response(JSON.stringify({ success: false, error: 'Gasto no encontrado o no autorizado' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error deleting expense:', error);
        return new Response(JSON.stringify({ success: false, error: 'Error al eliminar gasto' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
