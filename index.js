#!/usr/bin/env node
import "dotenv/config";
import readline from "node:readline";
import path from "node:path";
import process from "node:process";
import { OpenAI } from "openai";

import {
  ensureDir,
  executeCommand,
  fetchUrl,
  readFile,
  writeFile
} from "./tools.js";

const OUTPUT_DIR = path.resolve(process.cwd(), "scaler_clone");

const tool_map = {
  fetchUrl,
  ensureDir,
  writeFile,
  readFile,
  executeCommand
};

function buildSystemPrompt() {
  return `
You are an AI Assistant who works on INPUT , THINK, TOOL, OBSERVE and OUTPUT format.
You will be responsible to break down the major problem into smaller problems.
You will be doing multiple thinking steps before providing any output.
You will be having access of some tools that you can use.

Goal:
- Build a Scaler Academy website "clone" as a static webpage using HTML, CSS, and JavaScript.
- The output MUST include Header, Hero Section, Footer.
- It MUST be a fully working webpage that opens in a browser.
- The JavaScript MUST be real (not placeholder comments). Add at least 2 small working interactions.
- Generate files under this directory ONLY:
  ${OUTPUT_DIR}
- Required files:
  1) ${OUTPUT_DIR}/index.html
  2) ${OUTPUT_DIR}/styles.css
  3) ${OUTPUT_DIR}/script.js

Tools :
1. fetchUrl(url : string) : Fetches a URL as text (HTML).
2. ensureDir(dirPath : string) : Creates directory recursively.
3. writeFile(filePath : string, contents : string) : Writes a UTF-8 file.
4. readFile(filePath : string) : Reads a UTF-8 file.
5. executeCommand(cmd : string) : Executes a linux/unix command.

Rules :
1. You will always follow the JSON format described below.
2. You will do one step at a time and wait for the OBSERVE step after every TOOL call.
3. You will do multiple THINK steps before producing any OUTPUT.
4. Prefer writeFile/ensureDir tools to create the website output (avoid huge shell heredocs).
5. Always ensure the HTML links to ./styles.css and ./script.js and renders correctly.
6. Keep assets self-contained (use CSS gradients/shapes/icons via inline SVG if needed). Do NOT depend on downloading images unless necessary.
7. Make it visually similar to Scaler: clean tech look, blue accents, strong CTA, nav links, responsive layout.
8. JS requirements (must implement in script.js + corresponding HTML/CSS hooks):
   - Mobile nav toggle (hamburger button) that shows/hides nav links on small screens.
   - Smooth-scroll for internal anchor links (e.g. #apply).

Output format :
{ "step" : "START | THINK | TOOL | OBSERVE | OUTPUT" , "content" : "string" , "tool_name" : "string" , "tool_args" : "string | object" }

Tool calling format:
- When step is TOOL, set tool_name to one of the tool names.
- tool_args MUST be:
  - a string for fetchUrl/ensureDir/readFile/executeCommand
  - an object for writeFile: { "filePath": "...", "contents": "..." }

Examples :
user : Create a folder named todo_app and create a simple todo application
assistant : { "step" : "START" , "content" : "User wants a todo app generated" }
assistant : { "step" : "THINK" , "content" : "I should create a folder and write files" }
assistant : { "step" : "TOOL" , "tool_name" : "ensureDir" , "tool_args" : "./todo_app" }
developer : { "step" : "OBSERVE" , "content" : "Created/ensured directory: ./todo_app" }
assistant : { "step" : "TOOL" , "tool_name" : "writeFile" , "tool_args" : { "filePath": "./todo_app/index.html", "contents": "<!doctype html>..." } }
developer : { "step" : "OBSERVE" , "content" : "Wrote file: ..." }
assistant : { "step" : "OUTPUT" , "content" : "Done. Open ./todo_app/index.html" }
`;
}

function safeJsonParse(str) {
  try {
    return { ok: true, value: JSON.parse(str) };
  } catch (e) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}

async function callTool(parsed) {
  const name = parsed.tool_name;
  const fn = tool_map[name];
  if (!fn) {
    return { step: "OBSERVE", content: "This tool is not available" };
  }

  if (name === "writeFile") {
    const args = parsed.tool_args ?? {};
    return {
      step: "OBSERVE",
      content: await fn(args.filePath, args.contents)
    };
  }

  return { step: "OBSERVE", content: await fn(parsed.tool_args) };
}

async function runAgentLoop(userInstruction) {
  const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
  });
  const model = "gpt-4o-mini"; // using gpt-4o-mini as gpt-4.1-mini doesn't exist
  
  const system_prompt = buildSystemPrompt();
  const messages = [
    { role: "system", content: system_prompt },
    { role: "user", content: userInstruction }
  ];

  await ensureDir(OUTPUT_DIR);

  let turn = 0;
  const MAX_TURNS = 30;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  while (true) {
    turn += 1;
    if (turn > MAX_TURNS) {
      console.log(`Max turns (${MAX_TURNS}) exceeded.`);
      break;
    }
    
    let content = "";
    try {
      const response = await client.chat.completions.create({
          model,
          messages,
          response_format: { type: "json_object" }
      });
      content = response.choices[0].message.content;
    } catch (e) {
      console.error(`API error: ${e.message}`);
      break;
    }

    if (!content || !content.trim()) {
      console.error(`Empty model response on turn ${turn}\n`);
      break;
    }
    
    const parsedAttempt = safeJsonParse(content);
    if (!parsedAttempt.ok) {
        messages.push({
            role: "developer",
            content: JSON.stringify({
            step: "OBSERVE",
            content: `Invalid JSON from assistant. Error: ${parsedAttempt.error}`
            })
        });
        await sleep(800);
        continue;
    }

    const parsed = parsedAttempt.value;

    if (parsed.step === "START") {
      console.log("\n[START]", parsed.content);
    } else if (parsed.step === "THINK") {
      console.log("[THINK]", parsed.content);
    } else if (parsed.step === "TOOL") {
      console.log(`[TOOL] calling ${parsed.tool_name}`);
    } else if (parsed.step === "OUTPUT") {
      console.log("\n[OUTPUT]", parsed.content);
      break;
    } else {
      console.log(`[${parsed.step}] `, parsed.content);
    }

    messages.push({ role: "assistant", content: JSON.stringify(parsed) });

    if (parsed.step === "TOOL") {
      const obs = await callTool(parsed);
      messages.push({ role: "developer", content: JSON.stringify(obs) });
      continue;
    }
  }
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("Missing OPENAI_API_KEY in environment. Put it in .env file");
    process.exit(1);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question("What do you want the agent to do?\n> ", async (answer) => {
    rl.close();
    const instruction =
      answer?.trim() ||
      "Clone the Scaler Academy website into a working webpage with header, hero section, and footer.";
    await runAgentLoop(instruction);
    console.log(`\nDone. Output is in ${OUTPUT_DIR}\n`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
