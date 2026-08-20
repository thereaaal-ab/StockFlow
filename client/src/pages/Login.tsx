import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Chrome } from "lucide-react";

/**
 * Écran d'arrivée — registre encre + trame pointillée jaune, le motif de
 * marque R0. Le titre est un bloc compact en 800, la promesse est chiffrée,
 * et le seul `bold` de l'écran est le bouton de connexion.
 */
export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const { signInWithGoogle } = useAuth();
  const { toast } = useToast();

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error("Error signing in with Google:", error);
      toast({
        title: "Erreur de connexion",
        description:
          error?.message ||
          "Impossible de se connecter avec Google. Veuillez réessayer.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-900 p-4">
      {/* Trame pointillée jaune — sur surfaces encre uniquement. */}
      <div className="ro-dots pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative z-[1] w-full max-w-[440px] animate-ro-reveal">
        <div className="rounded-3xl border border-ink-700 bg-ink-850 p-8 shadow-overlay sm:p-10">
          <div className="flex items-center gap-3">
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand-500 font-mono text-base font-extrabold text-ink-850"
              style={{ fontFeatureSettings: "'zero' 1" }}
              aria-hidden
            >
              R0
            </div>
            <div className="ro-overline text-[11px] text-ink-400">
              Inventaire · Rushorder
            </div>
          </div>

          <h1 className="mt-7 text-[36px] font-extrabold leading-[0.95] tracking-display text-[#F6F8F7] sm:text-[42px]">
            Votre matériel,
            <br />
            <span className="ro-highlight text-ink-850">tout entier</span> dans
            un système.
          </h1>

          <p className="mt-4 text-[15px] leading-relaxed text-ink-300">
            Stock, clients, commandes et marges — une seule donnée, mise à jour
            en direct. Connectez-vous pour reprendre là où vous en étiez.
          </p>

          <Button
            type="button"
            variant="brand"
            size="lg"
            className="mt-8 w-full"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            data-testid="button-google-signin"
          >
            <Chrome />
            {isLoading ? "Connexion…" : "Continuer avec Google"}
          </Button>

          <p className="mt-5 text-center text-[13px] text-ink-500">
            En vous connectant, vous acceptez nos conditions d&apos;utilisation.
          </p>
        </div>

        {/* Le chiffre porte la phrase : trois repères, en mono. */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { k: "0 %", v: "commission" },
            { k: "1 ×", v: "saisie" },
            { k: "24/7", v: "à jour" },
          ].map((s) => (
            <div
              key={s.v}
              className="rounded-lg border border-ink-700 bg-ink-850/60 px-3 py-3 text-center"
            >
              <div className="ro-data text-lg font-bold text-brand-500">
                {s.k}
              </div>
              <div className="ro-overline mt-1 text-[9px] text-ink-400">
                {s.v}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
