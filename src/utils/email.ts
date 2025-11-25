import { Resend } from 'resend';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export interface LoanInvitationData {
  lenderName: string;
  borrowerEmail: string;
  borrowerName: string;
  amount: number;
  description: string;
  invitationUrl: string;
}

export async function sendLoanInvitation(data: LoanInvitationData): Promise<{ success: boolean; error?: string }> {
  try {
    const { lenderName, borrowerEmail, borrowerName, amount, description, invitationUrl } = data;

    const formattedAmount = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              border-radius: 10px;
              padding: 30px;
              color: white;
            }
            .content {
              background: white;
              border-radius: 8px;
              padding: 30px;
              margin-top: 20px;
              color: #333;
            }
            .amount {
              font-size: 2em;
              font-weight: bold;
              color: #667eea;
              margin: 20px 0;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
              margin: 20px 0;
            }
            .details {
              background: #f5f5f5;
              padding: 15px;
              border-radius: 5px;
              margin: 15px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              font-size: 0.9em;
              color: rgba(255, 255, 255, 0.8);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 style="margin: 0;">💸 Solicitud de Préstamo</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Gestor de Préstamos</p>
            
            <div class="content">
              <h2>Hola ${borrowerName},</h2>
              <p><strong>${lenderName}</strong> te ha enviado una solicitud de préstamo.</p>
              
              <div class="amount">${formattedAmount}</div>
              
              <div class="details">
                <p><strong>Descripción:</strong></p>
                <p>${description}</p>
              </div>
              
              <p>Para aceptar o rechazar este préstamo, haz clic en el siguiente botón:</p>
              
              <a href="${invitationUrl}" class="button">
                Ver Solicitud de Préstamo
              </a>
              
              <p style="font-size: 0.9em; color: #666; margin-top: 30px;">
                Si no tienes una cuenta, podrás registrarte usando este email para ver y gestionar el préstamo.
              </p>
            </div>
            
            <div class="footer">
              <p>Este es un mensaje automático del Gestor de Préstamos</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const { data: emailData, error } = await resend.emails.send({
      from: 'Gestor de Préstamos <onboarding@resend.dev>', // Use your verified domain
      to: [borrowerEmail],
      subject: `💰 ${lenderName} te ha enviado una solicitud de préstamo`,
      html: emailHtml,
    });

    if (error) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Email sent successfully:', emailData);
    return { success: true };
  } catch (error: any) {
    console.error('Error in sendLoanInvitation:', error);
    return { success: false, error: error.message || 'Error desconocido al enviar email' };
  }
}

export interface PaymentNotificationData {
  lenderEmail: string;
  lenderName: string;
  borrowerName: string;
  loanAmount: number;
  paymentAmount: number;
  paymentType: 'partial' | 'full';
  loanId: string;
  notes?: string;
}

export async function sendPaymentNotification(data: PaymentNotificationData): Promise<{ success: boolean; error?: string }> {
  try {
    const { lenderEmail, lenderName, borrowerName, loanAmount, paymentAmount, paymentType, loanId, notes } = data;

    const formattedLoanAmount = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(loanAmount);

    const formattedPaymentAmount = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(paymentAmount);

    const paymentTypeText = paymentType === 'full' ? 'Pago Completo' : 'Abono Parcial';

    const appUrl = import.meta.env.APP_URL || 'http://localhost:4321';
    const loanUrl = `${appUrl}/loans/${loanId}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              border-radius: 10px;
              padding: 30px;
              color: white;
            }
            .content {
              background: white;
              border-radius: 8px;
              padding: 30px;
              margin-top: 20px;
              color: #333;
            }
            .amount {
              font-size: 2em;
              font-weight: bold;
              color: #667eea;
              margin: 20px 0;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
              margin: 20px 0;
            }
            .details {
              background: #f5f5f5;
              padding: 15px;
              border-radius: 5px;
              margin: 15px 0;
            }
            .badge {
              display: inline-block;
              background: #22c55e;
              color: white;
              padding: 5px 15px;
              border-radius: 20px;
              font-size: 0.9em;
              font-weight: bold;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              font-size: 0.9em;
              color: rgba(255, 255, 255, 0.8);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 style="margin: 0;">💳 Nuevo Pago Registrado</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Gestor de Préstamos</p>
            
            <div class="content">
              <h2>Hola ${lenderName},</h2>
              <p><strong>${borrowerName}</strong> ha registrado un pago para su préstamo.</p>
              
              <div class="badge">${paymentTypeText}</div>
              
              <div class="amount">${formattedPaymentAmount}</div>
              
              <div class="details">
                <p><strong>Detalles del Préstamo:</strong></p>
                <p>Monto total del préstamo: <strong>${formattedLoanAmount}</strong></p>
                <p>Tipo de pago: <strong>${paymentTypeText}</strong></p>
                ${notes ? `<p>Notas: ${notes}</p>` : ''}
              </div>
              
              <p>Por favor, revisa el pago y la evidencia adjunta para confirmar o rechazar esta transacción.</p>
              
              <a href="${loanUrl}" class="button">
                Ver Pago y Evidencia
              </a>
              
              <p style="font-size: 0.9em; color: #666; margin-top: 30px;">
                Es importante que revises la evidencia de pago antes de confirmar la transacción.
              </p>
            </div>
            
            <div class="footer">
              <p>Este es un mensaje automático del Gestor de Préstamos</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const { data: emailData, error } = await resend.emails.send({
      from: 'Gestor de Préstamos <onboarding@resend.dev>', // Use your verified domain
      to: [lenderEmail],
      subject: `💳 ${borrowerName} ha registrado un pago de ${formattedPaymentAmount}`,
      html: emailHtml,
    });

    if (error) {
      console.error('Error sending payment notification:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Payment notification sent successfully:', emailData);
    return { success: true };
  } catch (error: any) {
    console.error('Error in sendPaymentNotification:', error);
    return { success: false, error: error.message || 'Error desconocido al enviar email' };
  }
}
