export function setup(router) {
  router.get("/foo", (req, res) => {
    res.send("Hello from app1 v2: /foo");
  });
}
