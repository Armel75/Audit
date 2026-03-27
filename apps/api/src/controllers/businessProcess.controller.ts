import { Request, Response } from 'express';
import { BusinessProcessService } from '../services/businessProcess.service';

export class BusinessProcessController {

  /**
   * CREATE
   */
  static async create(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        return res.status(401).json({ error: "UNAUTHORIZED" });
      }

      const result = await BusinessProcessService.create(
        req.body,
        tenantId
      );

      return res.status(201).json(result);

    } catch (error: any) {
      return res.status(400).json({
        error: error.message || "CREATE_FAILED"
      });
    }
  }

  /**
   * GET ALL
   */
  static async findAll(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        return res.status(401).json({ error: "UNAUTHORIZED" });
      }

      const result = await BusinessProcessService.findAll(tenantId);

      return res.status(200).json(result);

    } catch (error: any) {
      return res.status(500).json({
        error: error.message || "FETCH_FAILED"
      });
    }
  }

  /**
   * GET BY ID
   */
  static async findById(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      const id = parseInt(req.params.id, 10);

      if (!tenantId) {
        return res.status(401).json({ error: "UNAUTHORIZED" });
      }

      if (isNaN(id)) {
        return res.status(400).json({ error: "INVALID_ID" });
      }

      const result = await BusinessProcessService.findById(id, tenantId);

      return res.status(200).json(result);

    } catch (error: any) {
      return res.status(404).json({
        error: error.message || "NOT_FOUND"
      });
    }
  }

  /**
   * UPDATE
   */
  static async update(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      const id = parseInt(req.params.id, 10);

      if (!tenantId) {
        return res.status(401).json({ error: "UNAUTHORIZED" });
      }

      if (isNaN(id)) {
        return res.status(400).json({ error: "INVALID_ID" });
      }

      const result = await BusinessProcessService.update(
        id,
        req.body,
        tenantId
      );

      return res.status(200).json(result);

    } catch (error: any) {
      return res.status(400).json({
        error: error.message || "UPDATE_FAILED"
      });
    }
  }

  /**
   * DELETE (SOFT)
   */
  static async delete(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      const id = parseInt(req.params.id, 10);

      if (!tenantId) {
        return res.status(401).json({ error: "UNAUTHORIZED" });
      }

      if (isNaN(id)) {
        return res.status(400).json({ error: "INVALID_ID" });
      }

      await BusinessProcessService.delete(id, tenantId);

      return res.status(200).json({
        message: "BUSINESS_PROCESS_DELETED"
      });

    } catch (error: any) {
      return res.status(400).json({
        error: error.message || "DELETE_FAILED"
      });
    }
  }

}