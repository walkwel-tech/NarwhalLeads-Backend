import { Request, Response } from "express";
import { validate } from "class-validator";

import { ValidationErrorResponse } from "../../types/ValidationErrorResponse";
import { Permissions } from "../Models/Permission";
import { PermissionInput } from "../Inputs/Permissions.input";
import { PermissionInterface } from "../../types/PermissionsInterface";

const LIMIT = 10;

export class PermissionController {
  static view = async (req: Request, res: Response): Promise<Response> => {
    try {
      let perPage = 0,
        skip = 0;
      if (req?.query?.page && req?.query?.perPage) {
        //@ts-ignore
        perPage = req.query?.perPage > 0 ? req.query?.perPage * 1 : LIMIT;

        //@ts-ignore
        skip = (req.query.page > 0 ? req.query.page * 1 - 1 : 0) * perPage;
      }

      const paginationPipeline = [
        {
          $facet: {
            metaData: [
              { $count: "total" },
              { $addFields: { page: req?.query?.page, perPage } },
              {
                $addFields: {
                  pageCount: {
                    $ceil: {
                      $divide: ["$total", perPage],
                    },
                  },
                },
              },
            ],
            data: [{ $skip: skip }, { $limit: perPage }],
          },
        },
      ];
      let dataToFind: Record<string, unknown> = { isDeleted: false };

      if (req.query.search) {
        dataToFind = {
          ...dataToFind,
          $or: [{ role: { $regex: req.query.search, $options: "i" } }],
        };
      }

      const data = await Permissions.aggregate([
        { $match: dataToFind },
        ...(perPage ? paginationPipeline : []),
      ]);

      if (perPage) {
        return res.json({
          data: data[0]?.data,
          ...(data[0].metaData ? { meta: data[0].metaData[0] } : {}),
        });
      } else {
        return res.json({ data });
      }
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong.", err } });
    }
  };

  static create = async (req: Request, res: Response): Promise<Response> => {
    try {
      let input = req.body;
      if (Object.keys("isDeleted")) {
        delete input.isDeleted;
      }
      const permissionInput = new PermissionInput();
      permissionInput.role = input.role;
      permissionInput.permissions = input.permissions;

      const errors = await validate(permissionInput);

      if (errors.length) {
        const errorsInfo: ValidationErrorResponse[] = errors.map((error) => ({
          property: error.property,
          constraints: error.constraints,
        }));

        return res
          .status(400)
          .json({ error: { message: "VALIDATIONS_ERROR", info: errorsInfo } });
      }

      let permission = await Permissions.find({ role: input.role });

      if (permission.length) {
        return res
          .status(400)
          .json({ error: { message: "Role already exist" } });
      }

      const permissionData = await Permissions.create(input);

      return res.json({
        data: permissionData,
      });
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong.", err } });
    }
  };

  static delete = async (req: Request, res: Response): Promise<Response> => {
    try {
      let id = req?.params?.id;
      const permission = (await Permissions.findById(
        id
      )) as PermissionInterface;

      if (!permission) {
        return res
          .status(400)
          .json({ error: { message: "Permission doesn't exist" } });
      } else if (permission.isDeleted) {
        return res
          .status(400)
          .json({
            error: { message: "Permission already deleted" },
            permission,
          });
      }

      const updatedPermission = await Permissions.findByIdAndUpdate(
        id,
        { isDeleted: true, deletedAt: Date.now() },
        { new: true }
      );

      return res.json({
        data: { message: "Data deleted successfully", updatedPermission },
      });
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong.", err } });
    }
  };

  static update = async (req: Request, res: Response): Promise<Response> => {
    try {
      const input = req.body;
      const { id } = req.params;
      if (Object.keys("isDeleted")) {
        delete input.isDeleted;
      }

      const permission = await Permissions.findById(id);
      if (!permission) {
        return res
          .status(400)
          .json({ error: { message: "Permission doesn't exist" } });
      }

      const data = await Permissions.findByIdAndUpdate(id, input, {
        new: true,
      });

      return res.json({ data, message: "Record updated successfully" });
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong.", err } });
    }
  };
}
