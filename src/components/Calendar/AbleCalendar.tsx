import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Trash2,
  Edit
} from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  location?: string;
  color: string;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  status: 'confirmed' | 'tentative' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

type ViewType = 'month' | 'week' | 'day' | 'schedule';

const COLORS = [
  '#22c55e', // Green (terminal-green)
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#f97316', // Orange
  '#a855f7', // Purple
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#6b7280', // Gray
];

export default function AbleCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [view, setView] = useState<ViewType>('month');
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<CalendarEvent>>({});
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Load events from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('able-calendar-events');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setEvents(parsed.map((e: any) => ({
          ...e,
          startDate: new Date(e.startDate),
          endDate: new Date(e.endDate),
          createdAt: new Date(e.createdAt),
          updatedAt: new Date(e.updatedAt)
        })));
      } catch (e) {
        console.error('Failed to load calendar events:', e);
      }
    }
  }, []);

  // Auto-save events
  useEffect(() => {
    if (events.length > 0) {
      localStorage.setItem('able-calendar-events', JSON.stringify(events));
    }
  }, [events]);

  // Calendar calculations
  const getDaysInMonth = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days: (Date | null)[] = [];
    
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  }, []);

  const getEventsForDate = useCallback((date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.startDate);
      return eventDate.toDateString() === date.toDateString();
    });
  }, [events]);

  const getWeekDays = useCallback((date: Date) => {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay());
    
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  }, []);

  // Navigation
  const navigatePrev = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // Event CRUD
  const createEvent = () => {
    if (!editingEvent.title?.trim()) return;
    
    const newEvent: CalendarEvent = {
      id: `event-${Date.now()}`,
      title: editingEvent.title,
      description: editingEvent.description,
      startDate: editingEvent.startDate || selectedDate || new Date(),
      endDate: editingEvent.endDate || editingEvent.startDate || selectedDate || new Date(),
      allDay: editingEvent.allDay || false,
      location: editingEvent.location,
      color: editingEvent.color || '#22c55e',
      recurrence: editingEvent.recurrence || 'none',
      status: 'confirmed',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (editingEvent.id) {
      // Update existing
      setEvents(prev => prev.map(e => e.id === editingEvent.id ? { ...newEvent, id: editingEvent.id } : e));
    } else {
      // Create new
      setEvents(prev => [...prev, newEvent]);
    }
    
    setShowEventDialog(false);
    setEditingEvent({});
  };

  const deleteEvent = (eventId: string) => {
    setEvents(prev => prev.filter(e => e.id !== eventId));
    setSelectedEvent(null);
  };

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return selectedDate?.toDateString() === date.toDateString();
  };

  return (
    <div className="h-full flex flex-col bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-terminal-green/30">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={navigatePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={navigateNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToToday}>
            Today
          </Button>
          <h1 className="text-xl font-bold text-terminal-green">
            {formatMonth(currentDate)}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as ViewType)}>
            <TabsList className="bg-terminal-green/10 border border-terminal-green/30">
              <TabsTrigger value="day" className="data-[state=active]:bg-terminal-green data-[state=active]:text-black text-xs">
                Day
              </TabsTrigger>
              <TabsTrigger value="week" className="data-[state=active]:bg-terminal-green data-[state=active]:text-black text-xs">
                Week
              </TabsTrigger>
              <TabsTrigger value="month" className="data-[state=active]:bg-terminal-green data-[state=active]:text-black text-xs">
                Month
              </TabsTrigger>
              <TabsTrigger value="schedule" className="data-[state=active]:bg-terminal-green data-[state=active]:text-black text-xs">
                Schedule
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button 
            className="bg-terminal-green text-black hover:bg-terminal-green/80"
            onClick={() => {
              setEditingEvent({ startDate: selectedDate || new Date(), color: '#22c55e' });
              setShowEventDialog(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create
          </Button>
        </div>
      </div>

      {/* Calendar Views */}
      <div className="flex-1 overflow-hidden">
        {view === 'month' && (
          <MonthView 
            currentDate={currentDate}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onSelectEvent={setSelectedEvent}
            getDaysInMonth={getDaysInMonth}
            getEventsForDate={getEventsForDate}
            isToday={isToday}
            isSelected={isSelected}
          />
        )}
        
        {view === 'week' && (
          <WeekView 
            currentDate={currentDate}
            onSelectDate={setSelectedDate}
            onSelectEvent={setSelectedEvent}
            getWeekDays={getWeekDays}
            getEventsForDate={getEventsForDate}
            isToday={isToday}
          />
        )}

        {view === 'day' && (
          <DayView 
            currentDate={currentDate}
            onSelectEvent={setSelectedEvent}
            getEventsForDate={getEventsForDate}
          />
        )}

        {view === 'schedule' && (
          <ScheduleView 
            events={events}
            onSelectEvent={setSelectedEvent}
          />
        )}
      </div>

      {/* Create/Edit Event Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="bg-background border-terminal-green text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-terminal-green">
              {editingEvent.id ? 'Edit Event' : 'Create Event'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Input
              placeholder="Add title"
              value={editingEvent.title || ''}
              onChange={(e) => setEditingEvent(prev => ({ ...prev, title: e.target.value }))}
              className="bg-transparent border-terminal-green/30 text-lg font-medium"
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Start</label>
                <Input
                  type="datetime-local"
                  value={editingEvent.startDate ? new Date(editingEvent.startDate.getTime() - editingEvent.startDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setEditingEvent(prev => ({ ...prev, startDate: new Date(e.target.value) }))}
                  className="bg-transparent border-terminal-green/30"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">End</label>
                <Input
                  type="datetime-local"
                  value={editingEvent.endDate ? new Date(editingEvent.endDate.getTime() - editingEvent.endDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setEditingEvent(prev => ({ ...prev, endDate: new Date(e.target.value) }))}
                  className="bg-transparent border-terminal-green/30"
                />
              </div>
            </div>

            <Input
              placeholder="Add location"
              value={editingEvent.location || ''}
              onChange={(e) => setEditingEvent(prev => ({ ...prev, location: e.target.value }))}
              className="bg-transparent border-terminal-green/30"
            />

            <Textarea
              placeholder="Add description"
              value={editingEvent.description || ''}
              onChange={(e) => setEditingEvent(prev => ({ ...prev, description: e.target.value }))}
              className="bg-transparent border-terminal-green/30"
              rows={3}
            />

            {/* Color Picker */}
            <div>
              <label className="text-sm text-muted-foreground">Color</label>
              <div className="flex gap-2 mt-1">
                {COLORS.map(color => (
                  <button
                    key={color}
                    className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                      editingEvent.color === color ? 'border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setEditingEvent(prev => ({ ...prev, color }))}
                  />
                ))}
              </div>
            </div>

            {/* Recurrence */}
            <Select 
              value={editingEvent.recurrence || 'none'}
              onValueChange={(v) => setEditingEvent(prev => ({ ...prev, recurrence: v as any }))}
            >
              <SelectTrigger className="bg-transparent border-terminal-green/30">
                <SelectValue placeholder="Does not repeat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Does not repeat</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowEventDialog(false);
                  setEditingEvent({});
                }}
                className="border-terminal-green/30"
              >
                Cancel
              </Button>
              <Button 
                onClick={createEvent}
                className="bg-terminal-green text-black hover:bg-terminal-green/80"
                disabled={!editingEvent.title?.trim()}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="bg-background border-terminal-green text-foreground">
          {selectedEvent && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: selectedEvent.color }}
                  />
                  <DialogTitle className="text-terminal-green">
                    {selectedEvent.title}
                  </DialogTitle>
                </div>
              </DialogHeader>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {selectedEvent.allDay 
                      ? 'All day'
                      : `${formatTime(selectedEvent.startDate)} - ${formatTime(selectedEvent.endDate)}`
                    }
                  </span>
                </div>

                {selectedEvent.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedEvent.location}</span>
                  </div>
                )}

                {selectedEvent.description && (
                  <p className="text-sm text-muted-foreground">
                    {selectedEvent.description}
                  </p>
                )}

                <div className="flex gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setEditingEvent(selectedEvent);
                      setSelectedEvent(null);
                      setShowEventDialog(true);
                    }}
                    className="border-terminal-green/30"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => deleteEvent(selectedEvent.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Month View Component
function MonthView({ 
  currentDate, 
  selectedDate, 
  onSelectDate, 
  onSelectEvent, 
  getDaysInMonth, 
  getEventsForDate, 
  isToday, 
  isSelected 
}: {
  currentDate: Date;
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  onSelectEvent: (event: CalendarEvent) => void;
  getDaysInMonth: (date: Date) => (Date | null)[];
  getEventsForDate: (date: Date) => CalendarEvent[];
  isToday: (date: Date) => boolean;
  isSelected: (date: Date) => boolean;
}) {
  const days = getDaysInMonth(currentDate);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="h-full flex flex-col p-4">
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 flex-1">
        {days.map((day, i) => (
          <div
            key={i}
            className={`
              min-h-[80px] p-1 border border-terminal-green/10 rounded cursor-pointer
              hover:bg-terminal-green/5 transition-colors
              ${!day ? 'bg-transparent pointer-events-none' : ''}
              ${day && isToday(day) ? 'bg-terminal-green/10 border-terminal-green/50' : ''}
              ${day && isSelected(day) ? 'ring-2 ring-terminal-green' : ''}
            `}
            onClick={() => day && onSelectDate(day)}
          >
            {day && (
              <>
                <div className={`text-sm font-medium mb-1 ${isToday(day) ? 'text-terminal-green font-bold' : ''}`}>
                  {day.getDate()}
                </div>
                <div className="space-y-0.5">
                  {getEventsForDate(day).slice(0, 3).map(event => (
                    <div
                      key={event.id}
                      className="text-xs p-0.5 rounded truncate cursor-pointer hover:opacity-80"
                      style={{ backgroundColor: event.color + '33', color: event.color }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(event);
                      }}
                    >
                      {event.title}
                    </div>
                  ))}
                  {getEventsForDate(day).length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{getEventsForDate(day).length - 3} more
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Week View Component
function WeekView({ 
  currentDate, 
  onSelectDate, 
  onSelectEvent, 
  getWeekDays, 
  getEventsForDate, 
  isToday 
}: {
  currentDate: Date;
  onSelectDate: (date: Date) => void;
  onSelectEvent: (event: CalendarEvent) => void;
  getWeekDays: (date: Date) => Date[];
  getEventsForDate: (date: Date) => CalendarEvent[];
  isToday: (date: Date) => boolean;
}) {
  const days = getWeekDays(currentDate);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="h-full flex flex-col overflow-auto">
      <div className="grid grid-cols-8 border-b border-terminal-green/20 sticky top-0 bg-background z-10">
        <div className="p-2" />
        {days.map((day, i) => (
          <div 
            key={i} 
            className={`p-2 text-center border-l border-terminal-green/10 ${isToday(day) ? 'bg-terminal-green/10' : ''}`}
          >
            <div className="text-xs text-muted-foreground">
              {day.toLocaleDateString('en-US', { weekday: 'short' })}
            </div>
            <div className={`text-lg font-bold ${isToday(day) ? 'text-terminal-green' : ''}`}>
              {day.getDate()}
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1">
        {hours.map(hour => (
          <div key={hour} className="grid grid-cols-8 border-b border-terminal-green/10 min-h-[50px]">
            <div className="p-2 text-xs text-muted-foreground text-right pr-4">
              {hour.toString().padStart(2, '0')}:00
            </div>
            {days.map((day, i) => (
              <div 
                key={i} 
                className="border-l border-terminal-green/10 relative hover:bg-terminal-green/5 cursor-pointer"
                onClick={() => onSelectDate(day)}
              >
                {getEventsForDate(day)
                  .filter(e => new Date(e.startDate).getHours() === hour)
                  .map(event => (
                    <div
                      key={event.id}
                      className="absolute left-0 right-0 mx-1 p-1 rounded text-xs truncate cursor-pointer"
                      style={{ backgroundColor: event.color + '33', color: event.color, top: '2px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(event);
                      }}
                    >
                      {event.title}
                    </div>
                  ))
                }
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Day View Component
function DayView({ 
  currentDate, 
  onSelectEvent, 
  getEventsForDate 
}: {
  currentDate: Date;
  onSelectEvent: (event: CalendarEvent) => void;
  getEventsForDate: (date: Date) => CalendarEvent[];
}) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const dayEvents = getEventsForDate(currentDate);

  return (
    <div className="h-full flex overflow-auto p-4">
      <div className="w-20 flex-shrink-0">
        {hours.map(hour => (
          <div key={hour} className="h-[50px] text-right pr-4 text-sm text-muted-foreground">
            {hour.toString().padStart(2, '0')}:00
          </div>
        ))}
      </div>

      <div className="flex-1 relative border-l border-terminal-green/20">
        {hours.map(hour => (
          <div key={hour} className="h-[50px] border-b border-terminal-green/10" />
        ))}

        {dayEvents.map(event => {
          const startHour = new Date(event.startDate).getHours();
          const startMinute = new Date(event.startDate).getMinutes();
          const top = startHour * 50 + (startMinute / 60) * 50;
          
          return (
            <div
              key={event.id}
              className="absolute left-2 right-2 p-2 rounded cursor-pointer hover:opacity-80"
              style={{
                backgroundColor: event.color + '33',
                borderLeft: `4px solid ${event.color}`,
                top: `${top}px`,
                minHeight: '30px'
              }}
              onClick={() => onSelectEvent(event)}
            >
              <div className="font-medium text-sm" style={{ color: event.color }}>{event.title}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(event.startDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Schedule View Component
function ScheduleView({ 
  events, 
  onSelectEvent 
}: {
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
}) {
  const groupedEvents = events.reduce((acc, event) => {
    const dateKey = new Date(event.startDate).toDateString();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, CalendarEvent[]>);

  const sortedDates = Object.keys(groupedEvents).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  return (
    <ScrollArea className="h-full p-4">
      {sortedDates.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <CalendarIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No upcoming events</p>
          <p className="text-sm mt-1">Create an event to get started</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map(dateKey => (
            <div key={dateKey}>
              <h3 className="text-sm font-medium text-terminal-green mb-2">
                {new Date(dateKey).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h3>
              <div className="space-y-2">
                {groupedEvents[dateKey].map(event => (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-terminal-green/20 hover:bg-terminal-green/5 cursor-pointer transition-colors"
                    onClick={() => onSelectEvent(event)}
                  >
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: event.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{event.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {event.allDay 
                          ? 'All day'
                          : new Date(event.startDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                        }
                        {event.location && ` · ${event.location}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </ScrollArea>
  );
}

export { AbleCalendar };
