import React, { useState, useEffect } from 'react';
import { DailyReportListView } from './DailyReportListView';
import { DailyReportFormView } from './DailyReportFormView';

export const DailyReportManager: React.FC = () => {
  const [currentHash, setCurrentHash] = useState(window.location.hash);

  useEffect(() => {
    const onHashChange = () => setCurrentHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const cleanRoute = currentHash.replace(/^#\/?/, '').split('?')[0];
  
  if (cleanRoute === 'daily-reports/new') {
    return <DailyReportFormView id={undefined} key="new-daily-report" />;
  }
  
  const editMatch = cleanRoute.match(/^daily-reports\/([^/]+)\/edit$/);
  if (editMatch) {
    const id = editMatch[1];
    return <DailyReportFormView id={id} key={`edit-daily-report-${id}`} />;
  }

  return <DailyReportListView key={`list-daily-reports-${cleanRoute}`} />;
};

