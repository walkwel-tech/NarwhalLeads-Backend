import express, {Application} from "express";
import {Request, Response} from "express";
// import helmet from "helmet";
import passport from "passport";
import cors from "cors";
import {connectDatabase} from "./utils/dbConnection";

import {
    AuthRoutes,
    UserRoutes,
    ProfileRoutes,
    CardDetailsRoutes,
    AdminSettingsRoutes,
    LeadsRoutes,
    BusinessDetailsRoutes,
    userLeadsDetailsRoutes,
    invitedUserRoutes,
    BusinessIndustriesRoutes

} from "./routes";

import {local, jwt} from "./utils/strategies";
import {Auth} from "./app/Middlewares";
import { FileEnum } from "./types/FileEnum";
import TransactionsRoutes from "./routes/transaction.routes";
import { autoUpdateTasks } from "./app/AutoUpdateTasks";
import TermsAndConditionsRoutes from "./routes/termsAndConditions.routes";
import freeCreditsLinkRoutes from "./routes/FreeCreditsLink.routes";
import { autoChargePayment } from "./app/AutoUpdateTasks/autoCharge";
import path from "path";
// import {  dataCleaning } from "./dataCleaning";
const swaggerDocument = require('../swagger.json'); // Replace with the path to your actual Swagger document
const swaggerUi = require('swagger-ui-express');

const swaggerUiOptions = {
    swaggerOptions: {
      basicAuth: {
        name:   'Authorization',
        schema: {
          type: 'basic',
          in:   'header'
        },
        value:  'Basic admin:secret@7'
      }
    }
  }
let version="0.1.2b"
export class Server {
    public app: Application;

    public port: String;

    constructor(port: String) {
        this.app = express();
        this.port = port;

        this.registerMiddlewares();
        this.initializePassportAndStrategies();
        this.regsiterRoutes();
      

        connectDatabase();
        // this.start()
        console.log(port)
        console.log(`HTTP Application server ready to be started on ${this.port}`);
    }

    registerMiddlewares() {
        this.app.use(express.static(`${process.cwd()}${FileEnum.PUBLICDIR}`));
        this.app.use(express.json({limit: "50mb"}));
        this.app.use(express.urlencoded({limit: "50mb", extended: true}));
        // this.app.use(helmet());
        this.app.use(cors());
        this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument,swaggerUiOptions));

       
    }

    regsiterRoutes() {
        this.app.use(express.static("build"));
        this.app.use(express.static("public"));
        // this.app.use((req, res, next) => {
        //     console.log("---------------------")
        //     res.sendFile(path.join(__dirname, "../build", "index.html"));
        //   });
       
        this.app.use("/api/v1/auth", AuthRoutes);
        this.app.use("/api/v1/auth/business",BusinessDetailsRoutes)
        this.app.use("/api/v1/profile", Auth, ProfileRoutes);
        this.app.use("/api/v1/cardDetails", CardDetailsRoutes);
        // need to add middleware here for security of only admin or only user login can update themself.
        this.app.use("/api/v1/user", UserRoutes);
        this.app.use("/api/v1/adminSettings",AdminSettingsRoutes)
        this.app.use("/api/v1/leads",LeadsRoutes)
        this.app.use("/api/v1/transactions",Auth,TransactionsRoutes)
        this.app.use("/api/v1/userLeadsDetails",userLeadsDetailsRoutes)
        this.app.use("/api/v1/invitedUsers",Auth,invitedUserRoutes)
        this.app.use("/api/v1/termsAndConditions",TermsAndConditionsRoutes)
        this.app.use("/api/v1/freeCredits",freeCreditsLinkRoutes)
        this.app.use("/api/v1/businessIndustry",BusinessIndustriesRoutes)

        this.app.get("/api/v1/version", (req: Request, res: Response) => {
            res.status(200).json({message: `App running on version ${version}`});
        });

        this.app.get("*", (req: Request, res: Response) => {
            res.sendFile(path.join(__dirname, "../build", "index.html"));
            // res.status(200).json({message: `App running on version ${version}`});
        });
    }

    initializePassportAndStrategies() {

        this.app.use(passport.initialize())
        passport.use(local)
        passport.use(jwt)
    }

    start() {
        const http = require("http").createServer(this.app);
        http.listen(this.port, () => {
            console.log(`:rocket: HTTP Server started at port ${this.port}`);
        });
        autoUpdateTasks()
        autoChargePayment()

    }
}
