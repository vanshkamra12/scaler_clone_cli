# Website Cloner CLI 🚀

A Node.js-based conversational CLI agent built for the AI Agent CLI Tool assignment. It interacts with the OpenAI API to take user prompts from the terminal and auto-generate web pages. 

By default, it acts as an autonomous agent that reasons through the task and writes a complete HTML/CSS/JS clone of the Scaler Academy landing page right to your file system.

## How it works
The agent uses a strict thought loop:
1. **THINK**: Figures out what to do next
2. **TOOL**: Executes specific file-system or web-fetch actions
3. **OBSERVE**: Analyzes the result of the tool
4. **OUTPUT**: Finalizes the generated files

### Tech Stack
* Node.js
* OpenAI SDK
* Axios

## Running Locally

1. Install the dependencies:
   ```bash
   npm install
   ```

2. Set up your environment variables by creating a `.env` file:
   ```bash
   cp .env.example .env
   ```
   *Make sure to add your actual `OPENAI_API_KEY` inside `.env`!*

3. Run the CLI tool:
   ```bash
   node index.js
   ```

Once you run it, the agent will prompt you for instructions. Just hit Enter to run the default Scaler cloning task. It will automatically create a `scaler_clone/` folder and write all the code (`index.html`, `styles.css`, `script.js`) inside it.
