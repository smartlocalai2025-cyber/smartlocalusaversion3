// API routes for audit management
// GET /api/audits/:id - Get single audit
// GET /api/audits/business/:name - Get audits for business
// GET /api/audits/profile/:id - Get audits for profile
// GET /api/audits/history/:name - Get audit history with deltas
// GET /api/audits/stats - Get aggregate stats
// DELETE /api/audits/:id - Delete audit
// PATCH /api/audits/:id - Update audit

const express = require('express');
const { AuditPersistence } = require('../services/audit-persistence');

const router = express.Router();
const persistence = new AuditPersistence();

// Get single audit by ID
router.get('/:id', async (req, res) => {
  try {
    const audit = await persistence.getAudit(req.params.id);
    
    if (!audit) {
      return res.status(404).json({ error: 'Audit not found' });
    }

    res.json({ audit });
  } catch (error) {
    console.error('Get audit error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get audits for a business
router.get('/business/:name', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const audits = await persistence.getAuditsByBusiness(req.params.name, limit);
    
    res.json({ audits, count: audits.length });
  } catch (error) {
    console.error('Get audits by business error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get audits for a profile
router.get('/profile/:id', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const audits = await persistence.getAuditsByProfile(req.params.id, limit);
    
    res.json({ audits, count: audits.length });
  } catch (error) {
    console.error('Get audits by profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get audit history with deltas
router.get('/history/:name', async (req, res) => {
  try {
    const count = parseInt(req.query.count) || 5;
    const audits = await persistence.getAuditHistory(req.params.name, count);
    
    res.json({ audits, count: audits.length });
  } catch (error) {
    console.error('Get audit history error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get latest audit for a business
router.get('/latest/:name', async (req, res) => {
  try {
    const audit = await persistence.getLatestAudit(req.params.name);
    
    if (!audit) {
      return res.status(404).json({ error: 'No audits found for this business' });
    }

    res.json({ audit });
  } catch (error) {
    console.error('Get latest audit error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get aggregate stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await persistence.getStats();
    res.json({ stats });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update audit
router.patch('/:id', async (req, res) => {
  try {
    const updates = req.body;
    
    // Prevent updating system fields
    delete updates.auditId;
    delete updates.timestamp;
    delete updates.createdAt;
    
    await persistence.updateAudit(req.params.id, updates);
    
    const updated = await persistence.getAudit(req.params.id);
    res.json({ audit: updated });
  } catch (error) {
    console.error('Update audit error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete audit
router.delete('/:id', async (req, res) => {
  try {
    await persistence.deleteAudit(req.params.id);
    res.json({ success: true, message: 'Audit deleted' });
  } catch (error) {
    console.error('Delete audit error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
