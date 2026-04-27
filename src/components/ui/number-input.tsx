import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * NumberInput — drop-in replacement for `<Input type="number" />`.
 *
 * Comportement :
 *  - Si la valeur métier vaut 0 (ou undefined / null / NaN), l'input est visuellement vide
 *    et n'affiche que le placeholder. Plus de "0" parasite qu'il faut effacer à la main.
 *  - Au focus, le contenu est automatiquement sélectionné — la prochaine frappe remplace tout.
 *  - La molette de la souris ne modifie plus la valeur (blur au scroll).
 *  - Au blur, si l'input est vide, on renvoie `0` au parent (compat avec les states number).
 *  - Pendant la saisie, on conserve un état string interne pour autoriser "", "0.", ".5", etc.
 *
 * API compatible avec `<Input type="number" />` : value, onChange (event), onBlur, min, max,
 * step, placeholder, className, disabled, etc. Les composants appelants n'ont rien à changer.
 */

type InputProps = React.ComponentProps<"input">;

const NumberInput = React.forwardRef<HTMLInputElement, Omit<InputProps, "type">>(
  ({ className, value, onChange, onFocus, onBlur, onWheel, ...props }, ref) => {
    // Normalise la valeur extérieure en string affichable.
    const externalToDisplay = React.useCallback((v: unknown): string => {
      if (v === undefined || v === null || v === "") return "";
      const n = typeof v === "number" ? v : Number(v);
      if (Number.isNaN(n)) return "";
      // Cœur du correctif : 0 = champ vide.
      if (n === 0) return "";
      return String(v);
    }, []);

    const [internal, setInternal] = React.useState<string>(() => externalToDisplay(value));
    const focusedRef = React.useRef(false);

    // Resync avec la valeur externe uniquement quand le champ n'est pas en cours d'édition,
    // pour ne pas casser la saisie d'un utilisateur qui tape "0." ou "12.".
    React.useEffect(() => {
      if (!focusedRef.current) {
        setInternal(externalToDisplay(value));
      }
    }, [value, externalToDisplay]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInternal(e.target.value);
      onChange?.(e);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      focusedRef.current = true;
      // Sélectionne tout pour qu'une frappe remplace la valeur.
      requestAnimationFrame(() => {
        try {
          e.target.select();
        } catch {
          /* noop */
        }
      });
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      focusedRef.current = false;
      // Si l'utilisateur a vidé le champ, on émet "0" au parent (compat states number).
      if (e.target.value === "" || e.target.value === "-" || e.target.value === ".") {
        const synthetic = {
          ...e,
          target: { ...e.target, value: "0" },
          currentTarget: { ...e.currentTarget, value: "0" },
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        onChange?.(synthetic);
        setInternal("");
      } else {
        // Resync depuis la valeur externe (peut avoir été normalisée par le parent).
        setInternal(externalToDisplay(value));
      }
      onBlur?.(e);
    };

    const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
      // Empêche les changements involontaires à la molette.
      (e.currentTarget as HTMLInputElement).blur();
      onWheel?.(e);
    };

    return (
      <input
        type="number"
        inputMode="decimal"
        ref={ref}
        value={internal}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onWheel={handleWheel}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        {...props}
      />
    );
  }
);
NumberInput.displayName = "NumberInput";

export { NumberInput };
