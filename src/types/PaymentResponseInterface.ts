export interface PaymentResponse {
    message: string;
    status: number;
    url?: string;
    sessionID?: string;
  }