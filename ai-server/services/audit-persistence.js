// Firestore persistence for audit results
// Stores audit history, enables re-audit tracking, links to customer profiles

const admin = require('firebase-admin');

class AuditPersistence {
  constructor() {
    // Initialize Firestore (assumes firebase-admin already initialized in server.js)
    this.db = admin.firestore();
    this.auditsCollection = this.db.collection('audits');
  }

  /**
   * Save audit result to Firestore
   * @param {Object} audit - Full audit object from AuditEngine
     * @param {string} consultantUid - Firebase auth UID of consultant (optional, for rules)
   * @returns {Promise<string>} Firestore document ID
   */
    async saveAudit(audit, consultantUid = null) {
    try {
      const docRef = await this.auditsCollection.add({
        ...audit,
          consultant_uid: consultantUid,
          client_id: audit.profileId || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return docRef.id;
    } catch (error) {
      console.error('Failed to save audit:', error);
      throw new Error(`Audit persistence failed: ${error.message}`);
    }
  }

  /**
   * Get audit by ID
   * @param {string} auditId - Firestore document ID
   * @returns {Promise<Object|null>} Audit object or null
   */
  async getAudit(auditId) {
    try {
      const doc = await this.auditsCollection.doc(auditId).get();
      
      if (!doc.exists) {
        return null;
      }

      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error('Failed to get audit:', error);
      throw new Error(`Audit retrieval failed: ${error.message}`);
    }
  }

  /**
   * Get all audits for a business (by name)
   * @param {string} businessName
   * @param {number} limit - Max results (default 50)
   * @returns {Promise<Array>} Array of audit objects
   */
  async getAuditsByBusiness(businessName, limit = 50) {
    try {
      const snapshot = await this.auditsCollection
        .where('businessName', '==', businessName)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Failed to get audits by business:', error);
      throw new Error(`Audit query failed: ${error.message}`);
    }
  }

  /**
   * Get all audits linked to a profile ID
   * @param {string} profileId - Customer profile ID
   * @param {number} limit - Max results (default 50)
   * @returns {Promise<Array>} Array of audit objects
   */
  async getAuditsByProfile(profileId, limit = 50) {
    try {
      const snapshot = await this.auditsCollection
        .where('profileId', '==', profileId)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Failed to get audits by profile:', error);
      throw new Error(`Audit query failed: ${error.message}`);
    }
  }

  /**
   * Get audit history for comparison (latest N audits for a business)
   * @param {string} businessName
   * @param {number} count - Number of audits to retrieve
   * @returns {Promise<Array>} Array of audit objects ordered newest to oldest
   */
  async getAuditHistory(businessName, count = 5) {
    try {
      const snapshot = await this.auditsCollection
        .where('businessName', '==', businessName)
        .orderBy('timestamp', 'desc')
        .limit(count)
        .get();

      const audits = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Calculate deltas if we have multiple audits
      if (audits.length > 1) {
        for (let i = 0; i < audits.length - 1; i++) {
          const current = audits[i];
          const previous = audits[i + 1];
          
          current.delta = {
            overall: current.scores.overall - previous.scores.overall,
            website: current.scores.website - previous.scores.website,
            gbp: current.scores.gbp - previous.scores.gbp,
            citations: current.scores.citations - previous.scores.citations,
            reviews: current.scores.reviews - previous.scores.reviews,
            social: current.scores.social - previous.scores.social,
            daysSince: Math.floor((new Date(current.timestamp) - new Date(previous.timestamp)) / (1000 * 60 * 60 * 24))
          };
        }
      }

      return audits;
    } catch (error) {
      console.error('Failed to get audit history:', error);
      throw new Error(`Audit history query failed: ${error.message}`);
    }
  }

  /**
   * Update audit (e.g., add notes, link to profile)
   * @param {string} auditId - Firestore document ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<void>}
   */
  async updateAudit(auditId, updates) {
    try {
      await this.auditsCollection.doc(auditId).update({
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Failed to update audit:', error);
      throw new Error(`Audit update failed: ${error.message}`);
    }
  }

  /**
   * Delete audit
   * @param {string} auditId - Firestore document ID
   * @returns {Promise<void>}
   */
  async deleteAudit(auditId) {
    try {
      await this.auditsCollection.doc(auditId).delete();
    } catch (error) {
      console.error('Failed to delete audit:', error);
      throw new Error(`Audit deletion failed: ${error.message}`);
    }
  }

  /**
   * Get latest audit for a business
   * @param {string} businessName
   * @returns {Promise<Object|null>}
   */
  async getLatestAudit(businessName) {
    try {
      const snapshot = await this.auditsCollection
        .where('businessName', '==', businessName)
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error('Failed to get latest audit:', error);
      throw new Error(`Latest audit query failed: ${error.message}`);
    }
  }

  /**
   * Get aggregate stats across all audits
   * @returns {Promise<Object>} Stats object
   */
  async getStats() {
    try {
      const snapshot = await this.auditsCollection.get();
      
      const stats = {
        totalAudits: snapshot.size,
        avgOverallScore: 0,
        avgByCategory: {
          website: 0,
          gbp: 0,
          citations: 0,
          reviews: 0,
          social: 0
        },
        issuesByCategory: {},
        issueBySeverity: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0
        }
      };

      if (snapshot.size === 0) {
        return stats;
      }

      let totalScores = {
        overall: 0,
        website: 0,
        gbp: 0,
        citations: 0,
        reviews: 0,
        social: 0
      };

      snapshot.forEach(doc => {
        const data = doc.data();
        
        // Aggregate scores
        if (data.scores) {
          Object.keys(totalScores).forEach(key => {
            totalScores[key] += data.scores[key] || 0;
          });
        }

        // Count issues
        if (data.issues && Array.isArray(data.issues)) {
          data.issues.forEach(issue => {
            // By category
            stats.issuesByCategory[issue.category] = (stats.issuesByCategory[issue.category] || 0) + 1;
            
            // By severity
            stats.issueBySeverity[issue.severity] = (stats.issueBySeverity[issue.severity] || 0) + 1;
          });
        }
      });

      // Calculate averages
      stats.avgOverallScore = Math.round(totalScores.overall / snapshot.size);
      Object.keys(stats.avgByCategory).forEach(key => {
        stats.avgByCategory[key] = Math.round(totalScores[key] / snapshot.size);
      });

      return stats;
    } catch (error) {
      console.error('Failed to get audit stats:', error);
      throw new Error(`Stats query failed: ${error.message}`);
    }
  }
}

module.exports = { AuditPersistence };
