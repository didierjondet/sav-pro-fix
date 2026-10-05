import { Link } from 'react-router-dom';
import { LegalLayout, LegalSection } from '@/components/legal/LegalLayout';
import { LEGAL } from '@/lib/legalInfo';

export default function Confidentialite() {
  return (
    <LegalLayout title="Politique de confidentialité" description="Comment Fixway (SAS HAPICS) protège vos données personnelles, conformément au RGPD.">
      <LegalSection title="1. Qui est responsable de vos données ?">
        <p>
          <strong>{LEGAL.company}</strong>, {LEGAL.address}, éditeur de {LEGAL.brand}, est responsable des données des magasins utilisateurs, des visiteurs du site et des comptes particuliers créés pour la revente d'appareils.
        </p>
        <p>
          Pour les données des clients d'un magasin (dossiers SAV, devis, rendez-vous, messages), le <strong>magasin est responsable du traitement</strong> et {LEGAL.company} agit comme sous-traitant, sur ses instructions.
        </p>
        <p>Contact pour toute question sur vos données : <a className="text-primary underline" href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.</p>
      </LegalSection>
      <LegalSection title="2. Données collectées">
        <ul className="list-disc pl-5">
          <li><strong>Magasins et collaborateurs :</strong> nom, prénom, e-mail, téléphone, informations du magasin, données de connexion (date, ville approximative), données de facturation.</li>
          <li><strong>Clients des magasins :</strong> nom, coordonnées, appareil confié (marque, modèle, numéro de série ou IMEI), panne, codes de déverrouillage si vous les communiquez, photos, messages, devis et historique de réparation.</li>
          <li><strong>Particuliers vendeurs :</strong> compte (e-mail, mot de passe ou connexion Google), coordonnées, description et photos de l'appareil, offres reçues, messages, consentement marketing.</li>
          <li><strong>Visiteurs :</strong> messages envoyés via le formulaire de contact, pages consultées (mesure d'usage interne).</li>
        </ul>
      </LegalSection>
      <LegalSection title="3. Pourquoi et sur quelle base ?">
        <ul className="list-disc pl-5">
          <li>Fournir le logiciel et gérer les comptes : exécution du contrat.</li>
          <li>Suivi des réparations, devis, SMS et e-mails de suivi : exécution du contrat entre le magasin et son client.</li>
          <li>Facturation et obligations comptables : obligation légale.</li>
          <li>Sécurité, prévention de la fraude, amélioration du service : intérêt légitime.</li>
          <li>Offres commerciales aux particuliers (4 offres par an maximum) : consentement, retirable à tout moment.</li>
        </ul>
      </LegalSection>
      <LegalSection title="4. Durées de conservation">
        <ul className="list-disc pl-5">
          <li>Compte magasin : pendant l'abonnement ; suppression après 90 jours d'inactivité.</li>
          <li>Dossiers SAV et devis : pendant la durée choisie par le magasin, dans la limite de ses obligations légales.</li>
          <li>Factures : 10 ans (obligation comptable).</li>
          <li>Compte particulier : jusqu'à sa suppression par l'utilisateur ; 3 ans après la dernière activité au plus.</li>
          <li>Messages de contact : 3 ans maximum.</li>
        </ul>
      </LegalSection>
      <LegalSection title="5. Destinataires et sous-traitants">
        <p>Vos données ne sont jamais vendues. Elles sont accessibles au magasin concerné et, pour l'exploitation du service, à nos prestataires :</p>
        <ul className="list-disc pl-5">
          <li>Hébergement et base de données (Supabase, serveurs dans l'Union européenne).</li>
          <li>Envoi de SMS et d'e-mails (Twilio, Brevo, Resend).</li>
          <li>Paiement des abonnements (Stripe).</li>
          <li>Fonctions d'intelligence artificielle (estimation, reformulation, diagnostic) : seules les informations nécessaires sont transmises.</li>
          <li>Connexion Google, si vous la choisissez.</li>
        </ul>
        <p>Certains prestataires peuvent traiter des données hors de l'Union européenne ; ces transferts sont encadrés par les clauses contractuelles types de la Commission européenne.</p>
      </LegalSection>
      <LegalSection title="6. Sécurité">
        <p>Connexions chiffrées, cloisonnement strict des données de chaque magasin, mots de passe jamais stockés en clair, clés techniques chiffrées, double authentification pour les administrateurs.</p>
      </LegalSection>
      <LegalSection title="7. Vos droits">
        <p>Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition, de portabilité et du droit de retirer votre consentement. Les particuliers peuvent modifier leurs préférences ou supprimer leur compte directement dans Mon espace.</p>
        <p>Pour exercer vos droits, écrivez à {LEGAL.email}. Si votre demande concerne une réparation, adressez-vous d'abord au magasin, responsable de ces données ; nous l'aiderons à vous répondre. Réponse sous un mois.</p>
        <p>Vous pouvez introduire une réclamation auprès de la CNIL (cnil.fr).</p>
      </LegalSection>
      <LegalSection title="8. Cookies">
        <p>Voir notre <Link className="text-primary underline" to="/cookies">page cookies</Link>.</p>
      </LegalSection>
    </LegalLayout>
  );
}
