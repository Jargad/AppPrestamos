// Redirect favicon.ico requests to favicon.svg
export async function GET() {
    return new Response(null, {
        status: 301,
        headers: {
            'Location': '/logo.svg'
        }
    });
}
