import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Pencil, Loader2, Trash2, RefreshCw } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  description: string | null;
  price_per_1000: number;
  original_rate: number | null;
  min_quantity: number;
  max_quantity: number;
  is_active: boolean;
  category_id: string | null;
  api_service_id: string | null;
  api_provider_id: string | null;
}

interface Category {
  id: string;
  name: string;
}

interface APIProvider {
  id: string;
  name: string;
}

export default function AdminServices() {
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [providers, setProviders] = useState<APIProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  
  const [form, setForm] = useState({
    name: '',
    description: '',
    price_per_1000: '',
    original_rate: '',
    min_quantity: '100',
    max_quantity: '10000',
    category_id: '',
    api_service_id: '',
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [servicesRes, categoriesRes, providersRes] = await Promise.all([
      supabase.from('services').select('*').order('created_at', { ascending: false }),
      supabase.from('service_categories').select('*').order('sort_order'),
      supabase.from('api_providers').select('id, name').eq('is_active', true),
    ]);
    
    if (servicesRes.data) setServices(servicesRes.data);
    if (categoriesRes.data) setCategories(categoriesRes.data);
    if (providersRes.data) setProviders(providersRes.data);
    setLoading(false);
  };

  const syncRatesFromProviders = async () => {
    // Get services that have provider info
    const servicesWithProviders = services.filter(s => s.api_provider_id && s.api_service_id);
    
    if (servicesWithProviders.length === 0) {
      toast({
        title: 'No services to sync',
        description: 'No services are linked to external providers',
        variant: 'destructive',
      });
      return;
    }

    setSyncing(true);
    let updatedCount = 0;
    const providerIds = [...new Set(servicesWithProviders.map(s => s.api_provider_id))];

    try {
      for (const providerId of providerIds) {
        // Fetch services from provider
        const response = await supabase.functions.invoke('fetch-provider-services', {
          body: { providerId },
        });

        if (response.error || response.data?.error) {
          console.error(`Failed to fetch from provider ${providerId}:`, response.error || response.data?.error);
          continue;
        }

        const providerServices = response.data?.services || [];
        
        // Create a map of service_id to rate
        const rateMap = new Map<string, number>();
        providerServices.forEach((ps: { service_id: string; rate: number }) => {
          rateMap.set(ps.service_id, ps.rate);
        });

        // Update local services that match this provider
        for (const service of servicesWithProviders.filter(s => s.api_provider_id === providerId)) {
          const newRate = rateMap.get(service.api_service_id!);
          
          if (newRate !== undefined && newRate !== service.original_rate) {
            const { error } = await supabase
              .from('services')
              .update({ original_rate: newRate })
              .eq('id', service.id);

            if (!error) {
              updatedCount++;
              // Update local state
              setServices(prev => prev.map(s => 
                s.id === service.id ? { ...s, original_rate: newRate } : s
              ));
            }
          }
        }
      }

      toast({
        title: 'Sync Complete',
        description: `Updated rates for ${updatedCount} service(s)`,
      });
    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: 'Sync Error',
        description: error.message || 'Failed to sync rates',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  const openDialog = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setForm({
        name: service.name,
        description: service.description || '',
        price_per_1000: service.price_per_1000.toString(),
        original_rate: service.original_rate?.toString() || '',
        min_quantity: service.min_quantity.toString(),
        max_quantity: service.max_quantity.toString(),
        category_id: service.category_id || '',
        api_service_id: service.api_service_id || '',
        is_active: service.is_active,
      });
    } else {
      setEditingService(null);
      setForm({
        name: '',
        description: '',
        price_per_1000: '',
        original_rate: '',
        min_quantity: '100',
        max_quantity: '10000',
        category_id: '',
        api_service_id: '',
        is_active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      name: form.name,
      description: form.description || null,
      price_per_1000: Number(form.price_per_1000),
      original_rate: form.original_rate ? Number(form.original_rate) : null,
      min_quantity: Number(form.min_quantity),
      max_quantity: Number(form.max_quantity),
      category_id: form.category_id || null,
      api_service_id: form.api_service_id || null,
      is_active: form.is_active,
    };

    try {
      if (editingService) {
        const { error } = await supabase
          .from('services')
          .update(payload)
          .eq('id', editingService.id);
        
        if (error) throw error;
        
        setServices(services.map(s => 
          s.id === editingService.id ? { ...s, ...payload } : s
        ));
        toast({ title: 'Service updated successfully' });
      } else {
        const { data, error } = await supabase
          .from('services')
          .insert(payload)
          .select()
          .single();
        
        if (error) throw error;
        
        setServices([data, ...services]);
        toast({ title: 'Service created successfully' });
      }
      
      setDialogOpen(false);
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

  const toggleActive = async (service: Service) => {
    const { error } = await supabase
      .from('services')
      .update({ is_active: !service.is_active })
      .eq('id', service.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setServices(services.map(s => 
        s.id === service.id ? { ...s, is_active: !s.is_active } : s
      ));
    }
  };

  const toggleSelectService = (serviceId: string) => {
    const newSelected = new Set(selectedServices);
    if (newSelected.has(serviceId)) {
      newSelected.delete(serviceId);
    } else {
      newSelected.add(serviceId);
    }
    setSelectedServices(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedServices.size === services.length) {
      setSelectedServices(new Set());
    } else {
      setSelectedServices(new Set(services.map(s => s.id)));
    }
  };

  const deleteSelectedServices = async () => {
    if (selectedServices.size === 0) return;
    
    const confirmed = window.confirm(`Are you sure you want to delete ${selectedServices.size} service(s)? This action cannot be undone.`);
    if (!confirmed) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .in('id', Array.from(selectedServices));

      if (error) throw error;

      setServices(services.filter(s => !selectedServices.has(s.id)));
      setSelectedServices(new Set());
      toast({ title: `${selectedServices.size} service(s) deleted successfully` });
    } catch (error: any) {
      toast({
        title: 'Error deleting services',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const getCategoryName = (categoryId: string | null) => {
    return categories.find(c => c.id === categoryId)?.name || 'Uncategorized';
  };

  return (
    <DashboardLayout requireAdmin>
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Services</h1>
            <p className="text-muted-foreground mt-1">Manage your SMM services.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button 
              variant="outline"
              onClick={syncRatesFromProviders}
              disabled={syncing}
            >
              {syncing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Sync Rates
            </Button>
            {selectedServices.size > 0 && (
              <Button 
                variant="destructive"
                onClick={deleteSelectedServices}
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Delete ({selectedServices.size})
              </Button>
            )}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => openDialog()}
                  className="bg-gradient-to-r from-primary to-secondary"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Service
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingService ? 'Edit Service' : 'Add New Service'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Original Rate/1K (Provider)</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={form.original_rate}
                        onChange={(e) => setForm({ ...form, original_rate: e.target.value })}
                        placeholder="From provider"
                      />
                    </div>
                    <div>
                      <Label>Selling Price/1K</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={form.price_per_1000}
                        onChange={(e) => setForm({ ...form, price_per_1000: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Min Quantity</Label>
                      <Input
                        type="number"
                        value={form.min_quantity}
                        onChange={(e) => setForm({ ...form, min_quantity: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Max Quantity</Label>
                      <Input
                        type="number"
                        value={form.max_quantity}
                        onChange={(e) => setForm({ ...form, max_quantity: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label>API Service ID (Optional)</Label>
                    <Input
                      value={form.api_service_id}
                      onChange={(e) => setForm({ ...form, api_service_id: e.target.value })}
                      placeholder="External provider service ID"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={form.is_active}
                      onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                    />
                    <Label>Active</Label>
                  </div>
                  <Button type="submit" className="w-full" disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {editingService ? 'Update Service' : 'Create Service'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Services Table */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-12">
                    <Checkbox
                      checked={services.length > 0 && selectedServices.size === services.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Original Rate</th>
                  <th>Selling Price</th>
                  <th>Margin</th>
                  <th>Min</th>
                  <th>Max</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                ) : services.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-muted-foreground">
                      No services yet. Add your first service.
                    </td>
                  </tr>
                ) : (
                  services.map((service) => (
                    <tr key={service.id}>
                      <td>
                        <Checkbox
                          checked={selectedServices.has(service.id)}
                          onCheckedChange={() => toggleSelectService(service.id)}
                        />
                      </td>
                      <td>
                        <div>
                          <p className="font-medium">{service.name}</p>
                          {service.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {service.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="text-sm">{getCategoryName(service.category_id)}</td>
                      <td className="text-sm text-muted-foreground">
                        {service.original_rate !== null 
                          ? `₹${Number(service.original_rate).toFixed(4)}` 
                          : '-'
                        }
                      </td>
                      <td className="font-semibold text-primary">
                        ₹{Number(service.price_per_1000).toFixed(2)}
                      </td>
                      <td className={`font-medium ${
                        service.original_rate !== null && service.price_per_1000 > service.original_rate
                          ? 'text-green-500'
                          : service.original_rate !== null && service.price_per_1000 < service.original_rate
                          ? 'text-red-500'
                          : 'text-muted-foreground'
                      }`}>
                        {service.original_rate !== null 
                          ? `₹${(Number(service.price_per_1000) - Number(service.original_rate)).toFixed(2)}`
                          : '-'
                        }
                      </td>
                      <td>{service.min_quantity.toLocaleString()}</td>
                      <td>{service.max_quantity.toLocaleString()}</td>
                      <td>
                        <Switch
                          checked={service.is_active}
                          onCheckedChange={() => toggleActive(service)}
                        />
                      </td>
                      <td>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDialog(service)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
