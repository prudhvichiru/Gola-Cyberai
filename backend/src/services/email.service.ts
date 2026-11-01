import nodemailer, { type Transporter } from 'nodemailer';

export interface WelcomeEmailPayload {
  to: string;
  fullName: string;
  employeeId: string;
  role: string;
  departmentName: string;
  designationTitle: string;
  password: string;
  hiredAt?: string;
  frontendUrl?: string;
}

export class EmailService {
  private static transporter: Transporter | null = null;

  private static getTransporter(): Transporter {
    if (!this.transporter) {
      const host = process.env.SMTP_HOST;
      const port = Number(process.env.SMTP_PORT) || 587;
      const user = process.env.SMTP_USER || process.env.SMTP_EMAIL;
      const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;

      if (host && user && pass) {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
        });
      } else {
        // Fallback transport that logs output to console safely
        this.transporter = nodemailer.createTransport({
          streamTransport: true,
          newline: 'windows',
          buffer: true,
        });
      }
    }
    return this.transporter;
  }

  static async sendWelcomeCredentialsEmail(payload: WelcomeEmailPayload): Promise<{ success: boolean; previewUrl?: string; message: string }> {
    const {
      to,
      fullName,
      employeeId,
      role,
      departmentName,
      designationTitle,
      password,
      hiredAt,
      frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000',
    } = payload;

    const formattedRole = role.charAt(0).toUpperCase() + role.slice(1);
    const loginPortalUrl = role === 'admin' ? `${frontendUrl}/admin` : `${frontendUrl}/sign-in`;
    const fromAddress = process.env.EMAIL_FROM || '"Gola CyberAI Operations" <golacyberai@gmail.com>';

    let roleInstruction = '';
    if (role === 'admin') {
      roleInstruction = 'Please use the dedicated <strong>Admin Login Console</strong> to sign in.';
    } else if (role === 'manager') {
      roleInstruction = 'On the sign in page, select the <strong>Manager</strong> tab, then enter your credentials.';
    } else if (role === 'hr') {
      roleInstruction = 'On the sign in page, select the <strong>HR</strong> tab, then enter your credentials.';
    } else {
      roleInstruction = 'On the sign in page, select the <strong>Employee</strong> tab, then enter your credentials.';
    }

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Welcome to Gola CyberAI</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .logo-text { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }
    .logo-badge { font-size: 10px; font-weight: 700; letter-spacing: 2px; color: #60a5fa; text-transform: uppercase; margin-top: 4px; }
    .content { padding: 32px 28px; }
    .greeting { font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0; }
    .message { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
    .card-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-top: 0; margin-bottom: 14px; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; }
    .info-row:last-child { margin-bottom: 0; }
    .info-label { color: #64748b; font-weight: 500; }
    .info-value { color: #0f172a; font-weight: 600; text-align: right; }
    .creds-card { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
    .creds-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #1d4ed8; margin-top: 0; margin-bottom: 14px; }
    .cred-box { background: #ffffff; border: 1px dashed #93c5fd; border-radius: 8px; padding: 12px; margin-bottom: 8px; font-family: monospace; font-size: 13px; }
    .button-wrapper { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; padding: 12px 32px; border-radius: 10px; font-size: 14px; font-weight: 600; box-shadow: 0 4px 12px rgba(37,99,235,0.25); }
    .role-note { font-size: 12px; color: #475569; background: #f1f5f9; padding: 10px 14px; border-radius: 8px; margin-bottom: 20px; border-left: 3px solid #2563eb; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo-text">GOLA CyberAI</h1>
      <div class="logo-badge">Enterprise Employee Management Platform</div>
    </div>
    <div class="content">
      <h2 class="greeting">🎉 Congratulations & Welcome, ${fullName}!</h2>
      <p class="message">
        We are thrilled to welcome you to the <strong>Gola CyberAI</strong> enterprise workspace. Your official staff profile has been verified and provisioned by the system administrator.
      </p>

      <div class="card">
        <h3 class="card-title">Employee Information</h3>
        <div class="info-row">
          <span class="info-label">Employee ID:</span>
          <span class="info-value" style="font-family: monospace; color: #2563eb;">${employeeId}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Assigned Role:</span>
          <span class="info-value">${formattedRole}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Department:</span>
          <span class="info-value">${departmentName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Designation:</span>
          <span class="info-value">${designationTitle}</span>
        </div>
        ${hiredAt ? `
        <div class="info-row">
          <span class="info-label">Effective Date:</span>
          <span class="info-value">${hiredAt}</span>
        </div>` : ''}
      </div>

      <div class="creds-card">
        <h3 class="creds-title">🔑 Your Secure Login Credentials</h3>
        <div class="cred-box">
          <strong>Email:</strong> ${to}
        </div>
        <div class="cred-box">
          <strong>Password:</strong> <span style="color: #2563eb; font-weight: bold;">${password}</span>
        </div>
      </div>

      <div class="role-note">
        <strong>Sign-in Guidance:</strong> ${roleInstruction}
      </div>

      <div class="button-wrapper">
        <a href="${loginPortalUrl}" class="btn">Sign In to Gola CyberAI &rarr;</a>
      </div>

      <p class="message" style="font-size: 12px; color: #64748b;">
        🔒 <em>Security notice: For enterprise cybersecurity compliance, please update your temporary password immediately upon your first sign in via your Settings &gt; Security portal.</em>
      </p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Gola CyberAI Platform. All rights reserved.<br>
      Identity & Access Management (IAM) Operations.
    </div>
  </div>
</body>
</html>
`;

    try {
      const transporter = this.getTransporter();
      const mailOptions = {
        from: fromAddress,
        to,
        subject: `🎉 Welcome to Gola CyberAI — Your Workspace Login Credentials [${formattedRole}]`,
        html: htmlContent,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`[EmailService] Welcome email sent to ${to} (${employeeId}). MessageID: ${info.messageId}`);
      return {
        success: true,
        message: `Welcome credentials email dispatched successfully to ${to}`,
      };
    } catch (err: any) {
      console.error(`[EmailService] Failed to send email to ${to}:`, err.message);
      return {
        success: false,
        message: `Email sending encountered an issue: ${err.message}`,
      };
    }
  }
}
