import { Request, Response } from "express";
import { ValidationConfig } from "../Models/validationConfig";
import { ValidationConfigInput } from "../Inputs/validationConfig.input";
import { validate } from "class-validator";
import logger from "../../utils/winstonLogger/logger";

export class ValidationConfigController {
  static getValidation = async (req: Request, res: Response) => {
    const key: string = req.params.key;

    try {
      const validationConfig = await ValidationConfig.findOne({ key });

      if (!validationConfig) {
        return res.status(404).json({ message: "Validation config not found" });
      }

      return res.status(200).json(validationConfig);
    } catch (error) {
      console.error("Error getting validation config:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };

  static updateValidation = async (req: Request, res: Response) => {
    const { value, enabled } = req.body;
    const { key } = req.params;

    try {
      const validationConfig = await ValidationConfig.findOne({ key });

      if (!validationConfig) {
        return res.status(404).json({ message: "Validation config not found" });
      }

      const input = new ValidationConfigInput();
      input.value = value;
      input.enabled = enabled;

      const errors = await validate(input);
      if (errors.length > 0) {
        return res.status(400).json({ message: "Validation failed", errors });
      }

      validationConfig.value = value;

      validationConfig.enabled = enabled;

      await validationConfig.save();

      return res.status(200).json(validationConfig);
    } catch (error) {
      logger.error(
        "Error getting validation config:", 
        error
      );
      return res.status(500).json({ message: "Internal server error" });
    }
  };
}
