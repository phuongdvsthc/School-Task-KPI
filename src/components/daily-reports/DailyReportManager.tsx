import React, { useState, useEffect } from 'react';
import { DailyReportCalendarView } from './DailyReportCalendarView';
import { dailyReportService } from '../../services/daily-report.service';

export const DailyReportManager: React.FC = () => {
  const [currentHash, setCurrentHash] = useState(window.location.hash);

  useEffect(() => {
    const onHashChange = () => setCurrentHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const cleanRoute = currentHash.replace(/^#\/?/, '').split('?')[0];

  // Handle redirect from old /daily-reports/new -> /daily-reports?date=today
  if (cleanRoute === 'daily-reports/new') {
    const todayStr = new Date().toISOString().split('T')[0];
    const monthStr = todayStr.substring(0, 7);
    window.location.replace(`#/daily-reports?month=${monthStr}&date=${todayStr}`);
    return null;
  }

  // Handle redirect from old /daily-reports/:id/edit
  const editMatch = cleanRoute.match(/^daily-reports\/([^/]+)\/edit$/);
  if (editMatch) {
    const id = editMatch[1];
    // Async lookup or fallback
    dailyReportService.getDailyReportById(id).then((rep) => {
      if (rep?.report_date) {
        const m = rep.report_date.substring(0, 7);
        window.location.replace(`#/daily-reports?month=${m}&date=${rep.report_date}`);
      } else {
        window.location.replace('#/daily-reports');
      }
    }).catch(() => {
      window.location.replace('#/daily-reports');
    });
    return null;
  }

  return <DailyReportCalendarView key={`calendar-daily-reports`} />;
};

export default DailyReportManager;
