import { model, Model } from "mongoose";

import { leadCredentialsSchema } from "../../database/schemas/LeadCenterCredentialsSchema";
import { LeadCenterCredentialInterface } from "../../types/LeadCenterCredentialsInterface";

const LeadCenterCredential: Model<LeadCenterCredentialInterface> = model <LeadCenterCredentialInterface>(
    "LeadCenterCredentials",
    leadCredentialsSchema
);

export {LeadCenterCredential}