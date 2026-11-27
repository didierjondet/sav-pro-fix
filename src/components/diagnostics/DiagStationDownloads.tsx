import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Download, Laptop, Monitor, Terminal, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const RELEASE_URL = 'https://api.github.com/repos/didierjondet/diagstation-releases/releases/latest';
const CACHE_KEY = 'fixway_diagstation_latest_release';
const CACHE_DURATION = 60 * 60 * 1000;

type OperatingSystem = 'mac' | 'windows' | 'linux' | 'other';

type ReleaseInfo = {
  tag_name: string;
  published_at: string;
};

type DownloadItem = {
  id: string;
  label: string;
  url: string;
  icon: LucideIcon;
};

const DOWNLOADS: DownloadItem[] = [
  {
    id: 'mac-apple-silicon',
    label: 'Mac (Apple Silicon M1–M4)',
    url: 'https://github.com/didierjondet/diagstation-releases/releases/latest/download/DiagStation-mac-apple-silicon.dmg',
    icon: Laptop,
  },
  {
    id: 'mac-intel',
    label: 'Mac (Intel)',
    url: 'https://github.com/didierjondet/diagstation-releases/releases/latest/download/DiagStation-mac-intel.dmg',
    icon: Laptop,
  },
  {
    id: 'windows',
    label: 'Windows 10/11',
    url: 'https://github.com/didierjondet/diagstation-releases/releases/latest/download/DiagStation-windows.exe',
    icon: Monitor,
  },
  {
    id: 'linux-appimage',
    label: 'Linux (AppImage)',
    url: 'https://github.com/didierjondet/diagstation-releases/releases/latest/download/DiagStation-linux.AppImage',
    icon: Terminal,
  },
  {
    id: 'linux-deb',
    label: 'Linux (.deb)',
    url: 'https://github.com/didierjondet/diagstation-releases/releases/latest/download/DiagStation-linux.deb',
    icon: Terminal,
  },
];

function detectOperatingSystem(): OperatingSystem {
  if (typeof navigator === 'undefined') return 'other';

  const navigatorWithData = navigator as Navigator & {
    userAgentData?: { platform?: string };
  };
  const platform = `${navigatorWithData.userAgentData?.platform ?? ''} ${navigator.userAgent}`.toLowerCase();

  if (platform.includes('mac')) return 'mac';
  if (platform.includes('win')) return 'windows';
  if (platform.includes('linux')) return 'linux';
  return 'other';
}

export function DiagStationDownloads() {
  const [release, setRelease] = useState<ReleaseInfo | null>(null);
  const [operatingSystem] = useState<OperatingSystem>(detectOperatingSystem);

  useEffect(() => {
    let cancelled = false;

    const loadRelease = async () => {
      try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as ReleaseInfo & { cachedAt: number };
          if (
            Date.now() - parsed.cachedAt < CACHE_DURATION &&
            typeof parsed.tag_name === 'string' &&
            typeof parsed.published_at === 'string'
          ) {
            setRelease({ tag_name: parsed.tag_name, published_at: parsed.published_at });
            return;
          }
        }
      } catch {
        // Un cache indisponible ne doit pas empêcher les téléchargements.
      }

      try {
        const response = await fetch(RELEASE_URL);
        if (!response.ok) return;
        const data = await response.json();
        if (
          cancelled ||
          typeof data.tag_name !== 'string' ||
          typeof data.published_at !== 'string'
        ) return;

        const latest = { tag_name: data.tag_name, published_at: data.published_at };
        setRelease(latest);
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ...latest, cachedAt: Date.now() }));
        } catch {
          // Le téléchargement reste disponible sans stockage de session.
        }
      } catch {
        // La version est facultative : les liens fixes restent utilisables hors ligne de GitHub.
      }
    };

    void loadRelease();
    return () => { cancelled = true; };
  }, []);

  const versionLabel = useMemo(() => {
    if (!release) return null;
    const version = release.tag_name.replace(/^v/i, '');
    const publishedAt = new Date(release.published_at);
    if (Number.isNaN(publishedAt.getTime())) return `Version ${version}`;
    return `Version ${version} · publiée le ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(publishedAt)}`;
  }, [release]);

  const primaryDownload = operatingSystem === 'mac'
    ? 'mac-apple-silicon'
    : operatingSystem === 'windows'
      ? 'windows'
      : operatingSystem === 'linux'
        ? 'linux-appimage'
        : null;

  return (
    <Card aria-label="Télécharger DiagStation">
      <CardHeader>
        <CardTitle>Logiciel DiagStation</CardTitle>
        <CardDescription>
          Station de diagnostic smartphones &amp; tablettes. Les rapports arrivent automatiquement dans cette liste.
        </CardDescription>
        {versionLabel && <p className="text-sm text-muted-foreground">{versionLabel}</p>}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {DOWNLOADS.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                asChild
                variant={item.id === primaryDownload ? 'default' : 'outline'}
                className="h-auto min-h-10 whitespace-normal py-2 text-left"
              >
                <a href={item.url} download aria-label={`Télécharger DiagStation pour ${item.label}`}>
                  <Icon />
                  <span>{item.label}</span>
                  <Download />
                </a>
              </Button>
            );
          })}
        </div>

        <details className="rounded-md border bg-muted/30">
          <summary className="flex cursor-pointer items-center justify-between gap-2 p-3 text-sm font-medium">
            Première installation
            <ChevronDown className="h-4 w-4 shrink-0" />
          </summary>
          <ul className="space-y-3 border-t p-3 text-sm text-muted-foreground">
            <li>
              <strong className="text-foreground">Mac :</strong> ouvrez le .dmg, puis glissez DiagStation dans Applications.
              Au premier lancement : clic droit sur l’app → Ouvrir → Ouvrir (ou Réglages Système → Confidentialité et sécurité → « Ouvrir quand même »).
            </li>
            <li>
              <strong className="text-foreground">Windows :</strong> si « Windows a protégé votre ordinateur » s’affiche :
              « Informations complémentaires » → « Exécuter quand même ».
            </li>
            <li>
              <strong className="text-foreground">Linux :</strong> rendez l’AppImage exécutable
              (clic droit → Propriétés → Autoriser l’exécution) ou installez le .deb.
            </li>
            <li>
              <strong className="text-foreground">Connexion à Fixway :</strong> dans DiagStation → Réglages → Passerelle Fixway,
              collez une clé API générée dans les <Link to="/settings?tab=diagstation" className="font-medium text-primary underline underline-offset-4">réglages DiagStation de Fixway</Link>.
            </li>
            <li>
              <strong className="text-foreground">Téléphones :</strong> sous Android, l’application de test s’installe automatiquement
              sur le téléphone en le branchant ; sur iPhone/iPad, le test se fait via le navigateur (QR code).
            </li>
          </ul>
        </details>
      </CardContent>
    </Card>
  );
}
