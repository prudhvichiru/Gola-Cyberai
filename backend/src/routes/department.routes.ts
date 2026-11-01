import { Router } from 'express';
import { DepartmentController } from '../controllers/department.controller.js';

export const departmentRouter = Router();

departmentRouter.get('/', DepartmentController.getDepartments);
departmentRouter.get('/count', DepartmentController.getCount);
departmentRouter.post('/', DepartmentController.createDepartment);
