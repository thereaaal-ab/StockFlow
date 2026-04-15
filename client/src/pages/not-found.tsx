import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <Card className="mx-auto w-full max-w-md border-border shadow-lg">
        <CardContent className="space-y-4 pt-8">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-muted/30 text-destructive">
              <AlertCircle className="size-6" aria-hidden />
            </div>
            <div>
              <h1 className="page-heading">Page introuvable</h1>
              <p className="mt-1 text-sm text-muted-foreground">Erreur 404</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Cette adresse ne correspond à aucune page de l&apos;application. Vérifiez
            l&apos;URL ou revenez au tableau de bord.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
