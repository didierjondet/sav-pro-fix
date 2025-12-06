import { useProfile } from '@/hooks/useProfile';
import { MessagingInterface } from './MessagingInterface';

interface SAVMessagingProps {
  savCaseId: string;
  savCaseNumber: string;
  customerPhone?: string;
  customerName?: string;
  shopId?: string;
  customerId?: string;
  showSatisfactionButton?: boolean;
}

export function SAVMessaging({ 
  savCaseId, 
  savCaseNumber, 
  customerPhone, 
  customerName,
  shopId,
  customerId,
  showSatisfactionButton = false
}: SAVMessagingProps) {
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
      shopId={shopId}
      customerId={customerId}
      showSatisfactionButton={showSatisfactionButton}
    />
  );
}
