const fs = require('fs');
let code = fs.readFileSync('src/services/metric.service.ts', 'utf-8');

code = code.replace(/order\('period_date', \{ ascending: false \}\)/g, "order('period_start', { ascending: false })");

code = code.replace(/if \(filters\?\.period_date\) \{[\s\S]*?\}/g, `if (filters?.period_start) {
        query = query.eq('period_start', filters.period_start);
      }
      if (filters?.period_end) {
        query = query.eq('period_end', filters.period_end);
      }`);

code = code.replace(/if \(!payload\.period_date\) \{[\s\S]*?\}/g, `if (!payload.period_start || !payload.period_end) {
      throw new Error('Kỳ báo cáo không được để trống.');
    }`);
    
code = code.replace(/period_date: payload\.period_date,/g, "");

fs.writeFileSync('src/services/metric.service.ts', code);
