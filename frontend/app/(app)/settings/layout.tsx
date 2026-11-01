import { SettingsHeader } from '@/components/settings/settings-header';
import { SettingsNav } from '@/components/settings/settings-nav';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6 animate-in-up">
      <SettingsHeader />
      <SettingsNav />
      <div>{children}</div>
    </div>
  );
}
