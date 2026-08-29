const fs = require('fs');

// 1. Fix AdminLayout.tsx
let layout = fs.readFileSync('src/components/admin/AdminLayout.tsx', 'utf8');
if (!layout.includes("import { ReportSourceAdminView }")) {
  layout = layout.replace("import { SystemSettingsView } from './SystemSettingsView';", "import { SystemSettingsView } from './SystemSettingsView';\nimport { ReportSourceAdminView } from './ReportSourceAdminView';");
  fs.writeFileSync('src/components/admin/AdminLayout.tsx', layout);
}

// 2. Fix ReportSourceAdminView.tsx
let adminView = fs.readFileSync('src/components/admin/ReportSourceAdminView.tsx', 'utf8');
adminView = adminView.replace("const { session } = useAuth();", "const { user } = useAuth();");
adminView = adminView.replace(/session\?\.access_token/g, "token");
const getTokenStr = `
  const getToken = async () => {
    const supabase = getSupabaseClient();
    const { data } = await supabase!.auth.getSession();
    return data.session?.access_token;
  };
`;
adminView = adminView.replace("const fetchSources = async () => {", getTokenStr + "\n  const fetchSources = async () => {\n    const token = await getToken();");
adminView = adminView.replace("const fetchOrgs = async () => {", "const fetchOrgs = async () => {\n    const token = await getToken();");
adminView = adminView.replace("const handleSave = async (e: React.FormEvent) => {", "const handleSave = async (e: React.FormEvent) => {\n    const token = await getToken();");
fs.writeFileSync('src/components/admin/ReportSourceAdminView.tsx', adminView);

// 3. Fix DailyReportFormView.tsx
let reportForm = fs.readFileSync('src/components/daily-reports/DailyReportFormView.tsx', 'utf8');
reportForm = reportForm.replace("const { user, session } = useAuth();", "const { user } = useAuth();");
reportForm = reportForm.replace(/session\?\.access_token/g, "token");
reportForm = reportForm.replace("const res = await fetch(`/api/report-sources", "const { data: sessionData } = await getSupabaseClient()!.auth.getSession();\n          const token = sessionData.session?.access_token;\n          const res = await fetch(`/api/report-sources");
// Fix CHANNELS reference if any. Oh, there shouldn't be any. Let's see if there is.
// Wait, CHANNELS was referenced in some error: src/components/daily-reports/DailyReportFormView.tsx(122,17): error TS2304: Cannot find name 'CHANNELS'.
// Ah, the regex to remove CHANNELS might have missed something, or there was another map.
reportForm = reportForm.replace(/\{CHANNELS\.map[^}]+\}\}/g, "");
fs.writeFileSync('src/components/daily-reports/DailyReportFormView.tsx', reportForm);

