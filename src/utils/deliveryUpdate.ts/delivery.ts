import axios from "axios";

const POST='post'
//This API shows "not yet implemented"
export const deliveryUpdate = (deliveryId:string) => {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        update: { "status": "Active" }
      });
      const config = {
        method: POST,
        url: `${process.env.DELIVERY_UPDATE_URL}/${deliveryId}`,
        headers: {
          X_KEY: process.env.LEAD_BYTE_API_KEY,
        },
        data: data,
      };
      axios(config)
        .then((response) => {
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  };