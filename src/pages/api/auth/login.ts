import type { APIRoute } from 'astro';
import { getUserByEmail } from '../../../../db/index';

// Simple hash function (same as before)
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
        const { email, password } = body;

        // Validate input
        if (!email || !password) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Email y contraseña son requeridos'
            }), { status: 400 });
        }

        // Find user
        const user = getUserByEmail(email);
        if (!user) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Email o contraseña incorrectos'
            }), { status: 401 });
        }

        // Verify password
        const hashedPassword = hashPassword(password);
        if (user.password !== hashedPassword) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Email o contraseña incorrectos'
            }), { status: 401 });
        }

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
        console.error('Login error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Error al iniciar sesión'
        }), { status: 500 });
    }
};
