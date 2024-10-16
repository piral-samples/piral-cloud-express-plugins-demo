import cors from 'cors';
import type { Router } from "express-serve-static-core";

export function setup(router: Router) {
  router.use(cors());

  router.get("/", (req, res) => {
    res.status(404).send(`NOT FOUND.`);
  });
}
