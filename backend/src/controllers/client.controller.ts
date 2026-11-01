import { Request, Response } from 'express';
import { ClientService } from '../services/client.service.js';

export class ClientController {
  static async getClients(req: Request, res: Response) {
    try {
      const { status, search } = req.query;
      const data = await ClientService.getClients({
        status: status as string,
        search: search as string,
      });
      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error fetching clients' });
    }
  }

  static async getClientById(req: Request, res: Response) {
    try {
      const data = await ClientService.getClientById(req.params.id);
      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(404).json({ error: err.message || 'Client not found' });
    }
  }

  static async createClient(req: Request, res: Response) {
    try {
      const data = await ClientService.createClient(req.body);
      return res.status(201).json({ message: 'Client created successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Error creating client' });
    }
  }

  static async updateClient(req: Request, res: Response) {
    try {
      const data = await ClientService.updateClient(req.params.id, req.body);
      return res.status(200).json({ message: 'Client updated successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Error updating client' });
    }
  }
}
