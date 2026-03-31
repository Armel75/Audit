import { Request, Response } from 'express';
import { DashboardService } from './../services/dashboard.service';

export class DashboardController {
  static async getDG(req: Request, res: Response) {
    try {
      const tenantId = Number(req.user?.tenantId); // adapte selon ton auth

      const year = req.query.year ? Number(req.query.year) : undefined;
      const month = req.query.month ? Number(req.query.month) : undefined;

      const data = await DashboardService.getDGDashboard(tenantId, {
        year,
        month,
      });

      res.json(data);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({
        message: 'Erreur dashboard DG',
      });
    }
  }
}