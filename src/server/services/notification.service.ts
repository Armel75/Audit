export interface INotificationProvider {
  send(to: string, subject: string, body: string): Promise<boolean>;
}

export class EmailProvider implements INotificationProvider {
  async send(to: string, subject: string, body: string): Promise<boolean> {
    console.log(`[EMAIL] Sending to ${to}...`);
    console.log(`[EMAIL] Subject: ${subject}`);
    // In production, integrate with SendGrid, SMTP, etc.
    return true;
  }
}

export class SmsProvider implements INotificationProvider {
  async send(to: string, subject: string, body: string): Promise<boolean> {
    console.log(`[SMS] Sending to ${to}...`);
    // In production, integrate with Twilio, Orange API, etc.
    return true;
  }
}

export class NotificationService {
  private emailProvider: INotificationProvider;
  private smsProvider: INotificationProvider;

  constructor() {
    this.emailProvider = new EmailProvider();
    this.smsProvider = new SmsProvider();
  }

  async notifyUser(user: { email: string; phone?: string | null }, subject: string, message: string) {
    // V1: Email is priority
    await this.emailProvider.send(user.email, subject, message);
    
    // SMS is prepared but optional
    if (user.phone) {
      await this.smsProvider.send(user.phone, subject, message);
    }
  }
}
