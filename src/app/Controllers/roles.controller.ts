import { Request, Response } from "express";
import { Permissions } from "../Models/Permission";
import { validate } from "class-validator";
import { CreateRoleInput } from "../Inputs/CreateRole.input";

export class RolesController {
    static getAllRolesAndPermissions = async (req: Request, res: Response): Promise<Response> => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.perPage as string) || 10;

            const skip = (page - 1) * limit;

            const roles = await Permissions.aggregate([
                { $skip: skip },
                { $limit: limit }
            ])

            const totalRoles = await Permissions.countDocuments();

            if (!roles) return res.status(400).json({ data: [], message: "Roles doesn't exist." })

            return res.status(200).json({ data: {
                currentPage: page,
                totalRoles,
                roles
            }, message: "Roles fetched successfully." })

        } catch (err) {
            return res
                .status(500)
                .json({ error: { message: "Something went wrong.", err } });
        }
    }

    static createRole = async (req: Request, res: Response): Promise<Response> => {
        try {
            const reqBody = req.body;
            const createRole = new CreateRoleInput();
            createRole.role = reqBody?.role;

            const validationErrors = await validate(createRole);

            if (validationErrors.length > 0) {
                return res.status(400).json({
                    error: { message: "Invalid body", validationErrors },
                });
            }

            const data = await Permissions.create(reqBody);

            return res.status(200).json({ data: data, message: "Role created successfully." });

        } catch (err) {
            return res
                .status(500)
                .json({ error: { message: "Something went wrong.", err } });
        }
    }

    static getRoleAndPermissions = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { id } = req.params;
            
            const permissions = await Permissions.findById(id);

            if(!permissions) return res.status(400).json({data: [], message: "Permissions not found."});

            return res.status(200).json({data: permissions, message: "Permissions fetched successfully."});

        } catch (err) {
            return res
                .status(500)
                .json({ error: { message: "Something went wrong.", err } });
        }

    }

    static updateRolePermissions = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { id } = req.params;
            const { permissions } = req.body;

            const data = await Permissions.findByIdAndUpdate(id, { permissions: permissions }, { new: true });

            if (!data) return res.status(400).json({ data: [], message: "Role not found." })

            return res.status(200).json({ data: data, message: "Role updated successfully." })

        } catch (err) {
            return res
                .status(500)
                .json({ error: { message: "Something went wrong.", err } });
        }
    }
}
