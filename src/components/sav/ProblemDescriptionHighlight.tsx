import { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface FieldProps {
  children: ReactNode;
  action?: ReactNode;
  required?: boolean;
}

const wrapperClasses =
  "rounded-xl border border-primary/20 border-l-[6px] border-l-primary " +
  "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent " +
  "ring-1 ring-primary/20 shadow-md p-5 space-y-3";

function Header({ required }: { required?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
        <AlertCircle className="h-4 w-4" />
      </span>
      <div>
        <h3 className="text-base font-bold tracking-wide">
          Description du problème {required && <span className="text-destructive">*</span>}
        </h3>
        <p className="text-xs text-muted-foreground">Information clé du dossier</p>
      </div>
    </div>
  );
}

export function ProblemDescriptionField({ children, action, required }: FieldProps) {
  return (
    <div className={wrapperClasses}>
      <div className="flex items-center justify-between gap-2">
        <Header required={required} />
        {action}
      </div>
      <div className="[&_textarea]:bg-card [&_textarea]:border-primary/30 [&_textarea]:focus-visible:ring-primary [&_textarea]:min-h-[110px]">
        {children}
      </div>
    </div>
  );
}

interface DisplayProps {
  value?: string | null;
}

export function ProblemDescriptionDisplay({ value }: DisplayProps) {
  return (
    <div className={wrapperClasses}>
      <Header />
      <p className="text-foreground whitespace-pre-wrap leading-relaxed">
        {value || <span className="italic text-muted-foreground">Aucune description renseignée</span>}
      </p>
    </div>
  );
}
