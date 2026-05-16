import { redirect } from 'next/navigation';
import { isAdminFromCookies } from '@/lib/admin-auth';
import AdminConsole from './AdminConsole';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function AdminPage() {
  if (!isAdminFromCookies()) {
    redirect('/admin/login');
  }
  return <AdminConsole />;
}
