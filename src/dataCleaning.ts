// import { CardDetails } from "./app/Models/CardDetails";
// import { User } from "./app/Models/User";
// import user from "./routes/user.routes";
// import {
//   attemptToPayment,
//   createSession,
//   customerPaymentMethods,
//   refundPayment,
// } from "./utils/payment/createPaymentToRYFT";

// export const dataCleaning = async () => {
//   // cron.schedule("* * * * *", async () => {
//   const users = await User.find();
//   users.map(async (user)=>{
//       const cardExist:any = await CardDetails.findOne({
//     userId: user?.id,
//     isDefault: true,
//   });
//   if(!cardExist){
//     console.log("card does not exist!!")
//   }
//   if (user?.ryftClientId != "" && cardExist) {
//     const params: any = {
//       fixedAmount: 50,
//       amount:50,
//       currency: process.env.CURRENCY,
//       email: user?.email,
//       clientId: user?.ryftClientId,
//       cardNumber: cardExist?.cardNumber,
//       expiryMonth: cardExist?.expiryMonth,
//       expiryYear: cardExist?.expiryYear,
//       cvc: cardExist?.cvc,
//     };
//     console.log("hey",params)
//     createSession(params).then((res) => {
//       attemptToPayment(res,params).then((resp:any) => {
//         customerPaymentMethods(resp).then((response:any)=>{
//           params.id=resp.data.id
//           console.log(response.data)
//           setTimeout(() => {
//             refundPayment(params).then(()=>console.log("refunded")).catch((err)=>console.log("refund payment error",err))
//           }, 30000);
          
//         }).catch((ERR)=>{
//           console.log("payment method error",ERR.response.data)
//         });
//       }).catch((ERR)=>{
//         console.log("Attempt paymnent error",ERR.response.data)
//       });;
//     }).catch((ERR)=>{
//       console.log("create session error",ERR.response.data)
//     });
//   }
//   else{

//     console.log("------NO DATA FOUND------")
//   }
//   })


 
// };
