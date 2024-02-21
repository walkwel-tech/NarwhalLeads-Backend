import mongoose from "mongoose";
import { Notifications } from "../../../Models/Notifications";
import { Request, Response } from "express";
import { QueryParams } from "../Inputs/queryParams.input";


export const notifications = async (
    req: Request<QueryParams, {}>,
    res: Response
  ): Promise<Response> => {
    let dataToFind: mongoose.FilterQuery<typeof Notifications> = {};

    try {
      if (req.query.start && req.query.end) {
        dataToFind.createdAt = {
          $gte: req.query.start,
          $lt: req.query.end,
        };
      }
      if (req.query.notificationType) {
        dataToFind.notificationType = req.query.notificationType;
      }
      if (req.query.userId) {
        dataToFind.userId = req.query.userId;
      }

      const data = await Notifications.find(dataToFind).sort({ createdAt: -1 });
      return res.json({ data: data });
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };