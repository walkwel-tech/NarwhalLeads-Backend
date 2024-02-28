import { Request, Response } from "express";
import { updateReport } from "../../../AutoUpdateTasks/ReportingStatusUpdate";

export const  updateClientsStatusAction = async (
    req: Request,
    res: Response
  ): Promise<any> => {
    try {
      await updateReport(100);
      return res.json({ message: "client status updated " });
    } catch (err) {
      res.status(500).json({
        err,
      });
    }
  };