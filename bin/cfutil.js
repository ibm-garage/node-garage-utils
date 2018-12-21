#!/usr/bin/env node

const { promisify } = require("util");
const fs = require("fs");
const childProcess = require("child_process");
const eol = require("eol");
const program = require("commander");
const { stackWithCause } = require("../lib/errors");

const execFile = promisify(childProcess.execFile);
const spawn = childProcess.spawn;
const writeFile = promisify(fs.writeFile);
const nl = String(eol.auto);

module.exports = { parseServices, parseUserProvided, envValue, envScript, splitLines, selectLine };

program.version("4.0.0");
program
  .command("env <app>")
  .description("Save environment from Cloud Foundry to a file for use when running locally.")
  .option("-j --json", "save just VCAP_SERVICES as JSON, instead of creating a .env file")
  .option("-u --user", "include user-provided environment variables (cannot be used with --json)")
  .option("-s --script", "create an env.sh script to initialize the environment")
  .option("-f --filename <filename>", "output filename (default is .env or services.json)")
  .action(env);

program
  .command("logs <app>")
  .description("Retrieve, filter, and trim Cloud Foundry app logs for Bunyan viewing.")
  .option("-r --recent", "dump recent logs, instead of tailing")
  .option("-a --app-only", "include only log messages with type APP")
  .option("-j --json-only", "include only log messages with JSON content")
  .action(logs);

if (require.main === module) {
  process.on("uncaughtException", handleError);
  process.on("unhandledRejection", handleError);
  const args = process.argv;
  if (args.length < 3) {
    program.outputHelp();
    process.exit(1);
  } else {
    program.parse(args);
  }
}

function handleError(err) {
  console.error(stackWithCause(err) || err);
  process.exit(1);
}

function withCause(err, cause) {
  err.cause = cause;
  return err;
}

function checkCf() {
  return execFile("cf", ["-v"]).then(
    result => {
      if (!result.stdout.startsWith("cf version")) {
        throw new Error("Invalid cf executable: check installation and path");
      }
    },
    err => {
      throw withCause(new Error("Unable to run cf executable: check installation and path"), err);
    }
  );
}

function cfError(err) {
  const cause = { cmd: err.cmd, code: err.code, stdout: err.stdout, stderr: err.stderr };
  if (err.stdout) {
    const errLine = eol.lf(err.stdout).split("\n")[1];
    err = new Error(`${errLine}${nl}`);
  }
  return withCause(err, cause);
}

async function env(app, options = {}) {
  const {
    json = false,
    user = false,
    script = false,
    filename = json ? "services.json" : ".env"
  } = options;

  await checkCf();

  let result;
  try {
    result = await execFile("cf", ["env", app]);
  } catch (err) {
    throw cfError(err);
  }
  const envOutput = eol.lf(result.stdout);
  const services = parseServices(envOutput);

  let output;
  if (json) {
    output = JSON.stringify(services, undefined, 2);
  } else {
    let vars = { VCAP_SERVICES: JSON.stringify(services) };
    if (user) {
      vars = Object.assign({}, vars, parseUserProvided(envOutput));
    }
    output = Object.entries(vars)
      .map(([name, val]) => `${name}=${envValue(val)}`)
      .join(nl);
  }

  await writeFile(filename, output + nl);

  if (script) {
    await writeFile("env.sh", envScript(filename, json));
  }
}

function parseServices(envOutput) {
  const match = /^System-Provided:\n{\s*"VCAP_SERVICES":([\s\S]*?)^}/m.exec(envOutput);
  if (!match) {
    throw new Error("Invalid cf env output: cannot parse VCAP_SERVICES");
  }
  return JSON.parse(match[1]);
}

function parseUserProvided(envOutput) {
  const vars = {};
  if (!/^No user-defined env variables have been set$/m.exec(envOutput)) {
    const match = /^User-Provided:\n([\s\S]*?)^$/m.exec(envOutput);
    if (!match) {
      throw new Error("Invalid cf env output: cannot parse user-provided environment variables");
    }
    match[1].split("\n").forEach(line => {
      const [name, val] = line.split(":");
      if (name) {
        vars[name] = val;
      }
    });
  }
  return vars;
}

function envValue(val) {
  val = val.trim();
  const quote = !/^['a-zA-Z0-9,._+:@%/-]*$/.test(val);
  val = val.replace(/'/, quote ? "'\\''" : "\\'");
  if (quote) {
    val = `'${val}'`;
  }
  return val;
}

function envScript(filename, json) {
  const filenameWithDefault = "${1:-" + filename + "}";
  const lines = [
    `filename="${filenameWithDefault}"`,
    "set -a",
    json ? 'VCAP_SERVICES=$(cat "$filename")' : '. "$filename"',
    "set +a"
  ];
  return lines.join(nl) + nl;
}

async function logs(app, { recent = false, appOnly = false, jsonOnly = false } = {}) {
  await checkCf();

  let lineCount = 0;
  const args = ["logs"];
  if (recent) {
    args.push("--recent");
  }
  args.push(app);

  const cf = spawn("cf", args, { stdio: [process.stdin, "pipe", process.stderr] });
  cf.on("exit", process.exit);
  cf.stdout.on("data", data => {
    splitLines(data).forEach(line => {
      if (lineCount++ < 2) {
        console.log(line);
      } else {
        const match = selectLine(line, appOnly, jsonOnly);
        if (match) {
          console.log(match);
        }
      }
    });
  });
}

function splitLines(data) {
  const lines = eol.lf(data.toString()).split("\n");
  if (!lines[lines.length - 1]) {
    lines.pop();
  }
  return lines;
}

function selectLine(line, appOnly, jsonOnly) {
  const match = /^ +[-:.TZ0-9]+ \[(.*?)] [A-Z]+(.*)$/.exec(line);
  if (!match) {
    return jsonOnly ? false : line;
  }
  if (appOnly && !match[1].startsWith("APP/")) {
    return false;
  }

  const message = match[2].trim();
  const isJson = message.startsWith("{") && message.endsWith("}");
  if (isJson) {
    return message;
  }
  if (!jsonOnly) {
    return line.trim();
  }
  return false;
}
