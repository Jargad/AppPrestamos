import type { APIRoute } from 'astro';
import { createUser, getUserByEmail, getUserByUsername } from '../../../../db/index';

// Simple hash function (same as before - NOT secure for production)
function hashPassword(password: string): string {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(36);
}

export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        const body = await request.json();
        const { username, email, password, phone } = body;

        // Validate input
        if (!username || !email || !password) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Todos los campos son requeridos'
            }), { status: 400 });
        }

        // Validate phone format if provided (optional)
        if (phone && !phone.match(/^\+[1-9]\d{1,14}$/)) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Formato de teléfono inválido. Use formato internacional: +573001234567'
            }), { status: 400 });
        }

        // Check if user already exists
        const existingEmail = getUserByEmail(email);
        if (existingEmail) {
            return new Response(JSON.stringify({
                success: false,
                error: 'El email ya está registrado'
            }), { status: 400 });
        }

        const existingUsername = getUserByUsername(username);
        if (existingUsername) {
            return new Response(JSON.stringify({
                success: false,
                error: 'El nombre de usuario ya está en uso'
            }), { status: 400 });
        }

        // Create user
        const userId = crypto.randomUUID();
        const hashedPassword = hashPassword(password);
        const user = createUser(userId, username, email, hashedPassword, phone);

        // Create session
        cookies.set('session', JSON.stringify({
            userId: user.id,
            username: user.username,
            email: user.email
        }), {
            path: '/',
            httpOnly: true,
            secure: import.meta.env.PROD,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30 // 30 days
        });

        return new Response(JSON.stringify({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        }), { status: 200 });

    } catch (error: any) {
        console.error('Register error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Error al registrar usuario'
        }), { status: 500 });
    }
};
