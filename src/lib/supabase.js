/**
 * Client Supabase partagé pour toute l'application.
 * Configuration via les variables d'environnement Vite (.env.local) :
 *   VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
 *
 * Si les variables sont absentes, on exporte `null` et `isConfigured = false` —
 * c'est à l'appelant (App.jsx, storage.js) de gérer ce cas proprement.
 */

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && anonKey);

export const supabase = isConfigured
  ? createClient(url, anonKey, {
      auth: {
        // Pour l'instant pas d'authentification utilisateur — on tape l'API
        // avec la clé anon en lecture/écriture (RLS désactivée côté tables MVP).
        persistSession: false,
      },
    })
  : null;
