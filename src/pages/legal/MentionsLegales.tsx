import { LegalLayout, LegalSection } from '@/components/legal/LegalLayout';
import { LEGAL } from '@/lib/legalInfo';

export default function MentionsLegales() {
  return (
    <LegalLayout title="Mentions légales" description="Mentions légales du service Fixway, édité par SAS HAPICS (Valence, Drôme).">
      <LegalSection title="Éditeur du site">
        <p>
          Le site {LEGAL.site} et le logiciel {LEGAL.brand} sont édités par <strong>{LEGAL.company}</strong>, {LEGAL.legalForm.toLowerCase()} au capital de {LEGAL.capital}.
        </p>
        <ul className="list-disc pl-5">
          <li>Siège social : {LEGAL.address}</li>
          <li>SIREN : {LEGAL.siren} — {LEGAL.rcs}</li>
          <li>TVA intracommunautaire : {LEGAL.vat}</li>
          <li>Code APE : {LEGAL.ape}</li>
          <li>Contact : <a className="text-primary underline" href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a></li>
        </ul>
      </LegalSection>
      <LegalSection title="Directeur de la publication">
        <p>{LEGAL.director}, Président de {LEGAL.company}.</p>
      </LegalSection>
      <LegalSection title="Hébergement">
        <p>
          Le site est hébergé par un prestataire d'hébergement en nuage. Les données de l'application sont stockées par Supabase Inc. (970 Toa Payoh North, Singapour), sur des serveurs situés dans l'Union européenne.
        </p>
      </LegalSection>
      <LegalSection title="Propriété intellectuelle">
        <p>
          L'ensemble des éléments du site et du logiciel (textes, logos, interfaces, code) est la propriété de {LEGAL.company} ou de ses partenaires. Toute reproduction ou représentation, totale ou partielle, sans autorisation écrite préalable est interdite.
        </p>
        <p>Les contenus publiés par les magasins utilisateurs (photos, textes, tarifs) restent leur propriété.</p>
      </LegalSection>
      <LegalSection title="Signalement d'un contenu">
        <p>Tout contenu illicite peut être signalé à l'adresse {LEGAL.email}. Nous le traiterons dans les meilleurs délais.</p>
      </LegalSection>
    </LegalLayout>
  );
}
