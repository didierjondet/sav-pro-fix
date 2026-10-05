import { ReactNode, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { LEGAL, LEGAL_LINKS } from '@/lib/legalInfo';

interface Props {
  title: string;
  description: string;
  children: ReactNode;
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export function LegalLayout({ title, description, children }: Props) {
  useEffect(() => {
    document.title = `${title} | ${LEGAL.brand}`;
    let meta = document.querySelector("meta[name='description']");
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', description);
    window.scrollTo(0, 0);
  }, [title, description]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-xl font-black text-foreground">
            Fixway<span className="text-primary">Pro</span>
          </Link>
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Accueil
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="mb-2 text-3xl font-bold text-foreground">{title}</h1>
        <p className="mb-8 text-sm text-muted-foreground">Dernière mise à jour : {LEGAL.updatedAt}</p>
        <div className="space-y-8">{children}</div>
      </main>
      <footer className="border-t bg-card">
        <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-x-6 gap-y-2 px-4 py-6 text-sm">
          {LEGAL_LINKS.map((l) => (
            <Link key={l.to} to={l.to} className="text-muted-foreground hover:text-foreground">
              {l.label}
            </Link>
          ))}
          <Link to="/contact" className="text-muted-foreground hover:text-foreground">Contact</Link>
        </div>
        <p className="pb-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {LEGAL.brand} — un service de {LEGAL.company}
        </p>
      </footer>
    </div>
  );
}
