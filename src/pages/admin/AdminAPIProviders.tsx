import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus, Pencil, Trash2, Server, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface APIProvider {
  id: string;
  name: string;
  api_url: string;
  api_key: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminAPIProviders() {
  const [providers, setProviders] = useState<APIProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<APIProvider | null>(null);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    api_url: '',
    api_key: '',
    is_active: true,
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('api_providers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch API providers',
        variant: 'destructive',
      });
    } else {
      setProviders(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingProvider) {
        const { error } = await supabase
          .from('api_providers')
          .update({
            name: formData.name,
            api_url: formData.api_url,
            api_key: formData.api_key,
            is_active: formData.is_active,
          })
          .eq('id', editingProvider.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'API provider updated successfully',
        });
      } else {
        const { error } = await supabase.from('api_providers').insert({
          name: formData.name,
          api_url: formData.api_url,
          api_key: formData.api_key,
          is_active: formData.is_active,
        });

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'API provider added successfully',
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchProviders();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save API provider',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (provider: APIProvider) => {
    setEditingProvider(provider);
    setFormData({
      name: provider.name,
      api_url: provider.api_url,
      api_key: provider.api_key,
      is_active: provider.is_active,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API provider?')) return;

    const { error } = await supabase.from('api_providers').delete().eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete API provider',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'API provider deleted successfully',
      });
      fetchProviders();
    }
  };

  const toggleProviderStatus = async (provider: APIProvider) => {
    const { error } = await supabase
      .from('api_providers')
      .update({ is_active: !provider.is_active })
      .eq('id', provider.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update provider status',
        variant: 'destructive',
      });
    } else {
      fetchProviders();
    }
  };

  const testConnection = async (provider: APIProvider) => {
    setTestingProvider(provider.id);
    
    // Simulate API test - in real implementation, you'd make a test request
    setTimeout(() => {
      toast({
        title: 'Connection Test',
        description: `API provider "${provider.name}" is configured. Test the connection by placing a test order.`,
      });
      setTestingProvider(null);
    }, 1500);
  };

  const resetForm = () => {
    setEditingProvider(null);
    setFormData({
      name: '',
      api_url: '',
      api_key: '',
      is_active: true,
    });
  };

  const toggleApiKeyVisibility = (id: string) => {
    setShowApiKey((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return '••••••••';
    return key.slice(0, 4) + '••••••••' + key.slice(-4);
  };

  return (
    <DashboardLayout requireAdmin>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold gradient-text">
              API Providers
            </h1>
            <p className="text-muted-foreground mt-1">
              Connect external SMM providers to auto-forward orders
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-secondary">
                <Plus className="h-4 w-4 mr-2" />
                Add Provider
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-white/10">
              <DialogHeader>
                <DialogTitle className="gradient-text">
                  {editingProvider ? 'Edit API Provider' : 'Add API Provider'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Provider Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., SMM Provider 1"
                    className="bg-background/50"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api_url">API URL</Label>
                  <Input
                    id="api_url"
                    type="url"
                    value={formData.api_url}
                    onChange={(e) =>
                      setFormData({ ...formData, api_url: e.target.value })
                    }
                    placeholder="https://api.provider.com/v1"
                    className="bg-background/50"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api_key">API Key</Label>
                  <Input
                    id="api_key"
                    type="password"
                    value={formData.api_key}
                    onChange={(e) =>
                      setFormData({ ...formData, api_key: e.target.value })
                    }
                    placeholder="Enter your API key"
                    className="bg-background/50"
                    required
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="is_active">Active</Label>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_active: checked })
                    }
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-secondary"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : editingProvider ? (
                    'Update Provider'
                  ) : (
                    'Add Provider'
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
              Connected Providers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : providers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No API providers configured yet</p>
                <p className="text-sm mt-1">
                  Add a provider to start auto-forwarding orders
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10">
                      <TableHead>Provider</TableHead>
                      <TableHead>API URL</TableHead>
                      <TableHead>API Key</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {providers.map((provider) => (
                      <TableRow key={provider.id} className="border-white/10">
                        <TableCell className="font-medium">
                          {provider.name}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-background/50 px-2 py-1 rounded">
                            {provider.api_url}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-background/50 px-2 py-1 rounded">
                              {showApiKey[provider.id]
                                ? provider.api_key
                                : maskApiKey(provider.api_key)}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => toggleApiKeyVisibility(provider.id)}
                            >
                              {showApiKey[provider.id] ? (
                                <EyeOff className="h-3 w-3" />
                              ) : (
                                <Eye className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={provider.is_active}
                            onCheckedChange={() => toggleProviderStatus(provider)}
                          />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(provider.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => testConnection(provider)}
                              disabled={testingProvider === provider.id}
                            >
                              {testingProvider === provider.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(provider)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete(provider.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions Card */}
        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="text-lg">How to use API Providers</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              <strong className="text-foreground">1. Add Provider:</strong> Enter
              the API URL and API key from your external SMM provider.
            </p>
            <p>
              <strong className="text-foreground">2. Map Services:</strong> In the
              Services page, set the "API Service ID" field to match the provider's
              service ID.
            </p>
            <p>
              <strong className="text-foreground">3. Auto-Forward:</strong> When
              configured, orders will automatically be forwarded to the provider's
              API.
            </p>
            <p className="text-xs text-muted-foreground/70 mt-4">
              Note: Make sure to test the connection before enabling auto-forwarding
              for production orders.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
