import { Router, type Request, Response, NextFunction } from "express";
import { requireAuth, requireAdmin } from "./authMiddleware";
import {
  createRecurringCost,
  deleteRecurringCost,
  listRecurringCosts,
  updateRecurringCost,
} from "./recurringCostsApi";

const router = Router();

function asyncHandler(
  fn: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}

router.get(
  "/recurring-costs",
  requireAuth,
  asyncHandler(listRecurringCosts),
);
router.post(
  "/recurring-costs",
  requireAuth,
  requireAdmin,
  asyncHandler(createRecurringCost),
);
router.put(
  "/recurring-costs/:id",
  requireAuth,
  requireAdmin,
  asyncHandler(updateRecurringCost),
);
router.delete(
  "/recurring-costs/:id",
  requireAuth,
  requireAdmin,
  asyncHandler(deleteRecurringCost),
);

export default router;
