import type { APIRoute } from 'astro';
import db from '../../../../db/index';

// ⚠️ IMPORTANTE: Protege esta ruta con autenticación de admin
// Solo para desarrollo/debugging

function getSession(cookies: any) {
    const sessionCookie = cookies.get('session');
    if (!sessionCookie) return null;
    try {
        return JSON.parse(sessionCookie.value);
    } catch {
        return null;
    }
}

// Ejecutar consultas SQL personalizadas (solo para admin)
export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        const session = getSession(cookies);
        if (!session) {
            return new Response(JSON.stringify({
                success: false,
                error: 'No autenticado'
            }), { status: 401 });
        }

        // ⚠️ AGREGAR VERIFICACIÓN DE ADMIN AQUÍ
        // Por ejemplo: if (session.email !== 'admin@tudominio.com') { return 403; }

        const { query } = await request.json();

        if (!query) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Query requerido'
            }), { status: 400 });
        }

        // Ejecutar query
        let result;
        if (query.trim().toUpperCase().startsWith('SELECT')) {
            // Query de lectura
            const stmt = db.prepare(query);
            result = stmt.all();
        } else {
            // Query de escritura (INSERT, UPDATE, DELETE)
            const stmt = db.prepare(query);
            const info = stmt.run();
            result = { changes: info.changes, lastInsertRowid: info.lastInsertRowid };
        }

        return new Response(JSON.stringify({
            success: true,
            result
        }), { status: 200 });

    } catch (error: any) {
        console.error('Admin query error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), { status: 500 });
    }
};
