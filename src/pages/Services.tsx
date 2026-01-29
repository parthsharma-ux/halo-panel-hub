import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, Instagram, Send, Youtube, Twitter, Facebook, Music, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Service {
  id: string;
  name: string;
  description: string | null;
  price_per_1000: number;
  min_quantity: number;
  max_quantity: number;
  category_id: string;
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
}

const iconMap: Record<string, any> = {
  instagram: Instagram,
  send: Send,
  youtube: Youtube,
  twitter: Twitter,
  facebook: Facebook,
  music: Music,
};

export default function Services() {
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const handleQuickOrder = (serviceId: string) => {
    navigate(`/order?service=${serviceId}`);
  };

  useEffect(() => {
    const fetchData = async () => {
      const [categoriesRes, servicesRes] = await Promise.all([
        supabase.from('service_categories').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('services').select('*').eq('is_active', true),
      ]);

      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (servicesRes.data) setServices(servicesRes.data);
      setLoading(false);
    };

    fetchData();
  }, []);

  const filteredServices = services.filter((service) => {
    const matchesCategory = !selectedCategory || service.category_id === selectedCategory;
    const matchesSearch = !search || 
      service.name.toLowerCase().includes(search.toLowerCase()) ||
      service.description?.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getServicesForCategory = (categoryId: string) => {
    return filteredServices.filter(s => s.category_id === categoryId);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display font-bold">Services</h1>
          <p className="text-muted-foreground mt-1">
            Browse our wide range of social media marketing services.
          </p>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search services..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-card"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              !selectedCategory
                ? 'bg-primary text-primary-foreground'
                : 'bg-card hover:bg-muted text-muted-foreground'
            )}
          >
            All Services
          </button>
          {categories.map((category) => {
            const Icon = iconMap[category.icon || 'package'] || Filter;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                  selectedCategory === category.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card hover:bg-muted text-muted-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {category.name}
              </button>
            );
          })}
        </div>

        {/* Services List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading services...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {(selectedCategory ? [categories.find(c => c.id === selectedCategory)!] : categories)
              .filter(Boolean)
              .map((category) => {
                const categoryServices = getServicesForCategory(category.id);
                if (categoryServices.length === 0) return null;
                
                const Icon = iconMap[category.icon || 'package'] || Filter;
                
                return (
                  <div key={category.id} className="space-y-4">
                    <h2 className="text-xl font-display font-semibold flex items-center gap-2">
                      <Icon className="h-5 w-5 text-primary" />
                      {category.name}
                    </h2>
                    
                    {/* Mobile Card Layout */}
                    <div className="block md:hidden space-y-3">
                      {categoryServices.map((service) => (
                        <div key={service.id} className="glass-card p-4 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm leading-tight">{service.name}</p>
                              <p className="font-mono text-xs text-muted-foreground mt-1">
                                ID: {service.id.slice(0, 6)}
                              </p>
                            </div>
                            <span className="font-bold text-primary text-lg whitespace-nowrap">
                              ₹{Number(service.price_per_1000).toFixed(2)}
                            </span>
                          </div>
                          {service.description && (
                            <p className="text-xs text-muted-foreground line-clamp-3">
                              {service.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between gap-4 text-xs pt-3 border-t border-border">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">Min:</span>
                                <span className="font-medium">{service.min_quantity.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">Max:</span>
                                <span className="font-medium">{service.max_quantity.toLocaleString()}</span>
                              </div>
                            </div>
                            <Button 
                              size="sm" 
                              onClick={() => handleQuickOrder(service.id)}
                              className="bg-gradient-to-r from-primary to-secondary text-xs h-8"
                            >
                              <ShoppingCart className="h-3 w-3 mr-1" />
                              Order
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table Layout */}
                    <div className="hidden md:block glass-card overflow-hidden">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Service</th>
                            <th>Price/1K</th>
                            <th>Min</th>
                            <th>Max</th>
                          </tr>
                        </thead>
                        <tbody>
                          {categoryServices.map((service) => (
                            <tr key={service.id} className="hover-glow">
                              <td className="font-mono text-xs text-muted-foreground">
                                {service.id.slice(0, 6)}
                              </td>
                              <td>
                                <div>
                                  <p className="font-medium">{service.name}</p>
                                  {service.description && (
                                    <p className="text-xs text-muted-foreground mt-1 max-w-md">
                                      {service.description}
                                    </p>
                                  )}
                                </div>
                              </td>
                              <td className="font-semibold text-primary whitespace-nowrap">
                                ₹{Number(service.price_per_1000).toFixed(2)}
                              </td>
                              <td className="whitespace-nowrap">{service.min_quantity.toLocaleString()}</td>
                              <td className="whitespace-nowrap">{service.max_quantity.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}

            {filteredServices.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No services found matching your criteria.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
