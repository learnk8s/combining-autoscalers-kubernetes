const http = require("http");
const port = Number.isFinite(parseInt(process.env.PORT, 10))
  ? parseInt(process.env.PORT, 10)
  : 8080;

let counter = 0;
let requestsForCurrentWindow = 0;

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
      requestsForCurrentWindow++;
      reply(res);
      break;
  }
};

const server = http.createServer(requestListener);
server.listen(port);

console.log(`Starting server http://localhost:${port} with ${rps} rps`);

setInterval(() => {
  requestsForCurrentWindow = 0;
}, 1000 / rps);

function reply(res, retryAttempt = 0) {
  if (requestsForCurrentWindow > rps) {
    setTimeout(
      () => reply(res, retryAttempt + 1),
      Math.pow(2, retryAttempt) * 1000
    );
  } else {
    res.end("OK");
  }
}
