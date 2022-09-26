const app = App();
let lastPodResourceVersion;
let lastNodeResourceVersion;
let startTime = undefined;
const timer = document.querySelector("#timer");

fetch("/api/v1/pods")
  .then((response) => response.json())
  .then((response) => {
    const pods = response.items;
    lastPodResourceVersion = response.metadata.resourceVersion;
    pods.forEach((pod) => {
      const podId = `${pod.metadata.namespace}-${pod.metadata.name}`;
      app.upsertPod(podId, pod);
    });
  })
  .then(() => streamUpdatesPods());

fetch("/api/v1/nodes")
  .then((response) => response.json())
  .then((response) => {
    const nodes = response.items;
    lastNodeResourceVersion = response.metadata.resourceVersion;
    nodes.forEach((node) => {
      const nodeId = node.metadata.name;
      app.upsertPod(nodeId, node);
    });
  })
  .then(() => streamUpdatesNodes());

function streamUpdatesPods() {
  fetch(`/api/v1/pods?watch=1&resourceVersion=${lastPodResourceVersion}`)
    .then((response) => {
      const stream = response.body.getReader();
      const utf8Decoder = new TextDecoder("utf-8");
      let buffer = "";

      return stream.read().then(function processText({ done, value }) {
        if (done) {
          console.log("Request terminated");
          return;
        }
        buffer += utf8Decoder.decode(value);
        buffer = onNewLine(buffer, (chunk) => {
          if (chunk.trim().length === 0) {
            return;
          }
          try {
            const event = JSON.parse(chunk);
            console.log("PROCESSING EVENT: ", event);
            const pod = { ...event.object, phase: event.object.status.phase };
            const podId = `${pod.metadata.namespace}-${pod.metadata.name}`;
            switch (event.type) {
              case "ADDED": {
                app.upsertPod(podId, pod);
                break;
              }
              case "DELETED": {
                app.removePod(podId);
                break;
              }
              case "MODIFIED": {
                app.upsertPod(podId, pod);
                break;
              }
              default:
                break;
            }
            lastPodResourceVersion = event.object.metadata.resourceVersion;
          } catch (error) {
            console.log("Error while parsing", chunk, "\n", error);
          }
        });
        return stream.read().then(processText);
      });
    })
    .catch(() => {
      console.log("Error! Retrying in 5 seconds...");
      setTimeout(() => streamUpdatesPods(), 5000);
    });
}

function streamUpdatesNodes() {
  fetch(`/api/v1/nodes?watch=1&resourceVersion=${lastNodeResourceVersion}`)
    .then((response) => {
      const stream = response.body.getReader();
      const utf8Decoder = new TextDecoder("utf-8");
      let buffer = "";

      return stream.read().then(function processText({ done, value }) {
        if (done) {
          console.log("Request terminated");
          return;
        }
        buffer += utf8Decoder.decode(value);
        buffer = onNewLine(buffer, (chunk) => {
          if (chunk.trim().length === 0) {
            return;
          }
          try {
            const event = JSON.parse(chunk);
            console.log("PROCESSING EVENT: ", event);
            const node = event.object;
            switch (event.type) {
              case "ADDED": {
                app.upsertNode(node.metadata.name, node);
                break;
              }
              case "DELETED": {
                app.removeNode(node.metadata.name);
                break;
              }
              case "MODIFIED": {
                app.upsertNode(node.metadata.name, node);
                break;
              }
              default:
                break;
            }
            lastNodeResourceVersion = event.object.metadata.resourceVersion;
          } catch (error) {
            console.log("Error while parsing", chunk, "\n", error);
          }
        });
        return stream.read().then(processText);
      });
    })
    .catch(() => {
      console.log("Error! Retrying in 5 seconds...");
      setTimeout(() => streamUpdatesNodes(), 5000);
    });
}

function onNewLine(buffer, fn) {
  const newLineIndex = buffer.indexOf("\n");
  if (newLineIndex === -1) {
    return buffer;
  }
  const chunk = buffer.slice(0, buffer.indexOf("\n"));
  const newBuffer = buffer.slice(buffer.indexOf("\n") + 1);
  fn(chunk);
  return onNewLine(newBuffer, fn);
}

function App() {
  const allPods = new Map();
  const allNodes = new Map();
  const content = document.querySelector("#content");

  function render() {
    const pods = Array.from(allPods.values());

    if (pods.length === 0) {
      return;
    }

    const podsByNode = Array.from(allNodes.values()).reduce(
      (acc, it) => {
        if (it.name in acc) {
          return acc;
        } else {
          acc[it.name] = [];
        }
        return acc;
      },
      groupBy(pods, (it) => it.nodeName)
    );
    const nodeTemplates = Object.keys(podsByNode)
      .filter((nodeName) => {
        const pods = podsByNode[nodeName];
        return !pods.some((it) => /csi-linode-controller/i.test(it.name));
      })
      .sort((a, b) => {
        if (
          podsByNode[a].find((pod) => pod.name.startsWith("overprovisioning"))
        ) {
          return 1;
        }
        if (
          podsByNode[b].find((pod) => pod.name.startsWith("overprovisioning"))
        ) {
          return -1;
        }
        return a.localeCompare(b);
      })
      .map((nodeName) => {
        const pods = podsByNode[nodeName]
          .sort((a, b) => a.name.localeCompare(b.name))
          .filter(
            (it) =>
              ![
                "calico",
                "csi",
                "kube-proxy",
                "coredns",
                "locust",
                "prom",
              ].some((prefix) => it.name.startsWith(prefix))
          );
        return [
          '<li class="mh2">',
          `<p class="f7 white-70 tc code">${nodeName}</p>`,
          "<div class='w5 h5'>",
          `<div class="bg-dark-pink ba bw2 b--pink center h-100">${renderNode(
            pods
          )}</div>`,
          "</div>",
          "</li>",
        ].join("");
      });

    content.innerHTML = `<ul class="list pl0 flex flex-wrap center">${nodeTemplates.join(
      ""
    )}</ul>`;

    function renderNode(pods) {
      return [
        '<ul class="list pl0 flex flex-wrap h-100">',
        pods
          .map((pod) => {
            if (pod.name.includes("overprovisioning")) {
              return [
                '<li class="relative h-100 w-100">',
                `<div class="h-100 flex flex-column pa2" data-tooltip="${pod.name}"><div class="bg-moon-gray flex-auto w-100 flex items-center justify-center ttu b f3 br2">Placeholder</div></div>`,
                "</li>",
              ].join("");
            }
            return [
              '<li class="relative h-50 w-50">',
              `<div class="flex flex-column pa1 h-100"><div class="w-100 h-100 bg-green br2" data-tooltip="${pod.name}"></div></div>`,
              "</li>",
            ].join("");
          })
          .join(""),
        "</ul>",
      ].join("");
    }
  }

  return {
    upsertPod(podId, pod) {
      if (!pod.spec.nodeName) {
        return;
      }
      allPods.set(podId, {
        name: pod.metadata.name,
        namespace: pod.metadata.namespace,
        nodeName: pod.spec.nodeName,
        phase: pod.status.phase,
      });
      render();
    },
    removePod(podId) {
      allPods.delete(podId);
      render();
    },
    upsertNode(nodeId, node) {
      allNodes.set(nodeId, { name: node.metadata.name });
      render();
    },
    removeNode(nodeId) {
      allNodes.delete(nodeId);
      render();
    },
    pods() {
      return Array.from(allPods.values());
    },
  };
}

function groupBy(arr, groupByKeyFn) {
  return arr.reduce((acc, c) => {
    const key = groupByKeyFn(c);
    if (!(key in acc)) {
      acc[key] = [];
    }
    acc[key].push(c);
    return acc;
  }, {});
}

document
  .querySelector("#go-1")
  ?.addEventListener("click", createEventListener(1));
document
  .querySelector("#go-5")
  ?.addEventListener("click", createEventListener(5));
document
  .querySelector("#go-9")
  ?.addEventListener("click", createEventListener(9));
document
  .querySelector("#placeholder-1")
  ?.addEventListener("click", createPlaceholderEventListener(1));
document
  .querySelector("#placeholder-0")
  ?.addEventListener("click", createPlaceholderEventListener(0));

function createEventListener(replicas) {
  return (e) => {
    startTime = Date.now();
    timer.innerHTML = `00:00:00`;
    fetch("/apis/apps/v1/namespaces/default/deployments/podinfo", {
      method: "PATCH",
      body: JSON.stringify({ spec: { replicas } }),
      headers: {
        "Content-Type": "application/strategic-merge-patch+json",
      },
    }).then((response) => response.json());
    const timerId = setInterval(() => {
      timer.innerHTML = `${toHHMMSS(Date.now() - startTime)}`;
      const podinfo = app
        .pods()
        .filter((it) => /podinfo/.test(it.name) && it.phase === "Running");
      if (podinfo.length === replicas) {
        clearInterval(timerId);
        startTime = undefined;
      }
    }, 16);
  };
}

function createPlaceholderEventListener(replicas) {
  return (e) => {
    startTime = Date.now();
    timer.innerHTML = `00:00:00`;
    fetch("/apis/apps/v1/namespaces/default/deployments/overprovisioning", {
      method: "PATCH",
      body: JSON.stringify({ spec: { replicas } }),
      headers: {
        "Content-Type": "application/strategic-merge-patch+json",
      },
    }).then((response) => response.json());
  };
}

function toHHMMSS(value) {
  const sec_num = value / 1000;
  var hours = Math.floor(sec_num / 3600);
  var minutes = Math.floor((sec_num - hours * 3600) / 60);
  var seconds = Math.ceil(sec_num - hours * 3600 - minutes * 60);

  if (hours < 10) {
    hours = "0" + hours;
  }
  if (minutes < 10) {
    minutes = "0" + minutes;
  }
  if (seconds < 10) {
    seconds = "0" + seconds;
  }
  return hours + ":" + minutes + ":" + seconds;
}
