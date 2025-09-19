import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { 
  Plus, 
  GripVertical, 
  Trash2, 
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  AlertCircle,
  Minus,
  Table,
  Image,
  Video,
  FileText
} from 'lucide-react';

export interface Block {
  id: string;
  type: 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'bulletList' | 'numberedList' | 'todoList' | 'quote' | 'code' | 'callout' | 'divider' | 'table' | 'image' | 'video' | 'file';
  content: string;
  properties?: {
    checked?: boolean;
    calloutType?: 'info' | 'warning' | 'error' | 'success';
    tableData?: string[][];
    imageUrl?: string;
    videoUrl?: string;
    fileName?: string;
    fileUrl?: string;
  };
}

interface BlockEditorProps {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
}

export const BlockEditor: React.FC<BlockEditorProps> = ({ blocks, onChange }) => {
  const [showBlockMenu, setShowBlockMenu] = useState<string | null>(null);

  const addBlock = (afterId?: string, type: Block['type'] = 'paragraph') => {
    const newBlock: Block = {
      id: Date.now().toString(),
      type,
      content: '',
      properties: type === 'todoList' ? { checked: false } : 
                  type === 'callout' ? { calloutType: 'info' } :
                  type === 'table' ? { tableData: [['', ''], ['', '']] } :
                  {}
    };

    if (afterId) {
      const index = blocks.findIndex(b => b.id === afterId);
      const newBlocks = [...blocks];
      newBlocks.splice(index + 1, 0, newBlock);
      onChange(newBlocks);
    } else {
      onChange([...blocks, newBlock]);
    }
  };

  const updateBlock = (id: string, updates: Partial<Block>) => {
    onChange(blocks.map(block => 
      block.id === id ? { ...block, ...updates } : block
    ));
  };

  const deleteBlock = (id: string) => {
    onChange(blocks.filter(block => block.id !== id));
  };

  const moveBlock = (id: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex(b => b.id === id);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= blocks.length) return;
    
    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    onChange(newBlocks);
  };

  const renderBlock = (block: Block, index: number) => {
    const commonProps = {
      value: block.content,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => 
        updateBlock(block.id, { content: e.target.value }),
      className: "border-none bg-transparent resize-none outline-none",
      placeholder: getPlaceholder(block.type)
    };

    const blockContent = () => {
      switch (block.type) {
        case 'heading1':
          return <input {...commonProps} className="text-3xl font-bold bg-transparent border-none outline-none w-full" />;
        case 'heading2':
          return <input {...commonProps} className="text-2xl font-semibold bg-transparent border-none outline-none w-full" />;
        case 'heading3':
          return <input {...commonProps} className="text-xl font-medium bg-transparent border-none outline-none w-full" />;
        case 'bulletList':
          return (
            <div className="flex items-start gap-2">
              <span className="mt-2 text-muted-foreground">•</span>
              <textarea {...commonProps} rows={1} className="flex-1" />
            </div>
          );
        case 'numberedList':
          return (
            <div className="flex items-start gap-2">
              <span className="mt-2 text-muted-foreground">{index + 1}.</span>
              <textarea {...commonProps} rows={1} className="flex-1" />
            </div>
          );
        case 'todoList':
          return (
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={block.properties?.checked || false}
                onChange={(e) => updateBlock(block.id, { 
                  properties: { ...block.properties, checked: e.target.checked }
                })}
                className="mt-2"
              />
              <textarea 
                {...commonProps} 
                rows={1} 
                className={`flex-1 ${block.properties?.checked ? 'line-through text-muted-foreground' : ''}`}
              />
            </div>
          );
        case 'quote':
          return (
            <div className="border-l-4 border-terminal-amber pl-4">
              <textarea {...commonProps} rows={2} className="italic" />
            </div>
          );
        case 'code':
          return (
            <div className="bg-muted p-3 rounded font-mono text-sm">
              <textarea {...commonProps} rows={4} className="bg-transparent font-mono" />
            </div>
          );
        case 'callout':
          const calloutColors = {
            info: 'border-blue-500 bg-blue-500/10',
            warning: 'border-yellow-500 bg-yellow-500/10',
            error: 'border-red-500 bg-red-500/10',
            success: 'border-green-500 bg-green-500/10'
          };
          return (
            <div className={`border-l-4 p-3 rounded ${calloutColors[block.properties?.calloutType || 'info']}`}>
              <select
                value={block.properties?.calloutType || 'info'}
                onChange={(e) => updateBlock(block.id, { 
                  properties: { ...block.properties, calloutType: e.target.value as any }
                })}
                className="mb-2 text-xs bg-transparent border border-border rounded px-2 py-1"
              >
                <option value="info">💡 Info</option>
                <option value="warning">⚠️ Warning</option>
                <option value="error">❌ Error</option>
                <option value="success">✅ Success</option>
              </select>
              <textarea {...commonProps} rows={2} />
            </div>
          );
        case 'divider':
          return <hr className="border-border my-4" />;
        case 'table':
          const tableData = block.properties?.tableData || [['', '']];
          return (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-border">
                {tableData.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="border border-border p-2">
                        <input
                          type="text"
                          value={cell}
                          onChange={(e) => {
                            const newTableData = [...tableData];
                            newTableData[rowIndex][cellIndex] = e.target.value;
                            updateBlock(block.id, { 
                              properties: { ...block.properties, tableData: newTableData }
                            });
                          }}
                          className="w-full bg-transparent border-none outline-none"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </table>
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const newTableData = [...tableData, new Array(tableData[0].length).fill('')];
                    updateBlock(block.id, { 
                      properties: { ...block.properties, tableData: newTableData }
                    });
                  }}
                >
                  Add Row
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const newTableData = tableData.map(row => [...row, '']);
                    updateBlock(block.id, { 
                      properties: { ...block.properties, tableData: newTableData }
                    });
                  }}
                >
                  Add Column
                </Button>
              </div>
            </div>
          );
        case 'image':
          return (
            <div className="space-y-2">
              <Input
                placeholder="Image URL..."
                value={block.properties?.imageUrl || ''}
                onChange={(e) => updateBlock(block.id, { 
                  properties: { ...block.properties, imageUrl: e.target.value }
                })}
              />
              {block.properties?.imageUrl && (
                <img 
                  src={block.properties.imageUrl} 
                  alt="Block content"
                  className="max-w-full h-auto rounded"
                />
              )}
            </div>
          );
        default:
          return <textarea {...commonProps} rows={2} />;
      }
    };

    const blockTypeIcons = {
      paragraph: Type,
      heading1: Heading1,
      heading2: Heading2,
      heading3: Heading3,
      bulletList: List,
      numberedList: ListOrdered,
      todoList: CheckSquare,
      quote: Quote,
      code: Code,
      callout: AlertCircle,
      divider: Minus,
      table: Table,
      image: Image,
      video: Video,
      file: FileText
    };

    const Icon = blockTypeIcons[block.type];

    return (
      <div key={block.id} className="group relative">
        <div className="flex items-start gap-2">
          {/* Block Controls */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setShowBlockMenu(showBlockMenu === block.id ? null : block.id)}
            >
              <Plus className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 cursor-grab"
            >
              <GripVertical className="h-3 w-3" />
            </Button>
            <div className="flex items-center text-xs text-muted-foreground">
              <Icon className="h-3 w-3" />
            </div>
          </div>

          {/* Block Content */}
          <div className="flex-1 min-h-[2rem]">
            {blockContent()}
          </div>

          {/* Delete Button */}
          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
            onClick={() => deleteBlock(block.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        {/* Block Type Menu */}
        {showBlockMenu === block.id && (
          <Card className="absolute left-0 top-8 z-10 p-2 w-64">
            <div className="text-xs text-muted-foreground mb-2">Turn into</div>
            <div className="grid grid-cols-2 gap-1">
              {Object.entries(blockTypeIcons).map(([type, Icon]) => (
                <Button
                  key={type}
                  variant="ghost"
                  size="sm"
                  className="justify-start h-8"
                  onClick={() => {
                    updateBlock(block.id, { type: type as Block['type'] });
                    setShowBlockMenu(null);
                  }}
                >
                  <Icon className="h-3 w-3 mr-2" />
                  <span className="text-xs capitalize">{type.replace(/([A-Z])/g, ' $1').trim()}</span>
                </Button>
              ))}
            </div>
          </Card>
        )}
      </div>
    );
  };

  const getPlaceholder = (type: Block['type']) => {
    const placeholders = {
      paragraph: "Type '/' for commands",
      heading1: 'Heading 1',
      heading2: 'Heading 2',
      heading3: 'Heading 3',
      bulletList: 'List item',
      numberedList: 'List item',
      todoList: 'To-do',
      quote: 'Quote',
      code: 'Code',
      callout: 'Callout text',
      divider: '',
      table: 'Cell content',
      image: 'Image',
      video: 'Video',
      file: 'File'
    };
    return placeholders[type];
  };

  return (
    <div className="space-y-2">
      {blocks.map(renderBlock)}
      
      <div className="flex items-center gap-2 py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => addBlock()}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add block
        </Button>
      </div>
    </div>
  );
};