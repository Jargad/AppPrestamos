import twilio from 'twilio';

const accountSid = import.meta.env.TWILIO_ACCOUNT_SID;
const authToken = import.meta.env.TWILIO_AUTH_TOKEN;
const twilioWhatsAppNumber = import.meta.env.TWILIO_WHATSAPP_NUMBER; // ej: whatsapp:+14155238886

let twilioClient: ReturnType<typeof twilio> | null = null;

// Inicializar cliente de Twilio solo si las credenciales están configuradas
if (accountSid && authToken) {
    twilioClient = twilio(accountSid, authToken);
}

interface WhatsAppNotification {
    to: string; // Número de WhatsApp del destinatario (ej: +573001234567)
    message: string;
}

export async function sendWhatsAppNotification({ to, message }: WhatsAppNotification): Promise<{ success: boolean; error?: string }> {
    if (!twilioClient) {
        console.error('Twilio no está configurado. Verifica las variables de entorno.');
        return { success: false, error: 'Twilio no configurado' };
    }

    try {
        // Normalizar el número: quitar el prefijo whatsapp: si ya existe
        let normalizedTo = to.replace('whatsapp:', '').trim();

        // Asegurar que el número tenga el formato +[código país][número]
        if (!normalizedTo.startsWith('+')) {
            console.error('❌ Número de teléfono inválido. Debe empezar con +:', normalizedTo);
            return { success: false, error: 'Formato de número inválido. Debe empezar con +' };
        }

        const result = await twilioClient.messages.create({
            from: twilioWhatsAppNumber,
            to: `whatsapp:${normalizedTo}`,
            body: message
        });

        console.log('✅ WhatsApp enviado:', result.sid);
        return { success: true };
    } catch (error: any) {
        console.error('❌ Error enviando WhatsApp:', error);
        return { success: false, error: error.message };
    }
}

// Función para notificar sobre un nuevo préstamo
export async function notifyLoanInvitation({
    lenderName,
    borrowerPhone,
    borrowerName,
    amount,
    description,
    invitationUrl
}: {
    lenderName: string;
    borrowerPhone: string;
    borrowerName: string;
    amount: number;
    description: string;
    invitationUrl: string;
}): Promise<{ success: boolean; error?: string }> {
    const message = `
🏦 *Nuevo Préstamo*

Hola ${borrowerName},

${lenderName} te ha enviado una solicitud de préstamo:

💰 Monto: $${amount.toLocaleString('es-CO')}
📝 Descripción: ${description}

Para aceptar o rechazar esta solicitud, ingresa aquí:
${invitationUrl}

_Mensaje automático del Sistema de Gestión de Préstamos_
    `.trim();

    return sendWhatsAppNotification({
        to: borrowerPhone,
        message
    });
}

// Función para notificar sobre un pago registrado
export async function notifyPaymentRegistered({
    lenderPhone,
    lenderName,
    borrowerName,
    amount,
    loanAmount,
    paymentUrl
}: {
    lenderPhone: string;
    lenderName: string;
    borrowerName: string;
    amount: number;
    loanAmount: number;
    paymentUrl: string;
}): Promise<{ success: boolean; error?: string }> {
    const message = `
💳 *Nuevo Pago Registrado*

Hola ${lenderName},

${borrowerName} ha registrado un pago:

💰 Monto del pago: $${amount.toLocaleString('es-CO')}
📊 Préstamo total: $${loanAmount.toLocaleString('es-CO')}

Por favor, revisa y confirma el pago aquí:
${paymentUrl}

_Mensaje automático del Sistema de Gestión de Préstamos_
    `.trim();

    return sendWhatsAppNotification({
        to: lenderPhone,
        message
    });
}
