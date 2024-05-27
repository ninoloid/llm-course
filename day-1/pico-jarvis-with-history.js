import { readFileSync } from "fs";
import http from "http";

const LLAMA_API_URL =
  process.env.LLAMA_API_URL || "http://localhost:11434/api/generate";

const HISTORY = [];

const generatePrompt = (history, newQuestion) => {
  let prompt =
    "You are an AI that answers questions based on the provided context. Here are previous interactions:\n\n";

  history.forEach((entry) => {
    prompt += `Question: ${entry.question}\nAnswer: ${entry.answer}\n\n`;
  });

  prompt += `Based on this context, answer the following question:\n\n${newQuestion}`;

  return prompt;
};

async function llama(question) {
  const method = "POST";
  const headers = {
    "Content-Type": "application/json",
  };

  const prompt = generatePrompt(HISTORY, question);

  console.log(`Prompt :\n${prompt}`);

  const body = JSON.stringify({
    model: "orca-mini",
    prompt,
    options: {
      // see ollama/docs/modelfile.md
      num_predict: 200,
      temperature: 0.8,
      top_k: 20,
    },
    stream: false,
  });

  const request = { method, headers, body };
  const res = await fetch(LLAMA_API_URL, request);
  const { response } = await res.json();

  return response.trim();
}

const handler = async (req, res) => {
  const { url } = req;

  if (url === "/health") {
    res.writeHead(200).end("OK");
  } else if (url === "/" || url === "index.html") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(readFileSync("./index.html"));
  } else if (url.startsWith("/chat")) {
    const parsedUrl = new URL(`http://localhost${url}`);
    const { search } = parsedUrl;
    const question = decodeURIComponent(search.substring(1));
    const answer = await llama(question);
    HISTORY.push({ question, answer });
    res.writeHead(200, { "Content-Type": "text/html" }).end(answer);
  } else {
    res.writeHead(404).end("Not Found");
  }
};

http.createServer(handler).listen(3000);
