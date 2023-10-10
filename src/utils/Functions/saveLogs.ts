import { Logs } from "../../app/Models/Logs";
import { LogsInterface } from "../../types/LogsInterface";

export const saveLogs = async (params: Partial<LogsInterface>) => {
  const data = await Logs.create(params);
  return data;
};
