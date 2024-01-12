import { EventLogs } from "../../app/Models/EventLogs";
import { Logs } from "../../app/Models/Logs";
import { LogsInterface } from "../../types/LogsInterface";

export const saveLogs = async (params: Partial<LogsInterface>) => {
  const data = await Logs.create(params);
  return data;
};

export const saveEventLogs = async (params: Partial<LogsInterface>) => {
  const data = await EventLogs.create({...params, notes: JSON.stringify(params?.notes)});
  return data;
};
