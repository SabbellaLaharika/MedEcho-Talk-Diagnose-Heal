import { Request, Response } from 'express';
import * as reminderService from '../services/reminderService';

export const getUserReminders = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const reminders = await reminderService.getAllUserReminders(userId);
    res.json(reminders);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching reminders', error: error.message });
  }
};

export const createManualReminder = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { medications, reportId, timezoneOffset } = req.body;
    const reminders = await reminderService.createRemindersFromMedications(userId, reportId, medications, timezoneOffset);
    reminderService.forceCheck(); // Wake up worker to include new reminders in schedule
    res.status(201).json(reminders);
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating reminders', error: error.message });
  }
};

export const deleteReminder = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    await reminderService.deleteReminder(id, userId);
    reminderService.forceCheck(); // Refresh schedule
    res.status(200).json({ message: 'Reminder deleted' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting reminder', error: error.message });
  }
};

export const toggleReminder = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { isActive, active } = req.body;
    const status = isActive !== undefined ? isActive : active;
    const reminder = await reminderService.toggleReminder(id, userId, status);
    reminderService.forceCheck(); // Refresh schedule
    res.status(200).json(reminder);
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating reminder', error: error.message });
  }
};
