import type { APIRoute } from 'astro';
import {
    createContact as dbCreateContact,
    getContactsByUserId,
    getContactByEmail,
    updateContact as dbUpdateContact,
    deleteContact as dbDeleteContact
} from '../../../../db/index';

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

// GET - Get all contacts for current user
export const GET: APIRoute = async ({ cookies }) => {
    try {
        const session = getSession(cookies);
        if (!session) {
            return new Response(JSON.stringify({
                success: false,
                error: 'No autenticado'
            }), { status: 401 });
        }

        const contacts = getContactsByUserId(session.userId);

        return new Response(JSON.stringify({
            success: true,
            contacts
        }), { status: 200 });

    } catch (error: any) {
        console.error('Get contacts error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Error al obtener contactos'
        }), { status: 500 });
    }
};

// POST - Create new contact
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
        const { email, name, phone, notes } = body;

        // Validate input
        if (!email || !name) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Email y nombre son requeridos'
            }), { status: 400 });
        }

        // Check if contact already exists
        const existing = getContactByEmail(session.userId, email);
        if (existing) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Ya existe un contacto con este email'
            }), { status: 400 });
        }

        // Create contact
        const contact = dbCreateContact(session.userId, email, name, phone, notes);

        return new Response(JSON.stringify({
            success: true,
            contact
        }), { status: 201 });

    } catch (error: any) {
        console.error('Create contact error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Error al crear contacto'
        }), { status: 500 });
    }
};

// PUT - Update contact
export const PUT: APIRoute = async ({ request, cookies }) => {
    try {
        const session = getSession(cookies);
        if (!session) {
            return new Response(JSON.stringify({
                success: false,
                error: 'No autenticado'
            }), { status: 401 });
        }

        const body = await request.json();
        const { email, name, phone, notes } = body;

        if (!email) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Email es requerido'
            }), { status: 400 });
        }

        // Update contact
        const success = dbUpdateContact(session.userId, email, { name, phone, notes });

        if (!success) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Contacto no encontrado'
            }), { status: 404 });
        }

        return new Response(JSON.stringify({
            success: true
        }), { status: 200 });

    } catch (error: any) {
        console.error('Update contact error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Error al actualizar contacto'
        }), { status: 500 });
    }
};

// DELETE - Delete contact
export const DELETE: APIRoute = async ({ request, cookies }) => {
    try {
        const session = getSession(cookies);
        if (!session) {
            return new Response(JSON.stringify({
                success: false,
                error: 'No autenticado'
            }), { status: 401 });
        }

        const body = await request.json();
        const { email } = body;

        if (!email) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Email es requerido'
            }), { status: 400 });
        }

        // Delete contact
        const success = dbDeleteContact(session.userId, email);

        if (!success) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Contacto no encontrado'
            }), { status: 404 });
        }

        return new Response(JSON.stringify({
            success: true
        }), { status: 200 });

    } catch (error: any) {
        console.error('Delete contact error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Error al eliminar contacto'
        }), { status: 500 });
    }
};
