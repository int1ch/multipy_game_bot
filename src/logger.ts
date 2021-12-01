import pino from "pino";
import path from "path";
import fs from "fs";

const logDir = path.join(__dirname, "../logs");

if (!fs.existsSync(logDir)) {
  throw new Error(`LogDirectory '${logDir}' not exsists - fatal`);
}

const logFile = path.join(logDir, "logs");

const toConsole = process.env.CONSOLE;

console.log("Logging to " + logFile);

const AUX_TARGETS: { target: string; level: any; options: {} }[] = [];
if (toConsole) {
  AUX_TARGETS.push({
    target: "pino-pretty",
    level: "trace",
    options: {},
  });
}

let logger: any = pino({
  level: "trace",
  transport: {
    targets: [
      {
        target: "pino/file",
        options: { destination: logFile },
        level: "trace",
      },
      ...AUX_TARGETS,
    ],
  },

  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});
export function switchToConsole() {
  logger.tr;
}
export default logger;
