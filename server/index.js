const express = require("express");
const vm = require("vm");
const WebSocket = require("ws");

const port = 3000;
const app = express();
const feed = "https://feed.dev.piral.cloud/api/v1/pilet/express-demo";
const changeEventTypes = ["add-pilet", "update-pilet", "remove-pilet"];
const routers = {};
const current = [];

async function linkModule(url, ctx) {
  const res = await fetch(url);
  const content = await res.text();
  const mod = new vm.SourceTextModule(content);
  mod.context = ctx;
  await mod.link((specifier) => {
    const newUrl = new URL(specifier, url);
    return linkModule(newUrl.href, ctx);
  });
  await mod.evaluate();
  return mod;
}

async function loadModule(url) {
  const ctx = vm.createContext();

  try {
    const res = await linkModule(url, ctx);
    return res.namespace;
  } catch (ex) {
    console.warn(`Failed to evaluate "${url}":`, ex);
    return {};
  }
}

function makeId(item) {
  return `${item.name}@${item.version}`;
}

async function installPlugin(item) {
  const { name, link } = item;
  const router = express.Router();
  const { setup } = await loadModule(link);
  typeof setup === "function" && setup(router);
  routers[name] = router;
  current.push({ id: makeId(item), name });
}

async function uninstallPlugin(item) {
  delete routers[item.name];
  current.splice(current.indexOf(item));
}

function watchPlugins() {
  console.log("Watching plugins ...");
  const ws = new WebSocket(feed.replace("http", "ws"));

  ws.on("error", console.error);

  ws.on("message", async (data) => {
    const msg = JSON.parse(Buffer.from(data).toString("utf8"));

    if (changeEventTypes.includes(msg.type)) {
      const res = await fetch(feed);
      const { items } = await res.json();
      const removeItems = current.filter(
        ({ id }) => !items.some((n) => makeId(n) === id)
      );
      const addItems = items.filter(
        (item) => !current.some(({ id }) => id === makeId(item))
      );

      for (const item of removeItems) {
        await uninstallPlugin(item);
      }

      for (const item of addItems) {
        await installPlugin(item);
      }
    }
  });
}

async function loadPlugins() {
  console.log("Loading plugins ...");
  const res = await fetch(feed);
  const { items } = await res.json();

  for (const item of items) {
    const id = makeId(item);
    console.log(`Integrating plugin "${id}" ...`);
    await installPlugin(item);
    console.log(`Integrated plugin "${id}"!`);
  }

  watchPlugins();
}

loadPlugins();

app.get("/", (req, res) => {
  res.send("Hello world!");
});

app.use("/:namespace", (req, res, next) => {
  const { namespace } = req.params;
  const router = routers[namespace];

  if (router) {
    return router(req, res, next);
  }

  return next();
});

app.listen(port, () => {
  console.log(`Running at http://localhost:${port}`);
});
