import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Chrome } from "lucide-react";

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-60"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, hsl(239 84% 67% / 0.35), transparent 55%), radial-gradient(ellipse 60% 40% at 100% 0%, hsl(188 94% 43% / 0.12), transparent)",
        }}
      />
      <Card className="relative z-[1] w-full max-w-md border-border/80 shadow-xl">
        <CardHeader className="space-y-2 pb-2 text-center">
          <div className="mx-auto mb-1 flex size-11 items-center justify-center rounded-xl bg-primary/15 text-sm font-bold text-primary ring-1 ring-primary/20">
            IP
          </div>
          <CardTitle className="page-heading">
            Inventaire Pro
          </CardTitle>
          <CardDescription className="text-sm">
            Connectez-vous pour accéder à votre tableau de bord
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <Button
            type="button"
            className="h-11 w-full rounded-lg text-base font-medium shadow-sm"
            variant="default"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            <Chrome className="mr-2 h-5 w-5" />
            {isLoading ? "Connexion..." : "Continuer avec Google"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            En vous connectant, vous acceptez nos conditions d&apos;utilisation
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
