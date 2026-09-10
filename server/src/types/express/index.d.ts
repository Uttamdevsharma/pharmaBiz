import "express";
import { AuthenticatedUser } from "../../modules/auth/auth.types";

declare global {
  namespace Express {
    interface Request {
      params: { [key: string]: string };
      user?: AuthenticatedUser;
      effectiveBranchId?: string;
      subscription?: any;
      tenant?: any;
      isTrial?: boolean;
      trialDaysRemaining?: number;
    }
  }
}

declare module "express" {
  interface Request {
    params: { [key: string]: string };
  }
}
