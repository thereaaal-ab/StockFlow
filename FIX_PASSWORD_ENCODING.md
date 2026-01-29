# Problème : Mot de passe avec caractères spéciaux dans l'URL

Votre mot de passe contient des caractères spéciaux (`!` et `@`) qui doivent être **encodés en pourcentage** dans l'URL PostgreSQL.

## Votre mot de passe actuel :
```
brv!ERV9jqy@ynr3bnc
```

## Solution : Encoder le mot de passe dans l'URL

Dans votre fichier `.env`, remplacez la ligne `SUPABASE_DB_URL` :

### Avant (incorrect) :
```env
SUPABASE_DB_URL=postgresql://postgres:brv!ERV9jqy@ynr3bnc@db.trihldwbuukpqesttwnk.supabase.co:5432/postgres
```

### Après (correct) :
```env
SUPABASE_DB_URL=postgresql://postgres:brv%21ERV9jqy%40ynr3bnc@db.trihldwbuukpqesttwnk.supabase.co:5432/postgres
```

**Encodage :**
- `!` devient `%21`
- `@` devient `%40`

---

## Alternative : Utiliser la connection string depuis Supabase

1. Allez sur : https://supabase.com/dashboard/project/trihldwbuukpqesttwnk
2. **Settings** → **Database**
3. **Connection string** → **URI**
4. **Copiez la chaîne complète** (elle sera déjà correctement encodée)
5. Collez-la dans votre `.env` à la place de `SUPABASE_DB_URL`

---

## Vérification

Après avoir corrigé l'URL, **redémarrez le serveur** et regardez dans les logs :
- Vous devriez voir : `🔍 SUPABASE_DB_URL loaded: ✅ Yes`
- Si vous voyez `❌ No`, le fichier `.env` n'est pas chargé
