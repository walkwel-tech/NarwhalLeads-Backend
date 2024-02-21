import axios from "axios";
import logger from "../winstonLogger/logger";

const POST = "post";
export const createNotesOnXero = (
  paramsToCreateContact: any,
  token: string
) => {
  const data = {
    HistoryRecords: [
      {
        Changes: "Note",
        DateUTCString: new Date(),
        DateUTC: new Date(),
        User: "System Generated",
        Details: paramsToCreateContact.email,
      },
    ],
  };
  return new Promise(async (resolve, reject) => {
    const config = {
      method: POST,
      url: `${process.env.ADD_NOTES_TO_XERO}/${paramsToCreateContact.contactID}/History`,
      headers: {
        "xero-tenant-id": process.env.XERO_TETANT_ID,
        Authorization: `Bearer ${token}`,
        // "xero-tenant-id": "f3d6705e-2e71-437f-807f-5d0893c0285b",
        // Authorization: "Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjFDQUY4RTY2NzcyRDZEQzAyOEQ2NzI2RkQwMjYxNTgxNTcwRUZDMTkiLCJ0eXAiOiJKV1QiLCJ4NXQiOiJISy1PWm5jdGJjQW8xbkp2MENZVmdWY09fQmsifQ.eyJuYmYiOjE2OTMzODM4MjMsImV4cCI6MTY5MzM4NTYyMywiaXNzIjoiaHR0cHM6Ly9pZGVudGl0eS54ZXJvLmNvbSIsImF1ZCI6Imh0dHBzOi8vaWRlbnRpdHkueGVyby5jb20vcmVzb3VyY2VzIiwiY2xpZW50X2lkIjoiNjJDRDNGQkQyNENENEZGMUI4RUFGNEMyQzNGODI0NkYiLCJ4ZXJvX3VzZXJpZCI6IjQxYjlhNWJkLTM3YzEtNDIyNy1hNzkyLTdmYjkxYWRmOGIyNCIsImp0aSI6IjVDRTk0RUEzMzhDMEY3MEVEMDJERDJBNkRGNjAwQ0UzIiwiYXV0aGVudGljYXRpb25fZXZlbnRfaWQiOiI4YTIwODhmNS1iNzg4LTRkYzAtYTZlZS1iNGQ5YjIyODlkZGEiLCJzY29wZSI6WyJhY2NvdW50aW5nLmF0dGFjaG1lbnRzIiwiYWNjb3VudGluZy5idWRnZXRzLnJlYWQiLCJhY2NvdW50aW5nLmNvbnRhY3RzIiwiYWNjb3VudGluZy5jb250YWN0cy5yZWFkIiwiYWNjb3VudGluZy5yZXBvcnRzLnJlYWQiLCJhY2NvdW50aW5nLnNldHRpbmdzIiwiYWNjb3VudGluZy5zZXR0aW5ncy5yZWFkIiwiYWNjb3VudGluZy50cmFuc2FjdGlvbnMiLCJhY2NvdW50aW5nLnRyYW5zYWN0aW9ucy5yZWFkIl19.LzyLxkPzkJPFfs8cdCsvIL0LupsGeevbmBTtb9x7R8Z_PZmcTZJNN0J5Gnb9HbqeB_So3KYnR6mzDi9GBvx2kCwD-vD38TLYmgQBHOUpXvtvq7x71kv-NnJTubCHlWE2MCw9ZiYjCPvJPCF3uXtOVDbcfd3mNinr1yCpWvYhvr59N6U42BsmluO6T7wcfOdQzcq1_NHP6JlmVU87iW4nYoh0s1z5lo6sHQHtSvJ9G4jrDtHnJOqrFxxrPue4fouyNof8_sTAH6cyYH_PwqV7v2GnMVyyR_ZS9tkfkz-uHD6qZWGs4uWMt9OYyoX1eQywh0HGp7Jx3MBCUPanUA70rA",
      },
      data: JSON.stringify(data),
    };
    axios(config)
      .then((data) => {
        resolve(data);
      })
      .catch(async (err) => {
        logger.error(
          "Xero Error while adding notes",
          err
        );
        reject(err);
      });
  });
};
