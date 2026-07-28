import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Ban, Copy, KeyRound, ShieldAlert, FileJson, Download, ExternalLink } from 'lucide-react';

const API_BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-v1/api/v1`;
const SPEC_YAML_URL = `${window.location.origin}/openapi/powertech-api-v1.yaml`;
const SPEC_JSON_URL = `${window.location.origin}/openapi/powertech-api-v1.json`;

const SCOPES = [
  'clients:read', 'clients:write',
  'vehicles:read', 'vehicles:write',
  'appointments:read', 'appointments:write',
  'quotes:read', 'quotes:write',
  'availability:read',
  'maintenance:read', 'maintenance:write',
  'audit:read',
] as const;

const DEFAULT_ASSISTANT_SCOPES = SCOPES.filter((s) => s !== 'audit:read');

interface Integration {
  id: string;
  name: string;
  description: string | null;
  scopes: string[];
  key_prefix: string;
  active: boolean;
  expires_at: string | null;
  revoked_at: string | null;
  last_used_at: string | null;
  created_at: string;
}

interface AuditRow {
  id: string;
  integration_id: string | null;
  integration_name: string | null;
  resource: string;
  record_id: string | null;
  operation: string;
  result: string;
  denial_reason: string | null;
  request_id: string;
  ip_address: string | null;
  created_at: string;
}

function randomKey() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(input: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('fr-FR');
}

export default function ApiIntegrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scopes, setScopes] = useState<string[]>([...DEFAULT_ASSISTANT_SCOPES]);
  const [expiresAt, setExpiresAt] = useState('');

  const [filterIntegration, setFilterIntegration] = useState('all');
  const [filterResource, setFilterResource] = useState('all');

  const loadAudit = useCallback(async () => {
    let q = supabase.from('api_audit_log').select('*').order('created_at', { ascending: false }).limit(200);
    if (filterIntegration !== 'all') q = q.eq('integration_id', filterIntegration);
    if (filterResource !== 'all') q = q.eq('resource', filterResource);
    const { data } = await q;
    setAudit((data ?? []) as AuditRow[]);
  }, [filterIntegration, filterResource]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('api_integrations')
      .select('id, name, description, scopes, key_prefix, active, expires_at, revoked_at, last_used_at, created_at')
      .order('created_at', { ascending: false });
    if (error) toast.error("Accès refusé ou erreur de chargement");
    setIntegrations((data ?? []) as Integration[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadAudit(); }, [loadAudit]);

  function toggleScope(scope: string, checked: boolean) {
    setScopes((prev) => (checked ? [...prev, scope] : prev.filter((s) => s !== scope)));
  }

  async function handleCreate() {
    if (!name.trim()) { toast.error('Le nom est obligatoire'); return; }
    if (!scopes.length) { toast.error('Sélectionnez au moins une permission'); return; }
    setSaving(true);
    try {
      const secret = randomKey();
      const prefix = `ptk_${secret.slice(0, 6)}`;
      const fullKey = `${prefix}_${secret}`;
      const keyHash = await sha256Hex(fullKey);
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from('api_integrations').insert({
        name: name.trim(),
        description: description.trim() || null,
        scopes,
        key_prefix: prefix,
        key_hash: keyHash,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        created_by: userData.user?.id ?? null,
      });
      if (error) throw error;
      setRevealedKey(fullKey);
      setCreateOpen(false);
      setName(''); setDescription(''); setExpiresAt('');
      setScopes([...DEFAULT_ASSISTANT_SCOPES]);
      await load();
    } catch {
      toast.error('Impossible de créer l\'intégration');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(row: Integration) {
    const { error } = await supabase.from('api_integrations')
      .update({ active: !row.active }).eq('id', row.id);
    if (error) toast.error('Action impossible');
    else { toast.success(row.active ? 'Clé désactivée' : 'Clé réactivée'); load(); }
  }

  async function revoke(row: Integration) {
    const { error } = await supabase.from('api_integrations')
      .update({ active: false, revoked_at: new Date().toISOString() }).eq('id', row.id);
    if (error) toast.error('Révocation impossible');
    else { toast.success('Clé révoquée définitivement'); load(); }
  }

  const statusBadge = (row: Integration) => {
    if (row.revoked_at) return <Badge variant="destructive">Révoquée</Badge>;
    if (!row.active) return <Badge variant="secondary">Désactivée</Badge>;
    if (row.expires_at && new Date(row.expires_at) < new Date()) return <Badge variant="destructive">Expirée</Badge>;
    return <Badge>Active</Badge>;
  };

  const resources = Array.from(new Set(audit.map((a) => a.resource)));

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-display font-bold">Intégrations API</h1>
          <p className="text-sm text-muted-foreground">
            Clés API pour assistants externes — lecture/écriture contrôlée par permissions
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Créer une intégration
        </Button>
      </div>

      <Tabs defaultValue="cles">
        <TabsList>
          <TabsTrigger value="cles">Clés API</TabsTrigger>
          <TabsTrigger value="audit">Journal d'audit</TabsTrigger>
          <TabsTrigger value="doc">Documentation API</TabsTrigger>
        </TabsList>

        <TabsContent value="cles" className="mt-4">
          {loading ? (
            <div className="text-center py-16 text-muted-foreground">Chargement…</div>
          ) : integrations.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">Aucune intégration</div>
          ) : (
            <div className="rounded-lg border bg-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="p-3">Nom</th>
                    <th className="p-3">Préfixe</th>
                    <th className="p-3">Permissions</th>
                    <th className="p-3">Statut</th>
                    <th className="p-3">Expiration</th>
                    <th className="p-3">Dernière utilisation</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {integrations.map((row) => (
                    <tr key={row.id} className="border-t align-top">
                      <td className="p-3">
                        <div className="font-medium">{row.name}</div>
                        {row.description && (
                          <div className="text-xs text-muted-foreground">{row.description}</div>
                        )}
                        <div className="text-xs text-muted-foreground">Créée le {formatDate(row.created_at)}</div>
                      </td>
                      <td className="p-3 font-mono text-xs">{row.key_prefix}…</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {row.scopes.map((s) => (
                            <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">{statusBadge(row)}</td>
                      <td className="p-3 text-xs">{formatDate(row.expires_at)}</td>
                      <td className="p-3 text-xs">{formatDate(row.last_used_at)}</td>
                      <td className="p-3 text-right whitespace-nowrap">
                        {!row.revoked_at && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => toggleActive(row)}>
                              {row.active ? 'Désactiver' : 'Réactiver'}
                            </Button>
                            <Button variant="ghost" size="sm" className="text-destructive gap-1"
                              onClick={() => revoke(row)}>
                              <Ban className="h-3.5 w-3.5" /> Révoquer
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="audit" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-3">
            <Select value={filterIntegration} onValueChange={setFilterIntegration}>
              <SelectTrigger className="w-56"><SelectValue placeholder="Intégration" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les intégrations</SelectItem>
                {integrations.map((i) => (
                  <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterResource} onValueChange={setFilterResource}>
              <SelectTrigger className="w-56"><SelectValue placeholder="Ressource" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les ressources</SelectItem>
                {resources.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="p-3">Date</th>
                  <th className="p-3">Intégration</th>
                  <th className="p-3">Ressource</th>
                  <th className="p-3">Opération</th>
                  <th className="p-3">Résultat</th>
                  <th className="p-3">Enregistrement</th>
                  <th className="p-3">Détail</th>
                </tr>
              </thead>
              <tbody>
                {audit.length === 0 ? (
                  <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Aucun évènement</td></tr>
                ) : audit.map((a) => (
                  <tr key={a.id} className="border-t">
                    <td className="p-3 text-xs whitespace-nowrap">{formatDate(a.created_at)}</td>
                    <td className="p-3 text-xs">{a.integration_name ?? '—'}</td>
                    <td className="p-3 text-xs">{a.resource}</td>
                    <td className="p-3 text-xs">{a.operation}</td>
                    <td className="p-3">
                      <Badge variant={a.result === 'success' ? 'default' : 'destructive'} className="text-[10px]">
                        {a.result}
                      </Badge>
                    </td>
                    <td className="p-3 font-mono text-[10px]">{a.record_id ?? '—'}</td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {a.denial_reason ?? a.ip_address ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="doc" className="mt-4 space-y-4">
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <FileJson className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Spécification OpenAPI 3.1</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Fournissez ce fichier à l'assistant externe : il décrit toutes les routes, les
              scopes requis, les schémas, le mode simulation (<code>dry_run</code>),
              l'idempotence, le contrôle de concurrence et les opérations interdites.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="gap-2">
                <a href="/openapi/powertech-api-v1.yaml" download>
                  <Download className="h-4 w-4" /> Télécharger (YAML)
                </a>
              </Button>
              <Button asChild variant="outline" className="gap-2">
                <a href="/openapi/powertech-api-v1.json" download>
                  <Download className="h-4 w-4" /> Télécharger (JSON)
                </a>
              </Button>
              <Button asChild variant="ghost" className="gap-2">
                <a href={SPEC_YAML_URL} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" /> Ouvrir dans le navigateur
                </a>
              </Button>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4 space-y-3">
            <h2 className="font-semibold">URLs d'accès</h2>
            {[
              { label: "URL de base de l'API", value: API_BASE_URL },
              { label: 'Test de disponibilité (public)', value: `${API_BASE_URL}/health` },
              { label: 'Spécification OpenAPI (YAML)', value: SPEC_YAML_URL },
              { label: 'Spécification OpenAPI (JSON)', value: SPEC_JSON_URL },
            ].map((row) => (
              <div key={row.label} className="space-y-1">
                <Label className="text-xs text-muted-foreground">{row.label}</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-muted px-2 py-1.5 text-xs break-all">
                    {row.value}
                  </code>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      navigator.clipboard.writeText(row.value);
                      toast.success('Copié');
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border bg-card p-4 space-y-2">
            <h2 className="font-semibold">Exemple d'appel</h2>
            <pre className="rounded bg-muted p-3 text-xs overflow-x-auto">{`curl -H "Authorization: Bearer VOTRE_CLE_API" \\
  "${API_BASE_URL}/availability?date=2026-08-03&duree=60"`}</pre>
            <p className="text-xs text-muted-foreground">
              Toutes les routes (sauf <code>/health</code>) exigent l'en-tête
              <code> Authorization: Bearer</code>. Limite : 120 requêtes par minute.
            </p>
          </div>
        </TabsContent>
      </Tabs>


      {/* Création */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Créer une intégration API</DialogTitle>
            <DialogDescription>
              La clé ne sera affichée qu'une seule fois après sa création.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nom de l'intégration</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Assistant opérationnel" />
            </div>
            <div className="space-y-1.5">
              <Label>Description (optionnel)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Expiration (optionnel)</Label>
              <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Permissions</Label>
              <div className="grid grid-cols-2 gap-1.5 border rounded-lg p-3 max-h-56 overflow-auto">
                {SCOPES.map((s) => (
                  <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={scopes.includes(s)} onCheckedChange={(v) => toggleScope(s, !!v)} />
                    <span className="font-mono text-xs">{s}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                <ShieldAlert className="h-3 w-3 inline mr-1" />
                « audit:read » est réservé aux administrateurs humains.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? 'Création…' : 'Créer la clé'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clé révélée une seule fois */}
      <Dialog open={!!revealedKey} onOpenChange={(o) => !o && setRevealedKey(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" /> Votre clé API
            </DialogTitle>
            <DialogDescription>
              Copiez-la maintenant : elle ne sera plus jamais affichée. Transmettez-la via l'en-tête
              <span className="font-mono"> Authorization: Bearer …</span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded-lg border bg-muted p-3 text-xs font-mono">
              {revealedKey}
            </code>
            <Button size="icon" variant="outline" onClick={() => {
              navigator.clipboard.writeText(revealedKey ?? '');
              toast.success('Clé copiée');
            }}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setRevealedKey(null)}>J'ai copié la clé</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
