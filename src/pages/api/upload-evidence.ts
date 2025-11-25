import type { APIRoute } from 'astro';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
    cloud_name: import.meta.env.CLOUDINARY_CLOUD_NAME,
    api_key: import.meta.env.CLOUDINARY_API_KEY,
    api_secret: import.meta.env.CLOUDINARY_API_SECRET
});

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

export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        const session = getSession(cookies);
        if (!session) {
            return new Response(JSON.stringify({
                success: false,
                error: 'No autenticado'
            }), { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('evidence') as File;

        if (!file) {
            return new Response(JSON.stringify({
                success: false,
                error: 'No se proporcionó archivo'
            }), { status: 400 });
        }

        // Validate file type (images only)
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Tipo de archivo no válido. Solo se permiten imágenes (JPG, PNG, GIF, WEBP)'
            }), { status: 400 });
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            return new Response(JSON.stringify({
                success: false,
                error: 'El archivo es demasiado grande. Máximo 5MB'
            }), { status: 400 });
        }

        // Convert file to base64
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');
        const dataURI = `data:${file.type};base64,${base64}`;

        // Upload to Cloudinary
        const uploadResult = await cloudinary.uploader.upload(dataURI, {
            folder: 'loan-evidence',
            resource_type: 'image',
            transformation: [
                { width: 1200, height: 1200, crop: 'limit' }, // Limit max size
                { quality: 'auto' } // Auto quality optimization
            ]
        });

        return new Response(JSON.stringify({
            success: true,
            url: uploadResult.secure_url,
            publicId: uploadResult.public_id
        }), { status: 200 });

    } catch (error: any) {
        console.error('Upload error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Error al subir archivo'
        }), { status: 500 });
    }
};
