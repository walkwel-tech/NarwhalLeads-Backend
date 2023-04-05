// import { IP } from "../../utils/constantFiles/IP_Lists";

const ipfilter = require('express-ip-filter');


// define the IP address to allow or deny
const allowedIps =['54.154.201.136','52.49.50.123','52.30.239.254','52.48.178.55','52.48.44.198','52.18.69.254','52.17.127.192','52.18.107.114','3.249.0.120','54.247.77.248','182.77.63.226',undefined];
// create the IP filter middleware
const errorResponse = {
  status: 403,
  message: 'Access denied: Your IP address is not allowed to access this API',
};
export const ipFilter = ipfilter(allowedIps, { mode: 'allow' , logF: () => {}, errorMessage: errorResponse })

// apply the middleware to your API endpoints


