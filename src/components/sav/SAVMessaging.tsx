import { useProfile } from '@/hooks/useProfile';
import { MessagingInterface } from './MessagingInterface';

interface SAVMessagingProps {
  savCaseId: string;
  savCaseNumber: string;
  customerPhone?: string;
  customerName?: string;
}

export function SAVMessaging({ savCaseId, savCaseNumber, customerPhone, customerName }: SAVMessagingProps) {
  const { profile } = useProfile();

  if (!profile) {
    return <div>Chargement...</div>;
  }

  const senderName = `${profile.first_name} ${profile.last_name}`.trim() || 'Équipe SAV';

  return (
    <MessagingInterface
      savCaseId={savCaseId}
      userType="shop"
      caseNumber={savCaseNumber}
      senderName={senderName}
      customerPhone={customerPhone}
      customerName={customerName}
    />
  );
}