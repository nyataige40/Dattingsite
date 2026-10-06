// Admin controller: analytics, moderation queue, support tickets
import * as adminService from '../services/adminService.js';

const fail = (res, err) => {
    const status = err.status || 500;
    if (status >= 500) console.error('Admin error:', err);
    res.status(status).json({ message: err.message || 'Server error' });
};

export const analytics = async (req, res) => {
    try {
        res.json(await adminService.getAnalytics());
    } catch (err) {
        fail(res, err);
    }
};

export const listReports = async (req, res) => {
    try {
        res.json({ reports: await adminService.listReports({ status: req.query.status, limit: Number(req.query.limit) || 50 }) });
    } catch (err) {
        fail(res, err);
    }
};

export const resolveReport = async (req, res) => {
    try {
        const { status, note } = req.body;
        res.json(await adminService.resolveReport(req.user.id, req.params.id, { status, note }));
    } catch (err) {
        fail(res, err);
    }
};

export const listTickets = async (req, res) => {
    try {
        res.json({ tickets: await adminService.listTickets({ status: req.query.status, limit: Number(req.query.limit) || 50 }) });
    } catch (err) {
        fail(res, err);
    }
};

export const updateTicket = async (req, res) => {
    try {
        res.json(await adminService.setTicketStatus(req.user.id, req.params.id, req.body.status));
    } catch (err) {
        fail(res, err);
    }
};

export const listSubscribers = async (req, res) => {
    try {
        res.json({ subscribers: await adminService.listSubscribers() });
    } catch (err) {
        fail(res, err);
    }
};

export const listTransactions = async (req, res) => {
    try {
        res.json({ transactions: await adminService.listTransactions({ limit: Number(req.query.limit) || 100 }) });
    } catch (err) {
        fail(res, err);
    }
};

export const runMaintenance = async (req, res) => {
    try {
        res.json(await adminService.runMaintenance(req.user.id));
    } catch (err) {
        fail(res, err);
    }
};