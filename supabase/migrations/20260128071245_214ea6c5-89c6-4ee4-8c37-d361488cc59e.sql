-- Create app_role enum for role-based access
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create order_status enum
CREATE TYPE public.order_status AS ENUM ('pending', 'processing', 'completed', 'partial', 'cancelled');

-- Create payment_status enum
CREATE TYPE public.payment_status AS ENUM ('pending', 'approved', 'rejected');

-- Create ticket_status enum
CREATE TYPE public.ticket_status AS ENUM ('open', 'closed');

-- Profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT,
  balance DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
  is_banned BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE(user_id, role)
);

-- Service categories
CREATE TABLE public.service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Services table
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price_per_1000 DECIMAL(10,4) NOT NULL,
  min_quantity INTEGER NOT NULL DEFAULT 100,
  max_quantity INTEGER NOT NULL DEFAULT 10000,
  api_service_id TEXT,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  link TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status order_status DEFAULT 'pending' NOT NULL,
  start_count INTEGER,
  remains INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  utr TEXT NOT NULL,
  status payment_status DEFAULT 'pending' NOT NULL,
  admin_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Support tickets table
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  status ticket_status DEFAULT 'open' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Ticket messages table
CREATE TABLE public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Announcements table
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Site settings table
CREATE TABLE public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- API providers table
CREATE TABLE public.api_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  api_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_providers ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies

-- Profiles: Users can read/update their own profile, admins can read all
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- User roles: Only admins can manage
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Service categories: Public read, admin write
CREATE POLICY "Anyone can view active categories" ON public.service_categories FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admins can manage categories" ON public.service_categories FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Services: Public read active, admin write
CREATE POLICY "Anyone can view active services" ON public.services FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admins can manage services" ON public.services FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Orders: Users see own, admins see all
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update orders" ON public.orders FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Payments: Users see own, admins see all
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create payments" ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all payments" ON public.payments FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update payments" ON public.payments FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Tickets: Users see own, admins see all
CREATE POLICY "Users can view own tickets" ON public.tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create tickets" ON public.tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all tickets" ON public.tickets FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update tickets" ON public.tickets FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Ticket messages: Users can see messages of own tickets
CREATE POLICY "Users can view own ticket messages" ON public.ticket_messages FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.tickets WHERE tickets.id = ticket_messages.ticket_id AND tickets.user_id = auth.uid()));
CREATE POLICY "Users can create messages on own tickets" ON public.ticket_messages FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.tickets WHERE tickets.id = ticket_messages.ticket_id AND tickets.user_id = auth.uid()));
CREATE POLICY "Admins can manage ticket messages" ON public.ticket_messages FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Announcements: Public read active, admin write
CREATE POLICY "Anyone can view active announcements" ON public.announcements FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admins can manage announcements" ON public.announcements FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Site settings: Public read, admin write
CREATE POLICY "Anyone can view settings" ON public.site_settings FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage settings" ON public.site_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- API providers: Admin only
CREATE POLICY "Admins can manage API providers" ON public.api_providers FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Insert default site settings
INSERT INTO public.site_settings (key, value) VALUES
  ('site_name', 'SMMPanel'),
  ('currency', 'INR'),
  ('currency_symbol', '₹'),
  ('min_recharge', '100'),
  ('contact_email', 'support@smmpanel.com'),
  ('maintenance_mode', 'false'),
  ('maintenance_message', 'We are currently undergoing maintenance. Please check back soon.'),
  ('upi_id', 'example@upi');

-- Insert default service categories
INSERT INTO public.service_categories (name, icon, sort_order) VALUES
  ('Instagram', 'instagram', 1),
  ('Telegram', 'send', 2),
  ('YouTube', 'youtube', 3),
  ('Twitter', 'twitter', 4),
  ('Facebook', 'facebook', 5),
  ('TikTok', 'music', 6);

-- Insert sample services
INSERT INTO public.services (category_id, name, description, price_per_1000, min_quantity, max_quantity) 
SELECT 
  sc.id,
  'Instagram Followers - High Quality',
  'Premium quality Instagram followers. Instant start, no drop guarantee.',
  12.50,
  100,
  50000
FROM public.service_categories sc WHERE sc.name = 'Instagram';

INSERT INTO public.services (category_id, name, description, price_per_1000, min_quantity, max_quantity) 
SELECT 
  sc.id,
  'Instagram Likes - Fast Delivery',
  'Fast Instagram likes from real accounts.',
  5.00,
  50,
  100000
FROM public.service_categories sc WHERE sc.name = 'Instagram';

INSERT INTO public.services (category_id, name, description, price_per_1000, min_quantity, max_quantity) 
SELECT 
  sc.id,
  'Telegram Channel Members',
  'Real Telegram members for your channel.',
  8.00,
  500,
  100000
FROM public.service_categories sc WHERE sc.name = 'Telegram';