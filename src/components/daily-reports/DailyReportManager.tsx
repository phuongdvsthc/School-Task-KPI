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

  const route = currentHash.replace('#/', '').replace('#', '');
  
  if (route === 'daily-reports/new') {
    return <DailyReportFormView id={undefined} />;
  }
  if (route.startsWith('daily-reports/') && route.endsWith('/edit')) {
    const id = route.split('/')[1];
    return <DailyReportFormView id={id} />;
  }

  return <DailyReportListView />;
};
