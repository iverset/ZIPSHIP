import { Router, type IRouter } from "express";
import healthRouter from "./health";
import githubRouter from "./github";
import githubZipRouter from "./github-zip";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/github", githubRouter);
router.use("/github", githubZipRouter);

export default router;
