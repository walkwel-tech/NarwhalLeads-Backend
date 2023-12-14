import { Request, Response } from "express";
import { validate } from 'class-validator';
import fs from "fs";
import { Ad } from "../Models/Ad";
import { FileEnum } from "../../types/FileEnum";
import { TimePeriod } from "../Inputs/TimePeriod.input";
import { PipelineStage, Types } from "mongoose";
import { UserInterface } from "../../types/UserInterface";
import { CreateAdBodyValidator } from "../Inputs/CreateAdBodyValidator.input";
import { UpdateAdBodyValidator } from "../Inputs/UpdateAdBodyValidator.input";
import { QueryParams } from "../Inputs/QueryParamsAd.input";
const LIMIT = 10;
const LIMIT_ADD = 4


export class AdsController {
    static createAd = async (
        req: Request,
        res: Response
    ): Promise<Response> => {
        try {
            const reqBody = new CreateAdBodyValidator()
            reqBody.industries = req.body.industries as string[];
            reqBody.title = req.body.title,
                reqBody.callToAction = req.body.callToAction,
                reqBody.description = req.body.description,
                reqBody.buttonText = req.body.buttonText,
                reqBody.startDate = req.body.startDate,
                reqBody.endDate = req.body.endDate
            reqBody.targetReach = req.body.targetReach * 1

            const validationErrors = await validate(reqBody);
            if (validationErrors.length > 0) {
                return res.status(400).json({
                    error: { message: "Invalid request body", validationErrors },
                });
            }

            const ad = await Ad.create({ ...reqBody, ...(reqBody.targetReach ? { isTargetReachedEnable: true } : {}), ...(req.file ? { image: `${FileEnum.AD}${req?.file.filename}` } : {}) })
            return res.json({ data: ad, message: "Partner ad created successfully" })
        } catch (err) {
            return res
                .status(500)
                .json({ error: { message: "Something went wrong.", err } });
        }
    }

    static getAllAds = async (
        req: Request,
        res: Response
    ): Promise<Response> => {
        try {
            const queryParams = new QueryParams();
            queryParams.industry = req.body.industry as string[] | undefined;
            queryParams.liveBtw = req.body.liveBtw as TimePeriod | undefined;
            queryParams.search = req.body.search;
            queryParams.active = req.body.active;
            queryParams.page = req.body.page;
            queryParams.perPage = req.body.perPage;

            const validationErrors = await validate(queryParams);
            if (validationErrors.length > 0) {
                return res.status(400).json({
                    error: { message: "Invalid query parameters", validationErrors },
                });
            }

            const { perPage, page, liveBtw, active, search, industry } = queryParams;

            let skip = 0,
                defaultPerPage = perPage ? perPage * 1 : LIMIT; // front end is not able to give perPage in number to me
            if (page) {
                skip = (page > 0 ? page - 1 : 0) * defaultPerPage;
            }

            const pipeline: PipelineStage[] = [
                { $match: { isDeleted: false } },
                ...(liveBtw && Object.keys(liveBtw).length
                    ? [
                        {
                            $match: {
                                $or: [
                                    {
                                        $and: [
                                            { startDate: { $gte: new Date(liveBtw.startDate) } },
                                            { startDate: { $lte: new Date(liveBtw.endDate) } }
                                        ]
                                    },
                                    {
                                        $and: [
                                            { endDate: { $gte: new Date(liveBtw.startDate) } },
                                            { endDate: { $lte: new Date(liveBtw.endDate) } }
                                        ]
                                    }
                                ]
                            },
                        },
                    ]
                    : []),
                ...(search ? [
                    {
                        $match: {
                            "title": {
                                $regex: search,
                                $options: 'i'
                            },

                        }
                    }
                ] : []),
                ...(industry && industry.length ? [
                    {
                        $match: {
                            industries: {

                                $in: industry.map((industryId) => new Types.ObjectId(industryId))

                            }
                        }
                    },
                ] : []),
                ...(active && active === "true" ? [
                    {
                        $match: {
                            "isActive": true
                        }
                    }
                ] : active === "false" ? [
                    {
                        $match: {
                            "isActive": false
                        }
                    }
                ] : []),
                {
                    $lookup: {
                        from: 'buisnessindustries',
                        localField: 'industries',
                        foreignField: '_id',
                        as: 'joinedData'
                    }
                },
                {
                    $addFields: {
                        industriesName: {
                            $map: {
                                input: '$joinedData',
                                as: "data",
                                in: "$$data.industry"
                            }
                        }
                    }
                },
                {
                    $project: {
                        joinedData: 0
                    }
                },
                {
                    $sort: {
                        createdAt: -1,
                    },
                },
                ...(page ? [{
                    $facet: {
                        metaData: [
                            { $count: "total" },
                            { $addFields: { page, perPage: defaultPerPage } },
                            {
                                $addFields: {
                                    pageCount: {
                                        $ceil: {
                                            $divide: ["$total", defaultPerPage],
                                        },
                                    },
                                },
                            },
                        ],
                        data: [{ $skip: skip }, { $limit: defaultPerPage }],
                    },
                },] : []),



            ]


            const data = await Ad.aggregate(pipeline)

            if (page) {
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
    }

    static deleteAd = async (
        req: Request,
        res: Response
    ): Promise<Response> => {
        try {
            const id = req.params.id
            const ad = await Ad.findByIdAndUpdate(id, { isDeleted: true })

            return res.json({ message: "Ad deleted successfully" })

        } catch (err) {
            return res
                .status(500)
                .json({ error: { message: "Something went wrong.", err } });
        }
    }

    static updateAd = async (
        req: Request,
        res: Response
    ): Promise<Response> => {
        try {
            const reqBody = new UpdateAdBodyValidator()
            reqBody.industries = req.body.industries as string[];
            reqBody.title = req.body.title,
                reqBody.callToAction = req.body.callToAction,
                reqBody.description = req.body.description,
                reqBody.buttonText = req.body.buttonText,
                reqBody.startDate = req.body.startDate,
                reqBody.endDate = req.body.endDate
            reqBody.isActive = req.body.isActive
            reqBody.isTargetReachedEnable = req.body.isTargetReachedEnable
            req.body.targetReach ? reqBody.targetReach = req.body.targetReach * 1 : ''
            //  reqBody.targetReach = req.body.targetReach ? req.body.targetReach * 1 : ''


            const validationErrors = await validate(reqBody);
            if (validationErrors.length > 0) {
                return res.status(400).json({
                    error: { message: "Invalid request body", validationErrors },
                });
            }
            const id = req.params.id

            const adCheck = await Ad.findById(id);

            if (!adCheck || adCheck.isDeleted) {
                return res.status(404).json({ error: 'Ad not found' });
            }
            const ad = await Ad.findByIdAndUpdate(id, { ...reqBody, ...(req.file ? { image: `${FileEnum.AD}${req?.file.filename}` } : {}) }, { new: true });
            if (req.file) {
                fs.unlink(process.cwd() + '/public' + adCheck.image, (err) => {
                    if (err) {
                        console.error('Error deleting previous image:', err);
                    }

                    console.log('Previous image deleted successfully.');

                });
            }

            return res.json({ data: { message: "Ad updated succesfully", ad } })
        } catch (err) {
            return res
                .status(500)
                .json({ error: { message: "Something went wrong.", err } });
        }
    }


    static updateAdClick = async (
        req: Request,
        res: Response
    ): Promise<Response> => {
        try {
            const id = req.params.id
            const ad = await Ad.findById(id);

            if (!ad || ad.isDeleted) {
                return res.status(404).json({ error: 'Ad not found' });
            }

            if (
                ((ad.targetReach && ad.targetReach > ad.clickTotal) ||
                    (!ad.isTargetReachedEnable)) && ad.isActive === true
            ) {
                // Increment count
                ad.clickTotal++;

                // Check if isActive should be updated
                // if (!document.isActive && document.count >= document.targetReach) {
                //     document.isActive = true;
                // }
                if (ad.clickTotal === ad.targetReach && ad.isTargetReachedEnable) {
                    ad.isActive = false
                }

                // Save the updated document
                await ad.save();

                return res.json({ message: "Click updated successfully" });
            } else {
                return res.status(400).json({ error: 'Cannot increment count. Target reach reached or ad is paused.' });
            }
        } catch (err) {
            return res
                .status(500)
                .json({ error: { message: "Something went wrong.", err } });
        }
    }

    static getAdsBasedOnUser = async (
        req: Request,
        res: Response
    ): Promise<Response> => {
        try {
            const user = req.user;
            // let  buisnessIndustryId;
            // if (user) {

            const buisnessIndustryId = (user as UserInterface).businessIndustryId
            // }

            if (!buisnessIndustryId) {
                return res.status(400).json({ error: 'buisness industry not found' });
            }
            const ads = await Ad.aggregate([
                { $match: { isDeleted: false } },
                {
                    $match: {
                        // businessIndustries: new Types.ObjectId(buisnessIndustryId)
                        industries: {

                            $in: [new Types.ObjectId(buisnessIndustryId)]
                        }
                    }

                },

                {
                    $limit: LIMIT_ADD
                }
            ]);


            return res.json({ ads });
        } catch (err) {
            return res
                .status(500)
                .json({ error: { message: "Something went wrong.", err } });
        }

    }
}