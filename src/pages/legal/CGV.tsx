import { LegalLayout, LegalSection } from '@/components/legal/LegalLayout';
import { LEGAL } from '@/lib/legalInfo';

export default function CGV() {
  return (
    <LegalLayout title="Conditions générales de vente" description="Conditions de vente des abonnements et packs SMS Fixway, édités par SAS HAPICS.">
      <LegalSection title="1. Champ d'application">
        <p>
          Les présentes conditions s'appliquent aux abonnements et services payants de {LEGAL.brand} vendus par {LEGAL.company} ({LEGAL.address}, {LEGAL.rcs}) à des clients professionnels. Toute souscription vaut acceptation de ces conditions.
        </p>
      </LegalSection>
      <LegalSection title="2. Offres">
        <p>Le service propose une formule gratuite limitée et des abonnements payants (Premium, Enterprise), ainsi que des packs de crédits SMS. Le contenu et les limites de chaque formule sont décrits sur la page Abonnement de l'application au moment de la souscription.</p>
      </LegalSection>
      <LegalSection title="3. Prix et paiement">
        <p>Les prix sont indiqués en euros hors taxes, la TVA en vigueur s'ajoute. Les abonnements sont payables d'avance, mensuellement, par carte bancaire via notre prestataire de paiement sécurisé Stripe. Les packs SMS sont payables à la commande. Une facture est mise à disposition dans l'application.</p>
      </LegalSection>
      <LegalSection title="4. Durée et résiliation">
        <p>L'abonnement est sans engagement de durée et se renouvelle chaque mois. Il peut être résilié à tout moment depuis l'application ; la résiliation prend effet à la fin de la période déjà payée, sans remboursement au prorata. Les crédits SMS achetés ne sont pas remboursables.</p>
      </LegalSection>
      <LegalSection title="5. Défaut de paiement">
        <p>En cas d'échec de paiement, le compte peut être ramené à la formule gratuite après relance. Les données restent accessibles dans les limites de cette formule.</p>
      </LegalSection>
      <LegalSection title="6. Droit de rétractation">
        <p>Les services étant vendus à des professionnels pour les besoins de leur activité, le droit de rétractation prévu pour les consommateurs ne s'applique pas.</p>
      </LegalSection>
      <LegalSection title="7. Responsabilité">
        <p>{LEGAL.company} est tenue d'une obligation de moyens. Sa responsabilité ne peut être engagée pour les dommages indirects (perte de chiffre d'affaires, de clientèle ou de données dues à l'utilisateur). Elle est limitée, tous dommages confondus, aux sommes payées par le client au cours des 12 derniers mois.</p>
      </LegalSection>
      <LegalSection title="8. Données du client">
        <p>Le client reste propriétaire de ses données. Il peut les exporter à tout moment depuis l'application. Pour les données de ses propres clients, {LEGAL.company} agit en tant que sous-traitant au sens du RGPD.</p>
      </LegalSection>
      <LegalSection title="9. Litiges">
        <p>Les présentes conditions sont soumises au droit français. À défaut d'accord amiable, tout litige sera porté devant les tribunaux compétents du ressort de la cour d'appel de Grenoble. Contact : {LEGAL.email}.</p>
      </LegalSection>
    </LegalLayout>
  );
}
