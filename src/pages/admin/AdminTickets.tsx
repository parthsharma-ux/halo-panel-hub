import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/ui/status-badge';
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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, MessageSquare, Send, User, Shield, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/lib/auth';

interface Ticket {
  id: string;
  subject: string;
  status: 'open' | 'closed';
  user_id: string;
  created_at: string;
  updated_at: string;
  user_email?: string;
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
}

export default function AdminTickets() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket.id);
    }
  }, [selectedTicket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      // Fetch tickets with user emails
      const { data: ticketsData, error } = await supabase
        .from('tickets')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Fetch user emails from profiles
      const userIds = [...new Set(ticketsData?.map(t => t.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email')
        .in('user_id', userIds);

      const emailMap = new Map(profiles?.map(p => [p.user_id, p.email]) || []);
      
      const ticketsWithEmails = ticketsData?.map(ticket => ({
        ...ticket,
        user_email: emailMap.get(ticket.user_id) || 'Unknown',
      })) || [];

      setTickets(ticketsWithEmails);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (ticketId: string) => {
    const { data, error } = await supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setMessages(data || []);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket || !user) return;

    setSending(true);
    try {
      const { error } = await supabase.from('ticket_messages').insert({
        ticket_id: selectedTicket.id,
        user_id: user.id,
        message: newMessage.trim(),
        is_admin: true,
      });

      if (error) throw error;

      // Update ticket's updated_at
      await supabase
        .from('tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedTicket.id);

      setNewMessage('');
      await fetchMessages(selectedTicket.id);
      await fetchTickets();

      toast({
        title: 'Message Sent',
        description: 'Your reply has been sent.',
      });
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

  const toggleTicketStatus = async (ticket: Ticket) => {
    const newStatus = ticket.status === 'open' ? 'closed' : 'open';
    
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', ticket.id);

      if (error) throw error;

      await fetchTickets();
      
      if (selectedTicket?.id === ticket.id) {
        setSelectedTicket({ ...selectedTicket, status: newStatus });
      }

      toast({
        title: 'Status Updated',
        description: `Ticket marked as ${newStatus}.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const openTicketDialog = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setDialogOpen(true);
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesSearch = 
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const openCount = tickets.filter(t => t.status === 'open').length;
  const closedCount = tickets.filter(t => t.status === 'closed').length;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Support Tickets</h1>
            <p className="text-muted-foreground mt-1">
              Manage and respond to user support requests.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Tickets</p>
                  <p className="text-2xl font-bold">{tickets.length}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Open Tickets</p>
                  <p className="text-2xl font-bold text-warning">{openCount}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-warning opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Closed Tickets</p>
                  <p className="text-2xl font-bold text-success">{closedCount}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-success opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by subject, email, or ticket ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background/50"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tickets</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tickets Table */}
        <Card className="glass-card overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Tickets ({filteredTickets.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No tickets found.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket ID</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-mono text-xs">
                        {ticket.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {ticket.subject}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {ticket.user_email}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={ticket.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(ticket.created_at), 'MMM d, HH:mm')}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(ticket.updated_at), 'MMM d, HH:mm')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openTicketDialog(ticket)}
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant={ticket.status === 'open' ? 'destructive' : 'default'}
                            size="sm"
                            onClick={() => toggleTicketStatus(ticket)}
                          >
                            {ticket.status === 'open' ? 'Close' : 'Reopen'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Ticket Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{selectedTicket?.subject}</span>
                <StatusBadge status={selectedTicket?.status || 'open'} />
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                From: {selectedTicket?.user_email} • Created: {selectedTicket && format(new Date(selectedTicket.created_at), 'MMM d, yyyy HH:mm')}
              </p>
            </DialogHeader>

            {/* Messages */}
            <ScrollArea className="flex-1 max-h-[400px] pr-4">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${msg.is_admin ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                      msg.is_admin ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      {msg.is_admin ? (
                        <Shield className="h-4 w-4" />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                    </div>
                    <div className={`flex-1 max-w-[80%] ${msg.is_admin ? 'text-right' : ''}`}>
                      <div
                        className={`inline-block p-3 rounded-lg ${
                          msg.is_admin
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(msg.created_at), 'MMM d, HH:mm')}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Reply Form */}
            {selectedTicket?.status === 'open' && (
              <div className="flex gap-2 mt-4 pt-4 border-t">
                <Textarea
                  placeholder="Type your reply..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 min-h-[80px]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      sendMessage();
                    }
                  }}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="self-end"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}

            {selectedTicket?.status === 'closed' && (
              <div className="text-center text-muted-foreground py-4 border-t">
                This ticket is closed. Reopen it to reply.
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
