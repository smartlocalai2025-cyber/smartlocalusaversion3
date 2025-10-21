const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const persistence = require('../services/audit-persistence');

// POST /api/profile - Create or update a business profile
router.post('/', async (req, res) => {
  try {
    const { name, website, location, industry, notes, placesData } = req.body;
    if (!name) return res.status(400).json({ error: 'Business name is required' });

    // Try to find existing profile by name (or other unique key)
    let profile = await persistence.getProfileByName(name);
    if (!profile) {
      // Create new profile
      profile = {
        id: uuidv4(),
        name,
        website,
        location,
        industry,
        notes,
        placesData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } else {
      // Update existing profile
      profile = {
        ...profile,
        website,
        location,
        industry,
        notes,
        placesData,
        updatedAt: new Date().toISOString(),
      };
    }
    await persistence.saveProfile(profile);
    res.json({ profile });
  } catch (error) {
    console.error('Profile create/update error:', error);
    res.status(500).json({ error: 'Failed to create or update profile' });
  }
});

module.exports = router;
