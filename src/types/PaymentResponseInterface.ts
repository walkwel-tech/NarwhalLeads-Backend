export interface PaymentResponse {
  message?: string;
  status?: number | string;
  url?: string;
  sessionID?: string;
  furtherActions?: Object;
  // clientSecret?:string;
  // publicKey?:string;
  optionalData?: Object;
  paymentMethods?: Object;
  manualPaymentConfig?: Object;
  paymentStatus?: string;
}
