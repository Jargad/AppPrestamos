import type { APIRoute } from 'astro';
import { createExpense, getExpensesByUserId } from '../../../../db/index.js';
import { nanoid } from 'nanoid';

export const GET: APIRoute = async ({ request, cookies }) => {
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

        // Get query parameters for filtering
        const url = new URL(request.url);
        const year = url.searchParams.get('year');
        const month = url.searchParams.get('month');

        // Get expenses
        const expenses = getExpensesByUserId(
            session.userId,
            year ? parseInt(year) : undefined,
            month ? parseInt(month) : undefined
        );

        return new Response(JSON.stringify({ success: true, expenses }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error fetching expenses:', error);
        return new Response(JSON.stringify({ success: false, error: 'Error al obtener gastos' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

export const POST: APIRoute = async ({ request, cookies }) => {
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

        // Parse request body
        const body = await request.json();
        const { description, amount, category, expenseDate, isRecurring, recurrenceDay } = body;

        // Validate required fields
        if (!description || !amount || !category || !expenseDate) {
            return new Response(JSON.stringify({ success: false, error: 'Faltan campos requeridos' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate amount
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            return new Response(JSON.stringify({ success: false, error: 'Monto inválido' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate recurrence day if recurring
        let recurrenceDayNum: number | null = null;
        if (isRecurring) {
            if (!recurrenceDay) {
                return new Response(JSON.stringify({ success: false, error: 'Día de recurrencia requerido para gastos recurrentes' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            recurrenceDayNum = parseInt(recurrenceDay);
            if (isNaN(recurrenceDayNum) || recurrenceDayNum < 1 || recurrenceDayNum > 31) {
                return new Response(JSON.stringify({ success: false, error: 'Día de recurrencia debe estar entre 1 y 31' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        // Create expense
        const expense = createExpense(
            nanoid(),
            session.userId,
            description,
            amountNum,
            category,
            expenseDate,
            !!isRecurring,
            recurrenceDayNum
        );

        return new Response(JSON.stringify({ success: true, expense }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error creating expense:', error);
        return new Response(JSON.stringify({ success: false, error: 'Error al crear gasto' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
