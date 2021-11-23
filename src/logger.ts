import pino from "pino";
import path from "path";
import fs from "fs";

const logDir = path.join(__dirname, "../logs");
if (!fs.existsSync(logDir)) {
  throw new Error(`LogDirectory '${logDir}' not exsists - fatal`);
}

const logger = pino({
  transport: {
    target: "pino/file",
    options: { destination: logDir + "/logs" },
  },
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});
export default logger;
