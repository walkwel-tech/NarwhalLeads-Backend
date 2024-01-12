import axios from "axios";

const POST = "post";
export const reCaptchaValidation = (response: string) => {
  return new Promise((resolve, reject) => {
    const secret = `${process.env.GOOGLE_RECAPTCHA_SECRET}`;

    let config = {
      method: POST,
      maxBodyLength: Infinity,
      url: `${process.env.GOOGLE_RECAPTCHA_URL}?secret=${secret}&response=${response}`,
      headers: {
        "Content-Type": "application/json",
      },
      data: {},
    };

    axios
      .request(config)
      .then((response) => {
        resolve(response.data.success);
      })
      .catch((error) => {
        console.error("ReCaptcha validation error:", error.message);
        reject(error);
      });
  });
};
