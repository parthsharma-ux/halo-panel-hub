import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ShoppingCart, Loader2, Info, CheckCircle } from 'lucide-react';
import { z } from 'zod';

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
}

const orderSchema = z.object({
  serviceId: z.string().min(1, 'Please select a service'),
  link: z.string().url('Please enter a valid URL'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
});

export default function PlaceOrder() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedService, setSelectedService] = useState<string>('');
  const [link, setLink] = useState('');
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [orderSuccess, setOrderSuccess] = useState(false);

  const currentService = services.find(s => s.id === selectedService);
  const totalAmount = currentService 
    ? (Number(quantity) / 1000) * Number(currentService.price_per_1000) 
    : 0;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
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

  const filteredServices = services.filter(s => 
    !selectedCategory || s.category_id === selectedCategory
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setOrderSuccess(false);

    const quantityNum = Number(quantity);

    // Validate
    const result = orderSchema.safeParse({
      serviceId: selectedService,
      link,
      quantity: quantityNum,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    // Check quantity limits
    if (currentService) {
      if (quantityNum < currentService.min_quantity) {
        setErrors({ quantity: `Minimum quantity is ${currentService.min_quantity}` });
        return;
      }
      if (quantityNum > currentService.max_quantity) {
        setErrors({ quantity: `Maximum quantity is ${currentService.max_quantity}` });
        return;
      }
    }

    // Check balance
    if (Number(profile?.balance) < totalAmount) {
      toast({
        title: 'Insufficient Balance',
        description: 'Please add funds to your account.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      // Create order
      const { error: orderError } = await supabase.from('orders').insert({
        user_id: user!.id,
        service_id: selectedService,
        link,
        quantity: quantityNum,
        amount: totalAmount,
        status: 'pending',
      });

      if (orderError) throw orderError;

      // Deduct balance
      const newBalance = Number(profile?.balance) - totalAmount;
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('user_id', user!.id);

      if (balanceError) throw balanceError;

      await refreshProfile();
      setOrderSuccess(true);
      
      toast({
        title: 'Order Placed!',
        description: 'Your order has been submitted successfully.',
      });

      // Reset form
      setSelectedService('');
      setLink('');
      setQuantity('');
    } catch (error: any) {
      toast({
        title: 'Order Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display font-bold">Place New Order</h1>
          <p className="text-muted-foreground mt-1">
            Select a service and enter the details to place your order.
          </p>
        </div>

        {orderSuccess && (
          <div className="glass-card p-4 border-l-4 border-success animate-scale-in">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-success" />
              <div>
                <p className="font-medium text-success">Order Placed Successfully!</p>
                <p className="text-sm text-muted-foreground">
                  Your order is now being processed. Check your order history for updates.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Order Form */}
        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category */}
            <div className="space-y-2">
              <Label>Category (Optional)</Label>
              <Select value={selectedCategory} onValueChange={(value) => {
                setSelectedCategory(value === 'all' ? '' : value);
                setSelectedService('');
              }}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Service */}
            <div className="space-y-2">
              <Label>Service *</Label>
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {filteredServices.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} - ₹{Number(service.price_per_1000).toFixed(2)}/1K
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.serviceId && (
                <p className="text-xs text-destructive">{errors.serviceId}</p>
              )}
            </div>

            {/* Service Info */}
            {currentService && (
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Info className="h-4 w-4 text-primary" />
                  <span className="font-medium">{currentService.name}</span>
                </div>
                {currentService.description && (
                  <p className="text-sm text-muted-foreground">{currentService.description}</p>
                )}
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>Min: {currentService.min_quantity.toLocaleString()}</span>
                  <span>Max: {currentService.max_quantity.toLocaleString()}</span>
                  <span>Price: ₹{Number(currentService.price_per_1000).toFixed(2)}/1K</span>
                </div>
              </div>
            )}

            {/* Link */}
            <div className="space-y-2">
              <Label htmlFor="link">Link / Username *</Label>
              <Input
                id="link"
                type="url"
                placeholder="https://instagram.com/username"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="bg-background/50"
              />
              {errors.link && (
                <p className="text-xs text-destructive">{errors.link}</p>
              )}
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                placeholder={currentService ? `${currentService.min_quantity} - ${currentService.max_quantity}` : 'Enter quantity'}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min={currentService?.min_quantity}
                max={currentService?.max_quantity}
                className="bg-background/50"
              />
              {errors.quantity && (
                <p className="text-xs text-destructive">{errors.quantity}</p>
              )}
            </div>

            {/* Price Summary */}
            <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Amount</span>
                <span className="text-2xl font-display font-bold gradient-text">
                  ₹{totalAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-muted-foreground">Your Balance</span>
                <span className={Number(profile?.balance) < totalAmount ? 'text-destructive' : 'text-success'}>
                  ₹{Number(profile?.balance || 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-secondary"
              disabled={submitting || !selectedService || !link || !quantity}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Place Order
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
