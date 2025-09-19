import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  Code, 
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Quote,
  Link,
  Image,
  Palette
} from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  placeholder = "Start writing..."
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isEditorFocused, setIsEditorFocused] = useState(false);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== content) {
      editorRef.current.innerHTML = content;
    }
  }, [content]);

  const executeCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const insertSlashCommand = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const slashMenu = document.createElement('span');
      slashMenu.className = 'slash-command-menu';
      slashMenu.innerHTML = `
        <div class="bg-popover border border-border rounded-lg shadow-lg p-2 absolute z-50">
          <div class="text-xs text-muted-foreground mb-2">Choose a block type</div>
          <div class="space-y-1">
            <div class="slash-option" data-command="heading1">📝 Heading 1</div>
            <div class="slash-option" data-command="heading2">📄 Heading 2</div>
            <div class="slash-option" data-command="paragraph">📃 Paragraph</div>
            <div class="slash-option" data-command="bullet">• Bulleted List</div>
            <div class="slash-option" data-command="numbered">1. Numbered List</div>
            <div class="slash-option" data-command="todo">☐ To-do List</div>
            <div class="slash-option" data-command="quote">💬 Quote</div>
            <div class="slash-option" data-command="code">💻 Code Block</div>
            <div class="slash-option" data-command="callout">📢 Callout</div>
            <div class="slash-option" data-command="divider">➖ Divider</div>
            <div class="slash-option" data-command="table">🔢 Table</div>
          </div>
        </div>
      `;
      range.insertNode(slashMenu);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === '/') {
      setTimeout(() => insertSlashCommand(), 100);
    }
    
    // Handle keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          executeCommand('bold');
          break;
        case 'i':
          e.preventDefault();
          executeCommand('italic');
          break;
        case 'u':
          e.preventDefault();
          executeCommand('underline');
          break;
      }
    }
  };

  return (
    <div className="border border-border rounded-lg bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('bold')}
          className="h-8 w-8 p-0"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('italic')}
          className="h-8 w-8 p-0"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('underline')}
          className="h-8 w-8 p-0"
        >
          <Underline className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('strikeThrough')}
          className="h-8 w-8 p-0"
        >
          <Strikethrough className="h-4 w-4" />
        </Button>
        
        <Separator orientation="vertical" className="h-6" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('formatBlock', 'h1')}
          className="h-8 px-2 text-xs"
        >
          H1
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('formatBlock', 'h2')}
          className="h-8 px-2 text-xs"
        >
          H2
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('formatBlock', 'h3')}
          className="h-8 px-2 text-xs"
        >
          H3
        </Button>
        
        <Separator orientation="vertical" className="h-6" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('insertUnorderedList')}
          className="h-8 w-8 p-0"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('insertOrderedList')}
          className="h-8 w-8 p-0"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('formatBlock', 'blockquote')}
          className="h-8 w-8 p-0"
        >
          <Quote className="h-4 w-4" />
        </Button>
        
        <Separator orientation="vertical" className="h-6" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('justifyLeft')}
          className="h-8 w-8 p-0"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('justifyCenter')}
          className="h-8 w-8 p-0"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('justifyRight')}
          className="h-8 w-8 p-0"
        >
          <AlignRight className="h-4 w-4" />
        </Button>
        
        <Separator orientation="vertical" className="h-6" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const url = prompt('Enter link URL:');
            if (url) executeCommand('createLink', url);
          }}
          className="h-8 w-8 p-0"
        >
          <Link className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const url = prompt('Enter image URL:');
            if (url) executeCommand('insertImage', url);
          }}
          className="h-8 w-8 p-0"
        >
          <Image className="h-4 w-4" />
        </Button>
        
        <select
          className="h-8 px-2 text-xs bg-background border border-border rounded"
          onChange={(e) => executeCommand('foreColor', e.target.value)}
        >
          <option value="">Text Color</option>
          <option value="#000000">Black</option>
          <option value="#ef4444">Red</option>
          <option value="#22c55e">Green</option>
          <option value="#3b82f6">Blue</option>
          <option value="#a855f7">Purple</option>
          <option value="#f59e0b">Orange</option>
        </select>
        
        <select
          className="h-8 px-2 text-xs bg-background border border-border rounded"
          onChange={(e) => executeCommand('hiliteColor', e.target.value)}
        >
          <option value="">Highlight</option>
          <option value="#fef3c7">Yellow</option>
          <option value="#fce7f3">Pink</option>
          <option value="#dbeafe">Blue</option>
          <option value="#dcfce7">Green</option>
          <option value="#f3e8ff">Purple</option>
        </select>
      </div>
      
      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        className="min-h-[200px] p-4 outline-none prose prose-sm max-w-none"
        onInput={handleInput}
        onFocus={() => setIsEditorFocused(true)}
        onBlur={() => setIsEditorFocused(false)}
        onKeyDown={handleKeyDown}
        dangerouslySetInnerHTML={{ __html: content }}
        style={{ 
          caretColor: 'hsl(var(--terminal-green))',
        }}
      />
      
      {!content && !isEditorFocused && (
        <div className="absolute top-16 left-4 text-muted-foreground pointer-events-none">
          {placeholder}
        </div>
      )}
    </div>
  );
};