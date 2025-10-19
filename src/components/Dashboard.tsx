import React from 'react';
import { StatusIndicator } from './StatusIndicator';

const Dashboard: React.FC = () => {
  // Placeholder data for audits and reports
  const audits = [
    { id: 1, name: 'Q3 Financial Audit', status: 'Completed', date: '2025-09-30' },
    { id: 2, name: 'Security Review', status: 'In Progress', date: '2025-10-10' },
  ];
  const reports = [
    { id: 1, title: 'Q3 Summary', date: '2025-09-30' },
    { id: 2, title: 'Security Findings', date: '2025-10-10' },
  ];

  return (
    <div className="dashboard-container">
      <header>
        <h1>Business Audit Dashboard</h1>
        <StatusIndicator />
      </header>
      <section>
        <h2>Audit Status</h2>
        <ul>
          {audits.map(audit => (
            <li key={audit.id}>
              <strong>{audit.name}</strong> - {audit.status} ({audit.date})
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Recent Reports</h2>
        <ul>
          {reports.map(report => (
            <li key={report.id}>
              <strong>{report.title}</strong> ({report.date})
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Quick Actions</h2>
        <button>Start New Audit</button>
        <button>Generate Report</button>
      </section>
    </div>
  );
};

export default Dashboard;
