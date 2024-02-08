export interface webhhokParams{
    buyerId:string,
    fixedAmount?:number,
    freeCredits?:number
  }
  
 export interface webhookResponse{
    message:string,
    sessionId:string,
    status?:string
  }