import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GraphView from './GraphView';
import { RichTextEditor } from './RichTextEditor';
import { BlockEditor, Block } from './BlockEditor';
import { Database, DatabaseProperty, DatabaseRow } from './DatabaseView';
import { NotionTemplates, NotionTemplate } from './NotionTemplates';
import { SpreadsheetEditor } from './SpreadsheetEditor';
import AbleCanvasV2 from './Canvas/AbleCanvasV2';
import AdvancedSpreadsheet from './AdvancedSpreadsheet';
import { ExcelClone } from './Excel/ExcelClone';
import { SupplyChainViz } from './SupplyChainViz';
import AbleCalendar from './Calendar/AbleCalendar';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Link as LinkIcon, 
  Tag, 
  Calendar as CalendarIcon,
  FileText,
  Hash,
  Folder,
  Star,
  BookOpen,
  Network,
  Database as DatabaseIcon,
  Table,
  MessageCircle,
  Share2,
  Download,
  Upload,
  Copy,
  Archive,
  Settings,
  Layers,
  Palette,
  Bold,
  Italic,
  Type,
  ArrowLeft,
} from 'lucide-react';

interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  linkedNotes: string[];
  isFavorite: boolean;
  folder?: string;
  blocks?: Block[];
  richContent?: string;
  isRichText?: boolean;
  icon?: string;
  cover?: string;
  properties?: Record<string, any>;
  comments?: Comment[];
  parentId?: string;
  children?: string[];
}

interface Comment {
  id: string;
  content: string;
  author: string;
  createdAt: Date;
  resolved: boolean;
}

interface Folder {
  id: string;
  name: string;
  color: string;
}

interface Spreadsheet {
  id: string;
  name: string;
  sheets: any[];
  activeSheetId: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  folder?: string;
  linkedNotes?: string[];
  data?: any;
}

export default function NoteTaking() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([
    { id: '1', name: 'General', color: 'bg-blue-500' },
    { id: '2', name: 'Research', color: 'bg-green-500' },
    { id: '3', name: 'Ideas', color: 'bg-purple-500' }
  ]);
  const [databases, setDatabases] = useState<Database[]>([]);
  const [templates, setTemplates] = useState<NotionTemplate[]>([]);
  const [spreadsheets, setSpreadsheets] = useState<Spreadsheet[]>([]);
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState<Spreadsheet | null>(null);
  const [spreadsheetView, setSpreadsheetView] = useState<'grid' | 'relationship'>('grid');
  const [mainView, setMainView] = useState<'notes' | 'calendar' | 'templates' | 'spreadsheets' | 'canvas'>('notes');
  const [editorMode, setEditorMode] = useState<'simple' | 'rich' | 'blocks' | 'spreadsheet'>('simple');
  
  // Initialize with sample data on mount to avoid hydration issues
  useEffect(() => {
    if (notes.length === 0) {
      setNotes([
        {
          id: '1',
          title: 'Trading Strategy',
          content: 'This note discusses various trading strategies. It links to [[Risk Management]] and mentions #strategy.',
          tags: ['strategy', 'trading'],
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-15'),
          linkedNotes: ['2'],
          isFavorite: true,
          folder: 'Research'
        },
        {
          id: '2', 
          title: 'Risk Management',
          content: 'Key principles for managing risk in trading. Related to [[Trading Strategy]] and uses #risk #management tags.',
          tags: ['risk', 'management'],
          createdAt: new Date('2024-01-14'),
          updatedAt: new Date('2024-01-14'),
          linkedNotes: ['3'],
          isFavorite: false,
          folder: 'General'
        },
        {
          id: '3',
          title: 'Market Analysis',
          content: 'Technical analysis methods and tools. Connected to risk management through shared tags #analysis.',
          tags: ['analysis', 'technical'],
          createdAt: new Date('2024-01-13'),
          updatedAt: new Date('2024-01-13'),
          linkedNotes: ['1'],
          isFavorite: false,
          folder: 'Research'
        },
        {
          id: '4',
          title: 'Portfolio Ideas',
          content: 'Investment portfolio diversification ideas. Uses #strategy tag like Trading Strategy.',
          tags: ['strategy', 'portfolio'],
          createdAt: new Date('2024-01-12'),
          updatedAt: new Date('2024-01-12'),
          linkedNotes: [],
          isFavorite: true,
          folder: 'Ideas'
        }
      ]);
    }
  }, [notes.length]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingNote, setEditingNote] = useState<Partial<Note>>({});
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('list');
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Load notes from localStorage
  useEffect(() => {
    const savedNotes = localStorage.getItem('able-notes');
    if (savedNotes) {
      const parsedNotes = JSON.parse(savedNotes);
      setNotes(parsedNotes.map((note: any) => ({
        ...note,
        createdAt: new Date(note.createdAt),
        updatedAt: new Date(note.updatedAt)
      })));
    }
  }, []);

  // Save notes to localStorage
  useEffect(() => {
    localStorage.setItem('able-notes', JSON.stringify(notes));
  }, [notes]);

  // Load spreadsheets from localStorage
  useEffect(() => {
    const savedSpreadsheets = localStorage.getItem('able-spreadsheets');
    if (savedSpreadsheets) {
      try {
        const parsed = JSON.parse(savedSpreadsheets);
        setSpreadsheets(parsed.map((sheet: any) => ({
          ...sheet,
          createdAt: new Date(sheet.createdAt),
          updatedAt: new Date(sheet.updatedAt)
        })));
        console.log('✅ Loaded spreadsheets from localStorage:', parsed.length);
      } catch (e) {
        console.error('Failed to load spreadsheets:', e);
      }
    }
  }, []);

  // Save spreadsheets to localStorage
  useEffect(() => {
    if (spreadsheets.length > 0) {
      localStorage.setItem('able-spreadsheets', JSON.stringify(spreadsheets));
      console.log('💾 Saved spreadsheets to localStorage:', spreadsheets.length);
    }
  }, [spreadsheets]);

  // Save selected spreadsheet to localStorage when it changes
  useEffect(() => {
    if (selectedSpreadsheet) {
      localStorage.setItem('able-selected-spreadsheet', JSON.stringify(selectedSpreadsheet));
    }
  }, [selectedSpreadsheet]);

  // Load selected spreadsheet on mount
  useEffect(() => {
    const savedSelected = localStorage.getItem('able-selected-spreadsheet');
    if (savedSelected && spreadsheets.length > 0) {
      try {
        const parsed = JSON.parse(savedSelected);
        const found = spreadsheets.find(s => s.id === parsed.id);
        if (found) {
          setSelectedSpreadsheet(found);
        }
      } catch (e) {
        console.error('Failed to load selected spreadsheet:', e);
      }
    }
  }, [spreadsheets.length]);

  // Get all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    notes.forEach(note => note.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags);
  }, [notes]);

  // Filter notes based on search, folder, and tag
  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           note.content.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFolder = !selectedFolder || note.folder === selectedFolder;
      const matchesTag = !selectedTag || note.tags.includes(selectedTag);
      
      return matchesSearch && matchesFolder && matchesTag;
    });
  }, [notes, searchTerm, selectedFolder, selectedTag]);

  const createNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: editingNote.title || 'Untitled Note',
      content: editingNote.content || '',
      tags: editingNote.tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      linkedNotes: [],
      isFavorite: false,
      folder: editingNote.folder,
      blocks: [],
      richContent: '',
      isRichText: false,
      icon: editingNote.icon || '📄',
      properties: {},
      comments: [],
      children: []
    };
    
    setNotes([newNote, ...notes]);
    setEditingNote({});
    setIsCreating(false);
    setSelectedNote(newNote);
  };

  const createDatabase = () => {
    const newDatabase: Database = {
      id: Date.now().toString(),
      name: 'New Database',
      properties: [
        { id: '1', name: 'Name', type: 'text' },
        { id: '2', name: 'Status', type: 'select', options: ['Not Started', 'In Progress', 'Completed'] }
      ],
      rows: [],
      views: [
        { id: '1', name: 'All Items', type: 'table', filters: [], sorts: [] }
      ]
    };
    
    setDatabases([...databases, newDatabase]);
  };

  const useTemplate = (template: NotionTemplate) => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: template.name,
      content: '',
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      linkedNotes: [],
      isFavorite: false,
      blocks: [...template.blocks],
      richContent: '',
      isRichText: false,
      icon: template.icon,
      properties: template.properties || {},
      comments: [],
      children: []
    };
    
    setNotes([newNote, ...notes]);
    setSelectedNote(newNote);
    setMainView('notes');
  };

  const createTemplate = (templateData: Omit<NotionTemplate, 'id' | 'createdAt'>) => {
    const newTemplate: NotionTemplate = {
      id: Date.now().toString(),
      createdAt: new Date(),
      ...templateData
    };
    
    setTemplates([...templates, newTemplate]);
  };

  const updateNote = useCallback((noteId: string, updates: Partial<Note>) => {
    setNotes(prevNotes => prevNotes.map(note => 
      note.id === noteId 
        ? { ...note, ...updates, updatedAt: new Date() }
        : note
    ));
    
    setSelectedNote(prevSelected => {
      if (prevSelected?.id === noteId) {
        return { ...prevSelected, ...updates, updatedAt: new Date() };
      }
      return prevSelected;
    });
  }, []);

  // Auto-save function with debounce
  const autoSaveNote = useCallback((noteId: string, updates: Partial<Note>) => {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }
    
    const timeout = setTimeout(() => {
      updateNote(noteId, updates);
    }, 1000); // Auto-save after 1 second of inactivity
    
    setAutoSaveTimeout(timeout);
  }, [autoSaveTimeout, updateNote]);

  const deleteNote = (noteId: string) => {
    setNotes(notes.filter(note => note.id !== noteId));
    if (selectedNote?.id === noteId) {
      setSelectedNote(null);
    }
  };

  const toggleFavorite = (noteId: string) => {
    updateNote(noteId, { 
      isFavorite: !notes.find(n => n.id === noteId)?.isFavorite 
    });
  };

  const parseContent = (content: string) => {
    // Simple parsing for [[note links]] and #tags
    return content
      .replace(/\[\[([^\]]+)\]\]/g, '<span class="text-blue-400 underline cursor-pointer">$1</span>')
      .replace(/#(\w+)/g, '<span class="text-purple-400">#$1</span>');
  };

  const addTag = (noteId: string, tag: string) => {
    const note = notes.find(n => n.id === noteId);
    if (note && !note.tags.includes(tag)) {
      updateNote(noteId, { tags: [...note.tags, tag] });
    }
  };

  const removeTag = (noteId: string, tag: string) => {
    const note = notes.find(n => n.id === noteId);
    if (note) {
      updateNote(noteId, { tags: note.tags.filter(t => t !== tag) });
    }
  };

  // Spreadsheet functions
  const createNewSpreadsheet = () => {
    const newSpreadsheet: Spreadsheet = {
      id: `sheet-${Date.now()}`,
      name: 'Untitled Spreadsheet',
      sheets: [{
        id: 'sheet1',
        name: 'Sheet1',
        cells: {},
        rowHeights: {},
        columnWidths: {},
        frozenRows: 0,
        frozenColumns: 0
      }],
      activeSheetId: 'sheet1',
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
      linkedNotes: []
    };
    
    setSpreadsheets(prev => [...prev, newSpreadsheet]);
    setSelectedSpreadsheet(newSpreadsheet);
  };

  const updateSpreadsheetSheets = (spreadsheetId: string, newSheets: any[]) => {
    setSpreadsheets(prev => prev.map(sheet => 
      sheet.id === spreadsheetId 
        ? { ...sheet, sheets: newSheets, updatedAt: new Date() }
        : sheet
    ));
    if (selectedSpreadsheet?.id === spreadsheetId) {
      setSelectedSpreadsheet(prev => prev ? { ...prev, sheets: newSheets, updatedAt: new Date() } : null);
    }
  };

  const updateSpreadsheetName = (spreadsheetId: string, newName: string) => {
    setSpreadsheets(prev => prev.map(sheet => 
      sheet.id === spreadsheetId 
        ? { ...sheet, name: newName, updatedAt: new Date() }
        : sheet
    ));
    if (selectedSpreadsheet?.id === spreadsheetId) {
      setSelectedSpreadsheet(prev => prev ? { ...prev, name: newName, updatedAt: new Date() } : null);
    }
  };

  const deleteSpreadsheet = (spreadsheetId: string) => {
    setSpreadsheets(prev => prev.filter(sheet => sheet.id !== spreadsheetId));
    if (selectedSpreadsheet?.id === spreadsheetId) {
      setSelectedSpreadsheet(null);
    }
  };

  const updateSpreadsheetData = (spreadsheetId: string, data: any) => {
    setSpreadsheets(prev => prev.map(sheet => 
      sheet.id === spreadsheetId 
        ? { ...sheet, data, updatedAt: new Date() }
        : sheet
    ));
    if (selectedSpreadsheet?.id === spreadsheetId) {
      setSelectedSpreadsheet(prev => prev ? { ...prev, data, updatedAt: new Date() } : null);
    }
  };

  return (
    <Card className="w-full h-full bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-terminal-green">
          <BookOpen className="h-5 w-5" />
          ABLE NOTES - NOTION-STYLE WORKSPACE
        </CardTitle>
        <div className="text-xs text-muted-foreground">
          Advanced note-taking with rich text, blocks, databases, templates, and more
        </div>
      </CardHeader>
      <CardContent className="h-full p-4">
        <div className="flex h-full gap-4 overflow-hidden">
          {/* Sidebar */}
          <div className={`flex flex-col gap-4 border-r border-border pr-4 flex-shrink-0 transition-all duration-300 overflow-hidden ${mainView === 'canvas' ? 'w-0 pr-0 border-r-0 hidden' : 'w-80'}`}>
            {/* Main View Toggle */}
            <div className="grid grid-cols-2 gap-1 mb-4">
              <Button
                variant={mainView === 'notes' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMainView('notes')}
                className="text-xs"
              >
                <FileText className="h-3 w-3 mr-1" />
                Notes
              </Button>
              <Button
                variant={mainView === 'calendar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMainView('calendar')}
                className="text-xs"
              >
                <CalendarIcon className="h-3 w-3 mr-1" />
                Calendar
              </Button>
              <Button
                variant={mainView === 'templates' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMainView('templates')}
                className="text-xs"
              >
                <Layers className="h-3 w-3 mr-1" />
                Templates
              </Button>
              <Button
                variant={mainView === 'spreadsheets' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMainView('spreadsheets')}
                className="text-xs"
              >
                <Table className="h-3 w-3 mr-1" />
                Tables
              </Button>
              <Button
                variant={mainView === 'canvas' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMainView('canvas')}
                className="text-xs col-span-2"
              >
                <Palette className="h-3 w-3 mr-1" />
                Canvas V2
              </Button>
            </div>

            {mainView === 'notes' && (
              <>
                {/* View Mode Toggle */}
                <div className="flex gap-2 mb-4">
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="flex-1"
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    List
                  </Button>
                  <Button
                    variant={viewMode === 'graph' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('graph')}
                    className="flex-1"
                  >
                    <Network className="h-4 w-4 mr-1" />
                    Graph
                  </Button>
                </div>
              </>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  variant={selectedFolder === '' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedFolder('')}
                  className="text-xs"
                >
                  All
                </Button>
                {folders.map(folder => (
                  <Button
                    key={folder.id}
                    variant={selectedFolder === folder.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedFolder(folder.id)}
                    className="text-xs"
                  >
                    <div className={`w-2 h-2 rounded-full ${folder.color} mr-1`} />
                    {folder.name}
                  </Button>
                ))}
              </div>
              
              <div className="flex flex-wrap gap-1">
                {allTags.map(tag => (
                  <Badge
                    key={tag}
                    variant={selectedTag === tag ? 'default' : 'outline'}
                    className="cursor-pointer text-xs"
                    onClick={() => setSelectedTag(selectedTag === tag ? '' : tag)}
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              {mainView === 'notes' && (
                <Dialog open={isCreating} onOpenChange={setIsCreating}>
                  <DialogTrigger asChild>
                    <Button className="w-full" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      New Note
                    </Button>
                  </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Note</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Note title..."
                    value={editingNote.title || ''}
                    onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
                  />
                  <select
                    className="w-full p-2 border border-input rounded-md bg-background"
                    value={editingNote.folder || ''}
                    onChange={(e) => setEditingNote({ ...editingNote, folder: e.target.value })}
                  >
                    <option value="">No folder</option>
                    {folders.map(folder => (
                      <option key={folder.id} value={folder.id}>{folder.name}</option>
                    ))}
                  </select>
                  <Input
                    placeholder="Tags (comma separated)..."
                    value={editingNote.tags?.join(', ') || ''}
                    onChange={(e) => setEditingNote({ 
                      ...editingNote, 
                      tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                    })}
                  />
                  <Textarea
                    placeholder="Write your note here... Use [[note name]] for links and #tag for tags"
                    value={editingNote.content || ''}
                    onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                    rows={10}
                  />
                  <div className="flex gap-2">
                    <Button onClick={createNote}>Create Note</Button>
                    <Button variant="outline" onClick={() => setIsCreating(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
                </Dialog>
              )}
              
              {mainView === 'calendar' && (
                <div className="text-xs text-muted-foreground text-center py-2">
                  Create events in the calendar view
                </div>
              )}
              
              {mainView === 'templates' && (
                <Button className="w-full" size="sm" onClick={() => setMainView('templates')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Browse Templates
                </Button>
              )}
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-auto space-y-2">
              {mainView === 'notes' && filteredNotes.map(note => (
                <div
                  key={note.id}
                  className={`p-3 border border-border rounded cursor-pointer hover:bg-muted/50 transition-colors ${
                    selectedNote?.id === note.id ? 'bg-muted border-terminal-green' : ''
                  }`}
                  onClick={() => setSelectedNote(note)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{note.icon || '📄'}</span>
                      <h3 className="font-medium text-sm truncate">{note.title}</h3>
                    </div>
                    <div className="flex items-center gap-1">
                      {note.isFavorite && <Star className="h-3 w-3 text-yellow-400 fill-current" />}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(note.id);
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <Star className={`h-3 w-3 ${note.isFavorite ? 'text-yellow-400 fill-current' : 'text-muted-foreground'}`} />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mb-2">
                    {note.content.slice(0, 100)}...
                  </p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {note.tags.slice(0, 3).map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {note.updatedAt.toLocaleDateString()}
                  </div>
                </div>
              ))}
              
              {mainView === 'calendar' && (
                <div className="text-center py-8">
                  <CalendarIcon className="h-8 w-8 mx-auto mb-2 text-terminal-green" />
                  <p className="text-sm text-muted-foreground">View calendar in main area</p>
                </div>
              )}
              
              {mainView === 'templates' && (
                <div className="text-center py-8">
                  <Layers className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Browse templates in main area</p>
                </div>
              )}
              
              {mainView === 'spreadsheets' && spreadsheets.map(sheet => (
                <div
                  key={sheet.id}
                  className="p-3 border border-border rounded cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedSpreadsheet(sheet)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Table className="h-4 w-4 text-terminal-green" />
                    <h3 className="font-medium text-sm">{sheet.name}</h3>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {sheet.sheets.length} sheets • Updated {sheet.updatedAt.toLocaleDateString()}
                  </div>
                </div>
              ))}
              
              {mainView === 'spreadsheets' && spreadsheets.length === 0 && (
                <div className="text-center py-8">
                  <Table className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No spreadsheets yet</p>
                  <Button onClick={createNewSpreadsheet} size="sm" className="mt-2">
                    <Plus className="h-4 w-4 mr-1" />
                    Create Spreadsheet
                  </Button>
                </div>
              )}
            </div>

            <div className="text-xs text-terminal-amber space-y-1">
              <div>📝 {notes.length} notes • 🏷️ {allTags.length} tags • 📁 {folders.length} folders</div>
              <div>🗄️ {databases.length} databases • 📋 {templates.length} templates • 📊 {spreadsheets.length} spreadsheets</div>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
            {mainView === 'canvas' ? (
              <div className="flex-1 h-full min-h-0">
                <AbleCanvasV2 
                  notes={notes}
                  onUpdateNote={updateNote}
                  onCreateNote={(note) => setNotes(prev => [note, ...prev])}
                />
              </div>
            ) : mainView === 'templates' ? (
              <NotionTemplates
                templates={templates}
                onUseTemplate={useTemplate}
                onCreateTemplate={createTemplate}
              />
            ) : mainView === 'calendar' ? (
              <div className="flex-1 h-full">
                <AbleCalendar />
              </div>
            ) : mainView === 'spreadsheets' ? (
              selectedSpreadsheet ? (
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-2">
                      <Button onClick={() => setSelectedSpreadsheet(null)} size="sm" variant="ghost">
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <Input 
                        value={selectedSpreadsheet.name}
                        onChange={(e) => updateSpreadsheetName(selectedSpreadsheet.id, e.target.value)}
                        className="font-semibold text-lg border-none bg-transparent"
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant={spreadsheetView === 'grid' ? 'default' : 'outline'}
                        onClick={() => setSpreadsheetView('grid')}
                      >
                        <Table className="h-4 w-4 mr-1" />
                        Grid View
                      </Button>
                      <Button 
                        size="sm" 
                        variant={spreadsheetView === 'relationship' ? 'default' : 'outline'}
                        onClick={() => setSpreadsheetView('relationship')}
                      >
                        <Network className="h-4 w-4 mr-1" />
                        Relationship Map
                      </Button>
                      <Separator orientation="vertical" className="h-6" />
                      <Button size="sm" variant="outline">
                        <LinkIcon className="h-4 w-4 mr-1" />
                        Link Note
                      </Button>
                      <Button size="sm" variant="outline">
                        <Tag className="h-4 w-4 mr-1" />
                        Tags
                      </Button>
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4 mr-1" />
                        Export
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => deleteSpreadsheet(selectedSpreadsheet.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    {spreadsheetView === 'grid' ? (
                      <ExcelClone 
                        initialData={selectedSpreadsheet.data}
                        onSave={(data) => updateSpreadsheetData(selectedSpreadsheet.id, data)}
                      />
                    ) : (
                      <SupplyChainViz 
                        data={selectedSpreadsheet.data || {}}
                        columns={['NO.', 'Security', 'Ticker', 'Fund', 'Position', 'Pos Chg', '% Out', 'Current Mkt Val', 'Current MV Chg', 'Filing Date', 'Region']}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <Table className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">Excel-Style Spreadsheets</h3>
                    <p className="text-muted-foreground mb-4">Create powerful spreadsheets with formulas, charts, and data analysis</p>
                    <div className="flex gap-2 justify-center flex-wrap">
                      <Button onClick={createNewSpreadsheet}>
                        <Plus className="h-4 w-4 mr-2" />
                        New Spreadsheet
                      </Button>
                      <Button variant="outline">
                        <Upload className="h-4 w-4 mr-2" />
                        Import Excel
                      </Button>
                    </div>
                  </div>
                </div>
              )
            ) : viewMode === 'graph' ? (
              <GraphView
                notes={notes}
                onNodeClick={setSelectedNote}
                selectedNote={selectedNote}
                searchTerm={searchTerm}
                selectedFolder={selectedFolder}
                selectedTag={selectedTag}
              />
            ) : selectedNote ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{selectedNote.icon || '📄'}</span>
                    <h1 className="text-2xl font-bold">{selectedNote.title}</h1>
                    {selectedNote.isFavorite && (
                      <Star className="h-5 w-5 text-yellow-400 fill-current" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Editor Mode Toggle */}
                    <div className="flex border border-border rounded">
                      <Button
                        variant={editorMode === 'simple' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setEditorMode('simple')}
                        className="rounded-r-none"
                      >
                        <Type className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={editorMode === 'rich' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setEditorMode('rich')}
                        className="rounded-none"
                      >
                        <Bold className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={editorMode === 'blocks' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setEditorMode('blocks')}
                        className="rounded-l-none"
                      >
                        <Layers className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleFavorite(selectedNote.id)}
                    >
                      <Star className={`h-4 w-4 ${selectedNote.isFavorite ? 'text-yellow-400 fill-current' : ''}`} />
                    </Button>
                    
                    <Button variant="outline" size="sm">
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                    
                    <Button variant="outline" size="sm">
                      <Share2 className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteNote(selectedNote.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="h-4 w-4" />
                    Created: {selectedNote.createdAt.toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <Edit className="h-4 w-4" />
                    Updated: {selectedNote.updatedAt.toLocaleDateString()}
                  </div>
                  {selectedNote.folder && (
                    <div className="flex items-center gap-1">
                      <Folder className="h-4 w-4" />
                      {folders.find(f => f.id === selectedNote.folder)?.name}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedNote.tags.map(tag => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="cursor-pointer"
                      onClick={() => setSelectedTag(tag)}
                    >
                      #{tag}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTag(selectedNote.id, tag);
                        }}
                        className="h-4 w-4 p-0 ml-1"
                      >
                        ×
                      </Button>
                    </Badge>
                  ))}
                  <Input
                    placeholder="Add tag..."
                    className="w-32 h-6 text-xs"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const target = e.target as HTMLInputElement;
                        const tag = target.value.trim();
                        if (tag) {
                          addTag(selectedNote.id, tag);
                          target.value = '';
                        }
                      }
                    }}
                  />
                </div>

                <Separator className="my-4" />

                <div className="flex-1 overflow-auto">
                  <Textarea
                    value={selectedNote.content}
                    onChange={(e) => {
                      // Update the selected note immediately for UI responsiveness
                      setSelectedNote({ ...selectedNote, content: e.target.value });
                      // Auto-save with debounce
                      autoSaveNote(selectedNote.id, { content: e.target.value });
                    }}
                    className="w-full h-full min-h-96 resize-none border-0 focus:ring-0"
                    placeholder="Start writing your note... Use [[note name]] for links and #tag for tags"
                  />
                  <div className="text-xs text-muted-foreground mt-2 text-center">
                    💾 Auto-saves as you type
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <FileText className="h-16 w-16 mx-auto mb-4" />
                  <p className="text-lg mb-2">Select a note to edit</p>
                  <p className="text-sm">Or create a new note to get started</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}