import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

// Configuration SMTP — valeurs issues UNIQUEMENT de .env (aucune valeur par défaut codée)
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
const SMTP_SECURE = String(process.env.SMTP_SECURE).toLowerCase() === 'true';

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }
  return transporter;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  bcc?: string;
  attachments?: EmailAttachment[];
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  if (!SMTP_HOST) {
    console.warn('[EMAIL] SMTP non configuré. Email non envoyé à', options.to);
    return;
  }

  try {
    const from = process.env.SMTP_FROM;
    await getTransporter().sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      bcc: options.bcc,
      attachments: options.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });
    console.log('[EMAIL] Envoyé à', options.to, options.bcc ? ` (BCC: ${options.bcc})` : '', ':', options.subject);
  } catch (error) {
    console.error('[EMAIL] Erreur d\'envoi à', options.to, ':', error);
  }
}
