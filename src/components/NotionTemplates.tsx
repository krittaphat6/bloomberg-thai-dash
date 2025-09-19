import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Calendar, 
  CheckSquare, 
  Briefcase, 
  BookOpen, 
  Target, 
  Users, 
  Brain,
  Plus,
  Star,
  Search,
  Filter
} from 'lucide-react';
import { Block } from './BlockEditor';

export interface NotionTemplate {
  id: string;
  name: string;
  description: string;
  category: 'Personal' | 'Work' | 'Education' | 'Project' | 'Other';
  icon: string;
  blocks: Block[];
  properties?: Record<string, any>;
  isFavorite: boolean;
  createdAt: Date;
}

interface NotionTemplatesProps {
  templates: NotionTemplate[];
  onUseTemplate: (template: NotionTemplate) => void;
  onCreateTemplate: (template: Omit<NotionTemplate, 'id' | 'createdAt'>) => void;
}

export const NotionTemplates: React.FC<NotionTemplatesProps> = ({
  templates,
  onUseTemplate,
  onCreateTemplate
}) => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [newTemplate, setNewTemplate] = useState<Partial<NotionTemplate>>({
    category: 'Personal',
    icon: '📄',
    blocks: []
  });

  const defaultTemplates: NotionTemplate[] = [
    {
      id: 'meeting-notes',
      name: 'Meeting Notes',
      description: 'Structured template for meeting minutes and action items',
      category: 'Work',
      icon: '📝',
      isFavorite: false,
      createdAt: new Date(),
      blocks: [
        { id: '1', type: 'heading1', content: 'Meeting Notes - [Date]' },
        { id: '2', type: 'heading2', content: 'Attendees' },
        { id: '3', type: 'bulletList', content: '' },
        { id: '4', type: 'heading2', content: 'Agenda' },
        { id: '5', type: 'numberedList', content: '' },
        { id: '6', type: 'heading2', content: 'Discussion Points' },
        { id: '7', type: 'paragraph', content: '' },
        { id: '8', type: 'heading2', content: 'Action Items' },
        { id: '9', type: 'todoList', content: '', properties: { checked: false } },
        { id: '10', type: 'heading2', content: 'Next Steps' },
        { id: '11', type: 'bulletList', content: '' }
      ]
    },
    {
      id: 'project-plan',
      name: 'Project Plan',
      description: 'Comprehensive project planning template',
      category: 'Project',
      icon: '🎯',
      isFavorite: true,
      createdAt: new Date(),
      blocks: [
        { id: '1', type: 'heading1', content: 'Project Plan - [Project Name]' },
        { id: '2', type: 'callout', content: 'Project overview and key objectives', properties: { calloutType: 'info' } },
        { id: '3', type: 'heading2', content: 'Project Goals' },
        { id: '4', type: 'bulletList', content: 'Primary goal' },
        { id: '5', type: 'bulletList', content: 'Secondary goals' },
        { id: '6', type: 'heading2', content: 'Timeline' },
        { id: '7', type: 'table', content: '', properties: { 
          tableData: [
            ['Phase', 'Start Date', 'End Date', 'Status'],
            ['Planning', '', '', 'In Progress'],
            ['Development', '', '', 'Not Started'],
            ['Testing', '', '', 'Not Started'],
            ['Launch', '', '', 'Not Started']
          ]
        }},
        { id: '8', type: 'heading2', content: 'Team Members' },
        { id: '9', type: 'bulletList', content: 'Project Manager: [Name]' },
        { id: '10', type: 'heading2', content: 'Resources & Budget' },
        { id: '11', type: 'paragraph', content: '' },
        { id: '12', type: 'heading2', content: 'Risk Assessment' },
        { id: '13', type: 'callout', content: 'Identify potential risks and mitigation strategies', properties: { calloutType: 'warning' } }
      ]
    },
    {
      id: 'daily-journal',
      name: 'Daily Journal',
      description: 'Personal reflection and daily planning template',
      category: 'Personal',
      icon: '📔',
      isFavorite: false,
      createdAt: new Date(),
      blocks: [
        { id: '1', type: 'heading1', content: 'Daily Journal - [Date]' },
        { id: '2', type: 'heading2', content: '🌅 Morning Reflection' },
        { id: '3', type: 'paragraph', content: 'How am I feeling today?' },
        { id: '4', type: 'paragraph', content: 'What are my priorities for today?' },
        { id: '5', type: 'heading2', content: '✅ Today\'s Goals' },
        { id: '6', type: 'todoList', content: 'Important task', properties: { checked: false } },
        { id: '7', type: 'todoList', content: 'Secondary task', properties: { checked: false } },
        { id: '8', type: 'heading2', content: '💭 Thoughts & Ideas' },
        { id: '9', type: 'paragraph', content: '' },
        { id: '10', type: 'heading2', content: '🌙 Evening Reflection' },
        { id: '11', type: 'paragraph', content: 'What went well today?' },
        { id: '12', type: 'paragraph', content: 'What could I improve tomorrow?' },
        { id: '13', type: 'paragraph', content: 'Gratitude: What am I thankful for?' }
      ]
    },
    {
      id: 'book-notes',
      name: 'Book Notes',
      description: 'Template for book summaries and key insights',
      category: 'Education',
      icon: '📚',
      isFavorite: false,
      createdAt: new Date(),
      blocks: [
        { id: '1', type: 'heading1', content: '[Book Title] - Notes' },
        { id: '2', type: 'paragraph', content: '**Author:** [Author Name]' },
        { id: '3', type: 'paragraph', content: '**Genre:** [Genre]' },
        { id: '4', type: 'paragraph', content: '**Rating:** ⭐⭐⭐⭐⭐' },
        { id: '5', type: 'divider', content: '' },
        { id: '6', type: 'heading2', content: '📖 Summary' },
        { id: '7', type: 'paragraph', content: 'Brief overview of the book...' },
        { id: '8', type: 'heading2', content: '💡 Key Insights' },
        { id: '9', type: 'bulletList', content: 'First key insight' },
        { id: '10', type: 'bulletList', content: 'Second key insight' },
        { id: '11', type: 'heading2', content: '📝 Favorite Quotes' },
        { id: '12', type: 'quote', content: 'Insert memorable quote here...' },
        { id: '13', type: 'heading2', content: '🎯 Action Items' },
        { id: '14', type: 'todoList', content: 'Apply this concept...', properties: { checked: false } },
        { id: '15', type: 'heading2', content: '🔗 Related Resources' },
        { id: '16', type: 'bulletList', content: 'Related book/article' }
      ]
    },
    {
      id: 'habit-tracker',
      name: 'Habit Tracker',
      description: 'Track daily habits and build consistency',
      category: 'Personal',
      icon: '🏃‍♂️',
      isFavorite: true,
      createdAt: new Date(),
      blocks: [
        { id: '1', type: 'heading1', content: 'Habit Tracker - [Month/Year]' },
        { id: '2', type: 'callout', content: 'Building better habits one day at a time', properties: { calloutType: 'success' } },
        { id: '3', type: 'heading2', content: '🎯 Habits to Track' },
        { id: '4', type: 'todoList', content: 'Exercise (30 min)', properties: { checked: false } },
        { id: '5', type: 'todoList', content: 'Read (20 min)', properties: { checked: false } },
        { id: '6', type: 'todoList', content: 'Meditate (10 min)', properties: { checked: false } },
        { id: '7', type: 'todoList', content: 'Drink 8 glasses of water', properties: { checked: false } },
        { id: '8', type: 'heading2', content: '📊 Progress Tracking' },
        { id: '9', type: 'table', content: '', properties: { 
          tableData: [
            ['Date', 'Exercise', 'Reading', 'Meditation', 'Water', 'Notes'],
            ['Day 1', '✅', '✅', '❌', '✅', 'Good start!'],
            ['Day 2', '', '', '', '', ''],
            ['Day 3', '', '', '', '', '']
          ]
        }},
        { id: '10', type: 'heading2', content: '💭 Weekly Reflection' },
        { id: '11', type: 'paragraph', content: 'What patterns do I notice?' },
        { id: '12', type: 'paragraph', content: 'What obstacles did I face?' },
        { id: '13', type: 'paragraph', content: 'How can I improve next week?' }
      ]
    }
  ];

  const allTemplates = [...defaultTemplates, ...templates];

  const filteredTemplates = allTemplates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['Personal', 'Work', 'Education', 'Project', 'Other'];

  const createTemplate = () => {
    if (newTemplate.name) {
      onCreateTemplate({
        name: newTemplate.name,
        description: newTemplate.description || '',
        category: newTemplate.category || 'Personal',
        icon: newTemplate.icon || '📄',
        blocks: newTemplate.blocks || [],
        properties: {},
        isFavorite: false
      });
      setNewTemplate({ category: 'Personal', icon: '📄', blocks: [] });
      setShowCreateDialog(false);
    }
  };

  const getIconForTemplate = (template: NotionTemplate) => {
    const iconMap = {
      'meeting-notes': '📝',
      'project-plan': '🎯',
      'daily-journal': '📔',
      'book-notes': '📚',
      'habit-tracker': '🏃‍♂️'
    };
    return template.icon || iconMap[template.id as keyof typeof iconMap] || '📄';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-terminal-green">Templates</h2>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Custom Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Template name..."
                value={newTemplate.name || ''}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
              />
              <Textarea
                placeholder="Description..."
                value={newTemplate.description || ''}
                onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                rows={3}
              />
              <div className="flex gap-4">
                <select
                  className="flex-1 p-2 border border-input rounded-md bg-background"
                  value={newTemplate.category || 'Personal'}
                  onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value as any })}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <Input
                  placeholder="Icon (emoji)"
                  value={newTemplate.icon || ''}
                  onChange={(e) => setNewTemplate({ ...newTemplate, icon: e.target.value })}
                  className="w-20"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={createTemplate}>Create Template</Button>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={selectedCategory === '' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('')}
          >
            All
          </Button>
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map(template => (
          <Card 
            key={template.id} 
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => onUseTemplate(template)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getIconForTemplate(template)}</span>
                  <div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {template.category}
                    </Badge>
                  </div>
                </div>
                {template.isFavorite && (
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                {template.description}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{template.blocks.length} blocks</span>
                <span>{template.createdAt.toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No templates found matching your criteria.</p>
          <p className="text-sm">Try adjusting your search or create a new template.</p>
        </div>
      )}
    </div>
  );
};