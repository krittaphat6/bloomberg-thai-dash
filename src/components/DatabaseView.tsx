import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Table, 
  Calendar, 
  Grid3X3, 
  List, 
  Plus, 
  Filter, 
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Star,
  Tag,
  Clock,
  User,
  Hash,
  Type,
  CheckSquare,
  Link as LinkIcon
} from 'lucide-react';

export interface DatabaseProperty {
  id: string;
  name: string;
  type: 'text' | 'number' | 'select' | 'multiSelect' | 'date' | 'checkbox' | 'url' | 'email' | 'phone' | 'formula' | 'relation' | 'rollup' | 'createdTime' | 'lastEditedTime' | 'person';
  options?: string[];
}

export interface DatabaseRow {
  id: string;
  properties: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Database {
  id: string;
  name: string;
  properties: DatabaseProperty[];
  rows: DatabaseRow[];
  views: DatabaseView[];
}

export interface DatabaseView {
  id: string;
  name: string;
  type: 'table' | 'board' | 'calendar' | 'gallery' | 'list';
  filters: any[];
  sorts: any[];
}

interface DatabaseViewProps {
  database: Database;
  onUpdate: (database: Database) => void;
}

export const DatabaseView: React.FC<DatabaseViewProps> = ({ database, onUpdate }) => {
  const [currentView, setCurrentView] = useState<DatabaseView>(database.views[0] || {
    id: '1',
    name: 'All Items',
    type: 'table',
    filters: [],
    sorts: []
  });
  const [showPropertyDialog, setShowPropertyDialog] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Partial<DatabaseProperty>>({});
  const [showRowDialog, setShowRowDialog] = useState(false);
  const [editingRow, setEditingRow] = useState<Partial<DatabaseRow>>({});

  const addProperty = () => {
    const newProperty: DatabaseProperty = {
      id: Date.now().toString(),
      name: editingProperty.name || 'Untitled',
      type: editingProperty.type || 'text',
      options: editingProperty.options
    };

    onUpdate({
      ...database,
      properties: [...database.properties, newProperty]
    });

    setEditingProperty({});
    setShowPropertyDialog(false);
  };

  const addRow = () => {
    const newRow: DatabaseRow = {
      id: Date.now().toString(),
      properties: editingRow.properties || {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    onUpdate({
      ...database,
      rows: [...database.rows, newRow]
    });

    setEditingRow({});
    setShowRowDialog(false);
  };

  const updateRowProperty = (rowId: string, propertyId: string, value: any) => {
    onUpdate({
      ...database,
      rows: database.rows.map(row => 
        row.id === rowId 
          ? { 
              ...row, 
              properties: { ...row.properties, [propertyId]: value },
              updatedAt: new Date()
            }
          : row
      )
    });
  };

  const renderPropertyValue = (property: DatabaseProperty, value: any, rowId: string) => {
    switch (property.type) {
      case 'text':
        return (
          <Input
            value={value || ''}
            onChange={(e) => updateRowProperty(rowId, property.id, e.target.value)}
            className="border-none bg-transparent h-8"
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => updateRowProperty(rowId, property.id, Number(e.target.value))}
            className="border-none bg-transparent h-8"
          />
        );
      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => updateRowProperty(rowId, property.id, e.target.value)}
            className="border-none bg-transparent h-8 w-full"
          >
            <option value="">Select...</option>
            {property.options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
      case 'multiSelect':
        return (
          <div className="flex flex-wrap gap-1">
            {(value || []).map((item: string) => (
              <Badge key={item} variant="secondary" className="text-xs">
                {item}
                <button
                  onClick={() => {
                    const newValue = (value || []).filter((v: string) => v !== item);
                    updateRowProperty(rowId, property.id, newValue);
                  }}
                  className="ml-1 text-xs"
                >
                  ×
                </button>
              </Badge>
            ))}
            <select
              onChange={(e) => {
                if (e.target.value) {
                  const newValue = [...(value || []), e.target.value];
                  updateRowProperty(rowId, property.id, newValue);
                  e.target.value = '';
                }
              }}
              className="border-none bg-transparent text-xs"
            >
              <option value="">Add...</option>
              {property.options?.filter(option => !(value || []).includes(option)).map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        );
      case 'date':
        return (
          <Input
            type="date"
            value={value ? new Date(value).toISOString().split('T')[0] : ''}
            onChange={(e) => updateRowProperty(rowId, property.id, e.target.value)}
            className="border-none bg-transparent h-8"
          />
        );
      case 'checkbox':
        return (
          <input
            type="checkbox"
            checked={value || false}
            onChange={(e) => updateRowProperty(rowId, property.id, e.target.checked)}
          />
        );
      case 'url':
        return (
          <Input
            type="url"
            value={value || ''}
            onChange={(e) => updateRowProperty(rowId, property.id, e.target.value)}
            className="border-none bg-transparent h-8"
            placeholder="https://"
          />
        );
      default:
        return <span className="text-muted-foreground">-</span>;
    }
  };

  const renderTableView = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            {database.properties.map(property => (
              <th key={property.id} className="text-left p-2 font-medium">
                <div className="flex items-center gap-2">
                  {getPropertyIcon(property.type)}
                  {property.name}
                </div>
              </th>
            ))}
            <th className="w-12"></th>
          </tr>
        </thead>
        <tbody>
          {database.rows.map(row => (
            <tr key={row.id} className="border-b border-border hover:bg-muted/50">
              {database.properties.map(property => (
                <td key={property.id} className="p-2">
                  {renderPropertyValue(property, row.properties[property.id], row.id)}
                </td>
              ))}
              <td className="p-2">
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderBoardView = () => {
    const statusProperty = database.properties.find(p => p.type === 'select');
    if (!statusProperty) return <div>Add a select property to use board view</div>;

    const columns = statusProperty.options || [];
    
    return (
      <div className="flex gap-4 overflow-x-auto">
        {columns.map(status => {
          const columnRows = database.rows.filter(row => 
            row.properties[statusProperty.id] === status
          );
          
          return (
            <div key={status} className="flex-shrink-0 w-72">
              <div className="bg-muted p-3 rounded-t font-medium">
                {status} ({columnRows.length})
              </div>
              <div className="space-y-2 p-2 bg-muted/30 rounded-b min-h-[200px]">
                {columnRows.map(row => (
                  <Card key={row.id} className="p-3">
                    <div className="space-y-2">
                      {database.properties.slice(0, 3).map(property => {
                        if (property.id === statusProperty.id) return null;
                        return (
                          <div key={property.id}>
                            <div className="text-xs text-muted-foreground">{property.name}</div>
                            <div>{renderPropertyValue(property, row.properties[property.id], row.id)}</div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const getPropertyIcon = (type: string) => {
    const icons = {
      text: Type,
      number: Hash,
      select: Tag,
      multiSelect: Tag,
      date: Calendar,
      checkbox: CheckSquare,
      url: LinkIcon,
      email: Type,
      phone: Type,
      formula: Hash,
      relation: LinkIcon,
      rollup: Hash,
      createdTime: Clock,
      lastEditedTime: Clock,
      person: User
    };
    const Icon = icons[type as keyof typeof icons] || Type;
    return <Icon className="h-3 w-3" />;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">{database.name}</h2>
          <div className="flex gap-1">
            {(['table', 'board', 'calendar', 'gallery'] as const).map(viewType => {
              const Icon = viewType === 'table' ? Table :
                          viewType === 'board' ? Grid3X3 :
                          viewType === 'calendar' ? Calendar :
                          List;
              return (
                <Button
                  key={viewType}
                  variant={currentView.type === viewType ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentView({ ...currentView, type: viewType })}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              );
            })}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-1" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <Search className="h-4 w-4 mr-1" />
            Search
          </Button>
          
          <Dialog open={showPropertyDialog} onOpenChange={setShowPropertyDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Property
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Property</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Property name..."
                  value={editingProperty.name || ''}
                  onChange={(e) => setEditingProperty({ ...editingProperty, name: e.target.value })}
                />
                <select
                  className="w-full p-2 border border-input rounded-md bg-background"
                  value={editingProperty.type || 'text'}
                  onChange={(e) => setEditingProperty({ ...editingProperty, type: e.target.value as any })}
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="select">Select</option>
                  <option value="multiSelect">Multi-select</option>
                  <option value="date">Date</option>
                  <option value="checkbox">Checkbox</option>
                  <option value="url">URL</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                </select>
                {(editingProperty.type === 'select' || editingProperty.type === 'multiSelect') && (
                  <Input
                    placeholder="Options (comma separated)..."
                    value={editingProperty.options?.join(', ') || ''}
                    onChange={(e) => setEditingProperty({ 
                      ...editingProperty, 
                      options: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })}
                  />
                )}
                <Button onClick={addProperty}>Add Property</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showRowDialog} onOpenChange={setShowRowDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Row</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {database.properties.map(property => (
                  <div key={property.id}>
                    <label className="text-sm font-medium">{property.name}</label>
                    {renderPropertyValue(
                      property, 
                      editingRow.properties?.[property.id], 
                      'new'
                    )}
                  </div>
                ))}
                <Button onClick={addRow}>Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* View Content */}
      {currentView.type === 'table' && renderTableView()}
      {currentView.type === 'board' && renderBoardView()}
      {currentView.type === 'calendar' && (
        <div className="p-8 text-center text-muted-foreground">
          Calendar view coming soon...
        </div>
      )}
    </div>
  );
};