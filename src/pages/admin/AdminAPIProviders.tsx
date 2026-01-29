import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/use-debounce';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus, Pencil, Trash2, Server, Eye, EyeOff, Download, Check, Search } from 'lucide-react';
import { format } from 'date-fns';

interface APIProvider {
  id: string;
  name: string;
  api_url: string;
  api_key: string;
  is_active: boolean;
  created_at: string;
}

interface FetchedService {
  service_id: string;
  name: string;
  category: string;
  rate: number;
  min: number;
  max: number;
  type: string;
  description: string | null;
}

interface Category {
  id: string;
  name: string;
}

// Memoized service item component
const ServiceItem = ({ 
  service, 
  isSelected, 
  onToggle, 
  currencyMultiplier, 
  priceMarkup 
}: { 
  service: FetchedService; 
  isSelected: boolean; 
  onToggle: () => void; 
  currencyMultiplier: number; 
  priceMarkup: number;
}) => (
  <div
    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
      isSelected
        ? 'bg-primary/10 border-primary/50'
        : 'bg-background/50 border-white/10 hover:border-white/20'
    }`}
    onClick={onToggle}
  >
    <Checkbox checked={isSelected} onCheckedChange={onToggle} />
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium truncate">{service.name}</p>
      <p className="text-xs text-muted-foreground">
        ID: {service.service_id} | Min: {service.min} | Max: {service.max}
      </p>
    </div>
    <div className="text-right flex-shrink-0">
      <p className="text-xs text-muted-foreground">
        Original: ${service.rate.toFixed(4)}/1K
      </p>
      <p className="text-sm font-semibold text-primary">
        ₹{(service.rate * currencyMultiplier).toFixed(2)}/1K
      </p>
      {(priceMarkup > 0 || currencyMultiplier !== 1) && (
        <p className="text-xs text-green-500">
          Sell: ₹{(service.rate * currencyMultiplier * (1 + priceMarkup / 100)).toFixed(2)}
        </p>
      )}
    </div>
  </div>
);

export default function AdminAPIProviders() {
  const [providers, setProviders] = useState<APIProvider[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fetchDialogOpen, setFetchDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<APIProvider | null>(null);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [fetchingServices, setFetchingServices] = useState<string | null>(null);
  const [fetchedServices, setFetchedServices] = useState<FetchedService[]>([]);
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [importingServices, setImportingServices] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [priceMarkup, setPriceMarkup] = useState<number>(0);
  const [currencyMultiplier, setCurrencyMultiplier] = useState<number>(1);
  const [currentProviderName, setCurrentProviderName] = useState<string>('');
  const [currentProviderId, setCurrentProviderId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const debouncedSearch = useDebounce(searchQuery, 300);
  const parentRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    api_url: '',
    api_key: '',
    is_active: true,
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchProviders();
    fetchCategories();
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

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('service_categories')
      .select('id, name')
      .order('sort_order');
    if (data) setCategories(data);
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

  const fetchServicesFromProvider = async (provider: APIProvider) => {
    setFetchingServices(provider.id);
    setCurrentProviderName(provider.name);
    setCurrentProviderId(provider.id);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('fetch-provider-services', {
        body: { providerId: provider.id },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to fetch services');
      }

      const data = response.data;
      
      if (data.error) {
        throw new Error(data.error);
      }

      setFetchedServices(data.services || []);
      setSelectedServices(new Set());
      setCurrencyMultiplier(83);
      setSearchQuery('');
      setFetchDialogOpen(true);
      
      toast({
        title: 'Services Fetched',
        description: `Found ${data.services?.length || 0} services from ${provider.name}`,
      });
    } catch (error: any) {
      console.error('Error fetching services:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch services from provider',
        variant: 'destructive',
      });
    } finally {
      setFetchingServices(null);
    }
  };

  const toggleServiceSelection = useCallback((serviceId: string) => {
    setSelectedServices(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(serviceId)) {
        newSelection.delete(serviceId);
      } else {
        newSelection.add(serviceId);
      }
      return newSelection;
    });
  }, []);

  const filteredServices = useMemo(() => {
    if (!debouncedSearch.trim()) return fetchedServices;
    const query = debouncedSearch.toLowerCase();
    return fetchedServices.filter(
      s => s.name.toLowerCase().includes(query) || 
           s.category.toLowerCase().includes(query) ||
           s.service_id.includes(query)
    );
  }, [fetchedServices, debouncedSearch]);

  const selectAllFiltered = useCallback(() => {
    if (selectedServices.size === filteredServices.length && filteredServices.length > 0) {
      setSelectedServices(new Set());
    } else {
      setSelectedServices(new Set(filteredServices.map(s => s.service_id)));
    }
  }, [filteredServices, selectedServices.size]);

  // Virtual list for performance
  const rowVirtualizer = useVirtualizer({
    count: filteredServices.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 10,
  });

  const importSelectedServices = async () => {
    if (selectedServices.size === 0) {
      toast({
        title: 'No services selected',
        description: 'Please select at least one service to import',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedCategory) {
      toast({
        title: 'No category selected',
        description: 'Please select a category for the imported services',
        variant: 'destructive',
      });
      return;
    }

    setImportingServices(true);

    try {
      const servicesToImport = fetchedServices
        .filter(s => selectedServices.has(s.service_id))
        .map(s => {
          const convertedRate = s.rate * currencyMultiplier;
          return {
            name: s.name,
            description: s.description,
            original_rate: convertedRate,
            price_per_1000: convertedRate * (1 + priceMarkup / 100),
            min_quantity: s.min,
            max_quantity: s.max,
            category_id: selectedCategory,
            api_service_id: s.service_id,
            api_provider_id: currentProviderId,
            is_active: true,
          };
        });

      const { error } = await supabase
        .from('services')
        .insert(servicesToImport)
        .select();

      if (error) {
        throw error;
      }

      toast({
        title: 'Success',
        description: `Imported ${servicesToImport.length} services successfully`,
      });

      setFetchDialogOpen(false);
      setFetchedServices([]);
      setSelectedServices(new Set());
      setSelectedCategory('');
      setPriceMarkup(0);
      setCurrencyMultiplier(1);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to import services',
        variant: 'destructive',
      });
    } finally {
      setImportingServices(false);
    }
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold gradient-text">
              API Providers
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Connect external SMM providers to auto-forward orders
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-secondary w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Provider
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-white/10 max-w-md">
              <DialogHeader>
                <DialogTitle className="gradient-text">
                  {editingProvider ? 'Edit API Provider' : 'Add API Provider'}
                </DialogTitle>
                <DialogDescription>
                  Configure your external SMM provider API connection.
                </DialogDescription>
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
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10">
                      <TableHead>Provider</TableHead>
                      <TableHead className="hidden md:table-cell">API URL</TableHead>
                      <TableHead className="hidden lg:table-cell">API Key</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden sm:table-cell">Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {providers.map((provider) => (
                      <TableRow key={provider.id} className="border-white/10">
                        <TableCell className="font-medium">
                          {provider.name}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <code className="text-xs bg-background/50 px-2 py-1 rounded truncate max-w-[200px] block">
                            {provider.api_url}
                          </code>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
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
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                          {format(new Date(provider.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 sm:gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => fetchServicesFromProvider(provider)}
                              disabled={fetchingServices === provider.id}
                              className="text-xs sm:text-sm"
                            >
                              {fetchingServices === provider.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Download className="h-4 w-4 sm:mr-1" />
                                  <span className="hidden sm:inline">Fetch</span>
                                </>
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(provider)}
                              className="h-8 w-8"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
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

        {/* Fetch Services Dialog - Optimized with Virtual List */}
        <Dialog open={fetchDialogOpen} onOpenChange={setFetchDialogOpen}>
          <DialogContent className="glass-card border-white/10 max-w-4xl max-h-[90vh] sm:max-h-[80vh] overflow-hidden flex flex-col p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="gradient-text text-lg sm:text-xl">
                Import Services from {currentProviderName}
              </DialogTitle>
              <DialogDescription>
                {fetchedServices.length > 0 && (
                  <span>Found {fetchedServices.length.toLocaleString()} services</span>
                )}
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-hidden flex flex-col space-y-4">
              {fetchedServices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No services found from this provider</p>
                </div>
              ) : (
                <>
                  {/* Import Settings */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/20 rounded-lg border-2 border-primary/30">
                    <div className="space-y-2">
                      <Label className="text-primary font-semibold text-sm">Target Category *</Label>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className={!selectedCategory ? 'border-destructive' : ''}>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border-border">
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Currency Multiplier (USD→INR)</Label>
                      <Input
                        type="number"
                        value={currencyMultiplier}
                        onChange={(e) => setCurrencyMultiplier(Number(e.target.value) || 1)}
                        placeholder="83"
                        min="1"
                        step="0.01"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Price Markup (%)</Label>
                      <Input
                        type="number"
                        value={priceMarkup}
                        onChange={(e) => setPriceMarkup(Number(e.target.value))}
                        placeholder="0"
                        min="0"
                        max="500"
                      />
                    </div>
                  </div>

                  {/* Search and Select All */}
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search services..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedServices.size === filteredServices.length && filteredServices.length > 0}
                          onCheckedChange={selectAllFiltered}
                        />
                        <span className="text-sm">Select All</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {selectedServices.size.toLocaleString()} / {filteredServices.length.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Virtualized Service List */}
                  <div 
                    ref={parentRef} 
                    className="flex-1 overflow-auto rounded-lg border border-white/10 min-h-[200px]"
                    style={{ contain: 'strict' }}
                  >
                    <div
                      style={{
                        height: `${rowVirtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative',
                      }}
                    >
                      {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                        const service = filteredServices[virtualItem.index];
                        return (
                          <div
                            key={service.service_id}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: `${virtualItem.size}px`,
                              transform: `translateY(${virtualItem.start}px)`,
                              padding: '4px 8px',
                            }}
                          >
                            <ServiceItem
                              service={service}
                              isSelected={selectedServices.has(service.service_id)}
                              onToggle={() => toggleServiceSelection(service.service_id)}
                              currencyMultiplier={currencyMultiplier}
                              priceMarkup={priceMarkup}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {fetchedServices.length > 0 && (
              <div className="border-t border-white/10 pt-4 mt-4 space-y-2">
                {!selectedCategory && selectedServices.size > 0 && (
                  <p className="text-center text-sm text-destructive">
                    ⚠️ Please select a target category above before importing
                  </p>
                )}
                <Button
                  className="w-full bg-gradient-to-r from-primary to-secondary"
                  onClick={importSelectedServices}
                  disabled={importingServices || selectedServices.size === 0 || !selectedCategory}
                >
                  {importingServices ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : !selectedCategory ? (
                    'Select Category to Import'
                  ) : selectedServices.size === 0 ? (
                    'Select Services to Import'
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Import {selectedServices.size.toLocaleString()} Services
                    </>
                  )}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

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
              <strong className="text-foreground">2. Fetch Services:</strong> Click
              "Fetch Services" to load available services from the provider.
            </p>
            <p>
              <strong className="text-foreground">3. Import Services:</strong> Select
              services and category, then import them to your panel.
            </p>
            <p>
              <strong className="text-foreground">4. Auto-Forward:</strong> When
              configured, orders will automatically be forwarded to the provider's
              API.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
