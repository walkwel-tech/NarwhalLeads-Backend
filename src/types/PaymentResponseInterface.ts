export interface PaymentResponse {
    message?: string;
    status?: number | string;
    url?: string;
    sessionID?: string;
    furtherActions?: Object;
    // clientSecret?:string;
    // publicKey?:string;
    optionalData?:Object;
    // customerPaymentMethods?:Object;
    manualPaymentConfig?:Object
  }