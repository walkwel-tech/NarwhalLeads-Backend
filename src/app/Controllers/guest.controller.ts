import { Request, Response } from "express";
import { User } from "../Models/User";
import { RolesEnum } from "../../types/RolesEnum";
import { BuisnessIndustries } from "../Models/BuisnessIndustries";
import { LeadTablePreference } from "../Models/LeadTablePreference";
import { UserInterface } from "../../types/UserInterface";
import { ClientTablePreference } from "../Models/ClientTablePrefrence";
import { BusinessDetails } from "../Models/BusinessDetails";

export class GuestController {
  static setLeadPreferenceAccordingToIndustryInDB = async (
    req: Request,
    res: Response
  ) => {
    try {
      const dataToFind = { role: RolesEnum.USER, isDeleted: false };
      //   const dataToFind = { _id: "64c0aee1afbff4f9de4d3b0d" };
      const users = await User.find(dataToFind);
      await getUsers(users);

      return res.json({ message: "lead preferences of all users updated" });
    } catch (error) {
      return res.status(500).json({ error: "something went wrong" });
    }
  };

  static runCommandToSetBusinessIndustryColumns = async (
    req: Request,
    res: Response
  ) => {
    try {
      const businessIndustries = await BuisnessIndustries.find().exec();
      const updatedDocuments = await Promise.all(
        businessIndustries.map(async (ind) => {
          ind.columns.forEach((column: any) => {
            column.originalName = column.name;
            column.displayName = column.name;
            delete column.name;
            delete column.newName;
          });
          const data = await ind.save();
          return data;
        })
      );
      console.log("Updated and saved documents:", updatedDocuments);
      updatedDocuments.map(async (i) => {
        await BuisnessIndustries.findByIdAndUpdate(i.id, {
          columns: i.columns,
        });
      });

      return res.json({
        data: "Updated and saved documents",
        updatedDocuments,
      });
    } catch (error) {
      return res.status(500).json({ Error: "something went wrong", error });
    }
  };

  static runCommandToSetLeadPreferenceColumns = async (
    req: Request,
    res: Response
  ) => {
    try {
      const pref = await LeadTablePreference.find().exec();
      const updatedDocuments = await Promise.all(
        pref.map(async (preference) => {
          // Your update logic here
          // For example, let's update the "displayName" field
          preference.columns.forEach((column: any) => {
            column.originalName = column.name;
            column.displayName = column.name;
            delete column.name;
            delete column.newName;
          });
          const data = await preference.save();
          // Save the updated document
          return data;
        })
      );
      console.log("Updated and saved documents:", updatedDocuments);
      await Promise.all(
        updatedDocuments.map(async (i) => {
          await LeadTablePreference.findByIdAndUpdate(i.id, {
            columns: i.columns,
          });
        })
      );

      return res.json({
        data: "Updated and saved documents",
        updatedDocuments,
      });
    } catch (error) {
      return res.status(500).json({ Error: "something went wrong", error });
    }
  };

  static runCommandToSetClientTableColumns = async (
    req: Request,
    res: Response
  ) => {
    try {
      const clientPref = await ClientTablePreference.find().exec();
      const updatedDocuments = await Promise.all(
        clientPref.map(async (clientPref) => {
          clientPref.columns.forEach((column: any) => {
            column.originalName = column.name;
            column.displayName = column.name;
            delete column.name;
            // delete column.newName
          });
          const data = await clientPref.save();
          // Save the updated document
          return data;
        })
      );
      console.log("Updated and saved documents:", updatedDocuments);
      updatedDocuments.map(async (i) => {
        await ClientTablePreference.findByIdAndUpdate(i.id, {
          columns: i.columns,
        });
      });

      return res.json({
        data: "Updated and saved documents",
        updatedDocuments,
      });
    } catch (error) {
      return res.status(500).json({ Error: "something went wrong", error });
    }
  };

  static setBusinessDetails = async (req: Request, res: Response) => {
    try {
      const users = await User.find();
      await Promise.all(
        users.map(async (i) => {
          let dataToSave: any = {
            userId: i.id,
            businessIndustry: "baloon",
            businessName: "test pvt ltd",
            businessDescription: "desc",
            // businessLogo: `${FileEnum.PROFILEIMAGE}${req?.file.filename}`,
            businessSalesNumber: "123123123",
            businessAddress: "street lights",
            address1: "street",
            address2: "lights",
            businessCity: "london",
            businessPostCode: "BH7",
            // businessOpeningHours: JSON.parse(input?.businessOpeningHours),
            // businessOpeningHours: (input?.businessOpeningHours),
          };
          const business = await BusinessDetails.create(dataToSave);
          await User.findByIdAndUpdate(i.id, {
            businessDetailsId: business.id,
          });
        })
      );

      return res.json({ data: "Updated Business Details" });
    } catch (error) {
      return res.status(500).json({ Error: "something went wrong", error });
    }
  };

  static managePrefForLeads = async (_req: any, res: Response) => {
    const name = _req.body.name;
    // Define an array of document IDs
    let documentIds = await LeadTablePreference.find({}, "_id");
    // Iterate over the document IDs
    documentIds.forEach(async function (documentId): Promise<any> {
      // Find the length of the "columns" array
      var result = await LeadTablePreference.findOne({ _id: documentId._id });
      var nameExists = result?.columns.some(function (column: any) {
        return column.originalName === name;
      });
      if (!result) {
        console.error("Document not found with _id: " + documentId);
        return;
      }
      // if(result.columns)
      var columnsLength = result?.columns?.length;

      // Create the object to push with the correct "index" value
      var objectToPush = {
        originalName: name,
        isVisible: true,
        index: columnsLength,
        displayName: name,
      };

      // Push the object to the "columns" array for the current document
      if (!nameExists) {
        return await LeadTablePreference.updateOne(
          { _id: documentId },
          {
            $push: {
              columns: objectToPush,
            },
          }
        );
      } else {
        console.log("already exist");
      }
    });
    res.send({ data: "successfully inserted" });
  };

  static managePrefForClients = async (_req: any, res: Response) => {
    const name = _req.body.name;
    // Define an array of document IDs
    let documentIds = await ClientTablePreference.find({}, "_id");
    // Iterate over the document IDs
    documentIds.forEach(async function (documentId): Promise<any> {
      // Find the length of the "columns" array
      var result = await ClientTablePreference.findOne({ _id: documentId._id });
      var nameExists = result?.columns.some(function (column: any) {
        return column.originalName === name;
      });
      if (!result) {
        console.error("Document not found with _id: " + documentId);
        return;
      }
      // if(result.columns)
      var columnsLength = result?.columns?.length;

      // Create the object to push with the correct "index" value
      var objectToPush = {
        originalName: name,
        isVisible: true,
        index: columnsLength,
        displayName: name,
      };

      // Push the object to the "columns" array for the current document
      if (!nameExists) {
        return await ClientTablePreference.updateOne(
          { _id: documentId },
          {
            $push: {
              columns: objectToPush,
            },
          }
        );
      } else {
        console.log("already exist");
      }
    });
    res.send({ data: "successfully inserted" });
  };
}

const getUsers = (users: UserInterface[]) => {
  const leadPrefPromises = users.map((user) => {
    return new Promise(async (resolve, reject) => {
      try {
        const industry = await BuisnessIndustries.findById(
          user.businessIndustryId
        );
        const leadPref = await LeadTablePreference.findOneAndUpdate(
          { userId: user.id },
          { columns: industry?.columns }
        );
        resolve(leadPref);
      } catch (error) {
        reject(error);
      }
    });
  });

  return Promise.all(leadPrefPromises);
};
