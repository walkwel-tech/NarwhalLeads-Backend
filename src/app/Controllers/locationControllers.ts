import { Request, Response } from "express";
import { Location } from "../Models/Location";

export class LocationController {
  static view = async (req: Request, res: Response): Promise<Response> => {
    try {
      let postCode = req.query?.postCode;
      const radiusString = req.query?.radius;
      const radius =
        typeof radiusString === "string" ? parseFloat(radiusString) : NaN;
      if (!postCode || isNaN(radius)) {
        return res
          .status(400)
          .json({ error: { message: "Postcode and radius is reuired." } });
      }

      let geo = await Location.findOne({ name: postCode });
      let coordinates = [];
      if (geo) {
        coordinates = await Location.aggregate([
          {
            $geoNear: {
              near: {
                type: "Point",

                coordinates: geo!.location.coordinates as unknown as [
                  number,
                  number
                ],
              },
              distanceField: "distance",
              maxDistance: (typeof radius === "number" ? radius : 10) * 1609.34,
              spherical: true,
            },
          },
        ]);
      }

      return res.json({
        data: coordinates,
      });
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong.", err } });
    }
  };

  static viewAll = async (req: Request, res: Response): Promise<Response> => {
    try {
      let postcodes = await Location.aggregate([
        {
          $group: {
            _id: null,
            postCodes: { $push: `$name` },
          },
        },
        {
          $project: { _id: 0 },
        },
      ]);

      const postCodeArray = postcodes.length > 0 ? postcodes[0].postCodes : [];

      return res.json({ data: postCodeArray });
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong.", err } });
    }
  };
}
