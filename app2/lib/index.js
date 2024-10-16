import { compute } from './other.js';

export function setup(router) {
  router.get("/compute", (req, res) => {
    const { a, b } = req.query;
    const c = compute(+a, +b);

    if (!isNaN(c)) {
      return res.status(200).send(`${c}`);
    }

    return res.status(400).send(`Only numbers allowed.`);
  });
}
