import { LegalLayout, LegalSection } from '@/components/legal/LegalLayout';
import { LEGAL } from '@/lib/legalInfo';

export default function Cookies() {
  return (
    <LegalLayout title="Cookies et traceurs" description="Les cookies et le stockage local utilisés par Fixway : uniquement le strict nécessaire.">
      <LegalSection title="Ce que nous utilisons">
        <ul className="list-disc pl-5">
          <li><strong>Connexion :</strong> stockage local de votre session pour rester connecté. Indispensable, sans consentement requis.</li>
          <li><strong>Préférences :</strong> thème clair ou sombre, filtres et affichages choisis. Indispensable.</li>
          <li><strong>Mesure d'usage interne :</strong> pages consultées par les utilisateurs connectés, pour améliorer le logiciel. Données non partagées, non utilisées pour de la publicité.</li>
        </ul>
      </LegalSection>
      <LegalSection title="Ce que nous n'utilisons pas">
        <p>Aucun cookie publicitaire, aucun traceur de réseau social, aucune revente de données.</p>
      </LegalSection>
      <LegalSection title="Gérer ces données">
        <p>Vous pouvez effacer le stockage du site depuis les réglages de votre navigateur ; vous serez alors déconnecté. Questions : {LEGAL.email}.</p>
      </LegalSection>
    </LegalLayout>
  );
}
