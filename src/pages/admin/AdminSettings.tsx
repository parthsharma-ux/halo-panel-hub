import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, Settings, AlertTriangle } from 'lucide-react';

interface SettingsData {
  site_name: string;
  currency: string;
  currency_symbol: string;
  min_recharge: string;
  contact_email: string;
  upi_id: string;
  maintenance_mode: string;
  maintenance_message: string;
}

export default function AdminSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsData>({
    site_name: '',
    currency: '',
    currency_symbol: '',
    min_recharge: '',
    contact_email: '',
    upi_id: '',
    maintenance_mode: 'false',
    maintenance_message: '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('site_settings')
      .select('key, value');

    if (data) {
      const settingsMap: Record<string, string> = {};
      data.forEach((item) => {
        settingsMap[item.key] = item.value || '';
      });
      setSettings({
        site_name: settingsMap.site_name || 'SMMPanel',
        currency: settingsMap.currency || 'INR',
        currency_symbol: settingsMap.currency_symbol || '₹',
        min_recharge: settingsMap.min_recharge || '100',
        contact_email: settingsMap.contact_email || '',
        upi_id: settingsMap.upi_id || '',
        maintenance_mode: settingsMap.maintenance_mode || 'false',
        maintenance_message: settingsMap.maintenance_message || '',
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const updates = Object.entries(settings).map(([key, value]) => ({
        key,
        value,
        updated_at: new Date().toISOString(),
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('site_settings')
          .update({ value: update.value, updated_at: update.updated_at })
          .eq('key', update.key);

        if (error) {
          // If update fails, try insert
          await supabase.from('site_settings').insert({
            key: update.key,
            value: update.value,
          });
        }
      }

      toast({
        title: 'Settings Saved',
        description: 'Your changes have been saved successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof SettingsData, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <DashboardLayout requireAdmin>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout requireAdmin>
      <div className="space-y-8 animate-fade-in max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Site Settings</h1>
            <p className="text-muted-foreground mt-1">
              Configure your panel settings.
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-primary to-secondary"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>

        {/* General Settings */}
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <Settings className="h-5 w-5 text-primary" />
            <h2 className="font-display font-semibold text-lg">General Settings</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="site_name">Site Name</Label>
              <Input
                id="site_name"
                value={settings.site_name}
                onChange={(e) => updateSetting('site_name', e.target.value)}
                placeholder="SMMPanel"
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_email">Contact Email</Label>
              <Input
                id="contact_email"
                type="email"
                value={settings.contact_email}
                onChange={(e) => updateSetting('contact_email', e.target.value)}
                placeholder="support@example.com"
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency Code</Label>
              <Input
                id="currency"
                value={settings.currency}
                onChange={(e) => updateSetting('currency', e.target.value)}
                placeholder="INR"
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency_symbol">Currency Symbol</Label>
              <Input
                id="currency_symbol"
                value={settings.currency_symbol}
                onChange={(e) => updateSetting('currency_symbol', e.target.value)}
                placeholder="₹"
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="min_recharge">Minimum Recharge Amount</Label>
              <Input
                id="min_recharge"
                type="number"
                value={settings.min_recharge}
                onChange={(e) => updateSetting('min_recharge', e.target.value)}
                placeholder="100"
                className="bg-background/50"
              />
            </div>
          </div>
        </div>

        {/* Payment Settings */}
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <span className="text-xl">💳</span>
            <h2 className="font-display font-semibold text-lg">Payment Settings</h2>
          </div>

          <div className="space-y-2">
            <Label htmlFor="upi_id">UPI ID</Label>
            <Input
              id="upi_id"
              value={settings.upi_id}
              onChange={(e) => updateSetting('upi_id', e.target.value)}
              placeholder="yourname@upi"
              className="bg-background/50"
            />
            <p className="text-xs text-muted-foreground">
              This UPI ID will be displayed to users for making payments.
            </p>
          </div>
        </div>

        {/* Maintenance Mode */}
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <h2 className="font-display font-semibold text-lg">Maintenance Mode</h2>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable Maintenance Mode</p>
              <p className="text-sm text-muted-foreground">
                When enabled, only admins can access the panel.
              </p>
            </div>
            <Switch
              checked={settings.maintenance_mode === 'true'}
              onCheckedChange={(checked) =>
                updateSetting('maintenance_mode', checked ? 'true' : 'false')
              }
            />
          </div>

          {settings.maintenance_mode === 'true' && (
            <div className="p-4 rounded-lg bg-warning/10 border border-warning/30">
              <p className="text-warning text-sm font-medium">
                ⚠️ Maintenance mode is enabled. Users cannot access the panel.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="maintenance_message">Maintenance Message</Label>
            <Textarea
              id="maintenance_message"
              value={settings.maintenance_message}
              onChange={(e) => updateSetting('maintenance_message', e.target.value)}
              placeholder="We are currently undergoing maintenance..."
              rows={3}
              className="bg-background/50"
            />
            <p className="text-xs text-muted-foreground">
              This message will be shown to users when maintenance mode is enabled.
            </p>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            size="lg"
            className="bg-gradient-to-r from-primary to-secondary"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save All Settings
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
