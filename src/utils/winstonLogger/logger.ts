import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    // new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new DailyRotateFile({
      filename: "logs/error-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      level: "error",
      zippedArchive: true,
      maxSize: "24m",
      maxFiles: "14d", 
    }),
    // new winston.transports.File({ filename: "logs/combined.log" }),\
    new DailyRotateFile({
      filename: "logs/combined-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "24m",
      maxFiles: "14d", 
    }),
    new DailyRotateFile({
      filename: "logs/debug-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      level: "debug",
      maxSize: "24m",
      maxFiles: "14d", 
    }),
  ],
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
});

export default logger;
