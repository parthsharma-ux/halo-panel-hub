import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/ui/status-badge';
import { 
  MessageSquare, 
  Plus, 
  Send, 
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { format } from 'date-fns';

interface Ticket {
  id: string;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
}

export default function Support() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);
  
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, [user]);

  const fetchTickets = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('tickets')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (data) setTickets(data);
    setLoading(false);
  };

  const fetchMessages = async (ticketId: string) => {
    const { data } = await supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (data) setMessages(data);
  };

  const selectTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    await fetchMessages(ticket.id);
  };

  const createTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newMessage.trim()) return;

    setCreating(true);

    try {
      // Create ticket
      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          user_id: user!.id,
          subject: newSubject,
          status: 'open',
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Create first message
      const { error: messageError } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticketData.id,
          user_id: user!.id,
          message: newMessage,
          is_admin: false,
        });

      if (messageError) throw messageError;

      setNewSubject('');
      setNewMessage('');
      setShowCreateForm(false);
      await fetchTickets();
      
      toast({
        title: 'Ticket Created',
        description: 'We\'ll get back to you as soon as possible.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedTicket) return;

    setSending(true);

    try {
      const { error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: selectedTicket.id,
          user_id: user!.id,
          message: replyMessage,
          is_admin: false,
        });

      if (error) throw error;

      setReplyMessage('');
      await fetchMessages(selectedTicket.id);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Support</h1>
            <p className="text-muted-foreground mt-1">
              Get help from our support team.
            </p>
          </div>
          {!showCreateForm && !selectedTicket && (
            <Button 
              onClick={() => setShowCreateForm(true)}
              className="bg-gradient-to-r from-primary to-secondary"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Ticket
            </Button>
          )}
        </div>

        {/* Create Ticket Form */}
        {showCreateForm && (
          <div className="glass-card p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold">Create New Ticket</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
            <form onSubmit={createTicket} className="space-y-4">
              <div>
                <Input
                  placeholder="Subject"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="bg-background/50"
                />
              </div>
              <div>
                <Textarea
                  placeholder="Describe your issue..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  rows={4}
                  className="bg-background/50"
                />
              </div>
              <Button
                type="submit"
                disabled={creating || !newSubject.trim() || !newMessage.trim()}
                className="bg-gradient-to-r from-primary to-secondary"
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Ticket'
                )}
              </Button>
            </form>
          </div>
        )}

        {/* Ticket View */}
        {selectedTicket ? (
          <div className="glass-card overflow-hidden animate-slide-in">
            <div className="p-4 border-b border-border flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSelectedTicket(null)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1">
                <h2 className="font-semibold">{selectedTicket.subject}</h2>
                <p className="text-sm text-muted-foreground">
                  Created {format(new Date(selectedTicket.created_at), 'MMM d, yyyy')}
                </p>
              </div>
              <StatusBadge status={selectedTicket.status as any} />
            </div>

            {/* Messages */}
            <div className="p-4 max-h-[400px] overflow-y-auto space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.is_admin ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[70%] p-3 rounded-lg ${
                      msg.is_admin
                        ? 'bg-muted text-foreground'
                        : 'bg-primary text-primary-foreground'
                    }`}
                  >
                    <p className="text-sm">{msg.message}</p>
                    <p className={`text-xs mt-1 ${msg.is_admin ? 'text-muted-foreground' : 'text-primary-foreground/70'}`}>
                      {msg.is_admin ? 'Support' : 'You'} • {format(new Date(msg.created_at), 'HH:mm')}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply Form */}
            {selectedTicket.status === 'open' && (
              <form onSubmit={sendReply} className="p-4 border-t border-border flex gap-2">
                <Input
                  placeholder="Type your message..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className="flex-1 bg-background/50"
                />
                <Button type="submit" disabled={sending || !replyMessage.trim()}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            )}
          </div>
        ) : !showCreateForm && (
          /* Ticket List */
          <div className="glass-card overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">
                Loading tickets...
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-12 text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">No support tickets yet.</p>
                <Button 
                  className="mt-4"
                  onClick={() => setShowCreateForm(true)}
                >
                  Create your first ticket
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {tickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => selectTicket(ticket)}
                    className="w-full p-4 text-left hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{ticket.subject}</span>
                      <StatusBadge status={ticket.status as any} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Updated {format(new Date(ticket.updated_at), 'MMM d, yyyy HH:mm')}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
