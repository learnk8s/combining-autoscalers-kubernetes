const http = require("http");
const port = Number.isFinite(parseInt(process.env.PORT, 10))
  ? parseInt(process.env.PORT, 10)
  : 8080;

let counter = 0;
const queue = new Map();

const arg = parseFloat(process.argv.slice(2)[0]);
const rps = Number.isFinite(arg) ? arg : 1;

const requestListener = function (req, res) {
  res.setHeader("Content-Type", "text/html");
  res.writeHead(200);

  switch (req.url) {
    case "/metrics": {
      res.end(
        [
          `# HELP http_requests_total The total number of HTTP requests.`,
          `# TYPE http_requests_total counter`,
          `http_requests_total{status="200"} ${counter}`,
        ].join("\n")
      );
      break;
    }
    default:
      counter++;
      queue.set(res);
      break;
  }
};

const server = http.createServer(requestListener);
server.listen(port);

console.log(`Starting server http://localhost:${port} with ${rps} rps`);

setInterval(() => {
  if (queue.size === 0) {
    return;
  }

  const res = queue.keys().next().value;

  queue.delete(res);

  res.end("OK");
}, 1000 / rps);
