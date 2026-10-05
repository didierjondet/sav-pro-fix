import { Link } from 'react-router-dom';
import { LegalLayout, LegalSection } from '@/components/legal/LegalLayout';
import { LEGAL } from '@/lib/legalInfo';

export default function CGU() {
  return (
    <LegalLayout title="Conditions générales d'utilisation" description="Conditions d'utilisation du logiciel SAV Fixway pour les magasins et les particuliers.">
      <LegalSection title="1. Objet">
        <p>
          Les présentes conditions encadrent l'utilisation de {LEGAL.brand}, logiciel en ligne de gestion du service après-vente édité par {LEGAL.company}. Elles s'appliquent à toute personne qui utilise le service : magasins et réparateurs professionnels (« Professionnels ») et leurs clients particuliers (« Particuliers »).
        </p>
      </LegalSection>
      <LegalSection title="2. Accès au service">
        <p>Les Professionnels accèdent au service après création d'un compte protégé par un mot de passe ou une connexion Google. Ils sont responsables de la confidentialité de leurs identifiants et des comptes de leurs collaborateurs.</p>
        <p>Les Particuliers peuvent suivre leur dossier, consulter un devis, confirmer un rendez-vous ou répondre à une enquête par un lien personnel (lien ou QR code) sans créer de compte. Ce lien est personnel : ne le partagez pas. Pour la revente d'un appareil, un compte particulier Fixway est créé afin de consulter les estimations et d'échanger avec les magasins.</p>
      </LegalSection>
      <LegalSection title="3. Rôle de Fixway">
        <p>
          {LEGAL.brand} fournit un outil. Chaque magasin reste seul responsable des réparations, devis, prix, délais, garanties, offres de rachat et de la relation avec ses clients. {LEGAL.company} n'est pas partie aux contrats conclus entre un magasin et ses clients.
        </p>
      </LegalSection>
      <LegalSection title="4. Engagements des utilisateurs">
        <ul className="list-disc pl-5">
          <li>Fournir des informations exactes et à jour.</li>
          <li>Ne pas publier de contenu illicite, trompeur ou portant atteinte aux droits d'autrui.</li>
          <li>Ne pas tenter d'accéder aux données d'un autre magasin ou d'un autre client, ni perturber le service.</li>
          <li>Pour les Professionnels : informer leurs clients du traitement de leurs données et n'envoyer des SMS et e-mails commerciaux qu'avec leur accord.</li>
        </ul>
      </LegalSection>
      <LegalSection title="5. Disponibilité">
        <p>Nous faisons notre possible pour que le service soit accessible en permanence, sans pouvoir le garantir. Des interruptions pour maintenance ou mise à jour peuvent survenir.</p>
      </LegalSection>
      <LegalSection title="6. Inactivité et suppression">
        <p>Un compte magasin sans aucune activité pendant 90 jours peut être supprimé avec ses données, après avertissement affiché dans l'application. Un particulier peut supprimer son compte à tout moment depuis Mon espace.</p>
      </LegalSection>
      <LegalSection title="7. Suspension">
        <p>En cas de manquement aux présentes conditions, {LEGAL.company} peut suspendre ou fermer un compte, après information de l'utilisateur sauf urgence.</p>
      </LegalSection>
      <LegalSection title="8. Données personnelles">
        <p>Le traitement des données est décrit dans la <Link className="text-primary underline" to="/confidentialite">politique de confidentialité</Link>.</p>
      </LegalSection>
      <LegalSection title="9. Modification et droit applicable">
        <p>Ces conditions peuvent évoluer ; la version en vigueur est celle publiée sur cette page. Elles sont soumises au droit français. Pour toute question : {LEGAL.email}.</p>
      </LegalSection>
    </LegalLayout>
  );
}
